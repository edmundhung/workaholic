import TOML from '@iarna/toml';
import { Command } from 'commander';
import * as fs from 'fs/promises';
import { Response } from 'miniflare';

async function getWranglerConfig() {
  const wrangler = await fs.readFile('../wrangler.toml', 'utf-8');
  const config = TOML.parse(wrangler);

  return {
    getAccountId(): string {
      return config['account_id'];
    },
    getNamespaceId(bindingName: string, preview: boolean): string | null {
      const kvNamespaces = (config['kv_namespaces'] ?? []) as any[];
      const kv = kvNamespaces.find(namespace => namespace.binding === binding);

      if (!kv) {
        return null;
      }

      return preview ? kv.preview_id : kv.id;
    }
  };
}

export default async function publish(entries: string, { accountId, namespaceId, token }: { accountId: string, namespaceId: string, token: string }): Promise<Response> {
  const fetch = (url: string, init?: any) =>
    import('node-fetch').then(({ default: fetch }) => fetch(url, init));
  return fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/bulk`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: entries,
    },
  );
}

export function makePublishCommand(): Command {
  const command = new Command('publish');

  command
    .description('Publish kv data to Cloudflare')
    .argument('<data>', 'data soruce')
    .option('--binding <name>', 'wrangler binding name')
    .action(async (source, bindingName) => {
      const entries = await fs.readFile(source, 'utf-8');
      console.log('[workaholic] Reading config from wrangler.toml');
      const { getAccountId, getNamespaceId } = await getWranglerConfig();
      const accountId = getAccountId();
      const namespaceId = getNamespaceId(bindingName, process.env.NODE_ENV !== 'production');
      console.log(`[workaholic] Updating KV with binding "${bindingName}" for account "${config['account_id']}" and namespace "${namespaceId}"`);
      const response = await publish(entries, { accountId, namespaceId, token });
      const result = await response.text();
      console.log(`[workaholic] Update finish with status ${response.status} and result ${result}`);
    });

  return command;
}
