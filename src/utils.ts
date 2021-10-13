import TOML from '@iarna/toml';
import fs from 'fs';
import { Entry } from './types';

export async function parseData(source: string): Promise<Entry[]> {
  let entries;

  const content = await fs.promises.readFile(source, 'utf-8');

  try {
    entries = JSON.parse(content);
  } catch (e) {
    entries = null
  }

  if (!Array.isArray(entries)) {
    throw new Error('Invalid data provided; The data source should be a json array');
  }

  return entries;
}

export async function getWranglerConfig() {
  const wrangler = await fs.promises.readFile('../wrangler.toml', 'utf-8');
  const config = TOML.parse(wrangler);

  return {
    getAccountId(): string {
      return config['account_id'].toString();
    },
    getNamespaceId(bindingName: string, preview: boolean): string | null {
      const kvNamespaces = (config['kv_namespaces'] ?? []) as any[];
      const kv = kvNamespaces.find(namespace => namespace.binding === bindingName);

      if (!kv) {
        return null;
      }

      return preview ? kv.preview_id : kv.id;
    }
  };
}
