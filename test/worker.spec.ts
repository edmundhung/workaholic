import { Miniflare } from 'miniflare';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import path from 'path';
import build from '../src/commands/build';
import generate from '../src/commands/generate';
import preview from '../src/commands/preview';
import createQuery from '../src/createQuery';
import type { Options, Query } from '../src/types';

async function bootstrap({ site, binding, config }: Partial<Options>) {
  const script = await build({
    basename: site?.basename ?? '',
    binding,
    config,
  });
  const mf = new Miniflare({
    script,
    buildCommand: '',
    kvNamespaces: [binding],
  });
  const entries = await generate({
    source: path.resolve(__dirname, './fixtures'),
    config,
  });
  const kvNamespace = await preview(mf, binding, entries);
  const enhancer = config ? require(config).setupQuery() : null;

  return {
    query: enhancer ? createQuery(kvNamespace, enhancer) : createQuery(kvNamespace),
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

    expect(await request('/assets/sample-json.json')).toEqual([200, await query('assets', 'sample-json.json')]);
    expect(await request('/assets/sample-json.json')).toEqual([200, await query('assets', 'sample-json.json', { type: 'text' })]);
    expect(await request('/assets/sample-json.json?type=json')).toEqual([200, await query('assets', 'sample-json.json', { type: 'json' })]);
    expect(await request('/assets/foo/de-hostis-habetur.md')).toEqual([200, await query('assets', 'foo/de-hostis-habetur.md')]);
    expect(await request('/assets')).toEqual([404, null]);
    expect(await request('/random')).toEqual([404, null]);
    expect(await request('/assets/foo/bar/')).toEqual([404, null]);
  });

  it('works with custom config', async () => {
    const { query, request } = await bootstrap({
      binding: 'TEST2',
      config: path.resolve(__dirname, './fixtures/test-config.js'),
    });

    expect(await request('/assets/sample-json.json')).toEqual([404, null]);
    expect(await request('/test/sample-json.json')).toEqual([200, await query('test', 'sample-json.json')]);
    expect(await request('/foo/de-hostis-habetur.md')).toEqual([200, await query('foo', 'de-hostis-habetur.md')]);
    expect(await request('/foo/de-hostis-habetur.md')).toEqual([200, await query('test', 'foo/de-hostis-habetur.md')]);
  });

  it('works with custom basename', async () => {
    const { query, request, listen } = await bootstrap({
      site: { basename: '/api' },
      binding: 'TEST3',
    });

    expect(await request('/api/assets/sample-json.json')).toEqual([200, await query('assets', 'sample-json.json')]);
    expect(await request('/api/assets')).toEqual([404, null]);
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
      site: { basename: '/foo' },
      binding: 'TEST4',
    });

    expect(await request('/foo')).toEqual([404, null]);
    expect(await request('/bar')).toEqual([418, null]);
  });
});
