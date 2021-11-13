import { Miniflare } from 'miniflare';
import path from 'path';
import generate from '../../src/commands/generate';
import preview from '../../src/commands/preview';
import createQuery from '../../src/createQuery';
import { setupBuild } from '../../src/plugins/plugin-yaml';
import { Entry } from '../../src/types';
import data from '../fixtures/sample-json.json';

describe('plugin-yaml', () => {
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
        { source: path.resolve(__dirname, '../../src/plugins/plugin-yaml') },
      ],
    });
    namespace = await preview(mf, 'test', entries);
  });

  it('transforms data by parsing yaml content', async () => {
    const query = createQuery(namespace);

    expect(await query('data', 'sample-yaml.json')).toEqual({
      value: JSON.stringify(data),
      metadata: null,
    });
  });
});
