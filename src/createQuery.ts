import type { Metadata, Data, Reference, Query } from './types';

function createQuery(namespace: KVNamespace): Query {
  return {
    async listReferences(prefix: string, includeSubfolders = false): Promise<Reference[] | null> {
      const references = await namespace.get<Reference[]>(`references/${prefix}`, 'json');

      if (!references) {
        return null;
      }

      if (includeSubfolders) {
        return references;
      }

      const level = prefix !== '' ? prefix.split('/').length : 0;

      return references.filter(ref => ref.slug.split('/').length === level + 1);
    },
    async getData(slug: string): Promise<Data | null> {
      const data = await namespace.getWithMetadata<Metadata>(`data/${slug}`, 'text');

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
