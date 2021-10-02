import { Command } from 'commander';
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

export default function makePreviewCommand() {
  const command = new Command('preview');

  command
    .description('Persist data on miniflare')
    .argument('<data>', 'data path')
    .option('--binding <name>', 'wrangler binding name')
    .action((data, binding) => {
      preview(data, binding);
    });

  return command;
}
