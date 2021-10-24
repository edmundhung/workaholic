import { Miniflare } from 'miniflare';
import path from 'path';
import generate from '../../src/commands/generate';
import preview from '../../src/commands/preview';
import createClient from '../../src/createClient';
import { setupBuild, setupClient } from '../../src/plugins/plugin-list';
import { Entry } from '../../src/types';

describe('createClient', () => {
  let entries: Entry[];
  let namespace: KVNamespace;

  beforeAll(async () => {
    const mf = new Miniflare({
      script: 'addEventListener("fetch", () => {});',
      buildCommand: '',
    });

    entries = await generate({
      root: __dirname,
      source: path.resolve(__dirname, '../fixtures'),
      builds: [setupBuild()],
    });
    namespace = await mf.getKVNamespace('test');

    await preview(namespace, entries);
  });

  it('inherits default client', () => {
    const client = createClient(namespace);

    expect(setupClient(client)).toMatchObject(client);
  });

  it('handles the list query properly', async () => {
    const client = setupClient(createClient(namespace), namespace);
    const resolveFixture = (slug: string) => {
      const kv = entries.find(kv => kv.key === `data/${slug}`);

      return {
        slug,
        metadata: kv?.metadata ?? null,
      };
    };

    expect(await client.listReferences('bar')).toEqual([resolveFixture('bar/de-hostis-habetur.md'), resolveFixture('bar/mulcet-vincere.md')]);
    expect(await client.listReferences('bar', { includeSubfolders: true })).toEqual([resolveFixture('bar/de-hostis-habetur.md'), resolveFixture('bar/mulcet-vincere.md')]);
    expect(await client.listReferences('foo', { includeSubfolders: false })).toEqual([resolveFixture('foo/reditum-quater.md'), resolveFixture('foo/versa-colebatur.md')]);
    expect(await client.listReferences('foo', { includeSubfolders: true })).toEqual([resolveFixture('foo/reditum-quater.md'), resolveFixture('foo/versa-colebatur.md')]);
    expect(await client.listReferences('')).toEqual([resolveFixture('gemitus-inplicuit.yaml'), resolveFixture('inferiusque-peti.toml'), resolveFixture('mensis-quam-timori.json'), resolveFixture('opus-dicto-spargit.md')]);
    expect(await client.listReferences('', { includeSubfolders: true })).toEqual([resolveFixture('bar/de-hostis-habetur.md'), resolveFixture('bar/mulcet-vincere.md'), resolveFixture('foo/reditum-quater.md'), resolveFixture('foo/versa-colebatur.md'), resolveFixture('gemitus-inplicuit.yaml'), resolveFixture('inferiusque-peti.toml'), resolveFixture('mensis-quam-timori.json'), resolveFixture('opus-dicto-spargit.md')]);
  });
});
