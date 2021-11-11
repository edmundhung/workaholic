import { Miniflare } from 'miniflare';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import path from 'path';
import build from '../src/commands/build';
import generate from '../src/commands/generate';
import preview from '../src/commands/preview';
import createQuery from '../src/createQuery';
import type { PluginConfig, Query } from '../src/types';

interface Options {
  binding: string;
  basename?: string;
  plugins?: PluginConfig[];
}

async function bootstrap({ basename, binding, plugins = [] }: Options) {
  const script = await build({
    basename: basename ?? '',
    binding,
    plugins,
  });
  const mf = new Miniflare({
    script,
    buildCommand: '',
    kvNamespaces: [binding],
  });
  const entries = await generate({
    source: path.resolve(__dirname, './fixtures'),
    plugins
  });
  const kvNamespace = await preview(mf, binding, entries);
  const enhancers = plugins
    .map(config => require(config.source))
    .filter(plugin => typeof plugin.setupQuery !== 'undefined')
    .map(plugin => plugin.setupQuery());

  return {
    query: createQuery(kvNamespace, enhancers),
    async request(path: string, init?: RequestInit): [number, any] {
      const response = await mf.dispatchFetch(`http://test.workaholic.site${path}`, init);

      if (response.status !== 200) {
        return [response.status, null];
      }

      return [200, await response.json()];
    },
  };
}

describe('worker', () => {
  const server = setupServer();

  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  })

  afterAll(() => {
    server.close();
  });

  it('maps url the pathname to query and response based on the result', async () => {
    const { query, request } = await bootstrap({
      binding: 'TEST1',
    });

    expect(await request('/data/sample-json.json')).toEqual([200, await query('data', 'sample-json.json')]);
    expect(await request('/data/foo/de-hostis-habetur.md')).toEqual([200, await query('data', 'foo/de-hostis-habetur.md')]);
    expect(await request('/data')).toEqual([404, null]);
    expect(await request('/random')).toEqual([404, null]);
    expect(await request('/data/foo/bar/')).toEqual([404, null]);
  });

  it('works with plugins', async () => {
    const { query, request } = await bootstrap({
      binding: 'TEST2',
      plugins: [
        { source: path.resolve(__dirname, '../src/plugins/plugin-list') },
        { source: path.resolve(__dirname, '../src/plugins/plugin-json') },
      ],
    });

    expect(await request('/list')).toEqual([200, await query('list', '')]);
    expect(await request('/list/foo')).toEqual([200, await query('list', 'foo')]);
    expect(await request('/list/foo?includeSubfolder=yes')).toEqual([200, await query('list', 'foo', { includeSubfolder: true })]);
    expect(await request('/list/bar')).toEqual([404, null]);
  });

  it('works with custom basename', async () => {
    const { query, request, listen } = await bootstrap({
      basename: '/api',
      binding: 'TEST3',
    });

    expect(await request('/api/data/sample-json.json')).toEqual([200, await query('data', 'sample-json.json')]);
    expect(await request('/api/data')).toEqual([404, null]);
  });

  it('forwards the request to the origin if the request url does not match the basename', async () => {
    server.use(
      rest.get('http://test.workaholic.site/foo', (req, res, ctx) => {
        return res(
          ctx.status(400),
          ctx.text(`Bad Request`),
        );
      }),
      rest.get('http://test.workaholic.site/bar', (req, res, ctx) => {
        return res(
          ctx.status(418),
          ctx.text(`I'm a teapot`),
        );
      }),
    );

    const { query, request, listen } = await bootstrap({
      basename: '/foo',
      binding: 'TEST4',
    });

    expect(await request('/foo')).toEqual([404, null]);
    expect(await request('/bar')).toEqual([418, null]);
  });
});
