import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { start } from '../server.mjs';
import { FixtureClient, sleep, until } from '../client.mjs';

async function fixture(t, transport) {
  await mkdir(resolve('.local'), { recursive: true });
  const directory = await mkdtemp(resolve('.local/test-'));
  const server = await start({ transport, port: 0, database: resolve(directory, 'state.sqlite') });
  const clients = [];
  t.after(async () => {
    await Promise.all(clients.map((client) => client.disconnect()));
    await server.close();
  });
  return { server, directory, clients, client: async () => {
    const client = await FixtureClient.create(server.baseUrl, transport);
    clients.push(client);
    return client;
  } };
}

for (const transport of ['sse', 'socket.io']) {
  for (const capacity of [2, 6]) {
    test(transport + ': permanent capacity ' + capacity + ' rejects the extra member', async (t) => {
      const f = await fixture(t, transport);
      const owner = await f.client();
      const room = await owner.request('/rooms', { capacity });
      assert.equal(room.status, 201);
      const joiners = await Promise.all(Array.from({ length: capacity }, () => f.client()));
      const joins = await Promise.all(joiners.map((client) => client.request('/rooms/join', { code: room.body.code })));
      assert.equal(joins.filter((result) => result.status === 200).length, capacity - 1);
      assert.equal(joins.filter((result) => result.status === 409).length, 1);
      const state = await owner.request('/rooms/' + room.body.id + '/snapshot');
      assert.equal(state.body.members.length, capacity);
      assert.equal(new Set(state.body.members.map((member) => member.identity)).size, capacity);
    });
  }

  test(transport + ': last-slot race, membership authorization, separate room delivery', async (t) => {
    const f = await fixture(t, transport);
    const [owner, racerA, racerB, outsider] = await Promise.all(Array.from({ length: 4 }, () => f.client()));
    const room = (await owner.request('/rooms', { capacity: 2 })).body;
    const raced = await Promise.all([racerA, racerB].map((client) => client.request('/rooms/join', { code: room.code })));
    assert.deepEqual(raced.map((result) => result.status).sort(), [200, 409]);
    const joined = raced[0].status === 200 ? racerA : racerB;
    const other = (await outsider.request('/rooms', { capacity: 2 })).body;
    assert.equal((await outsider.request('/rooms/' + room.id + '/snapshot')).status, 403);
    await Promise.all([owner.connect(room.id), joined.connect(room.id), outsider.connect(other.id)]);
    owner.events = []; joined.events = []; outsider.events = [];
    const chat = await owner.command('chat', { commandId: randomUUID(), text: 'Only this room' });
    assert.equal(chat.ok, true);
    await until(() => joined.events.some((event) => event.message?.text === 'Only this room' || event.state?.chat.some((message) => message.text === 'Only this room')));
    assert.equal(outsider.events.some((event) => event.roomId === room.id || event.state?.roomId === room.id), false);
  });

  test(transport + ': valid movement, bounds, throttle, forged identity and duplicate chat', async (t) => {
    const f = await fixture(t, transport);
    const owner = await f.client();
    const room = (await owner.request('/rooms', { capacity: 2 })).body;
    await owner.connect(room.id);
    assert.equal((await owner.command('move', { commandId: randomUUID(), x: -1, z: 2 })).code, 'INVALID_INPUT');
    assert.equal((await owner.command('move', { commandId: randomUUID(), x: 2, z: 2, identity: randomUUID() })).code, 'FORBIDDEN');
    const move = await owner.command('move', { commandId: randomUUID(), x: 2, z: 2 });
    assert.equal(move.ok, true);
    const burst = await Promise.all(Array.from({ length: 20 }, (_, index) => owner.command('move', { commandId: randomUUID(), x: index % 9, z: 2 })));
    assert.ok(burst.some((result) => result.code === 'RATE_LIMITED'));
    const commandId = randomUUID();
    const first = await owner.command('chat', { commandId, text: 'Persistent text <script>' });
    const replay = await owner.command('chat', { commandId, text: 'Persistent text <script>' });
    const changed = await owner.command('chat', { commandId, text: 'Changed payload' });
    assert.equal(first.ok, true);
    assert.deepEqual(replay, first);
    assert.equal(changed.code, 'COMMAND_ID_REUSED');
    const state = (await owner.request('/rooms/' + room.id + '/snapshot')).body;
    assert.equal(state.chat.length, 1);
    assert.equal(state.chat[0].text, 'Persistent text <script>');
    assert.match(state.chat[0].id, /^[0-9a-f-]{36}$/);
  });

  test(transport + ': reconnect snapshot and real SQLite restart keep durable chat/membership', async (t) => {
    const f = await fixture(t, transport);
    const owner = await f.client();
    const room = (await owner.request('/rooms', { capacity: 2 })).body;
    await owner.connect(room.id);
    await owner.command('move', { commandId: randomUUID(), x: 3, z: 4 });
    await owner.command('chat', { commandId: randomUUID(), text: 'Still here after return' });
    await owner.disconnect();
    await sleep(25);
    await owner.connect(room.id);
    const state = owner.events.findLast((event) => event.type === 'snapshot').state;
    assert.equal(state.chat.length, 1);
    assert.equal(state.members.find((member) => member.identity === owner.identity).position.x, 3);
    await owner.disconnect();
    await f.server.close();
    const restarted = await start({ transport, port: 0, database: resolve(f.directory, 'state.sqlite') });
    t.after(() => restarted.close());
    owner.baseUrl = restarted.baseUrl;
    const recovered = (await owner.request('/rooms/' + room.id + '/snapshot')).body;
    assert.equal(recovered.chat.length, 1);
    assert.equal(recovered.members.length, 1);
    assert.equal(recovered.members[0].online, false);
    assert.equal(recovered.members[0].position.x, 1);
  });
}

test('loopback fixture rejects missing session and cross-origin mutation', async (t) => {
  const f = await fixture(t, 'sse');
  const unknown = await fetch(f.server.baseUrl + '/rooms', { method: 'POST', headers: { Origin: f.server.baseUrl, 'Content-Type': 'application/json' }, body: '{"capacity":2}' });
  assert.equal(unknown.status, 401);
  const origin = await fetch(f.server.baseUrl + '/fixture/session', { method: 'POST', headers: { Origin: 'https://other.invalid' } });
  assert.equal(origin.status, 403);
});
