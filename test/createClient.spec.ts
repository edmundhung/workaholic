import { Miniflare } from 'miniflare';
import preview from '../src/commands/preview';
import createClient from '../src/createClient';
import fixtures from './fixtures.json';
import { setupClient } from '../src/plugins/plugin-list';

describe('createClient', () => {
  let namespace: KVNamespace;

  beforeAll(async () => {
    const mf = new Miniflare({
      script: 'addEventListener("fetch", () => {});',
      buildCommand: '',
    });

    namespace = await mf.getKVNamespace('test');
    await preview(namespace, fixtures);
  });

  it('provides a default query', () => {
    const client = createClient(namespace);

    expect(client).toHaveProperty('getData');
  });

  it('handles the getData query properly', async () => {
    const client = createClient(namespace);
    const resolveFixture = (slug: string) => {
      const kv = fixtures.find(kv => kv.key === `data/${slug}`);

      return {
        content: kv?.value ?? null,
        metadata: kv?.metadata ?? null,
      };
    };

    expect(await client.getData('sample-markdown.md')).toEqual(resolveFixture('sample-markdown.md'));
    expect(await client.getData('foo/de-hostis-habetur.md')).toEqual(resolveFixture('foo/de-hostis-habetur.md'));
  });
});
