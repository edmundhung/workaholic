import { Command } from 'commander';
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import type { Build, Entry, Options } from '../types';
import { getRelativePath, getWranglerConfig, getWranglerDirectory } from '../utils';

interface BuildOptions {
  source: string;
  config?: string;
}

async function parseFile(root: string, filePath: string): Promise<Entry> {
  const value = await fs.promises.readFile(filePath);
  const key = getRelativePath(root, filePath);

  return {
    key,
    value: value.buffer,
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

function assignNamespace(namespace: string, entries: Entry[]): Entry[] {
  return entries.map<Entry>(entry => ({ ...entry, key: `${namespace}://${entry.key}` }));
}

export default async function build({ source, config = path.resolve(__dirname, '../defaultConfig') }: BuildOptions): Promise<Entry[]> {
  const files = await parseDirectory(source);
  const entries = await Promise.all(files.map(file => parseFile(source, file)));
  const build = initialiseBuild(config);
  const result = await Promise.resolve(build(entries));

  return Object.entries(result).flatMap(([namespace, entries]) => assignNamespace(namespace, entries));
}

async function resolveConfig(root: string, config: string): Promise<string> {
  const target = path.resolve(root, './node_modules/.workaholic/', config);

  await esbuild.build({
    entryPoints: [config.startsWith('.') ? path.resolve(root, config) : config],
    outfile: target,
    format: 'cjs',
    target: 'node12',
  });

  return target;
}

function initialiseBuild(config: string): Build {
  return require(config).setupBuild();
}

function stringifyEntries(entries: Entry[]): string {
  const result = entries.map(entry => {
    if (typeof entry.value === 'string') {
      return entry;
    }

    return {
      ...entry,
      value: Buffer.from(entry.value).toString('base64'),
      base64: true,
    };
  });

  return JSON.stringify(result, null, 2);
}

export function makeBuildCommand(): Command {
  const command = new Command('build');

  command
    .description('Build worker kv data')
    .argument('<output>', 'output file path')
    .option('--source [path]', 'path of the source directory')
    .action(async (output, options) => {
      const cwd = process.cwd();
      const root = await getWranglerDirectory();
      const config = await getWranglerConfig(root);
      const workaholic = config.getWorkaholicOptions();
      const entries = await build({
        source: path.resolve(root, options.source ? path.resolve(cwd, options.source) : workaholic.source),
        config: await resolveConfig(root, workaholic.config),
      });

      fs.promises.writeFile(path.resolve(cwd, output), stringifyEntries(entries));
    });

  return command;
}
