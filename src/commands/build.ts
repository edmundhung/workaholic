import { Command } from 'commander';
import { build, Plugin, PluginBuild } from 'esbuild';
import path from 'path';
import type { PluginConfig } from '../types';
import { getWranglerConfig, getWranglerDirectory } from '../utils';

interface BuildWorkerOptions {
  basename: string;
  binding: string;
  minify?: boolean;
  plugins?: PluginConfig[]
  target?: string;
}

function workaholicWorkerPlugin(suffixMatcher: RegExp, options: Pick<BuildWorkerOptions, 'basename' | 'binding' | 'plugins'>): Plugin {
  return {
    name: 'workaholic-worker',
    setup(build: PluginBuild) {
      build.onResolve({ filter: suffixMatcher }, args => {
        return { namespace: 'workaholic-worker', path: args.path };
      });

      build.onLoad({ namespace: 'workaholic-worker', filter: suffixMatcher }, async args => {
          const file = args.path.replace(suffixMatcher, '');
          const imports = options.plugins?.map((plugin, i) => `import * as plugin${i} from ${JSON.stringify(plugin.source)};`) ?? [];
          const enhancers = options.plugins?.map((plugin, i) => `plugin${i}.setupQuery()`) ?? [];
          const contents = `
import { createRequestHandler } from ${JSON.stringify(file)};
${imports.join('\n')}

const handleRequest = createRequestHandler(${options.binding}, {
  basename: '${options.basename}',
  enhancers: [
    ${enhancers.join(',\n    ')}
  ],
});

addEventListener('fetch', event => event.respondWith(handleRequest(event.request)));
          `;

          return {
            contents: contents.trim(),
            resolveDir: path.dirname(file),
            loader: 'js',
          };
        }
      );
    }
  };
}

export default async function buildWorker(options: BuildWorkerOptions): Promise<string | null> {
  const result = await build({
    entryPoints: [path.resolve(__dirname, '../../template/worker.ts?worker')],
    outfile: options.target,
    write: !!options.target,
    bundle: true,
    minify: options.minify ?? false,
    format: 'esm',
    plugins: [
      workaholicWorkerPlugin(/\?worker$/, {
        basename: options.basename,
        binding: options.binding,
        plugins: options.plugins ?? [],
      }),
    ],
  });

  if (options.target) {
    return null;
  }

  const [file] = result.outputFiles ?? [];

  if (!file) {
    throw new Error('[Workaholic] Unknown error during build');
  }

  return file.text;
}

export function makeBuildCommand(): Command {
  const command = new Command('build');

  command
    .description('build worker source')
    .argument('<output>', 'output file path')
    .option('--minify', 'Minify output', false)
    .action(async (output, options) => {
      const root = await getWranglerDirectory();
      const config = await getWranglerConfig(root);
      const workaholic = config.getWorkaholicConfig();

      await buildWorker({
        basename: workaholic.site?.basename ?? '/',
        target: path.resolve(process.cwd(), output),
        binding: workaholic.binding,
        minify: options.minify,
      });
    });

  return command;
}