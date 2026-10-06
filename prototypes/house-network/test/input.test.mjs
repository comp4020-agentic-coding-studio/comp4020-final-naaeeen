import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { start } from '../server.mjs';
import { FixtureClient } from '../client.mjs';

test('HTTP controller rejects non-object JSON as invalid input without creating a room', async (t) => {
  await mkdir(resolve('.local'), { recursive: true });
  const directory = await mkdtemp(resolve('.local/input-'));
  const server = await start({ transport: 'sse', port: 0, database: resolve(directory, 'state.sqlite') });
  t.after(() => server.close());
  const client = await FixtureClient.create(server.baseUrl, 'sse');
  for (const body of [null, [], 'string', 2]) {
    const result = await client.request('/rooms', body);
    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'INVALID_INPUT');
  }
});
