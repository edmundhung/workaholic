import { Miniflare } from 'miniflare';
import path from 'path';
import generate from '../../src/commands/generate';
import preview from '../../src/commands/preview';
import createQuery from '../../src/createQuery';
import { setupBuild } from '../../src/plugins/plugin-json';
import { Entry } from '../../src/types';
import data from '../fixtures/sample-json.json';

describe('plugin-json', () => {
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
    namespace = await preview(mf, 'test', entries);
  });

  it('transforms data by parsing json content', async () => {
    const query = createQuery(namespace);
    const { metadata, ...value } = data;

    expect(await query('data', 'sample-json')).toEqual({
      value: JSON.stringify(value),
      metadata,
    });
  });
});
