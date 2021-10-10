import TOML from '@iarna/toml';
import { Command } from 'commander';
import { Response } from 'miniflare';
import fetch from 'node-fetch';
import { Entry } from '../types';
import { parseData, getWranglerConfig } from '../utils';

export default async function publish(entries: Entry[], { accountId, namespaceId, token }: { accountId: string, namespaceId: string, token: string }): Promise<Response> {
  return fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/bulk`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(entries),
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
      const entries = await parseData(soruce);
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
