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
  require('../plugins/plugin-json.ts'),
  require('../plugins/plugin-md.ts'),
  require('../plugins/plugin-yaml.ts'),
  require('../plugins/plugin-toml.ts'),
  require('../plugins/plugin-list.ts'),
];

async function parseFile(root: string, filePath: string): Promise<Entry> {
  const value = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
  const key = getRelativePath(root, filePath);

  return {
    key,
    value,
  };
}

async function parseDirectory(source: string, directoryPath = source): Promise<Entry[]> {
  let list: Entry[] = [];

  for (const dirent of await fs.promises.readdir(directoryPath, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      const entries = await parseDirectory(source, `${directoryPath}/${dirent.name}`);

      list.push(...entries);
    } else if (dirent.isFile()) {
      const entry = await parseFile(source, `${directoryPath}/${dirent.name}`);

      list.push(entry);
    }
  }

  return list;
}



function defaultDerive(entries: Entry[]): Promise<Entry[]> {
  return Promise.resolve([]);
}

function createTransform(builds: Build[]): (entries: Entry[]) => Promise<Entry[]> {
  const defaultTransform = (entry: Entry): Promise<Entry> => Promise.resolve(entry);
  const transform = builds.reduce((fn, build) => (entry: Entry) => fn(entry).then(build.transform ?? defaultTransform), defaultTransform);

  return (entries: Entry[]) => Promise.all(entries.map(entry => transform(entry)));
}

function assignNamespace(namespace: string, entries: Entry[]): Entry[] {
  return entries.map<Entry>(entry => ({ ...entry, key: `${namespace}/${entry.key}` }));
}

export default async function generate({ source, builds = defaultPlugins.map<Build>(plugin => plugin.setupBuild()) }: GenerateOptions): Promise<Entry[]> {
  const files = await parseDirectory(source);
  const transform = createTransform(builds);
  const entries = await transform(files);
  const data = assignNamespace('data', entries);
  const derived = await Promise.all(
    builds.reduce((result, build) => {
      if (!build.derive) {
        return result;
      }

      const promise = Promise
        .resolve(build.derive(entries))
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
    entryPoints: [path.resolve(root, config.source)],
    outfile: target,
    format: 'cjs',
    target: 'node12',
  });

  return require(target).setupBuild(config.options);
}

export function makeGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .description('Generate worker kv data')
    .argument('<output>', 'output file path')
    .action(async (output) => {
      const root = await getWranglerDirectory();
      const config = await getWranglerConfig(root);
      const options = config.getWorkaholicConfig();
      const builds = options.plugins ? await Promise.all(options.plugins.map(plugin => resolvePlugin(root, plugin))) : [];
      const entries = await generate({
        source: path.resolve(root, options.source),
        builds,
      });

      fs.promises.writeFile(path.resolve(process.cwd(), output), JSON.stringify(entries, null, 2));
    });

  return command;
}
