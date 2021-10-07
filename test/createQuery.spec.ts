import createQuery from '../src/createQuery';
import fixtures from './fixtures.json';

interface KV {
  key: string;
  value?: string;
  metadata?: any;
}

function parse(value: string | undefined, type: string): unknown | null {
  if (typeof value === 'undefined') {
    return null;
  }

  try {
    switch (type) {
      // case 'json':
      //   return JSON.parse(value);
      default:
        return value;
    }
  } catch {
    return null;
  }
}

// Simple kv namespace implementation which just covers the usage of createQuery()
function createNamespace(list: KV[]) {
  async function getWithMetadata(key: string, type: string) {
    const kv = list.find(data => data.key === key);

    return {
      value: parse(kv?.value, type) ?? null,
      metadata: kv?.metadata ?? null
    };
  }

  async function get(key: string, type: string) {
    const kv = list.find(data => data.key === key);

    return parse(kv?.value, type) ?? null;
  }

  return {
    get,
    getWithMetadata,
  };
}

describe('createQuery', () => {
  const namespace = createNamespace(fixtures);

  it('creates 3 different queries', () => {
    const query = createQuery({}, namespace);

    expect(query).toHaveProperty('search');
    expect(query).toHaveProperty('list');
    expect(query).toHaveProperty('get');
  });

  it('handles the get query properly', async () => {
    const query = createQuery({}, namespace);
    const resolveFixture = (slug: string) => {
      const kv = fixtures.find(kv => kv.key === `articles#${slug}`);

      return {
        content: kv?.value ?? null,
        metadata: kv?.metadata ?? null,
      };
    };

    expect(await query.get('opus-dicto-spargit')).toEqual(resolveFixture('opus-dicto-spargit'));
    expect(await query.get('bar/de-hostis-habetur')).toEqual(resolveFixture('bar/de-hostis-habetur'));
    expect(await query.get('foo/reditum-quater')).toEqual(resolveFixture('foo/reditum-quater'));
  });

  it('handles the list query properly', async () => {
    const query = createQuery({}, namespace);
    const resolveFixture = (slug: string) => {
      const kv = fixtures.find(kv => kv.key === `articles#${slug}`);

      return {
        slug: kv?.key,
        metadata: kv?.metadata ?? null,
      };
    };

    expect(await query.list('bar')).toEqual([resolveFixture('bar/de-hostis-habetur'), resolveFixture('bar/mulcet-vincere')]);
    expect(await query.list('foo')).toEqual([resolveFixture('foo/reditum-quater'), resolveFixture('foo/versa-colebatur')]);
  });
});
