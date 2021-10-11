import type { Metadata, Article, Reference } from './types';

function createQuery(namespace: KVNamespace) {
  return {
    async list(prefix: string): Promise<Reference[] | null> {
      const references = await namespace.get<Reference[]>(`references/${prefix}`, 'json');

      return references;
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
