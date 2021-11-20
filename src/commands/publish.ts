import { Command } from 'commander';
import fetch, { Response } from 'node-fetch';
import path from 'path';
import { Entry } from '../types';
import { parseData, getWranglerConfig, getWranglerDirectory } from '../utils';

export async function publish(entries: Entry[], { accountId, namespaceId, token }: { accountId: string, namespaceId: string, token: string }): Promise<Response> {
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

export default function makePublishCommand(): Command {
  const command = new Command('publish');

  command
    .description('Publish kv data to Cloudflare')
    .argument('<source>', 'source file path')
    .option('--preview', 'publish to the preview namespace instead of production', false)
    .action(async (source, options) => {
      const entries = await parseData(path.resolve(process.cwd(), source));
      console.log('[workaholic] Reading config from wrangler.toml');
      const root = await getWranglerDirectory();
      const config = await getWranglerConfig(root);
      const workaholic = config.getWorkaholicOptions();
      const accountId = config.getAccountId();
      const namespaceId = config.getNamespaceId(workaholic.binding, options.preview);
      const token = process.env.CF_API_TOKEN;

      if (!namespaceId) {
        console.log(`[workaholic] Environemnt variable CF_API_TOKEN is missing;`)
        return;
      }

      if (!token) {
        console.log(`[workaholic] Environemnt variable CF_API_TOKEN is missing;`)
        return;
      }

      console.log(`[workaholic] Updating KV with binding "${workaholic.binding}" for account "${accountId}" and namespace "${namespaceId}"`);
      const response = await publish(entries, { accountId, namespaceId, token });
      const result = await response.text();
      console.log(`[workaholic] Update finish with status ${response.status} and result ${result}`);
    });

  return command;
}
