import type { Metadata, Article, Reference } from './types';

function createQuery(namespace: KVNamespace) {
  return {
    async listReferences(prefix: string, includeSubfolders = false): Promise<Reference[] | null> {
      const references = await namespace.get<Reference[]>(`references/${prefix}`, 'json');

      if (includeSubfolders) {
        return references;
      }

      return references.filter(ref => !ref.slug.replace(prefix !== '' ? `articles/${prefix}/` : 'articles/', '').includes('/'));
    },
    async getArticle(slug: string): Promise<Article | null> {
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
