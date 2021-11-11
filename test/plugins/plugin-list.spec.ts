import { Miniflare } from 'miniflare';
import path from 'path';
import generate from '../../src/commands/generate';
import preview from '../../src/commands/preview';
import createQuery from '../../src/createQuery';
import { setupQuery } from '../../src/plugins/plugin-list';
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
      plugins: [
        { source: path.resolve(__dirname, '../../src/plugins/plugin-list') },
      ],
    });
    namespace = await preview(mf, 'test', entries);
  });

  it('handles the references query properly', async () => {
    const query = createQuery(namespace, [setupQuery()]);
    const getReference = async (slug: string) => {
      const data = await query('data', slug);

      return {
        slug,
        metadata: data?.metadata ?? null,
      };
    };

    expect(await query('list', 'foo', { includeSubfolders: false })).toEqual([await getReference('foo/de-hostis-habetur.md'), await getReference('foo/mulcet-vincere.md')]);
    expect(await query('list', 'foo', { includeSubfolders: true })).toEqual([await getReference('foo/de-hostis-habetur.md'), await getReference('foo/mulcet-vincere.md')]);
    expect(await query('list', '')).toEqual([await getReference('sample-json.json'), await getReference('sample-markdown.md'), await getReference('sample-toml.toml'), await getReference('sample-yaml.yaml')]);
    expect(await query('list', '', { includeSubfolders: true })).toEqual([await getReference('foo/de-hostis-habetur.md'), await getReference('foo/mulcet-vincere.md'), await getReference('sample-json.json'), await getReference('sample-markdown.md'), await getReference('sample-toml.toml'), await getReference('sample-yaml.yaml')]);
  });
});
