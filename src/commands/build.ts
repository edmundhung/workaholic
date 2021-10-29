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

async function getPluginExport(plugin: PluginConfig): Promise<string[]> {
  const result = await build({
    entryPoints: [plugin.source],
    platform: 'neutral',
    format: 'esm',
    metafile: true,
    write: false,
    logLevel: 'silent',
  });

  let { metafile } = result;

  if (metafile) {
    for (let key in metafile.outputs) {
      let output = metafile.outputs[key];

      if (output.entryPoint) {
        return output.exports;
      }
    }
  }

  throw new Error(`Unable to get exports for plugin ${plugin.source}`);
}

function workaholicSitePlugin(workerMatcher: RegExp, options: Pick<BuildWorkerOptions, 'basename' | 'binding' | 'plugins'>): Plugin {
  return {
    name: 'workaholic-site',
    setup(build: PluginBuild) {
      build.onResolve({ filter: workerMatcher }, args => {
        return { namespace: 'workaholic-site', path: args.path };
      });

      build.onLoad({ namespace: 'workaholic-site', filter: workerMatcher }, async args => {
          const file = args.path.replace(workerMatcher, '');
          const exports = await Promise.all(options.plugins?.map(plugin => getPluginExport(plugin)) ?? []);
          const plugins = options.plugins?.filter((_, i) => exports[i].includes('setupQuery')) ?? [];
          const imports = plugins.map((plugin, i) => `import * as plugin${i} from ${JSON.stringify(plugin.source)};`) ?? [];
          const enhancers = plugins.map((plugin, i) => `plugin${i}.setupQuery(${plugin.queryOptions ? JSON.stringify(plugin.queryOptions) : ''})`) ?? [];
          const contents = `
import { createRequestHandler } from ${JSON.stringify(file)};
${imports.join('\n')}

const handleRequest = createRequestHandler(${options.binding}, {
  basename: '${options.basename}',
  enhancers: [${enhancers.join(', ')}],
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
        binding: workaholic.binding,
        minify: options.minify,
        plugins: workaholic.plugins?.map(plugin => ({
          ...plugin,
          source: plugin.source.startsWith('.') ? path.resolve(root, plugin.source) : plugin.source,
        })) ?? [
          { source: path.resolve(__dirname, '../../src/plugins/plugin-json.ts') },
          { source: path.resolve(__dirname, '../../src/plugins/plugin-frontmatter.ts') },
          { source: path.resolve(__dirname, '../../src/plugins/plugin-yaml.ts') },
          { source: path.resolve(__dirname, '../../src/plugins/plugin-toml.ts') },
          { source: path.resolve(__dirname, '../../src/plugins/plugin-list.ts') },
        ],
        target: path.resolve(process.cwd(), output),
      });
    });

  return command;
}
