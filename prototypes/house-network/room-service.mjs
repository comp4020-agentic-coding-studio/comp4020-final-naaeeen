import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const localRoot = fileURLToPath(new URL('./.local/', import.meta.url));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class FixtureError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export function failure(error) {
  if (error instanceof FixtureError) return { ok: false, code: error.code };
  return { ok: false, code: 'INTERNAL_ERROR' };
}
function check(condition, code = 'INVALID_INPUT', status = 400) {
  if (!condition) throw new FixtureError(code, status);
}
function commandInput(payload, keys) {
  check(payload && typeof payload === 'object' && !Array.isArray(payload));
  check(!('identity' in payload) && !('actor' in payload), 'FORBIDDEN', 403);
  check(Object.keys(payload).every((key) => keys.includes(key)));
  check(typeof payload.commandId === 'string' && uuid.test(payload.commandId));
}

/** One shared authority. Sessions, permanent memberships and chat are durable;
 * positions/online counts are process-local. This is a fixture, not production auth. */
export class RoomService {
  constructor(database, { now = () => performance.now() } = {}) {
    this.now = now;
    const path = resolve(database ?? resolve(localRoot, 'spike.sqlite'));
    check(path.startsWith(resolve(localRoot) + sep), 'FIXTURE_DATA_PATH_REQUIRED');
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS sessions (digest TEXT PRIMARY KEY, identity TEXT NOT NULL UNIQUE);
      CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, capacity INTEGER NOT NULL CHECK(capacity BETWEEN 2 AND 6));
      CREATE TABLE IF NOT EXISTS members (room_id TEXT REFERENCES rooms(id), identity TEXT NOT NULL REFERENCES sessions(identity), slot INTEGER NOT NULL, PRIMARY KEY(room_id,identity), UNIQUE(room_id,slot));
      CREATE TABLE IF NOT EXISTS chat (id TEXT PRIMARY KEY, room_id TEXT REFERENCES rooms(id), identity TEXT NOT NULL, command_id TEXT NOT NULL, text TEXT NOT NULL, created_at INTEGER NOT NULL, receipt TEXT NOT NULL, UNIQUE(room_id,identity,command_id));
    `);
    this.subscribers = new Map();
    this.positions = new Map();
    this.sequences = new Map();
    this.moveBuckets = new Map();
    this.acceptedMoves = 0;
    this.rejectedMoves = 0;
    this.closed = false;
  }

  tx(action) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = action(); this.db.exec('COMMIT'); return value; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  issueFixtureSession() {
    check(this.db.prepare('SELECT count(*) AS count FROM sessions').get().count < 128, 'FIXTURE_LIMIT', 429);
    const token = randomBytes(32).toString('hex');
    const identity = randomUUID();
    this.db.prepare('INSERT INTO sessions VALUES (?,?)').run(createHash('sha256').update(token).digest('hex'), identity);
    return { token, identity };
  }

  authenticate(cookie = '') {
    const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('house_fixture='))?.slice(14);
    check(typeof token === 'string' && /^[0-9a-f]{64}$/.test(token), 'UNAUTHENTICATED', 401);
    const session = this.db.prepare('SELECT identity FROM sessions WHERE digest=?').get(createHash('sha256').update(token).digest('hex'));
    check(session, 'UNAUTHENTICATED', 401);
    return session.identity;
  }

  create(identity, capacity) {
    check(Number.isInteger(capacity) && capacity >= 2 && capacity <= 6);
    return this.tx(() => {
      check(this.db.prepare('SELECT count(*) AS count FROM rooms').get().count < 64, 'FIXTURE_LIMIT', 429);
      const room = { id: randomUUID(), code: randomBytes(4).toString('hex').toUpperCase(), capacity };
      this.db.prepare('INSERT INTO rooms VALUES (?,?,?)').run(room.id, room.code, capacity);
      this.db.prepare('INSERT INTO members VALUES (?,?,1)').run(room.id, identity);
      return room;
    });
  }

  join(identity, code) {
    check(typeof code === 'string' && /^[0-9A-F]{8}$/.test(code));
    const room = this.tx(() => {
      const found = this.db.prepare('SELECT * FROM rooms WHERE code=?').get(code);
      check(found, 'ROOM_NOT_FOUND', 404);
      if (this.db.prepare('SELECT slot FROM members WHERE room_id=? AND identity=?').get(found.id, identity)) return found;
      const count = this.db.prepare('SELECT count(*) AS count FROM members WHERE room_id=?').get(found.id).count;
      check(count < found.capacity, 'ROOM_FULL', 409);
      this.db.prepare('INSERT INTO members VALUES (?,?,?)').run(found.id, identity, count + 1);
      return found;
    });
    this.broadcast(room.id, { kind: 'membership', roomId: room.id, sequence: this.next(room.id), members: this.snapshot(identity, room.id).members });
    return room;
  }

  authorize(identity, roomId) {
    check(typeof roomId === 'string' && uuid.test(roomId));
    const member = this.db.prepare('SELECT slot FROM members WHERE room_id=? AND identity=?').get(roomId, identity);
    check(member, 'FORBIDDEN', 403);
    return member;
  }

  next(roomId) {
    const next = (this.sequences.get(roomId) ?? 0) + 1;
    this.sequences.set(roomId, next);
    return next;
  }

  snapshot(identity, roomId) {
    this.authorize(identity, roomId);
    const room = this.db.prepare('SELECT * FROM rooms WHERE id=?').get(roomId);
    const members = this.db.prepare('SELECT identity, slot FROM members WHERE room_id=? ORDER BY slot').all(roomId).map((member) => ({
      ...member,
      position: this.positions.get(roomId + ':' + member.identity) ?? { x: member.slot, z: 1, commandId: null },
      online: (this.subscribers.get(roomId)?.get(member.identity)?.size ?? 0) > 0,
    }));
    const chat = this.db.prepare('SELECT id, identity, command_id AS commandId, text, created_at AS createdAt FROM chat WHERE room_id=? ORDER BY rowid DESC LIMIT 50').all(roomId).reverse();
    return { roomId, code: room.code, capacity: room.capacity, sequence: this.sequences.get(roomId) ?? 0, members, chat };
  }

  subscribe(identity, roomId, deliver) {
    this.authorize(identity, roomId);
    let room = this.subscribers.get(roomId);
    if (!room) { room = new Map(); this.subscribers.set(roomId, room); }
    let subscribers = room.get(identity);
    if (!subscribers) { subscribers = new Set(); room.set(identity, subscribers); }
    subscribers.add(deliver);
    deliver({ snapshot: this.snapshot(identity, roomId) });
    if (subscribers.size === 1) this.broadcast(roomId, { kind: 'presence', roomId, sequence: this.next(roomId), identity, online: true });
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      subscribers.delete(deliver);
      if (!subscribers.size) {
        room.delete(identity);
        this.broadcast(roomId, { kind: 'presence', roomId, sequence: this.next(roomId), identity, online: false });
      }
      if (!room.size) this.subscribers.delete(roomId);
    };
  }

  broadcast(roomId, delta) {
    const room = this.subscribers.get(roomId);
    if (!room) return;
    for (const [identity, subscribers] of room) {
      // Recheck permanent authority for each snapshot delivery.
      const snapshot = this.snapshot(identity, roomId);
      for (const subscriber of subscribers) subscriber({ delta, snapshot });
    }
  }

  move(identity, roomId, payload) {
    this.authorize(identity, roomId);
    commandInput(payload, ['commandId', 'x', 'z']);
    check(Number.isFinite(payload.x) && Number.isFinite(payload.z) && payload.x >= 0 && payload.x <= 10 && payload.z >= 0 && payload.z <= 8);
    const key = roomId + ':' + identity;
    const now = this.now();
    const previous = this.moveBuckets.get(key) ?? { time: now, tokens: 4 };
    // Shared 12/s sustained rate, burst4: tolerate three delayed nominal 10Hz ticks.
    const tokens = Math.min(4, previous.tokens + (now - previous.time) * 12 / 1000);
    if (tokens < 1) {
      this.moveBuckets.set(key, { time: now, tokens });
      this.rejectedMoves++;
      throw new FixtureError('RATE_LIMITED', 429);
    }
    this.moveBuckets.set(key, { time: now, tokens: tokens - 1 });
    const position = { x: payload.x, z: payload.z, commandId: payload.commandId };
    this.positions.set(key, position);
    const sequence = this.next(roomId);
    this.acceptedMoves++;
    this.broadcast(roomId, { kind: 'move', roomId, sequence, identity, position });
    return { ok: true, commandId: payload.commandId, sequence };
  }

  chat(identity, roomId, payload) {
    this.authorize(identity, roomId);
    commandInput(payload, ['commandId', 'text']);
    check(typeof payload.text === 'string' && [...payload.text.trim()].length >= 1 && [...payload.text].length <= 200 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(payload.text));
    const result = this.tx(() => {
      const previous = this.db.prepare('SELECT text, receipt FROM chat WHERE room_id=? AND identity=? AND command_id=?').get(roomId, identity, payload.commandId);
      if (previous) {
        check(previous.text === payload.text, 'COMMAND_ID_REUSED', 409);
        return { receipt: JSON.parse(previous.receipt), changed: false };
      }
      check(this.db.prepare('SELECT count(*) AS count FROM chat WHERE room_id=?').get(roomId).count < 256, 'FIXTURE_LIMIT', 429);
      const message = { id: randomUUID(), identity, commandId: payload.commandId, text: payload.text, createdAt: Date.now() };
      const receipt = { ok: true, commandId: payload.commandId, messageId: message.id };
      this.db.prepare('INSERT INTO chat VALUES (?,?,?,?,?,?,?)').run(message.id, roomId, identity, payload.commandId, payload.text, message.createdAt, JSON.stringify(receipt));
      return { receipt, message, changed: true };
    });
    // Commit precedes both delivery and acknowledgement for both adapters.
    if (result.changed) this.broadcast(roomId, { kind: 'chat', roomId, sequence: this.next(roomId), message: result.message });
    return result.receipt;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.subscribers.clear();
    this.db.close();
  }
}
