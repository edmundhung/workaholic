import TOML from '@iarna/toml';
import { Command } from 'commander';
import { build, Plugin } from 'esbuild';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';
import type { Build, Entry, PluginConfig, Config } from '../types';
import { getRelativePath, getWranglerConfig, getWranglerDirectory } from '../utils';

type GenerateOptions = Omit<Config, 'binding' | 'site'>;

async function parseFile(root: string, filePath: string): Promise<Entry> {
  const value = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
  const key = getRelativePath(root, filePath);

  return {
    key,
    value: value.replace(/\r/g, ''),
  };
}

async function parseDirectory(directory: string): Promise<string[]> {
  let list: string[] = [];

  for (const dirent of await fs.promises.readdir(directory, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      const paths = await parseDirectory(`${directory}/${dirent.name}`);

      list.push(...paths);
    } else if (dirent.isFile()) {
      list.push(`${directory}/${dirent.name}`);
    }
  }

  return list;
}

function createTransform(builds: Build[]): (entries: Entry[]) => Promise<Entry[]> {
  const transform = builds.reduce((fn, build) => async (entry: Entry): Promise<Entry[]> => {
    if (!build.transform) {
      throw new Error('[Workaholic] Missing transform from plugin');
    }

    const entries = await fn(entry);
    const result = await Promise.all(entries.map(build.transform));

    return result.flat();
  }, (entry: Entry) => Promise.resolve([entry]));

  return (entries: Entry[]) => Promise.all(entries.map(transform)).then(result => result.flat());
}

function assignNamespace(namespace: string, entries: Entry[]): Entry[] {
  return entries.map<Entry>(entry => ({ ...entry, key: `${namespace}/${entry.key}` }));
}

async function finalise(entries: Entry[], output?: Record<string, PluginConfig>): Promise<Entry[]> {
  const outputs = Object.entries(output ?? {});

  if (outputs.length === 0) {
    return assignNamespace('data', entries);
  }

  const result = await Promise.all(
    outputs.map(async ([namespace, plugin]) => {
      const build = initialiseBuild(plugin);

      if (!build.index) {
        throw new Error('[Workaholic] output plugin must implement the index hook');
      }

      const data = await Promise.resolve(build.index(entries));
      const result = assignNamespace(namespace, data);

      return result;
    })
  );

  return result.flat();
}

export default async function generate({ source, output, plugins = [] }: GenerateOptions): Promise<Entry[]> {
  const files = await parseDirectory(source);
  const inputs = await Promise.all(files.map(file => parseFile(source, file)));
  const builds = plugins.map(initialiseBuild);
  const transform = createTransform(builds);
  const entries = await transform(inputs);
  const result = await finalise(entries, output);

  return result;
}

async function resolvePlugin(root: string, config: PluginConfig): Promise<PluginConfig> {
  const target = path.resolve(root, './node_modules/.workaholic/', config.source);

  await build({
    entryPoints: [config.source.startsWith('.') ? path.resolve(root, config.source) : config.source],
    outfile: target,
    format: 'cjs',
    target: 'node12',
  });

  return { ...config, source: target };
}

function initialiseBuild(plugin: PluginConfig): Build {
  return require(plugin.source).setupBuild(plugin.options);
}

export function makeGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .description('Generate worker kv data')
    .argument('<output>', 'output file path')
    .option('--source [path]', 'path of the source directory')
    .action(async (output, options) => {
      const cwd = process.cwd();
      const root = await getWranglerDirectory();
      const config = await getWranglerConfig(root);
      const workaholic = config.getWorkaholicConfig();
      const entries = await generate({
        source: path.resolve(root, options.source ? path.resolve(cwd, options.source) : workaholic.source),
        output: Object.fromEntries(
          workaholic.output
            ? await Promise.all(
              Object.entries(workaholic.output).map(async ([namespace, plugin]) => [namespace, await resolvePlugin(root, plugin)])
            )
            : []
        ),
        plugins: workaholic.plugins
          ? await Promise.all(workaholic.plugins.map(plugin => resolvePlugin(root, plugin)))
          : [
            { source: '../plugins/plugin-frontmatter' },
            { source: '../plugins/plugin-yaml' },
            { source: '../plugins/plugin-toml' },
            { source: '../plugins/plugin-json' },
          ],
      });

      fs.promises.writeFile(path.resolve(cwd, output), JSON.stringify(entries, null, 2));
    });

  return command;
}
