import TOML from '@iarna/toml';
import * as fs from 'fs/promises';

async function publish(source: string, binding: string): Promise<void> {
  console.log('[workaholic] Reading wrangler.toml...');
  const wranglerTOML = await fs.readFile('../wrangler.toml', 'utf-8');
  const config = TOML.parse(wranglerTOML);
  const accountId = config['account_id'];
  const kvNamespaces = (config['kv_namespaces'] ?? []) as any[];
  const kv = kvNamespaces.find(namespace => namespace.binding === binding);
  const namespaceId =
    process.env.NODE_ENV === 'production' ? kv?.id : kv?.preview_id;

  console.log(
    `[workaholic] Updating KV with binding "${binding}" for account "${accountId}" and namespace "${namespaceId}"`,
  );

  const content = await fs.readFile(source, 'utf-8');
  const fetch = (url: string, init?: any) =>
    import('node-fetch').then(({ default: fetch }) => fetch(url, init));
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/bulk`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
      },
      body: content,
    },
  );
  const result = await response.text();

  console.log(
    `[workaholic] Update finish with status ${response.status} and result ${result}`,
  );
}

export const command = 'publish <data>';

export const describe = 'Publish kv data to Cloudflare';

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
  await publish(argv.data, argv.binding);
}
