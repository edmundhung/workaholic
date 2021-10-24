
import type { Client, Entry, Metadata, SetupBuildFunction } from '../types';

export interface Reference {
  slug: string;
  metadata: Metadata | null;
}

export interface ListPlugin extends Client {
  listReferences(prefix: string, query: { includeSubfolders?: boolean }): Promise<Reference[] | null>;
}

export const setupBuild: SetupBuildFunction = () => {
  return {
    namespace: 'references',
    derive(entries: Entry[]): Entry[] {
      let referencesByKey: Record<string, Reference[]> = {};

      for (const entry of entries) {
        let key = entry.key;

        while (key !== '') {
          key = key.includes('/') ? key.slice(0, key.lastIndexOf('/')) : '';

          if (typeof referencesByKey[key] === 'undefined') {
            referencesByKey[key] = [];
          }

          referencesByKey[key].push({ slug: entry.key, metadata: entry.metadata ?? null });
        }
      }

      return Object.entries(referencesByKey).map(([key, references]) => ({ key, value: JSON.stringify(references) }));
    },
  };
};

export function setupClient(client: Client, namespace: KVNamespace): Client<ListPlugin> {
  return {
    ...client,
    async listReferences(prefix: string, { includeSubfolders = false } = {}): Promise<Reference[] | null> {
      const references = await namespace.get<Reference[]>(`references/${prefix}`, 'json');

      if (!references) {
        return null;
      }

      if (includeSubfolders) {
        return references;
      }

      const level = prefix !== '' ? prefix.split('/').length : 0;

      return references.filter(ref => ref.slug.split('/').length === level + 1);
    },
  };
}
