import { createQuery } from '../src';
import type { QueryEnhancer } from '../src/types';

interface CreateRequestHandlerOptions {
  basename: string;
  enhancers?: QueryEnhancer[];
}

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

export function createRequestHandler(KVNamespace: KVNamespace, { basename, enhancers = [] }: CreateRequestHandlerOptions) {
  return async (request: Request): Promise<Response> => {
    let response: Response;

    try {
      const { pathname, searchParams } = new URL(request.url);

      if (pathname.startsWith(basename)) {
        const base = basename.endsWith('/') ? basename : `${basename}/`;
        const [namespace, ...paths] = pathname.slice(base.length).split('/');
        const path = paths.join('/');
        const options = parseSearchParams(searchParams);
        const query = createQuery(KVNamespace, enhancers);
        const result = await query(namespace, path, options);

        if (result !== null) {
          response = new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
          response = new Response('Not found', { status: 404 });
        }
      } else {
        response = await fetch(request);
      }
    } catch (error) {
      response = new Response('Internal Server Error', { status: 500 });
    }

    return response;
  }
}
