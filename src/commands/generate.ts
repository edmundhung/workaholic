import { Command } from 'commander';
import * as esbuild from 'esbuild';
import path from 'path';
import { getWranglerConfig, getWranglerDirectory } from '../utils';

interface GenerateWorkerOptions {
  basename: string;
  binding: string;
  minify?: boolean;
  config?: string;
  target?: string;
}

function workaholicSitePlugin(workerMatcher: RegExp, options: Pick<GenerateWorkerOptions, 'basename' | 'binding' | 'config'>): esbuild.Plugin {
  return {
    name: 'workaholic-site',
    setup(build: esbuild.PluginBuild) {
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

export default async function generateWorker(options: GenerateWorkerOptions): Promise<string | null> {
  const result = await esbuild.build({
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
    throw new Error('[Workaholic] Unknown error during generate');
  }

  return file.text;
}

export function makeGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .description('generate worker source')
    .argument('<output>', 'output file path')
    .option('--minify', 'Minify output', false)
    .action(async (output, options) => {
      const root = await getWranglerDirectory();
      const config = await getWranglerConfig(root);
      const workaholic = config.getWorkaholicOptions();

      await generateWorker({
        basename: workaholic.site?.basename ?? '/',
        binding: workaholic.binding,
        minify: options.minify,
        config: workaholic.config,
        target: path.resolve(process.cwd(), output),
      });
    });

  return command;
}
