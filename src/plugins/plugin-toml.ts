import TOML from '@iarna/toml';
import type { Entry, SetupBuildFunction } from '../types';

export const setupBuild: SetupBuildFunction = () => {
  return {
    transform(entry: Entry) {
      if (!entry.key.endsWith('.toml')) {
        return entry;
      }

      return {
        key: entry.key.replace(/\.toml$/, '.json'),
        value: JSON.stringify(TOML.parse(entry.value)),
      };
    },
  };
};
