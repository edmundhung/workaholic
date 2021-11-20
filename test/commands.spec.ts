import { Miniflare } from 'miniflare';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import path from 'path';
import build from '../src/commands/build';
import preview from '../src/commands/preview';
import publish from '../src/commands/publish';
import type { Entry } from '../src/types';

function encodeEntry(entry: Entry, encoding: string): Entry {
  return {
    ...entry,
    value: Buffer.from(entry.value).toString(encoding),
    base64: encoding === 'base64',
  };
}

describe('commands', () => {
  const server = setupServer();

  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  })

  afterAll(() => {
    server.close();
  });

  it('supports building entries based on the fixtures', async () => {
    const entries = await build({ source: path.resolve(__dirname, './fixtures') });

    expect(entries.map(entry => encodeEntry(entry, 'utf-8'))).toMatchSnapshot();
  });

  it('supports previewing entries on miniflare', async () => {
    const mf = new Miniflare({
      script: `addEventListener("fetch", () => {});`,
      buildCommand: '',
    });
    const fixtures = await build({ source: path.resolve(__dirname, './fixtures') });
    const namespace = await preview(mf, 'test', fixtures);

    for (const entry of fixtures) {
      expect(await namespace.getWithMetadata(entry.key)).toEqual({
        value: Buffer.from(entry.value).toString('utf-8'),
        metadata: entry.metadata ?? null,
      });
    }
  });

  it('supports publishing entries to cloudflare', async () => {
    const accountId = 'foo';
    const namespaceId = 'bar';
    const token = 'test-token';
    const entries = await build({ source: path.resolve(__dirname, './fixtures') });
    const fixtures = entries.map(entry => encodeEntry(entry, 'base64'));

    server.use(
      rest.put('https://api.cloudflare.com/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId/bulk', (req, res, ctx) => {
        const { accountId, namespaceId } = req.params

        if (req.params.accountId !== accountId || req.params.namespaceId !== namespaceId || req.headers.get('Authorization') !== `Bearer ${token}`) {
          return res(
            ctx.status(400),
          );
        }

        return res(
          ctx.status(200),
          ctx.json(req.body),
        );
      }),
    );
    const response = await publish(fixtures, { accountId, namespaceId, token });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(fixtures);
  });
});
