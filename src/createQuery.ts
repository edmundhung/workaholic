import type { Metadata, Article, Reference } from './types';
import { getRelativePath } from './utils';

function createQuery(namespace: KVNamespace) {
  return {
    async listReferences(prefix: string, includeSubfolders = false): Promise<Reference[] | null> {
      const references = await namespace.get<Reference[]>(`references/${prefix}`, 'json');

      if (!references) {
        return null;
      }

      if (includeSubfolders) {
        return references;
      }

      return references.filter(ref => !getRelativePath(`articles/${prefix}`, ref.slug).includes('/'));
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
