import { Command } from 'commander';
import Fuse from 'fuse.js'
import * as fs from 'fs/promises';
import matter from 'gray-matter';
import { Entry, Reference } from '../types';

async function parseFile(root: string, path: string): Promise<Entry> {
  const content = await fs.readFile(path, { encoding: 'utf-8' });
  const result = matter(content);

  return {
    key: `articles#${path.replace(new RegExp(`^${root}/`), '').replace(/\.md$/, '')}`,
    value: result.content ?? '',
    metadata: result.data as any,
  };
}

async function parseDirectory(source: string, path = source): Promise<Entry[]> {
  let references: Reference[] = [];
  let list: Entry[] = [];


  for (const dirent of await fs.readdir(path, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      const [directoryEntry, ...articles] = await parseDirectory(source, `${path}/${dirent.name}`);

      references.push(...JSON.parse(directoryEntry.value));
      list.push(directoryEntry, ...articles);
    } else if (dirent.isFile()) {
      const article = await parseFile(source, `${path}/${dirent.name}`);

      references.push({ slug: article.key, metadata: article.metadata ?? null });
      list.push(article);
    }
  }

  list.unshift({
    key: `entries#${path.replace(new RegExp(`^${source}/`), '')}`,
    value: JSON.stringify(references),
  });

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
  ], JSON.parse(entry.value));

  return {
    key: 'search',
    value: JSON.stringify({
      index: index.toJSON(),
      references: JSON.parse(entry.value),
    }),
  };
}

export default async function generate(source: string): Promise<Entry[]> {
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
