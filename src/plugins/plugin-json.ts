import type { Entry, SetupBuildFunction } from '../types';

export const setupBuild: SetupBuildFunction = () => {
  return {
    transform(entry: Entry) {
      if (!entry.key.endsWith('.json')) {
        return entry;
      }

      const { metadata, ...data } = JSON.parse(entry.value);

      return {
        key: entry.key.replace(/\.json$/, ''),
        value: JSON.stringify(data),
        metadata,
      };
    },
  };
};
