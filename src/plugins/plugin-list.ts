
import type { Query, Entry, Metadata, SetupBuildFunction, SetupQueryFunction } from '../types';

export interface Reference {
  slug: string;
  metadata: Metadata | null;
}

export const setupBuild: SetupBuildFunction = () => {
  return {
    index(entries: Entry[]): Entry[] {
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

export const setupQuery: SetupQueryFunction<Reference[]> = () => {
  return kvNamespace => async (namespace: string, path: string, { includeSubfolders }) => {
    const references = await kvNamespace.get<Reference[]>(`${namespace}/${path}`, 'json');

    if (!references) {
      return null;
    }

    if (includeSubfolders) {
      return references;
    }

    const level = path !== '' ? path.split('/').length : 0;

    return references.filter(ref => ref.slug.split('/').length === level + 1);
  };
}
