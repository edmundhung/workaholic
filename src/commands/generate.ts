import { Command } from 'commander';
import Fuse from 'fuse.js'
import * as fs from 'fs/promises';
import matter from 'gray-matter';
import { Entry } from '../types';

async function parseFile(root: string, path: string): Promise<Entry> {
  const content = await fs.readFile(path, { encoding: 'utf-8' });
  const result = matter(content);

  return {
    key: `articles#${path.replace(new RegExp(`^${root}/`), '').replace(/\.md$/, '')}`,
    value: result.content ?? '',
    metadata: result.data ?? {},
  };
}

async function parseDirectory(source: string, path = source): Promise<Entry[]> {
  let entry: KV = {
    key: `entries#${path.replace(new RegExp(`^${source}/`), '')}`,
    value: [],
  };
  let list: KV[] = [entry];


  for (const dirent of await fs.readdir(path, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      const [directoryEntry, ...articles] = await parseDirectory(source, `${path}/${dirent.name}`);

      entry.value.push(...directoryEntry.value);
      list.push(directoryEntry, ...articles);
    } else if (dirent.isFile()) {
      const article = await parseFile(source, `${path}/${dirent.name}`);

      entry.value.push({ slug: article.key, metadata: article.metadata });
      list.push(article);
    }
  }

  return list;
}

function generateSearch(entry: Entry) {
  const index = Fuse.createIndex([
    {
      name: 'slug',
      weight: 0.1
    },
    {
      name: 'metadata.title',
      weight: 0.5
    },
    {
      name: 'metadata.description',
      weight: 0.4
    },
  ], entry.value);

  return {
    key: 'search',
    value: {
      index: index.toJSON(),
      references: entry.value,
    },
  };
}

export default async function generate(source: string): Promise<void> {
  const [entry, ...data] = await parseDirectory(source);
  const search = generateSearch(entry);

  return [search, ...data];
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
