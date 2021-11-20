import { Command } from 'commander';
import { Miniflare } from 'miniflare';
import path from 'path';
import rimraf from 'rimraf';
import { Entry } from '../types';
import { parseData, getWranglerConfig, getWranglerDirectory } from '../utils';

export default async function preview(mf: Miniflare, binding: string, entries: Entry[]): Promise<KVNamespace> {
  const kvNamespace = await mf.getKVNamespace(binding);

  await Promise.all(
    entries.map(entry =>
      kvNamespace.put(entry.key, typeof entry.value !== 'string' ? Buffer.from(entry.value).buffer : entry.value, { metadata: entry.metadata }),
    ),
  );

  return kvNamespace;
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
      const options = config.getWorkaholicOptions();
      await preview(mf, options.binding, entries);
      console.log('[workaholic] KV persisted on Miniflare');
    });

  return command;
}
