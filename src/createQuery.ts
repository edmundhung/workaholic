import type { Query, QueryEnhancer } from './types';

function createQuery(kvNamespace: KVNamespace, enhancer?: QueryEnhancer): Query {
  function query(namespace: string, slug: string, options: Record<string, any> = {}): Promise<any> {
    const key = `${namespace}://${slug}`;

    if (options.metadata) {
      return kvNamespace.getWithMetadata(key, options.type);
    }

    return kvNamespace.get(key, options.type);
  }

  return enhancer?.(query) ?? query;
}

export default createQuery;
