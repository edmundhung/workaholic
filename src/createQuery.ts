import type { Handler, HandlerFactory, QueryEnhancer, Metadata, Data, Query } from './types';

const defaultEnhancer: QueryEnhancer<Data> = {
  namespace: 'data',
  handlerFactory: namespace => {
    return async (slug): Promise<Data | null> => {
      const data = await namespace.getWithMetadata<Metadata>(`data/${slug}`, 'text');

      if (!data.value && !data.metadata) {
        return null;
      }

      return {
        content: data.value,
        metadata: data.metadata,
      };
    };
  },
};

function createQuery(kvNamespace: KVNamespace, enhancers: QueryEnhancer[] = []): Query {
  const map = new Map<string, Handler>();

  function register(namespace: string, handlerFactory: HandlerFactory) {
    if (map.has(namespace)) {
      throw new Error(`[Workaholic] Namespace collision found: ${namespace}`);
    }

    map.set(namespace, handlerFactory(kvNamespace));
  }

  async function query(namespace: string, path: string, options?: Record<string, any>): Promise<any> {
    const handler = map.get(namespace);

    if (typeof handler === 'undefined') {
      return null;
    }

    return handler(path, options);
  }

  for (const enhancer of [defaultEnhancer, ...enhancers]) {
    register(enhancer.namespace, enhancer.handlerFactory);
  }

  return query;
}

export default createQuery;
