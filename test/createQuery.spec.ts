import { Miniflare } from 'miniflare';
import preview from '../src/commands/preview';
import createQuery from '../src/createQuery';
import fixtures from './fixtures.json';
import { setupClient } from '../src/plugins/plugin-list';

describe('createQuery', () => {
  let namespace: KVNamespace;

  beforeAll(async () => {
    const mf = new Miniflare({
      script: 'addEventListener("fetch", () => {});',
      buildCommand: '',
    });

    namespace = await preview(mf, 'test', fixtures);
  });

  it('returns data by the file path', async () => {
    const query = createQuery(namespace);
    const resolveFixture = (slug: string) => {
      const kv = fixtures.find(kv => kv.key === `data/${slug}`);

      return {
        content: kv?.value ?? null,
        metadata: kv?.metadata ?? null,
      };
    };

    expect(await query('data', 'sample-markdown.md')).toEqual(resolveFixture('sample-markdown.md'));
    expect(await query('data', 'foo/de-hostis-habetur.md')).toEqual(resolveFixture('foo/de-hostis-habetur.md'));
  });
});
