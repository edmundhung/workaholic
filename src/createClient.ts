import type { Metadata, Data, Client } from './types';

function createClient(namespace: KVNamespace): Client {
  return {
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

export default createClient;
