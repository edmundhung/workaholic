import { Miniflare } from 'miniflare';
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
    builds: plugins.map(config => require(config.source).setupBuild(config.options)),
  });
  const kvNamespace = await preview(mf, binding, entries);

  return {
    query: createQuery(kvNamespace, plugins.map(config => require(config.source).setupQuery()) ?? []),
    async request(path: string, init?: RequestInit): [number, any] {
      const response = await mf.dispatchFetch(`http://localhost${path}`, init);

      if (response.status !== 200) {
        return [response.status, null];
      }

      return [200, await response.json()];
    },
  };
}

describe('worker', () => {
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
      ],
    });

    expect(await request('/references')).toEqual([200, await query('references', '')]);
    expect(await request('/references/foo')).toEqual([200, await query('references', 'foo')]);
    expect(await request('/references/foo?includeSubfolder=yes')).toEqual([200, await query('references', 'foo', { includeSubfolder: true })]);
    expect(await request('/references/bar')).toEqual([404, null]);
  });

  it('works with custom basename', async () => {
    const { query, request } = await bootstrap({
      basename: '/api',
      binding: 'TEST3',
    });

    expect(await request('/api/data/sample-json.json')).toEqual([200, await query('data', 'sample-json.json')]);
    expect(await request('/api/data')).toEqual([404, null]);
    expect(await request('/data/sample-json.json')).toEqual([500, null]);
  });
});
