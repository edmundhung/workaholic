import { Miniflare } from 'miniflare';
import path from 'path';
import generate from '../../src/commands/generate';
import preview from '../../src/commands/preview';
import createClient from '../../src/createClient';
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
    namespace = await mf.getKVNamespace('test');

    await preview(namespace, entries);
  });

  it('transforms data by parsing json content', async () => {
    const client = createClient(namespace);
    const { metadata, ...content } = data;

    expect(await client.getData('sample-json')).toEqual({
      content: JSON.stringify(content),
      metadata,
    });
  });
});