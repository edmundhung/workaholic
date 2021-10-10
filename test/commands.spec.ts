import { Miniflare } from 'miniflare';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import path from 'path';
import generate from '../src/commands/generate';
import preview from '../src/commands/preview';
import publish from '../src/commands/publish';
import fixtures from './fixtures.json';

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

  it('supports generating entries based on the fixtures', async () => {
    expect(await generate(path.resolve(__dirname, './fixtures'))).toEqual(fixtures);
  });

  it('supports previewing entries on miniflare', async () => {
    const mf = new Miniflare({
      script: `addEventListener("fetch", () => {});`,
      buildCommand: '',
    });

    await preview(mf, fixtures, 'test');

    const namespace = await mf.getKVNamespace('test');

    for (const entry of fixtures) {
      expect(await namespace.getWithMetadata(entry.key)).toEqual({
        value: entry.value,
        metadata: entry.metadata ?? null,
      });
    }
  });

  it('supports publishing entries to cloudflare', async () => {
    const accountId = 'foo';
    const namespaceId = 'bar';
    const token = 'test-token';

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
