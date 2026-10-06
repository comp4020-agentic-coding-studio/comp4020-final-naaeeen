import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { validatePlacements } from "../public/house-geometry.js";
import { HouseError } from "./house-contract.ts";
import type { Bedroom, Card, Chat, Colour, Home, HouseCommand, HouseIdentity, HouseReceipt, HouseSnapshot, Me, Placement, Profile, Resident } from "./house-contract.ts";

export const HOUSE_SESSION_SECONDS = 30 * 24 * 60 * 60;
const CHAT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const COLOURS: readonly string[] = ["amber", "sage", "rose", "blue", "lavender", "peach"];
const TYPES = ["house.create", "house.join", "profile.set", "chat.send", "room.configure", "room.placements", "card.save", "card.close", "house.transfer", "house.leave", "house.remove", "house.reinstate"];
type IdentityRow = { id: string; name: string; colour: Colour; revision: number };
type HomeRow = { id: string; capacity: number; owner_id: string; code: string | null; status: string };
type Membership = HomeRow & { slot: number; bedroom_id: string };
type RoomRow = { id: string; house_id: string; owner_id: string; slot: number; revision: number; open: number; palette: Colour; placements: string; archived: number };
type CardRow = { id: string; house_id: string; author_id: string; small_goal: string; question: string; resource_url: string; next_step: string; help_requested: number; state: Card["state"]; revision: number; inactive_sequence: number | null };
type ReceiptRow = { command_hash: string; response: string; room_id: string | null };
type Outcome = { streamId: string; entityRevision: number; result?: Record<string, unknown>; roomId?: string; sequence?: number };

export function houseSessionDigest(token: string): string { return createHash("sha256").update(token).digest("hex"); }
function fail(code: string, message: string): never { throw new HouseError(code, message); }
function storageError(error: unknown): never {
  if (error instanceof HouseError) throw error;
  return fail("STORAGE_UNAVAILABLE", "The saved house is temporarily unavailable. Please retry.");
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return fail("INVALID_INPUT", "Expected a command object.");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: readonly string[], required: readonly string[] = []): void {
  if (Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key))) fail("INVALID_INPUT", "The command contains missing or unsupported fields.");
}
function text(value: unknown, max: number, required = false): string {
  if (typeof value !== "string" || [...value].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return fail("INVALID_INPUT", "Text is missing or exceeds its limit.");
  const normalized = value.trim();
  if (required && !normalized) return fail("INVALID_INPUT", "Enter the required text.");
  return normalized;
}
function colour(value: unknown): Colour {
  if (typeof value !== "string" || !COLOURS.includes(value)) return fail("INVALID_INPUT", "Choose a supported colour.");
  return value as Colour;
}
function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) return fail("INVALID_INPUT", "A valid UUID is required.");
  return value.toLowerCase();
}
function revision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) return fail("INVALID_INPUT", "A non-negative revision is required.");
  return value as number;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const v = record(value);
    return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
  }
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return JSON.stringify(value);
  return fail("INVALID_INPUT", "The command must contain JSON values.");
}
function parseCommand(value: unknown): HouseCommand {
  const c = record(value);
  keys(c, ["commandId", "type", "expectedRevision", "payload", "houseId"], ["commandId", "type", "payload"]);
  const commandId = uuid(c.commandId);
  if (Object.hasOwn(c, "houseId")) uuid(c.houseId);
  if (typeof c.type !== "string" || !TYPES.includes(c.type)) return fail("INVALID_INPUT", "Unknown house action.");
  if (Object.hasOwn(c, "expectedRevision")) revision(c.expectedRevision);
  record(c.payload);
  // Canonicalisation also rejects non-JSON nested values before any state changes.
  canonical(c);
  return { ...c, commandId } as unknown as HouseCommand;
}
function profile(row: IdentityRow): Profile { return { id: row.id, name: row.name, colour: row.colour, revision: row.revision }; }
function home(row: HomeRow): Home { return { id: row.id, capacity: row.capacity, ownerId: row.owner_id, code: row.code! }; }
function room(row: RoomRow): Bedroom { return { id: row.id, ownerId: row.owner_id, revision: row.revision, open: row.open === 1, palette: row.palette, placements: JSON.parse(row.placements) as Placement[] }; }
function card(row: CardRow): Card { return { id: row.id, authorId: row.author_id, smallGoal: row.small_goal, question: row.question, resourceUrl: row.resource_url, nextStep: row.next_step, helpRequested: row.help_requested === 1, state: row.state, revision: row.revision }; }

/** One SQLite authority. State, zone cursor and receipt are committed before execute returns. */
export class HouseStore {
  readonly db!: DatabaseSync;
  private closed = false;
  constructor(path: string) {
    try { this.db = new DatabaseSync(path); }
    catch (error) { return storageError(error); }
    try {
      this.db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;");
      const version = (this.db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
      if (version !== 0 && version !== 1) fail("STORAGE_UNAVAILABLE", "Unsupported house database version.");
      if (version === 0) this.transaction(() => this.db.exec(`
        CREATE TABLE identities (id TEXT PRIMARY KEY, name TEXT NOT NULL, colour TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE sessions (token_digest TEXT PRIMARY KEY, identity_id TEXT NOT NULL REFERENCES identities(id), expires_at INTEGER NOT NULL);
        CREATE TABLE recovery (proof_digest TEXT PRIMARY KEY, identity_id TEXT NOT NULL UNIQUE REFERENCES identities(id));
        CREATE TABLE houses (id TEXT PRIMARY KEY, capacity INTEGER NOT NULL CHECK(capacity BETWEEN 2 AND 6), owner_id TEXT NOT NULL REFERENCES identities(id), code TEXT UNIQUE, status TEXT NOT NULL CHECK(status IN ('active','archived')));
        CREATE TABLE members (house_id TEXT NOT NULL REFERENCES houses(id), identity_id TEXT NOT NULL REFERENCES identities(id), slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 5), bedroom_id TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('active','left','removed')), PRIMARY KEY(house_id,identity_id));
        CREATE UNIQUE INDEX members_one_home ON members(identity_id) WHERE status='active';
        CREATE UNIQUE INDEX members_one_slot ON members(house_id,slot) WHERE status='active';
        CREATE TABLE bedrooms (id TEXT PRIMARY KEY, house_id TEXT NOT NULL REFERENCES houses(id), owner_id TEXT NOT NULL REFERENCES identities(id), slot INTEGER NOT NULL, revision INTEGER NOT NULL DEFAULT 0, open INTEGER NOT NULL DEFAULT 0 CHECK(open IN (0,1)), palette TEXT NOT NULL, placements TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)));
        CREATE UNIQUE INDEX bedrooms_one_active ON bedrooms(house_id,owner_id) WHERE archived=0;
        CREATE TABLE removed_guards (house_id TEXT NOT NULL REFERENCES houses(id), identity_id TEXT NOT NULL REFERENCES identities(id), PRIMARY KEY(house_id,identity_id));
        CREATE TABLE streams (id TEXT PRIMARY KEY, sequence INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE chat (id TEXT PRIMARY KEY, zone_id TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES identities(id), name TEXT NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL, sequence INTEGER NOT NULL);
        CREATE INDEX chat_zone_sequence ON chat(zone_id,sequence);
        CREATE TABLE cards (id TEXT PRIMARY KEY, house_id TEXT NOT NULL REFERENCES houses(id), author_id TEXT NOT NULL REFERENCES identities(id), small_goal TEXT NOT NULL, question TEXT NOT NULL, resource_url TEXT NOT NULL, next_step TEXT NOT NULL, help_requested INTEGER NOT NULL CHECK(help_requested IN (0,1)), state TEXT NOT NULL CHECK(state IN ('active','closed','ownerLeft')), revision INTEGER NOT NULL, inactive_sequence INTEGER);
        CREATE UNIQUE INDEX cards_one_active ON cards(house_id,author_id) WHERE state='active';
        CREATE INDEX cards_inactive ON cards(house_id,state,inactive_sequence,id);
        CREATE TABLE archives (id TEXT PRIMARY KEY, identity_id TEXT NOT NULL REFERENCES identities(id), house_id TEXT NOT NULL REFERENCES houses(id), room TEXT NOT NULL, cards TEXT NOT NULL, at INTEGER NOT NULL);
        CREATE TABLE receipts (actor_id TEXT NOT NULL REFERENCES identities(id), command_id TEXT NOT NULL, command_hash TEXT NOT NULL, response TEXT NOT NULL, room_id TEXT, PRIMARY KEY(actor_id,command_id));
        PRAGMA user_version=1;
      `));
      this.transaction(() => this.db.prepare("DELETE FROM chat WHERE at<?").run(Date.now() - CHAT_RETENTION_MS));
      this.db.prepare("SELECT id FROM identities LIMIT 1").get();
    } catch (error) { this.closed = true; this.db.close(); storageError(error); }
  }

  private transaction<T>(action: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = action(); this.db.exec("COMMIT"); return result; }
    catch (error) { try { this.db.exec("ROLLBACK"); } catch { /* Preserve the original cause. */ } throw error; }
  }
  private identity(id: string): IdentityRow {
    const row = this.db.prepare("SELECT * FROM identities WHERE id=?").get(id) as IdentityRow | undefined;
    return row ?? fail("FORBIDDEN", "A current house identity is required.");
  }
  private active(id: string): Membership | undefined {
    return this.db.prepare("SELECT h.*,m.slot,m.bedroom_id FROM members m JOIN houses h ON h.id=m.house_id WHERE m.identity_id=? AND m.status='active' AND h.status='active'").get(id) as Membership | undefined;
  }
  private requireHome(id: string): Membership { return this.active(id) ?? fail("FORBIDDEN", "Current house membership is required."); }
  private requireOwner(id: string, h: HomeRow): void { if (h.owner_id !== id) fail("FORBIDDEN", "Only the house owner can administer membership."); }
  private requireRevision(expected: unknown, actual: number): void { if (revision(expected) !== actual) fail("REVISION_CONFLICT", "This item changed. Keep your draft and reread the saved state."); }
  private bedroom(id: string): RoomRow {
    return this.db.prepare("SELECT * FROM bedrooms WHERE id=? AND archived=0").get(id) as RoomRow | undefined ?? fail("FORBIDDEN", "This bedroom is unavailable.");
  }
  private access(id: string, roomId: string): RoomRow {
    const h = this.requireHome(id), r = this.bedroom(roomId);
    if (r.house_id !== h.id || (r.owner_id !== id && r.open !== 1)) fail("FORBIDDEN", "This bedroom is closed or belongs to another house.");
    return r;
  }
  private sequence(streamId: string): number {
    const row = this.db.prepare("SELECT sequence FROM streams WHERE id=?").get(streamId) as { sequence: number } | undefined;
    return row?.sequence ?? 0;
  }
  private bump(streamId: string): number {
    this.db.prepare("INSERT INTO streams(id,sequence) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET sequence=sequence+1").run(streamId);
    return this.sequence(streamId);
  }
  private setProfile(id: string, payload: Record<string, unknown>): number {
    const name = text(payload.name, 40, true), nextColour = colour(payload.colour);
    this.db.prepare("UPDATE identities SET name=?,colour=?,revision=revision+1 WHERE id=?").run(name, nextColour, id);
    return this.identity(id).revision;
  }
  private newCode(excluding?: string): string {
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    for (let attempt = 0; attempt < 32; attempt++) {
      let bits = BigInt("0x" + randomBytes(5).toString("hex")), code = "";
      for (let i = 0; i < 8; i++) { code = alphabet[Number(bits & 31n)] + code; bits >>= 5n; }
      if (code !== excluding && !this.db.prepare("SELECT id FROM houses WHERE code=?").get(code)) return code;
    }
    return fail("STORAGE_UNAVAILABLE", "A unique invitation could not be allocated. Please retry.");
  }
  private claim(id: string, h: HomeRow, slot: number): string {
    const roomId = randomUUID();
    this.db.prepare("INSERT INTO bedrooms(id,house_id,owner_id,slot,palette,placements) VALUES (?,?,?,?,?,?)").run(roomId, h.id, id, slot, this.identity(id).colour, "[]");
    this.db.prepare("INSERT INTO members(house_id,identity_id,slot,bedroom_id,status) VALUES (?,?,?,?,'active') ON CONFLICT(house_id,identity_id) DO UPDATE SET slot=excluded.slot,bedroom_id=excluded.bedroom_id,status='active'").run(h.id, id, slot, roomId);
    this.db.prepare("INSERT INTO streams(id,sequence) VALUES (?,0)").run("bedroom:" + roomId);
    return roomId;
  }
  ready(): boolean {
    try { if (this.closed) return false; this.db.prepare("SELECT id FROM identities LIMIT 1").get(); return true; } catch { return false; }
  }
  close(): void { if (!this.closed) { this.closed = true; this.db.close(); } }

  ensureSession(token?: string): HouseIdentity {
    try {
      if (token && TOKEN.test(token)) {
        const digest = houseSessionDigest(token), existing = this.session(digest);
        if (existing) return { id: existing.id, token, digest, created: false };
      }
      return this.transaction(() => {
        const id = randomUUID(), nextToken = randomBytes(32).toString("base64url"), digest = houseSessionDigest(nextToken);
        this.db.prepare("INSERT INTO identities(id,name,colour) VALUES (?,'Study friend','amber')").run(id);
        this.db.prepare("INSERT INTO sessions(token_digest,identity_id,expires_at) VALUES (?,?,?)").run(digest, id, Date.now() + HOUSE_SESSION_SECONDS * 1000);
        return { id, token: nextToken, digest, created: true };
      });
    } catch (error) { return storageError(error); }
  }
  session(digest: string): { id: string } | undefined {
    try {
      const row = this.db.prepare("SELECT identity_id FROM sessions WHERE token_digest=? AND expires_at>?").get(digest, Date.now()) as { identity_id: string } | undefined;
      return row ? { id: row.identity_id } : undefined;
    } catch (error) { return storageError(error); }
  }
  me(id: string): Me {
    try { return this.transaction(() => {
      const h = this.active(id), count = this.db.prepare("SELECT COUNT(*) AS count FROM archives WHERE identity_id=?").get(id) as { count: number };
      return { identity: profile(this.identity(id)), home: h ? home(h) : null, archiveCount: count.count };
    }); } catch (error) { return storageError(error); }
  }
  issueRecovery(id: string): string {
    try { return this.transaction(() => {
      this.identity(id); const proof = randomBytes(32).toString("base64url");
      this.db.prepare("DELETE FROM recovery WHERE identity_id=?").run(id);
      this.db.prepare("INSERT INTO recovery(proof_digest,identity_id) VALUES (?,?)").run(houseSessionDigest(proof), id);
      return proof;
    }); } catch (error) { return storageError(error); }
  }
  recover(proof: string): HouseIdentity {
    try {
      if (typeof proof !== "string" || !TOKEN.test(proof)) fail("FORBIDDEN", "The recovery proof is invalid or already used.");
      return this.transaction(() => {
        const row = this.db.prepare("SELECT identity_id FROM recovery WHERE proof_digest=?").get(houseSessionDigest(proof)) as { identity_id: string } | undefined;
        if (!row) fail("FORBIDDEN", "The recovery proof is invalid or already used.");
        const id = row.identity_id, token = randomBytes(32).toString("base64url"), digest = houseSessionDigest(token);
        this.db.prepare("DELETE FROM recovery WHERE identity_id=?").run(id);
        this.db.prepare("DELETE FROM sessions WHERE identity_id=?").run(id);
        this.db.prepare("INSERT INTO sessions(token_digest,identity_id,expires_at) VALUES (?,?,?)").run(digest, id, Date.now() + HOUSE_SESSION_SECONDS * 1000);
        return { id, token, digest, created: false };
      });
    } catch (error) { return storageError(error); }
  }

  snapshot(id: string, zoneId = "lounge"): HouseSnapshot {
    try { return this.transaction(() => {
      const h = this.requireHome(id); this.identity(id);
      const privateRoom = zoneId === "lounge" ? null : this.access(id, uuid(zoneId));
      const streamId = privateRoom ? "bedroom:" + privateRoom.id : "lounge:" + h.id;
      const residents = this.db.prepare("SELECT i.*,m.slot,m.bedroom_id,b.open FROM members m JOIN identities i ON i.id=m.identity_id JOIN bedrooms b ON b.id=m.bedroom_id WHERE m.house_id=? AND m.status='active' ORDER BY m.slot").all(h.id) as (IdentityRow & { slot: number; bedroom_id: string; open: number })[];
      const chats = this.db.prepare("SELECT id,author_id AS authorId,name,text,at,sequence FROM (SELECT * FROM chat WHERE zone_id=? AND at>=? ORDER BY sequence DESC LIMIT 100) ORDER BY sequence").all(streamId, Date.now() - CHAT_RETENTION_MS) as unknown as Chat[];
      return { schemaVersion: 2, selfId: id, house: home(h), residents: residents.map(r => ({ ...profile(r), slot: r.slot, bedroomId: r.bedroom_id, open: r.open === 1 } satisfies Resident)), streamId, sequence: this.sequence(streamId), zoneId: privateRoom?.id ?? "lounge", room: privateRoom ? room(privateRoom) : null, cards: privateRoom ? [] : (this.db.prepare("SELECT * FROM cards WHERE house_id=? ORDER BY CASE WHEN state='active' THEN 0 ELSE 1 END,inactive_sequence DESC,id").all(h.id) as CardRow[]).map(card), chat: chats };
    }); } catch (error) { return storageError(error); }
  }

  exportOwn(id: string): object {
    try { return this.transaction(() => {
      const h = this.active(id);
      const archives = this.db.prepare("SELECT id,house_id,room,cards,at FROM archives WHERE identity_id=? ORDER BY at,id").all(id) as { id: string; house_id: string; room: string; cards: string; at: number }[];
      return { schemaVersion: 2, identity: profile(this.identity(id)), home: h ? home(h) : null, room: h ? room(this.bedroom(h.bedroom_id)) : null, cards: h ? (this.db.prepare("SELECT * FROM cards WHERE house_id=? AND author_id=? ORDER BY id").all(h.id, id) as CardRow[]).map(card) : [], archives: archives.map(a => ({ id: a.id, houseId: a.house_id, room: JSON.parse(a.room), cards: JSON.parse(a.cards), at: a.at })) };
    }); } catch (error) { return storageError(error); }
  }

  execute(id: string, untrusted: unknown): HouseReceipt {
    try {
      const command = parseCommand(untrusted), hash = houseSessionDigest(id + "\n" + canonical(command));
      return this.transaction(() => {
        this.identity(id);
        const previous = this.db.prepare("SELECT command_hash,response,room_id FROM receipts WHERE actor_id=? AND command_id=?").get(id, command.commandId) as ReceiptRow | undefined;
        if (previous) {
          if (previous.command_hash !== hash) fail("COMMAND_ID_REUSED", "This command ID was already used for another action.");
          if (previous.room_id) this.access(id, previous.room_id);
          return JSON.parse(previous.response) as HouseReceipt;
        }
        const outcome = this.apply(id, command);
        const receipt: HouseReceipt = { ok: true, commandId: command.commandId, streamId: outcome.streamId, sequence: outcome.sequence ?? this.bump(outcome.streamId), entityRevision: outcome.entityRevision, ...(outcome.result ? { result: outcome.result } : {}) };
        this.db.prepare("INSERT INTO receipts(actor_id,command_id,command_hash,response,room_id) VALUES (?,?,?,?,?)").run(id, command.commandId, hash, JSON.stringify(receipt), outcome.roomId ?? null);
        return receipt;
      });
    } catch (error) { return storageError(error); }
  }

  private trimCards(houseId: string): void {
    this.db.prepare("DELETE FROM cards WHERE house_id=? AND state!='active' AND id NOT IN (SELECT id FROM cards WHERE house_id=? AND state!='active' ORDER BY inactive_sequence DESC,id DESC LIMIT 12)").run(houseId, houseId);
  }
  private depart(target: string, h: HomeRow, removed: boolean, sequence: number): void {
    const member = this.db.prepare("SELECT bedroom_id FROM members WHERE house_id=? AND identity_id=? AND status='active'").get(h.id, target) as { bedroom_id: string } | undefined;
    if (!member) fail("FORBIDDEN", "This person is not an active member.");
    const r = this.bedroom(member.bedroom_id);
    this.db.prepare("UPDATE cards SET state='ownerLeft',revision=revision+1,inactive_sequence=? WHERE house_id=? AND author_id=? AND state='active'").run(sequence, h.id, target);
    const ownCards = (this.db.prepare("SELECT * FROM cards WHERE house_id=? AND author_id=? ORDER BY id").all(h.id, target) as CardRow[]).map(card);
    this.db.prepare("UPDATE bedrooms SET archived=1,open=0,revision=revision+1 WHERE id=?").run(r.id);
    this.db.prepare("INSERT INTO archives(id,identity_id,house_id,room,cards,at) VALUES (?,?,?,?,?,?)").run(randomUUID(), target, h.id, JSON.stringify({ ...room(r), open: false, revision: r.revision + 1 }), JSON.stringify(ownCards), Date.now());
    this.db.prepare("UPDATE members SET status=? WHERE house_id=? AND identity_id=?").run(removed ? "removed" : "left", h.id, target);
    if (removed) this.db.prepare("INSERT INTO removed_guards(house_id,identity_id) VALUES (?,?) ON CONFLICT DO NOTHING").run(h.id, target);
    this.trimCards(h.id);
  }

  private apply(id: string, c: HouseCommand): Outcome {
    const p = c.payload;
    if (c.type === "house.create") {
      keys(p, ["capacity", "name", "colour"], ["capacity", "name", "colour"]);
      if (!Number.isInteger(p.capacity) || (p.capacity as number) < 2 || (p.capacity as number) > 6) fail("INVALID_INPUT", "Choose capacity from two to six.");
      text(p.name, 40, true); colour(p.colour);
      if (this.active(id)) fail("ALREADY_MEMBER", "Leave your current house before creating another.");
      const houseId = randomUUID(), code = this.newCode(), entityRevision = this.setProfile(id, p);
      this.db.prepare("INSERT INTO houses(id,capacity,owner_id,code,status) VALUES (?,?,?,?,'active')").run(houseId, p.capacity as number, id, code);
      const h = this.db.prepare("SELECT * FROM houses WHERE id=?").get(houseId) as HomeRow;
      const bedroomId = this.claim(id, h, 0);
      return { streamId: "lounge:" + h.id, entityRevision, result: { houseId, bedroomId } };
    }
    if (c.type === "house.join") {
      keys(p, ["code", "name", "colour"], ["code", "name", "colour"]); text(p.name, 40, true); colour(p.colour);
      const code = text(p.code, 9, true).toUpperCase().replace("-", "");
      if (!/^[0-9A-HJKMNP-TV-Z]{8}$/.test(code)) fail("INVALID_INPUT", "Enter the eight-character house code.");
      const h = this.db.prepare("SELECT * FROM houses WHERE code=? AND status='active'").get(code) as HomeRow | undefined;
      if (!h) fail("FORBIDDEN", "This invitation is unavailable.");
      const current = this.active(id);
      if (current) {
        if (current.id !== h.id) fail("ALREADY_MEMBER", "Leave your current house before joining another.");
        return { streamId: "lounge:" + h.id, sequence: this.sequence("lounge:" + h.id), entityRevision: this.identity(id).revision, result: { houseId: h.id, bedroomId: current.bedroom_id } };
      }
      if (this.db.prepare("SELECT 1 FROM removed_guards WHERE house_id=? AND identity_id=?").get(h.id, id)) fail("FORBIDDEN", "The owner must reinstate this identity before it can rejoin.");
      const claimed = this.db.prepare("SELECT slot FROM members WHERE house_id=? AND status='active'").all(h.id) as { slot: number }[];
      const slot = Array.from({ length: h.capacity }, (_, n) => n).find(n => !claimed.some(m => m.slot === n));
      if (slot === undefined) fail("SPACE_FULL", "This house has no unclaimed permanent bedroom.");
      const entityRevision = this.setProfile(id, p), bedroomId = this.claim(id, h, slot);
      return { streamId: "lounge:" + h.id, entityRevision, result: { houseId: h.id, bedroomId } };
    }
    if (c.type === "profile.set") {
      keys(p, ["name", "colour"], ["name", "colour"]);
      text(p.name, 40, true); colour(p.colour); this.requireRevision(c.expectedRevision, this.identity(id).revision);
      return { streamId: this.active(id) ? "lounge:" + this.active(id)!.id : "identity:" + id, entityRevision: this.setProfile(id, p) };
    }

    const h = this.requireHome(id), lounge = "lounge:" + h.id;
    if (uuid(c.houseId) !== h.id) fail("FORBIDDEN", "This queued action belongs to a different house.");
    if (c.type === "chat.send") {
      keys(p, ["zoneId", "text"], ["zoneId", "text"]);
      const value = text(p.text, 280, true), zoneId = p.zoneId === "lounge" ? "lounge" : uuid(p.zoneId);
      const r = zoneId === "lounge" ? null : this.access(id, zoneId);
      const streamId = r ? "bedroom:" + r.id : lounge, sequence = this.bump(streamId), chatId = randomUUID();
      this.db.prepare("INSERT INTO chat(id,zone_id,author_id,name,text,at,sequence) VALUES (?,?,?,?,?,?,?)").run(chatId, streamId, id, this.identity(id).name, value, Date.now(), sequence);
      this.db.prepare("DELETE FROM chat WHERE at<?").run(Date.now() - CHAT_RETENTION_MS);
      this.db.prepare("DELETE FROM chat WHERE zone_id=? AND id NOT IN (SELECT id FROM chat WHERE zone_id=? ORDER BY sequence DESC LIMIT 100)").run(streamId, streamId);
      return { streamId, sequence, entityRevision: 0, result: { chatId }, ...(r ? { roomId: r.id } : {}) };
    }
    if (c.type === "room.configure" || c.type === "room.placements") {
      keys(p, c.type === "room.configure" ? ["roomId", "open", "palette"] : ["roomId", "placements"], c.type === "room.configure" ? ["roomId", "open", "palette"] : ["roomId", "placements"]);
      const r = this.access(id, uuid(p.roomId));
      if (r.owner_id !== id) fail("FORBIDDEN", "Only the resident may edit their bedroom.");
      this.requireRevision(c.expectedRevision, r.revision);
      if (c.type === "room.configure") {
        if (typeof p.open !== "boolean") fail("INVALID_INPUT", "Choose whether your door is open.");
        const palette = colour(p.palette);
        this.db.prepare("UPDATE bedrooms SET open=?,palette=?,revision=revision+1 WHERE id=?").run(p.open ? 1 : 0, palette, r.id);
        if (r.open !== (p.open ? 1 : 0)) this.bump(lounge);
      } else {
        if (!Array.isArray(p.placements) || p.placements.length > 10) fail("INVALID_INPUT", "Use at most ten furniture pieces.");
        const ids = new Set<string>();
        const placements = p.placements.map(value => {
          const item = record(value); keys(item, ["id", "kind", "x", "z", "rotation", "colour"], ["id", "kind", "x", "z", "rotation", "colour"]);
          const itemId = uuid(item.id); if (ids.has(itemId)) fail("INVALID_INPUT", "Furniture IDs must be unique."); ids.add(itemId);
          if (typeof item.kind !== "string" || !["desk", "chair", "bed", "shelf", "plant", "lamp"].includes(item.kind)) fail("INVALID_INPUT", "Choose a supported furniture category.");
          if (typeof item.x !== "number" || !Number.isFinite(item.x) || item.x * 2 !== Math.trunc(item.x * 2) || typeof item.z !== "number" || !Number.isFinite(item.z) || item.z * 2 !== Math.trunc(item.z * 2) || !Number.isInteger(item.rotation) || (item.rotation as number) < 0 || (item.rotation as number) > 3) fail("INVALID_INPUT", "Furniture uses a half-unit grid and quarter turns.");
          return { id: itemId, kind: item.kind, x: item.x, z: item.z, rotation: item.rotation as number, colour: colour(item.colour) };
        });
        if (!validatePlacements(placements)) fail("INVALID_INPUT", "Keep furniture inside the room, clear of other pieces and the door/spawn route.");
        this.db.prepare("UPDATE bedrooms SET placements=?,revision=revision+1 WHERE id=?").run(JSON.stringify(placements), r.id);
      }
      return { streamId: "bedroom:" + r.id, roomId: r.id, entityRevision: r.revision + 1, result: { roomId: r.id } };
    }
    if (c.type === "card.save") {
      keys(p, ["cardId", "smallGoal", "question", "resourceUrl", "nextStep", "helpRequested"], ["smallGoal", "helpRequested"]);
      const smallGoal = text(p.smallGoal, 160, true), question = text(p.question ?? "", 400), resourceUrl = text(p.resourceUrl ?? "", 2048), nextStep = text(p.nextStep ?? "", 400);
      if (resourceUrl) { let url: URL; try { url = new URL(resourceUrl); } catch { return fail("INVALID_INPUT", "Enter an https resource link."); } if (url.protocol !== "https:" || url.username || url.password) fail("INVALID_INPUT", "Enter an https resource link without credentials."); }
      if (typeof p.helpRequested !== "boolean") fail("INVALID_INPUT", "Choose whether help is requested.");
      const requestedId = p.cardId === undefined ? undefined : uuid(p.cardId);
      const existing = requestedId ? this.db.prepare("SELECT * FROM cards WHERE id=?").get(requestedId) as CardRow | undefined : this.db.prepare("SELECT * FROM cards WHERE house_id=? AND author_id=? AND state='active'").get(h.id, id) as CardRow | undefined;
      if (requestedId && !existing) fail("FORBIDDEN", "This card is unavailable.");
      if (existing && (existing.author_id !== id || existing.house_id !== h.id)) fail("FORBIDDEN", "Only the author may edit their card.");
      if (existing && existing.state !== "active") fail("FORBIDDEN", "An inactive card is read-only. Start a new current card.");
      this.requireRevision(c.expectedRevision, existing?.revision ?? 0);
      const cardId = existing?.id ?? randomUUID(), entityRevision = (existing?.revision ?? 0) + 1;
      this.db.prepare("INSERT INTO cards(id,house_id,author_id,small_goal,question,resource_url,next_step,help_requested,state,revision) VALUES (?,?,?,?,?,?,?,?,'active',?) ON CONFLICT(id) DO UPDATE SET small_goal=excluded.small_goal,question=excluded.question,resource_url=excluded.resource_url,next_step=excluded.next_step,help_requested=excluded.help_requested,revision=excluded.revision").run(cardId, h.id, id, smallGoal, question, resourceUrl, nextStep, p.helpRequested ? 1 : 0, entityRevision);
      return { streamId: lounge, entityRevision, result: { cardId } };
    }
    if (c.type === "card.close") {
      keys(p, ["cardId"], ["cardId"]); const cardId = uuid(p.cardId);
      const existing = this.db.prepare("SELECT * FROM cards WHERE id=?").get(cardId) as CardRow | undefined;
      if (!existing || existing.author_id !== id || existing.house_id !== h.id) fail("FORBIDDEN", "Only the author may close this card.");
      this.requireRevision(c.expectedRevision, existing.revision);
      if (existing.state !== "active") fail("FORBIDDEN", "This card is already inactive.");
      const sequence = this.bump(lounge);
      this.db.prepare("UPDATE cards SET state='closed',revision=revision+1,inactive_sequence=? WHERE id=?").run(sequence, cardId); this.trimCards(h.id);
      return { streamId: lounge, sequence, entityRevision: existing.revision + 1, result: { cardId } };
    }
    if (c.type === "house.leave") {
      keys(p, []);
      const count = this.db.prepare("SELECT COUNT(*) AS count FROM members WHERE house_id=? AND status='active'").get(h.id) as { count: number };
      if (h.owner_id === id && count.count > 1) fail("FORBIDDEN", "Transfer ownership before leaving this house.");
      const sequence = this.bump(lounge); this.depart(id, h, false, sequence);
      if (count.count === 1) this.db.prepare("UPDATE houses SET status='archived',code=NULL WHERE id=?").run(h.id);
      return { streamId: lounge, sequence, entityRevision: 0, result: { houseId: h.id, archived: count.count === 1 } };
    }

    keys(p, ["memberId"], ["memberId"]); const target = uuid(p.memberId); this.requireOwner(id, h);
    if (c.type === "house.reinstate") {
      if (!this.db.prepare("SELECT 1 FROM removed_guards WHERE house_id=? AND identity_id=?").get(h.id, target)) fail("FORBIDDEN", "This identity has no removed membership to reinstate.");
      this.db.prepare("DELETE FROM removed_guards WHERE house_id=? AND identity_id=?").run(h.id, target);
      return { streamId: lounge, entityRevision: 0, result: { memberId: target } };
    }
    if (target === id) fail("FORBIDDEN", "Choose another current resident.");
    if (!this.db.prepare("SELECT 1 FROM members WHERE house_id=? AND identity_id=? AND status='active'").get(h.id, target)) fail("FORBIDDEN", "Choose a current member of this house.");
    if (c.type === "house.transfer") {
      this.db.prepare("UPDATE houses SET owner_id=? WHERE id=?").run(target, h.id);
      return { streamId: lounge, entityRevision: 0, result: { memberId: target } };
    }
    const sequence = this.bump(lounge); this.depart(target, h, true, sequence);
    this.db.prepare("UPDATE houses SET code=? WHERE id=?").run(this.newCode(h.code!), h.id);
    return { streamId: lounge, sequence, entityRevision: 0, result: { memberId: target } };
  }
}
