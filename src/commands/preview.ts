import { Command } from 'commander';
import { Miniflare } from 'miniflare';
import rimraf from 'rimraf';
import { Entry } from '../types';
import { parseData } from '../utils';

export default async function preview(mf: Miniflare, entries: Entry[], binding: string): Promise<void> {
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
