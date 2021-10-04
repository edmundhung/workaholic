import { Command } from 'commander';
import Fuse from 'fuse.js'
import * as fs from 'fs/promises';
import matter from 'gray-matter';

async function parseFile(root: string, path: string): Promise<any> {
  const content = await fs.readFile(path);
  const result = matter(content.toString('utf8'));

  return {
    key: path.replace(new RegExp(`^${root}/`), '').replace(/\.md$/, ''),
    value: result.content ?? '',
    metadata: result.data ?? {},
  };
}

async function parseDirectory(source: string, path: string): Promise<any[]> {
  let list = [];

  for (const dirent of await fs.readdir(path, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      list.push(...(await parseDirectory(source, `${path}/${dirent.name}`)));
    } else if (dirent.isFile()) {
      list.push(await parseFile(source, `${path}/${dirent.name}`));
    }
  }

  return list;
}

async function generate(source: string, path = source): Promise<void> {
  const entries = await parseDirectory(source, path);
  const index = Fuse.createIndex([
    {
      name: 'key',
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
  ], entries);

  const data = {
    key: 'workaholic',
    value: entries,
    metadata: index.toJSON(),
  };

  process.stdout.write(JSON.stringify(data, null, 2));
}

export default function makeGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .description('Generate worker kv data')
    .argument('[soruce]', 'source directory')
    .action(source => {
      generate(source);
    });

  return command;
}
