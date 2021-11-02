import TOML from '@iarna/toml';
import { Command } from 'commander';
import { build } from 'esbuild';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';
import type { Build, Entry, PluginConfig } from '../types';
import { getRelativePath, getWranglerConfig, getWranglerDirectory } from '../utils';

interface GenerateOptions {
  source: string;
  builds?: Build[];
}

const defaultPlugins = [
  require('../plugins/plugin-json'),
  require('../plugins/plugin-frontmatter'),
  require('../plugins/plugin-yaml'),
  require('../plugins/plugin-toml'),
  require('../plugins/plugin-list'),
];

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
  const defaultTransform = (entry: Entry): Promise<Entry> => Promise.resolve(entry);
  const transform = builds.reduce((fn, build) => (entry: Entry) => fn(entry).then(build.transform ?? defaultTransform), defaultTransform);

  return (entries: Entry[]) => Promise.all(entries.map(entry => transform(entry)));
}

function assignNamespace(namespace: string, entries: Entry[]): Entry[] {
  return entries.map<Entry>(entry => ({ ...entry, key: `${namespace}/${entry.key}` }));
}

export default async function generate({ source, builds = [] }: GenerateOptions): Promise<Entry[]> {
  const files = await parseDirectory(source);
  const inputs = await Promise.all(files.map(file => parseFile(source, file)));
  const transform = createTransform(builds);
  const entries = await transform(inputs);
  const data = assignNamespace('data', entries);
  const derived = await Promise.all(
    builds.reduce((result, build) => {
      if (!build.index) {
        return result;
      }

      const promise = Promise
        .resolve(build.index(entries))
        .then(entries => {
          if (!build.namespace) {
            throw new Error('[Workaholic] namespace is required for deriving entries');
          }

          return assignNamespace(build.namespace, entries)
        });

      return result.concat(promise);
    }, [] as Array<Promise<Entry[]>>)
  );

  return derived.reduce((result, entries) => result.concat(entries), data);
}

async function resolvePlugin(root: string, config: PluginConfig): Promise<Build> {
  const target = path.resolve(root, './node_modules/.workaholic/', config.source);

  await build({
    entryPoints: [config.source.startsWith('.') ? path.resolve(root, config.source) : config.source],
    outfile: target,
    format: 'cjs',
    target: 'node12',
  });

  return require(target).setupBuild(config.buildOptions);
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
      const builds = workaholic.plugins ? await Promise.all(workaholic.plugins.map(plugin => resolvePlugin(root, plugin))) : defaultPlugins.map<Build>(plugin => plugin.setupBuild());
      const entries = await generate({
        source: path.resolve(root, options.source ? path.resolve(cwd, options.source) : workaholic.source),
        builds,
      });

      fs.promises.writeFile(path.resolve(cwd, output), JSON.stringify(entries, null, 2));
    });

  return command;
}
