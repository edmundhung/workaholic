import { Miniflare } from 'miniflare';
import path from 'path';
import generate from '../../src/commands/generate';
import preview from '../../src/commands/preview';
import createClient from '../../src/createClient';
import { setupBuild, setupClient } from '../../src/plugins/plugin-list';
import { Entry } from '../../src/types';

describe('plugin-list', () => {
  let entries: Entry[];
  let namespace: KVNamespace;

  beforeAll(async () => {
    const mf = new Miniflare({
      script: 'addEventListener("fetch", () => {});',
      buildCommand: '',
    });

    entries = await generate({
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
    const getReference = async (slug: string) => {
      const data = await client.getData(slug);

      return {
        slug,
        metadata: data?.metadata ?? null,
      };
    };

    expect(await client.listReferences('foo', { includeSubfolders: false })).toEqual([await getReference('foo/de-hostis-habetur.md'), await getReference('foo/mulcet-vincere.md')]);
    expect(await client.listReferences('foo', { includeSubfolders: true })).toEqual([await getReference('foo/de-hostis-habetur.md'), await getReference('foo/mulcet-vincere.md')]);
    expect(await client.listReferences('')).toEqual([await getReference('sample-json.json'), await getReference('sample-markdown.md'), await getReference('sample-toml.toml'), await getReference('sample-yaml.yaml')]);
    expect(await client.listReferences('', { includeSubfolders: true })).toEqual([await getReference('foo/de-hostis-habetur.md'), await getReference('foo/mulcet-vincere.md'), await getReference('sample-json.json'), await getReference('sample-markdown.md'), await getReference('sample-toml.toml'), await getReference('sample-yaml.yaml')]);
  });
});
