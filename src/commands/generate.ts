import * as fs from 'fs/promises';
import matter from 'gray-matter';

async function parseFile(root: string, path: string): Promise<any> {
  const content = await fs.readFile(path);
  const result = matter(content.toString('utf8'));

  return {
    key: path.replace(new RegExp(`^${root}/`), '').replace(/\.md$/, ''),
    value: result.content,
    metadata: result.data,
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

  process.stdout.write(JSON.stringify(entries, null, 2));
}

export const command = 'generate [source]';

export const describe = 'Generate worker kv data';

export const builder = {
  source: {
    describe: 'source directory',
    type: 'string'
  },
};

export async function handler(argv) {
  await generate(argv.source);
}
