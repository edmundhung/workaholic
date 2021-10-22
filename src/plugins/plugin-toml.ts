import TOML from '@iarna/toml';
import type { Entry, SetupBuildFunction } from '../types';

export const setupBuild: SetupBuildFunction = () => {
  return {
    transform(entry: Entry) {
      if (!entry.key.endsWith('.toml')) {
        return entry;
      }

      const { metadata, ...data } = TOML.parse(entry.value);

      return {
        key: entry.key.replace(/\.toml$/, ''),
        value: JSON.stringify(data),
        metadata: metadata as any,
      };
    },
  };
};
