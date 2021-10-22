import matter from 'gray-matter';
import type { Entry, SetupBuildFunction } from '../types';

export const setupBuild: SetupBuildFunction = () => {
  return {
    transform(entry: Entry) {
      if (!entry.key.endsWith('.yaml') && !entry.key.endsWith('.yml')) {
        return entry;
      }

      const result = matter(['---', entry.value, '---'].join('\n'));
      const { metadata, ...data } = result.data;

      return {
        key: entry.key.replace(/\.(yaml|yml)$/, ''),
        value: JSON.stringify(data),
        metadata,
      };
    },
  };
};
