import { Command } from 'commander';
import { build, Plugin, PluginBuild } from 'esbuild';
import path from 'path';
import { getWranglerConfig, getWranglerDirectory } from '../utils';

interface BuildWorkerOptions {
  basename: string;
  binding: string;
  minify?: boolean;
  config?: string;
  target?: string;
}

function workaholicSitePlugin(workerMatcher: RegExp, options: Pick<BuildWorkerOptions, 'basename' | 'binding' | 'config'>): Plugin {
  return {
    name: 'workaholic-site',
    setup(build: PluginBuild) {
      build.onResolve({ filter: workerMatcher }, args => {
        return { namespace: 'workaholic-site', path: args.path };
      });

      build.onLoad({ namespace: 'workaholic-site', filter: workerMatcher }, async args => {
          const file = args.path.replace(workerMatcher, '');
          const contents = `
            import { createRequestHandler } from ${JSON.stringify(file)};
            ${options.config ? `import { setupQuery } from ${JSON.stringify(options.config)};` : ''}

            const handleRequest = createRequestHandler(${options.binding}, {
              basename: '${options.basename}',
              ${options.config ? 'enhancer: setupQuery(),' : ''}
            });

            addEventListener('fetch', event => event.respondWith(handleRequest(event.request)));
          `;

          return {
            contents: contents.trim().split('\n').map(line => line.trim()).join('\n'),
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
    entryPoints: [path.resolve(__dirname, '../../template/worker.ts?site')],
    outfile: options.target,
    write: !!options.target,
    bundle: true,
    minify: options.minify ?? false,
    format: 'esm',
    plugins: [
      workaholicSitePlugin(/\?site$/, {
        basename: options.basename,
        binding: options.binding,
        config: options.config,
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
      const workaholic = config.getWorkaholicOptions();

      await buildWorker({
        basename: workaholic.site?.basename ?? '/',
        binding: workaholic.binding,
        minify: options.minify,
        config: workaholic.config,
        target: path.resolve(process.cwd(), output),
      });
    });

  return command;
}
