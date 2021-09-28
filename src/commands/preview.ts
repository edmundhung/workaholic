import * as fs from 'fs/promises';
import { Miniflare } from 'miniflare';
import rimraf from 'rimraf';

async function preview(source: string, binding: string): Promise<void> {
  console.log('[workaholic] Empty ./.mf/kv');
  rimraf.sync('./.mf/kv');
  console.log('[workaholic] Cleanup done');

  console.log('[workaholic] Persisting KV on Miniflare');

  const mf = new Miniflare({
    script: `addEventListener("fetch", () => {});`,
    buildCommand: '',
    kvPersist: true,
  });

  const content = await fs.readFile(source, 'utf-8');
  const namespace = await mf.getKVNamespace(binding);

  const entries = JSON.parse(content);

  if (!Array.isArray(entries)) {
    throw new Error('[workaholic] source json must be an array');
  }

  await Promise.all(
    entries.map(entry =>
      namespace.put(entry.key, entry.value, { metadata: entry.metadata }),
    ),
  );
  console.log('[workaholic] KV persisted on Miniflare');
}


export const command = 'preview <data>';

export const describe = 'Persist data on miniflare';

export const builder = {
  data: {
    describe: 'data path',
    type: 'string'
  },
  binding: {
    describe: 'wrangler binding name',
    type: 'string',
    default: 'workaholic'
  }
};

export async function handler(argv) {
  await preview(argv.data, argv.binding);
}
