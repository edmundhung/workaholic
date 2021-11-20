import type { Entry, SetupBuildFunction, SetupQueryFunction } from './types';

export let setupBuild: SetupBuildFunction = () => {
  return (entries: Entry[]): Record<string, Entry[]> => {
    return {
      assets: entries,
    };
  };
};

export let setupQuery: SetupQueryFunction = () => {
  return query => query;
};
