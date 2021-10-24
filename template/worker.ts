import { createQuery } from '../src';
import type { QueryEnhancer } from '../src/types';

function parseSearchParams(search: URLSearchParams): Record<string, string | string[]> {
  return [...search.entries()].reduce((result, [key, value]) => {
    if (result.hasOwnProperty(key)) {
      result[key] = [].concat(result[key], value);
    } else {
      result[key] = value;
    }

   return result;
   }, {});
}

export function createRequestHandler(KVNamespace: KVNamespace, enhancers: QueryEnhancer[] = []) {
  return async (request: Request): Promise<Response> => {
    let response: Response;

    try {
      const url = new URL(request.url);
      const [, namespace, ...paths] = url.pathname.split('/');
      const path = paths.join('/');
      const options = parseSearchParams(url.searchParams);
      const query = createQuery(KVNamespace, enhancers);
      const result = await query(namespace, path, options);

      if (result !== null) {
        response = new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
        response = new Response('Not found', { status: 404 });
      }
    } catch (error) {
      response = new Response('Internal Server Error', { status: 500 });
    }

    return response;
  }
}
