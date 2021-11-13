import yaml from 'js-yaml';
import type { Entry, SetupBuildFunction } from '../types';

export const setupBuild: SetupBuildFunction = () => {
  return {
    transform(entry: Entry) {
      if (!entry.key.endsWith('.yaml') && !entry.key.endsWith('.yml')) {
        return entry;
      }

      return {
        key: entry.key.replace(/\.(yaml|yml)$/, '.json'),
        value: JSON.stringify(yaml.load(entry.value)),
      };
    },
  };
};
