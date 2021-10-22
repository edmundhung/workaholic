import TOML from '@iarna/toml';
import { Command } from 'commander';
import { build } from 'esbuild';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';
import type { Build, Entry, Reference, PluginConfig } from '../types';
import { getRelativePath, getWranglerConfig, getWranglerDirectory } from '../utils';

interface GenerateOptions {
  root: string;
  source: string;
  builds?: Build[];
}

const defaultPlugins = [
  require('../plugins/plugin-json.ts'),
  require('../plugins/plugin-md.ts'),
  require('../plugins/plugin-yaml.ts'),
  require('../plugins/plugin-toml.ts'),
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

function defaultTransform(entry: Entry): Promise<Entry> {
  return Promise.resolve(entry);
}

export default async function generate({ root, source, builds = defaultPlugins.map<Build>(plugin => plugin.setupBuild()) }: GenerateOptions): Promise<Entry[]> {
  let entries = await parseDirectory(path.resolve(root, source));

  const transform = builds.reduce((fn, build) => (entry: Entry) => fn(entry).then(build.transform ?? defaultTransform), defaultTransform);

  entries = await Promise.all(entries.map(entry => transform(entry)));

  let referencesByKey: Record<string, Reference[]> = {};

  for (const entry of entries) {
    let key = entry.key;

    while (key !== '') {
      key = key.includes('/') ? key.slice(0, key.lastIndexOf('/')) : '';

      if (typeof referencesByKey[key] === 'undefined') {
        referencesByKey[key] = [];
      }

      referencesByKey[key].push({ slug: entry.key, metadata: entry.metadata ?? null });
    }
  }

  return [
    ...entries.map<Entry>(entry => ({
      ...entry,
      key: `data/${entry.key}`,
    })),
    ...Object.entries(referencesByKey).map<Entry>(([key, references]) => ({
      key: `references/${key}`,
      value: JSON.stringify(references),
    })),
  ];
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
        root,
        source: options.source,
        builds,
      });

      fs.promises.writeFile(path.resolve(process.cwd(), output), JSON.stringify(entries, null, 2));
    });

  return command;
}
