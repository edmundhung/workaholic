import { Command } from 'commander';
import * as fs from 'fs/promises';
import { Miniflare } from 'miniflare';
import rimraf from 'rimraf';

async function parseData(source: string): any[] {
  const content = await fs.readFile(source, 'utf-8');
  const entries = JSON.parse(content);

  if (!Array.isArray(entries)) {
    throw new Error('[workaholic] source json must be an array');
  }

  return entries;
}

export default async function preview(mf: Miniflare, entries: any[], binding: string): Promise<void> {
  const namespace = await mf.getKVNamespace(binding);

  await Promise.all(
    entries.map(entry =>
      namespace.put(entry.key, entry.value, { metadata: entry.metadata }),
    ),
  );
}

export function makePreviewCommand(): Command {
  const command = new Command('preview');

  command
    .description('Persist data on miniflare')
    .argument('<data>', 'data soruce')
    .option('--binding <name>', 'wrangler binding name')
    .action(async (source, bindingName) => {
      console.log('[workaholic] Empty ./.mf/kv');
      rimraf.sync('./.mf/kv');
      console.log('[workaholic] Cleanup done');

      console.log('[workaholic] Persisting KV on Miniflare');
      const mf = new Miniflare({
        script: `addEventListener("fetch", () => {});`,
        buildCommand: '',
        kvPersist: true,
      });

      const entries = await parseData(source);
      await preview(mf, entries, bindingName);
      console.log('[workaholic] KV persisted on Miniflare');
    });

  return command;
}
