import TOML from '@iarna/toml';
import { Command } from 'commander';
import { build } from 'esbuild';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';
import type { Entry, Reference, Options } from '../types';
import { getRelativePath, getWranglerConfig, getWranglerDirectory } from '../utils';

interface GenerateOptions extends Pick<Options, 'source' | 'plugins'> {
  root: string;
}

async function parseFile(root: string, filePath: string): Promise<Entry> {
  const content = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
  const extension = path.extname(filePath);
  const key = getRelativePath(root, filePath);

  switch (extension) {
    case '.md': {
      const result = matter(content);

      return {
        key: key.replace(/\.md$/, ''),
        value: result.content?.replace(/\r/g, '') ?? '',
        metadata: result.data as any,
      };
    }
    case '.yaml':
    case '.yml': {
      const result = matter(['---', content, '---'].join('\n'));
      const { metadata, ...data } = result.data;

      return {
        key: key.replace(/\.yaml$/, ''),
        value: JSON.stringify(data),
        metadata: metadata,
      };
    }
    case '.toml': {
      const { metadata, ...data } = TOML.parse(content);

      return {
        key: key.replace(/\.toml$/, ''),
        value: JSON.stringify(data),
        metadata: metadata as any,
      };
    }
    case '.json': {
      const { metadata, ...data } = JSON.parse(content);

      return {
        key: key.replace(/\.json$/, ''),
        value: JSON.stringify(data),
        metadata: metadata,
      };
    }
    default:
      throw new Error(`Unsupported file extension: ${extension}`);
  }
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

export default async function generate(options: GenerateOptions): Promise<Entry[]> {
  let entries = await parseDirectory(path.resolve(options.root, options.source));

  const plugins = await Promise.all(
    (options.plugins ?? []).map(async ({ source, params }) => {
      const outPath = path.resolve(options.root, './node_modules/.workaholic/', source);

      await build({
        entryPoints: [path.resolve(options.root, source)],
        outfile: outPath,
        format: 'cjs',
        target: 'node12',
      });

      return (entries: Entry[]): Promise<Entry[]> => require(outPath).process(entries, params);
    }),
  );

  for (const process of plugins) {
    entries = await process(entries);
  }

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

export function makeGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .description('Generate worker kv data')
    .argument('<output>', 'output file path')
    .action(async (output) => {
      const root = await getWranglerDirectory();
      const config = await getWranglerConfig(root);
      const options = config.getWorkaholicOptions();
      const entries = await generate({ root, source: options.source, plugins: options.plugins });

      fs.promises.writeFile(path.resolve(process.cwd(), output), JSON.stringify(entries, null, 2));
    });

  return command;
}
