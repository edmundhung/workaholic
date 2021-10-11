import Fuse from 'fuse.js';
import type { Metadata, Search, Article, Reference } from './types';

function createQuery(options: Fuse.IFuseOptions<Reference>, namespace: KVNamespace) {
  return {
    async search(keyword: string): Promise<Fuse.FuseResult<Reference>[]> {
      const search = await namespace.get<Search>('search', 'json');

      if (!search) {
        throw new Error('[workaholic] Fails to get the `search` record from KV');
      }

      const index = Fuse.parseIndex<Reference>(search.index)
      const fuse = new Fuse<Reference>(search.references, options, index);

      return fuse.search(keyword);
    },
    list(prefix: string): Promise<Reference[] | null> {
      return namespace.get<Reference[]>(`references/${prefix}`, 'json');
    },
    async get(slug: string): Promise<Article | null> {
      const data = await namespace.getWithMetadata<Metadata>(`articles/${slug}`, 'text');

      if (!data.value && !data.metadata) {
        return null;
      }

      return {
        content: data.value,
        metadata: data.metadata,
      };
    },
  }
}

export default createQuery;
