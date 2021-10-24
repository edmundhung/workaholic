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

    await preview(mf, fixtures, 'test');

    namespace = await mf.getKVNamespace('test');
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

    expect(await client.getData('opus-dicto-spargit')).toEqual(resolveFixture('opus-dicto-spargit'));
    expect(await client.getData('bar/de-hostis-habetur')).toEqual(resolveFixture('bar/de-hostis-habetur'));
    expect(await client.getData('foo/reditum-quater')).toEqual(resolveFixture('foo/reditum-quater'));
  });
});
