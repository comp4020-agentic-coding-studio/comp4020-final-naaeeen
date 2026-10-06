import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RoomService } from '../room-service.mjs';

test('shared limiter accepts nominal 10Hz ticks after a bounded 300ms delivery pause, but rejects excess', async (t) => {
  await mkdir(resolve('.local'), { recursive: true });
  const directory = await mkdtemp(resolve('.local/throttle-'));
  let now = 0;
  const service = new RoomService(resolve(directory, 'state.sqlite'), { now: () => now });
  t.after(() => service.close());
  const session = service.issueFixtureSession();
  const room = service.create(session.identity, 2);
  const move = () => service.move(session.identity, room.id, { commandId: randomUUID(), x: 2, z: 3 });
  for (const due of [0, 100, 200, 300, 400, 500, 600, 950, 950, 950, 1000]) {
    now = due;
    assert.equal(move().ok, true);
  }
  const burst = [];
  for (let index = 0; index < 20; index++) {
    try { burst.push(move()); } catch (error) { burst.push({ code: error.code }); }
  }
  assert.ok(burst.some((result) => result.code === 'RATE_LIMITED'));
});
