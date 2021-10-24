import yaml from 'js-yaml';
import type { Entry, SetupBuildFunction } from '../types';

export const setupBuild: SetupBuildFunction = () => {
  return {
    transform(entry: Entry) {
      if (!entry.key.endsWith('.yaml') && !entry.key.endsWith('.yml')) {
        return entry;
      }

      const { metadata, ...data } = yaml.load(entry.value) as any;

      return {
        key: entry.key.replace(/\.(yaml|yml)$/, ''),
        value: JSON.stringify(data),
        metadata,
      };
    },
  };
};
