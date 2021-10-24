import { Command } from 'commander';
import { Miniflare } from 'miniflare';
import path from 'path';
import rimraf from 'rimraf';
import { Entry } from '../types';
import { parseData, getWranglerConfig, getWranglerDirectory } from '../utils';

export default async function preview(namespace: KVNamespace, entries: Entry[], ): Promise<void> {
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
    .argument('<source>', 'source file path')
    .action(async (source) => {
      const root = await getWranglerDirectory();

      console.log('[workaholic] Empty ./.mf/kv');
      rimraf.sync(path.resolve(root, './.mf/kv'));
      console.log('[workaholic] Cleanup done');

      console.log('[workaholic] Persisting KV on Miniflare');
      const mf = new Miniflare({
        script: `addEventListener("fetch", () => {});`,
        buildCommand: '',
        kvPersist: true,
      });
      const entries = await parseData(path.resolve(process.cwd(), source));
      const config = await getWranglerConfig(root);
      const options = config.getWorkaholicConfig();
      const namespace = await mf.getKVNamespace(options.binding);
      await preview(namespace, entries);
      console.log('[workaholic] KV persisted on Miniflare');
    });

  return command;
}
