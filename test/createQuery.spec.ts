import createQuery from '../src/createQuery';
import examples from '../examples.json';

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
      case 'json':
        return JSON.parse(value);
      default:
        return null;
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
  const namespace = createNamespace(examples);

  it('creates 3 different queries', () => {
    const query = createQuery({}, namespace);

    expect(query).toHaveProperty('search');
    expect(query).toHaveProperty('list');
    expect(query).toHaveProperty('get');
  });
});
