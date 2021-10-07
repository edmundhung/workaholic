import Fuse from 'fuse.js';

type Metadata = {
  title: string;
  description: string;
  [key: string]: string | undefined;
}

interface Search {
  entries: Entry[];
  index: {
    keys: readonly string[];
    collection: Fuse.FuseIndexRecords;
  };
}

interface Entry {
  slug: string;
  metadta: Metadata;
};

interface Article {
  content: string | null;
  metadata: Metadata | null;
}

function createQuery(options: Fuse.IFuseOptions<Entry>, namespace: KVNamespace) {
  return {
    async search(keyword: string): Promise<Fuse.FuseResult<Entry>[]> {
      const search = await namespace.get<Search>('search', 'json');

      if (!search) {
        throw new Error('[workaholic] Fails to get the `search` record from KV');
      }

      const index = Fuse.parseIndex<Entry>(search.index)
      const fuse = new Fuse<Entry>(search.entries, options, index);

      return fuse.search(keyword);
    },
    list(prefix: string): Promise<Entry[] | null> {
      return namespace.get<Entry[]>(`entries#${prefix}`, 'json');
    },
    async get(slug: string): Promise<Article | null> {
      const data = await namespace.getWithMetadata<Metadata>(`articles#${slug}`, 'text');

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
