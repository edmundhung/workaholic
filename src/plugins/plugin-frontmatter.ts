import matter from 'gray-matter';
import type { Entry, SetupBuildFunction } from '../types';

export const setupBuild: SetupBuildFunction = () => {
  return {
    transform(entry: Entry) {
      if (!entry.key.endsWith('.md')) {
        return entry;
      }

      const result = matter(entry.value);

      return {
        key: entry.key,
        value: result.content?.trim() ?? '',
        metadata: result.data,
      };
    },
  };
};
