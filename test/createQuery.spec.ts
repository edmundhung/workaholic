import { Miniflare, Response } from 'miniflare';
import * as path from 'path';
import preview from '../src/commands/preview';
import generate from '../src/commands/generate';
import createQuery from '../src/createQuery';
import fixtures from './fixtures.json';
import type { Entry } from '../src/types';

describe('createQuery', () => {
  let namespace: KVNamespace;
  let fixtures: Entry[];

  beforeAll(async () => {
    const mf = new Miniflare({
      script: 'addEventListener("fetch", () => {});',
      buildCommand: '',
    });

    fixtures = await generate({
      source: path.resolve(__dirname, './fixtures'),
    });
    namespace = await preview(mf, 'test', fixtures);
  });

  it('returns the value as text by default', async () => {
    const query = createQuery(namespace);
    const resolveFixture = (slug: string) => {
      const kv = fixtures.find(kv => kv.key === `assets://${slug}`);

      return Buffer.from(kv?.value).toString('utf-8') ?? null;
    };

    expect(await query('assets', 'sample-markdown.md')).toEqual(resolveFixture('sample-markdown.md'));
    expect(await query('assets', 'foo/de-hostis-habetur.md')).toEqual(resolveFixture('foo/de-hostis-habetur.md'));
  });

  it('returns metadata together if specified in the options', async () => {
    const query = createQuery(namespace);
    const resolveFixture = (slug: string) => {
      const kv = fixtures.find(kv => kv.key === `assets://${slug}`);

      return {
        value: Buffer.from(kv?.value).toString('utf-8') ?? null,
        metadata: kv?.metadata ?? null,
      };
    };

    expect(await query('assets', 'sample-yaml.yaml', { metadata: true })).toEqual(resolveFixture('sample-yaml.yaml'));
    expect(await query('assets', 'foo/mulcet-vincere.md', { metadata: true })).toEqual(resolveFixture('foo/mulcet-vincere.md'));
  });

  it('returns value in different type based on the options', async () => {
    const query = createQuery(namespace);
    const resolveFixture = (slug: string) => {
      const kv = fixtures.find(kv => kv.key === `assets://${slug}`);

      return Buffer.from(kv?.value).toString('utf-8') ?? null;
    };

    const streamToString = (stream: ReadableStream): Promise<string> => {
      return new Response(stream).text()
    }

    const text = await query('assets', 'sample-json.json', { type: 'text' })
    const json = await query('assets', 'sample-json.json', { type: 'json' })
    const stream = await query('assets', 'sample-json.json', { type: 'stream' })
    const arrayBuffer = await query('assets', 'sample-json.json', { type: 'arrayBuffer' })

    expect(text).toEqual(resolveFixture('sample-json.json'));
    expect(json).toEqual(JSON.parse(resolveFixture('sample-json.json')));
    expect(await streamToString(stream)).toEqual(resolveFixture('sample-json.json'));
    expect(Buffer.from(arrayBuffer).toString('utf-8')).toEqual(resolveFixture('sample-json.json'));
  });
});
