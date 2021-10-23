
import type { Reference, Entry, SetupBuildFunction } from '../types';

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
