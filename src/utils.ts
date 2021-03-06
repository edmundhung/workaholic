import TOML from '@iarna/toml';
import path from 'path';
import fs from 'fs';
import findUp from 'find-up';
import type { Entry, Options } from './types';

export function getRelativePath(source: string, target: string): string {
  return target.replace(source, '').replace(/^\//, '');
}

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

export async function getWranglerDirectory(cwd?: string): Promise<string> {
  const result = await findUp('wrangler.toml', { cwd });

  if (!result) {
    throw new Error('[workaholic] Fail to lookup `wrangler.toml`');
  }

	return path.dirname(result);
}

export async function getWranglerConfig(root: string) {
  const wrangler = await fs.promises.readFile(path.resolve(root, './wrangler.toml'), 'utf-8');
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
    },
    getWorkaholicOptions(): Options {
      const options = config['workaholic'] as any;

      if (!options) {
        throw new Error('[workaholic] options not found; Please initialise with `workaholic init`')
      }

      return options;
    },
  };
}
