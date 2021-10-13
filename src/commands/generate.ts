import TOML from '@iarna/toml';
import { Command } from 'commander';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';
import { Entry, Reference } from '../types';

async function parseFile(root: string, filePath: string): Promise<Entry> {
  const content = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
  const extension = path.extname(filePath);
  const key = `articles/${path.relative(root, filePath)}`;

  switch (extension) {
    case '.md': {
      const result = matter(content);

      return {
        key: key.replace(/\.md$/, ''),
        value: result.content ?? '',
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
  let references: Reference[] = [];
  let list: Entry[] = [];

  for (const dirent of await fs.promises.readdir(directoryPath, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      const [directoryEntry, ...articles] = await parseDirectory(source, `${directoryPath}/${dirent.name}`);

      references.push(...JSON.parse(directoryEntry.value));
      list.push(directoryEntry, ...articles);
    } else if (dirent.isFile()) {
      const article = await parseFile(source, `${directoryPath}/${dirent.name}`);

      references.push({ slug: article.key, metadata: article.metadata ?? null });
      list.push(article);
    }
  }

  list.unshift({
    key: `references/${path.relative(source, directoryPath)}`,
    value: JSON.stringify(references),
  });

  return list;
}

export default async function generate(source: string): Promise<Entry[]> {
  const entries = await parseDirectory(source);

  return entries;
}

export function makeGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .description('Generate worker kv data')
    .argument('[soruce]', 'source directory')
    .action(async (source) => {
      const entries = await generate(source);

      process.stdout.write(JSON.stringify(entries, null, 2));
    });

  return command;
}
