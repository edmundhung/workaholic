import { Miniflare } from 'miniflare';
import preview from '../src/commands/preview';
import createQuery from '../src/createQuery';
import fixtures from './fixtures.json';

describe('createQuery', () => {
  let namespace: KVNamespace;

  beforeAll(async () => {
    const mf = new Miniflare({
      script: 'addEventListener("fetch", () => {});',
      buildCommand: '',
    });

    await preview(mf, fixtures, 'test');

    namespace = await mf.getKVNamespace('test');
  });

  it('creates 3 different queries', () => {
    const query = createQuery(namespace);

    expect(query).toHaveProperty('listReferences');
    expect(query).toHaveProperty('getData');
  });

  it('handles the get query properly', async () => {
    const query = createQuery(namespace);
    const resolveFixture = (slug: string) => {
      const kv = fixtures.find(kv => kv.key === `data/${slug}`);

      return {
        content: kv?.value ?? null,
        metadata: kv?.metadata ?? null,
      };
    };

    expect(await query.getData('opus-dicto-spargit')).toEqual(resolveFixture('opus-dicto-spargit'));
    expect(await query.getData('bar/de-hostis-habetur')).toEqual(resolveFixture('bar/de-hostis-habetur'));
    expect(await query.getData('foo/reditum-quater')).toEqual(resolveFixture('foo/reditum-quater'));
  });

  it('handles the list query properly', async () => {
    const query = createQuery(namespace);
    const resolveFixture = (slug: string) => {
      const kv = fixtures.find(kv => kv.key === `data/${slug}`);

      return {
        slug: kv?.key.replace(/^data\//, ''),
        metadata: kv?.metadata ?? null,
      };
    };

    expect(await query.listReferences('bar')).toEqual([resolveFixture('bar/de-hostis-habetur'), resolveFixture('bar/mulcet-vincere')]);
    expect(await query.listReferences('bar', true)).toEqual([resolveFixture('bar/de-hostis-habetur'), resolveFixture('bar/mulcet-vincere')]);
    expect(await query.listReferences('foo')).toEqual([resolveFixture('foo/reditum-quater'), resolveFixture('foo/versa-colebatur')]);
    expect(await query.listReferences('foo', true)).toEqual([resolveFixture('foo/reditum-quater'), resolveFixture('foo/versa-colebatur')]);
    expect(await query.listReferences('')).toEqual([resolveFixture('gemitus-inplicuit'), resolveFixture('inferiusque-peti'), resolveFixture('mensis-quam-timori'), resolveFixture('opus-dicto-spargit')]);
    expect(await query.listReferences('', true)).toEqual([resolveFixture('bar/de-hostis-habetur'), resolveFixture('bar/mulcet-vincere'), resolveFixture('foo/reditum-quater'), resolveFixture('foo/versa-colebatur'), resolveFixture('gemitus-inplicuit'), resolveFixture('inferiusque-peti'), resolveFixture('mensis-quam-timori'), resolveFixture('opus-dicto-spargit')]);
  });
});
