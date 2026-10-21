import { parseDiscordDestination } from "./house-voice.ts";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { validatePlacements } from "../public/house-geometry.js";
import { ROOM_LIGHTS, getRoomPreset, instantiateRoomPreset, roomPresetForSlot } from "../public/house-room-content.js";
import { emptyGameTable, advanceGameTime, applyGameAction, applyGameEvent, projectGame, INACTIVITY_MS } from "../public/house-game-rules.js";
import type { GameTable, GameRound, GameAction, GameEvent } from "../public/house-game-rules.js";
import { HouseError } from "./house-contract.ts";
import type { Bedroom, Card, Chat, Colour, Home, HouseCommand, HouseIdentity, HouseReceipt, HouseSnapshot, HouseGameControl, Me, Placement, Profile, Resident, RoomLight } from "./house-contract.ts";

export const HOUSE_SESSION_SECONDS = 30 * 24 * 60 * 60;
const CHAT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const COLOURS: readonly string[] = ["amber", "sage", "rose", "blue", "lavender", "peach"];
const TYPES = ["house.create", "house.join", "profile.set", "chat.send", "room.configure", "room.placements", "room.starter", "room.light", "card.save", "card.close", "house.transfer", "house.leave", "house.remove", "house.reinstate", "house.voice", "game.join", "game.ready", "game.move", "game.resume", "game.leave"];
type IdentityRow = { id: string; name: string; colour: Colour; revision: number };
type HomeRow = { id: string; capacity: number; owner_id: string; code: string | null; status: string };
type Membership = HomeRow & { slot: number; bedroom_id: string };
type RoomRow = { id: string; house_id: string; owner_id: string; slot: number; revision: number; open: number; palette: Colour; placements: string; archived: number; light: RoomLight; origin_preset_id: string | null; origin_preset_version: number | null };
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
function room(row: RoomRow): Bedroom { return { id: row.id, ownerId: row.owner_id, revision: row.revision, open: row.open === 1, palette: row.palette, placements: JSON.parse(row.placements) as Placement[], light: row.light, originPresetId: row.origin_preset_id, originPresetVersion: row.origin_preset_version }; }
function card(row: CardRow): Card { return { id: row.id, authorId: row.author_id, smallGoal: row.small_goal, question: row.question, resourceUrl: row.resource_url, nextStep: row.next_step, helpRequested: row.help_requested === 1, state: row.state, revision: row.revision }; }

const GAME_RULESET = 1;
type GameRow = { house_id: string; ruleset: number; state: string; next_due_at: number | null };
/** Reject unsupported/corrupt persisted input before the pure rules can use it. */
function restoredGame(row: GameRow): GameTable {
  if (row.ruleset !== GAME_RULESET || row.state.length > 8192) fail("STORAGE_UNAVAILABLE", "Unsupported saved table rules.");
  const value: unknown = JSON.parse(row.state);
  const check = (condition: boolean) => { if (!condition) fail("STORAGE_UNAVAILABLE", "The saved table is invalid."); };
  const object = (v: unknown, fields: string[]) => {
    check(!!v && typeof v === "object" && !Array.isArray(v));
    const r = v as Record<string, unknown>;
    check(Object.keys(r).length === fields.length && fields.every(k => Object.hasOwn(r,k)));
    return r;
  };
  const integer = (v: unknown, minimum = 0): v is number => Number.isSafeInteger(v) && (v as number) >= minimum && (v as number) <= Number.MAX_SAFE_INTEGER - INACTIVITY_MS;
  const identifier = (v: unknown) => typeof v === "string" && UUID.test(v);
  const tuple = (v: unknown): v is unknown[] => Array.isArray(v) && v.length === 2;
  const board = (v: unknown) => {
    check(Array.isArray(v) && v.length === 42);
    const cells = v as unknown[];
    check(cells.every(c => c === null || c === 0 || c === 1));
    const counts = [cells.filter(c=>c===0).length,cells.filter(c=>c===1).length];
    check(counts[0] === counts[1] || counts[0] === counts[1]! + 1);
    for (let c=0;c<7;c++) for (let r=0;r<5;r++) if (cells[r*7+c] !== null) check(cells[(r+1)*7+c] !== null);
    return counts;
  };
  const wins = (cells: unknown[], slot: number) => cells.some((cell,i) => cell===slot && [[0,1],[1,0],[1,1],[1,-1]].some(([dr,dc]) => [1,2,3].every(n => {
    const r=Math.floor(i/7)+dr!*n,c=i%7+dc!*n; return r>=0&&r<6&&c>=0&&c<7&&cells[r*7+c]===slot;
  })));
  const lastMove = (v: unknown, cells: unknown[], counts: number[]) => {
    if (v === null) { check(counts[0] === 0 && counts[1] === 0); return; }
    const m=object(v,["row","column","slot"]);
    check(integer(m.row) && m.row<6 && integer(m.column) && m.column<7 && (m.slot===0 || m.slot===1));
    const row=m.row as number,column=m.column as number;
    check(cells[row*7+column]===m.slot && (row===0 || cells[(row-1)*7+column]===null));
    check(m.slot === (counts[0] === counts[1] ? 1 : 0));
  };
  const table=object(value,["revision","rosterRevision","current","latestResult"]);
  check(integer(table.revision) && integer(table.rosterRevision) && (table.rosterRevision as number) <= (table.revision as number));
  if (table.current !== null) {
    const r=object(table.current,["roundId","status","players","ready","cells","turn","lastMove","waitingDeadlineAt","startedAt","lastMoveAt","recoveryDeadlineAt","resumeRevision","resume"]);
    check(identifier(r.roundId) && ["waiting","active","paused"].includes(r.status as string));
    check(tuple(r.players) && r.players.every(v=>v===null || identifier(v)) && r.players.some(v=>v!==null) && (r.players[0]===null || r.players[0]!==r.players[1]));
    check(tuple(r.ready) && tuple(r.resume) && r.resume.every(v=>typeof v==="boolean") && integer(r.resumeRevision) && r.resumeRevision <= (table.revision as number));
    check(integer(r.waitingDeadlineAt) && (r.turn===0 || r.turn===1));
    const cells=r.cells as unknown[], counts=board(cells); lastMove(r.lastMove,cells,counts); check(!wins(cells,0) && !wins(cells,1));
    if (r.status === "waiting") {
      check(counts[0]===0 && counts[1]===0 && r.turn===0 && r.startedAt===null && r.lastMoveAt===null && r.recoveryDeadlineAt===null && r.resumeRevision===0 && (r.resume as boolean[]).every(v=>!v));
      (r.ready as unknown[]).forEach((v,slot)=>{if(v!==null){const ready=object(v,["rosterRevision","expiresAt"]);check((r.players as unknown[])[slot]!==null && (r.players as unknown[]).every(p=>p!==null) && ready.rosterRevision===table.rosterRevision && integer(ready.expiresAt) && ready.expiresAt <= (r.waitingDeadlineAt as number));}});
    } else {
      check((r.players as unknown[]).every(identifier) && integer(r.startedAt) && integer(r.lastMoveAt) && r.lastMoveAt >= r.startedAt && (r.ready as unknown[]).every(v=>v===null) && cells.some(v=>v===null));
      check(r.turn === (counts[0]===counts[1] ? 0 : 1));
      if (r.status==="active") check(r.recoveryDeadlineAt===null && (r.resume as boolean[]).every(v=>!v));
      else check(integer(r.recoveryDeadlineAt) && (r.resumeRevision as number)>0 && !(r.resume as boolean[]).every(Boolean));
    }
  }
  if (table.latestResult !== null) {
    const r=object(table.latestResult,["roundId","players","cells","lastMove","startedAt","endedAt","reason","winner"]);
    check(identifier(r.roundId) && tuple(r.players) && r.players.every(identifier) && r.players[0]!==r.players[1]);
    check(integer(r.startedAt) && integer(r.endedAt) && r.endedAt >= r.startedAt);
    check(["win","draw","player_left","left_lounge","member_removed","recovery_expired","inactive"].includes(r.reason as string));
    const cells=r.cells as unknown[],counts=board(cells);lastMove(r.lastMove,cells,counts);
    if(r.reason==="win") check((r.winner===0 || r.winner===1) && wins(cells,r.winner) && !wins(cells,1-r.winner) && (r.lastMove as {slot:number}).slot===r.winner);
    else check(r.winner===null && !wins(cells,0) && !wins(cells,1));
    if(r.reason==="draw") check(cells.every(v=>v!==null)); else if(r.reason!=="win") check(cells.some(v=>v===null));
    check(table.current===null || (table.current as GameRound).roundId!==r.roundId);
  }
  const state=value as GameTable;
  check(gameDeadline(state) === row.next_due_at);
  return state;
}
function gameDeadline(state: GameTable): number | null {
  const r=state.current;
  if(!r) return null;
  if(r.status==="waiting") return Math.min(r.waitingDeadlineAt,...r.ready.filter(v=>v!==null).map(v=>v!.expiresAt));
  return Math.min(r.lastMoveAt!+INACTIVITY_MS,r.recoveryDeadlineAt ?? Infinity);
}

/** One SQLite authority. State, zone cursor and receipt are committed before execute returns. */
export class HouseStore {
  readonly db!: DatabaseSync;
  private closed = false;
  // Reuse only this store's constant SQL plans; each execution reads current rows.
  // Native StatementSync has no explicit finalize API in the installed runtime.
  private readonly statements = new Map<string, StatementSync>();
  private prepared(sql: string): StatementSync {
    let statement = this.statements.get(sql);
    if (!statement) {
      if (this.statements.size >= 96) throw new HouseError("STORAGE_UNAVAILABLE", "The house query catalogue exceeds its supported bound.");
      statement = this.db.prepare(sql); this.statements.set(sql, statement);
    }
    return statement;
  }
  constructor(path: string) {
    try { this.db = new DatabaseSync(path); }
    catch (error) { return storageError(error); }
    try {
      this.db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;");
      const version = (this.prepared("PRAGMA user_version").get() as { user_version: number }).user_version;
      if (version !== 0 && version !== 1 && version !== 2 && version !== 3 && version !== 4) fail("STORAGE_UNAVAILABLE", "Unsupported house database version.");
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
      if (version < 2) this.transaction(() => this.db.exec(`
        ALTER TABLE bedrooms ADD COLUMN light TEXT NOT NULL DEFAULT 'standard' CHECK(light IN ('standard','cosy','dim'));
        ALTER TABLE bedrooms ADD COLUMN origin_preset_id TEXT;
        ALTER TABLE bedrooms ADD COLUMN origin_preset_version INTEGER;
        PRAGMA user_version=2;
      `));
      if (version < 3) this.transaction(() => this.db.exec(`
        CREATE TABLE game_tables (house_id TEXT PRIMARY KEY REFERENCES houses(id), ruleset INTEGER NOT NULL, state TEXT NOT NULL, next_due_at INTEGER);
        CREATE INDEX game_tables_due ON game_tables(next_due_at) WHERE next_due_at IS NOT NULL;
        PRAGMA user_version=3;
      `));
      if (version < 4) this.transaction(() => this.db.exec(`
        CREATE TABLE house_voice (house_id TEXT PRIMARY KEY REFERENCES houses(id), url TEXT, revision INTEGER NOT NULL CHECK(revision>=0));
        PRAGMA user_version=4;
      `));
      // A new process cannot inherit former sockets or their recovery consent.
      const restartAt=Date.now();
      this.maintainGames(restartAt);
      this.transaction(() => {
        for (const row of this.prepared("SELECT house_id,ruleset,state,next_due_at FROM game_tables WHERE next_due_at IS NOT NULL").all() as GameRow[]) {
          const transition=applyGameEvent(restoredGame(row),{type:"restart"},restartAt);
          if (transition.changed) this.saveGame(row.house_id,transition.state,true);
        }
      });
      this.transaction(() => this.prepared("DELETE FROM chat WHERE at<?").run(Date.now() - CHAT_RETENTION_MS));
      this.prepared("SELECT id FROM identities LIMIT 1").get();
    } catch (error) { this.closed = true; this.statements.clear(); this.db.close(); storageError(error); }
  }

  private transaction<T>(action: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = action(); this.db.exec("COMMIT"); return result; }
    catch (error) { try { this.db.exec("ROLLBACK"); } catch { /* Preserve the original cause. */ } throw error; }
  }
  private identity(id: string): IdentityRow {
    const row = this.prepared("SELECT * FROM identities WHERE id=?").get(id) as IdentityRow | undefined;
    return row ?? fail("FORBIDDEN", "A current house identity is required.");
  }
  private active(id: string): Membership | undefined {
    return this.prepared("SELECT h.*,m.slot,m.bedroom_id FROM members m JOIN houses h ON h.id=m.house_id WHERE m.identity_id=? AND m.status='active' AND h.status='active'").get(id) as Membership | undefined;
  }
  private requireHome(id: string): Membership { return this.active(id) ?? fail("FORBIDDEN", "Current house membership is required."); }
  private requireOwner(id: string, h: HomeRow): void { if (h.owner_id !== id) fail("FORBIDDEN", "Only the house owner can administer membership."); }
  private requireRevision(expected: unknown, actual: number): void { if (revision(expected) !== actual) fail("REVISION_CONFLICT", "This item changed. Keep your draft and reread the saved state."); }
  private bedroom(id: string): RoomRow {
    return this.prepared("SELECT * FROM bedrooms WHERE id=? AND archived=0").get(id) as RoomRow | undefined ?? fail("FORBIDDEN", "This bedroom is unavailable.");
  }
  private access(id: string, roomId: string): RoomRow {
    const h = this.requireHome(id), r = this.bedroom(roomId);
    if (r.house_id !== h.id || (r.owner_id !== id && r.open !== 1)) fail("FORBIDDEN", "This bedroom is closed or belongs to another house.");
    return r;
  }
  private sequence(streamId: string): number {
    const row = this.prepared("SELECT sequence FROM streams WHERE id=?").get(streamId) as { sequence: number } | undefined;
    return row?.sequence ?? 0;
  }
  private bump(streamId: string): number {
    this.prepared("INSERT INTO streams(id,sequence) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET sequence=sequence+1").run(streamId);
    return this.sequence(streamId);
  }
  private game(houseId: string): GameTable {
    const row=this.prepared("SELECT house_id,ruleset,state,next_due_at FROM game_tables WHERE house_id=?").get(houseId) as GameRow | undefined;
    return row ? restoredGame(row) : emptyGameTable();
  }
  private saveGame(houseId: string, state: GameTable, bump = false): void {
    this.prepared("INSERT INTO game_tables(house_id,ruleset,state,next_due_at) VALUES (?,?,?,?) ON CONFLICT(house_id) DO UPDATE SET ruleset=excluded.ruleset,state=excluded.state,next_due_at=excluded.next_due_at").run(houseId,GAME_RULESET,JSON.stringify(state),gameDeadline(state));
    if(bump) this.bump("lounge:"+houseId);
  }
  /** Due housekeeping commits independently, even if the next player command fails. */
  maintainGames(now=Date.now()): boolean {
    try { return this.transaction(() => {
      let changed=false;
      for(const row of this.prepared("SELECT house_id,ruleset,state,next_due_at FROM game_tables WHERE next_due_at<=?").all(now) as GameRow[]) {
        const transition=advanceGameTime(restoredGame(row),now);
        if(transition.changed){this.saveGame(row.house_id,transition.state,true);changed=true;}
      }
      return changed;
    }); } catch(error) { return storageError(error); }
  }
  /** Only the generation-filtered realtime authority calls these process events. */
  gameLifecycle(id: string, event: "disconnect" | "left_lounge"): boolean {
    try {
      const now=Date.now(); this.maintainGames(now);
      return this.transaction(() => {
        const h=this.active(id); if(!h) return false;
        return this.gameEvent(h.id,event==="disconnect" ? {type:"disconnect",actorId:id} : {type:"depart",actorId:id,reason:"left_lounge"},true,now);
      });
    } catch(error){return storageError(error);}
  }
  private gameEvent(houseId: string,event: GameEvent,bump=false,now=Date.now()): boolean {
    const transition=applyGameEvent(this.game(houseId),event,now);
    if(!transition.ok) fail("STORAGE_UNAVAILABLE","Table housekeeping is required.");
    if(transition.changed)this.saveGame(houseId,transition.state,bump);
    return transition.changed;
  }
  private setProfile(id: string, payload: Record<string, unknown>): number {
    const name = text(payload.name, 40, true), nextColour = colour(payload.colour);
    this.prepared("UPDATE identities SET name=?,colour=?,revision=revision+1 WHERE id=?").run(name, nextColour, id);
    return this.identity(id).revision;
  }
  private newCode(excluding?: string): string {
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    for (let attempt = 0; attempt < 32; attempt++) {
      let bits = BigInt("0x" + randomBytes(5).toString("hex")), code = "";
      for (let i = 0; i < 8; i++) { code = alphabet[Number(bits & 31n)] + code; bits >>= 5n; }
      if (code !== excluding && !this.prepared("SELECT id FROM houses WHERE code=?").get(code)) return code;
    }
    return fail("STORAGE_UNAVAILABLE", "A unique invitation could not be allocated. Please retry.");
  }
  private claim(id: string, h: HomeRow, slot: number): string {
    const roomId = randomUUID(), starter = instantiateRoomPreset(roomPresetForSlot(slot).id, () => randomUUID());
    this.prepared("INSERT INTO bedrooms(id,house_id,owner_id,slot,palette,placements,light,origin_preset_id,origin_preset_version) VALUES (?,?,?,?,?,?,?,?,?)").run(roomId, h.id, id, slot, starter.palette, JSON.stringify(starter.placements), starter.light, starter.originPresetId, starter.originPresetVersion);
    this.prepared("INSERT INTO members(house_id,identity_id,slot,bedroom_id,status) VALUES (?,?,?,?,'active') ON CONFLICT(house_id,identity_id) DO UPDATE SET slot=excluded.slot,bedroom_id=excluded.bedroom_id,status='active'").run(h.id, id, slot, roomId);
    this.prepared("INSERT INTO streams(id,sequence) VALUES (?,0)").run("bedroom:" + roomId);
    return roomId;
  }
  ready(): boolean {
    try { if (this.closed) return false; this.prepared("SELECT id FROM identities LIMIT 1").get(); return true; } catch { return false; }
  }
  close(): void { if (!this.closed) { this.closed = true; this.statements.clear(); this.db.close(); } }

  ensureSession(token?: string): HouseIdentity {
    try {
      if (token && TOKEN.test(token)) {
        const digest = houseSessionDigest(token), existing = this.session(digest);
        if (existing) return { id: existing.id, token, digest, created: false };
      }
      return this.transaction(() => {
        const id = randomUUID(), nextToken = randomBytes(32).toString("base64url"), digest = houseSessionDigest(nextToken);
        this.prepared("INSERT INTO identities(id,name,colour) VALUES (?,'Study friend','amber')").run(id);
        this.prepared("INSERT INTO sessions(token_digest,identity_id,expires_at) VALUES (?,?,?)").run(digest, id, Date.now() + HOUSE_SESSION_SECONDS * 1000);
        return { id, token: nextToken, digest, created: true };
      });
    } catch (error) { return storageError(error); }
  }
  session(digest: string): { id: string } | undefined {
    try {
      const row = this.prepared("SELECT identity_id FROM sessions WHERE token_digest=? AND expires_at>?").get(digest, Date.now()) as { identity_id: string } | undefined;
      return row ? { id: row.identity_id } : undefined;
    } catch (error) { return storageError(error); }
  }
  me(id: string): Me {
    try { return this.transaction(() => {
      const h = this.active(id), count = this.prepared("SELECT COUNT(*) AS count FROM archives WHERE identity_id=?").get(id) as { count: number };
      return { identity: profile(this.identity(id)), home: h ? home(h) : null, archiveCount: count.count };
    }); } catch (error) { return storageError(error); }
  }
  /** Owner administration is paged separately from shared house snapshots. */
  removedResidents(id: string, after = ""): { members: { id: string; name: string }[]; nextCursor: string | null } {
    try { return this.transaction(() => {
      const h = this.requireHome(id); this.requireOwner(id, h);
      const cursor = after === "" ? "" : uuid(after);
      const rows = this.prepared("SELECT i.id,i.name FROM removed_guards g JOIN identities i ON i.id=g.identity_id WHERE g.house_id=? AND i.id>? ORDER BY i.id LIMIT 51").all(h.id, cursor) as { id: string; name: string }[];
      const members = rows.slice(0, 50);
      return { members, nextCursor: rows.length > 50 ? members[49]!.id : null };
    }); } catch (error) { return storageError(error); }
  }
  issueRecovery(id: string): string {
    try { return this.transaction(() => {
      this.identity(id); const proof = randomBytes(32).toString("base64url");
      this.prepared("DELETE FROM recovery WHERE identity_id=?").run(id);
      this.prepared("INSERT INTO recovery(proof_digest,identity_id) VALUES (?,?)").run(houseSessionDigest(proof), id);
      return proof;
    }); } catch (error) { return storageError(error); }
  }
  recover(proof: string): HouseIdentity {
    try {
      if (typeof proof !== "string" || !TOKEN.test(proof)) fail("FORBIDDEN", "The recovery proof is invalid or already used.");
      return this.transaction(() => {
        const row = this.prepared("SELECT identity_id FROM recovery WHERE proof_digest=?").get(houseSessionDigest(proof)) as { identity_id: string } | undefined;
        if (!row) fail("FORBIDDEN", "The recovery proof is invalid or already used.");
        const id = row.identity_id, token = randomBytes(32).toString("base64url"), digest = houseSessionDigest(token);
        this.prepared("DELETE FROM recovery WHERE identity_id=?").run(id);
        this.prepared("DELETE FROM sessions WHERE identity_id=?").run(id);
        this.prepared("INSERT INTO sessions(token_digest,identity_id,expires_at) VALUES (?,?,?)").run(digest, id, Date.now() + HOUSE_SESSION_SECONDS * 1000);
        return { id, token, digest, created: false };
      });
    } catch (error) { return storageError(error); }
  }

  snapshot(id: string, zoneId = "lounge"): HouseSnapshot {
    try { this.maintainGames(); return this.transaction(() => {
      const h = this.requireHome(id); this.identity(id);
      const privateRoom = zoneId === "lounge" ? null : this.access(id, uuid(zoneId));
      const streamId = privateRoom ? "bedroom:" + privateRoom.id : "lounge:" + h.id;
      const residents = this.prepared("SELECT i.*,m.slot,m.bedroom_id,b.open FROM members m JOIN identities i ON i.id=m.identity_id JOIN bedrooms b ON b.id=m.bedroom_id WHERE m.house_id=? AND m.status='active' ORDER BY m.slot").all(h.id) as (IdentityRow & { slot: number; bedroom_id: string; open: number })[];
      const chats = this.prepared("SELECT id,author_id AS authorId,name,text,at,sequence FROM (SELECT * FROM chat WHERE zone_id=? AND at>=? ORDER BY sequence DESC LIMIT 100) ORDER BY sequence").all(streamId, Date.now() - CHAT_RETENTION_MS) as unknown as Chat[];
      const ownCard = this.prepared("SELECT * FROM cards WHERE house_id=? AND author_id=? AND state='active'").get(h.id, id) as CardRow | undefined;
      const voice = this.prepared("SELECT url,revision FROM house_voice WHERE house_id=?").get(h.id) as { url: string | null; revision: number } | undefined;
      const ownWork = { streamId: "lounge:" + h.id, sequence: this.sequence("lounge:" + h.id), card: ownCard ? card(ownCard) : null };
      return { voice: voice ?? { url: null, revision: 0 }, schemaVersion: 2, game: privateRoom ? null : projectGame(this.game(h.id)), selfId: id, ownWork, house: home(h), residents: residents.map(r => ({ ...profile(r), slot: r.slot, bedroomId: r.bedroom_id, open: r.open === 1 } satisfies Resident)), streamId, sequence: this.sequence(streamId), zoneId: privateRoom?.id ?? "lounge", room: privateRoom ? room(privateRoom) : null, cards: privateRoom ? [] : (this.prepared("SELECT * FROM cards WHERE house_id=? ORDER BY CASE WHEN state='active' THEN 0 ELSE 1 END,inactive_sequence DESC,id").all(h.id) as CardRow[]).map(card), chat: chats };
    }); } catch (error) { return storageError(error); }
  }

  exportOwn(id: string): object {
    try { return this.transaction(() => {
      const h = this.active(id);
      const archives = this.prepared("SELECT id,house_id,room,cards,at FROM archives WHERE identity_id=? ORDER BY at,id").all(id) as { id: string; house_id: string; room: string; cards: string; at: number }[];
      return { schemaVersion: 2, identity: profile(this.identity(id)), home: h ? home(h) : null, room: h ? room(this.bedroom(h.bedroom_id)) : null, cards: h ? (this.prepared("SELECT * FROM cards WHERE house_id=? AND author_id=? ORDER BY id").all(h.id, id) as CardRow[]).map(card) : [], archives: archives.map(a => ({ id: a.id, houseId: a.house_id, room: JSON.parse(a.room), cards: JSON.parse(a.cards), at: a.at })) };
    }); } catch (error) { return storageError(error); }
  }

  execute(id: string, untrusted: unknown, control?: HouseGameControl): HouseReceipt {
    try {
      const now=Date.now(); this.maintainGames(now);
      const command = parseCommand(untrusted), hash = houseSessionDigest(id + "\n" + canonical(command));
      return this.transaction(() => {
        this.identity(id);
        if(command.type.startsWith("game.")) {
          if(!control?.isController) fail("NOT_CONTROLLER","Enter the table with current lounge control.");
          if(control.zoneId!=="lounge") fail("STALE_ZONE","Return to the lounge table.");
          const h=this.requireHome(id);if(uuid(command.houseId)!==h.id)fail("FORBIDDEN","This queued action belongs to another house.");
        }
        const previous = this.prepared("SELECT command_hash,response,room_id FROM receipts WHERE actor_id=? AND command_id=?").get(id, command.commandId) as ReceiptRow | undefined;
        if (previous) {
          if (previous.command_hash !== hash) fail("COMMAND_ID_REUSED", "This command ID was already used for another action.");
          if (previous.room_id) this.access(id, previous.room_id);
          return JSON.parse(previous.response) as HouseReceipt;
        }
        const outcome = this.apply(id, command, control, now);
        const receipt: HouseReceipt = { ok: true, commandId: command.commandId, streamId: outcome.streamId, sequence: outcome.sequence ?? this.bump(outcome.streamId), entityRevision: outcome.entityRevision, ...(outcome.result ? { result: outcome.result } : {}) };
        this.prepared("INSERT INTO receipts(actor_id,command_id,command_hash,response,room_id) VALUES (?,?,?,?,?)").run(id, command.commandId, hash, JSON.stringify(receipt), outcome.roomId ?? null);
        return receipt;
      });
    } catch (error) { return storageError(error); }
  }

  private trimCards(houseId: string): void {
    this.prepared("DELETE FROM cards WHERE house_id=? AND state!='active' AND id NOT IN (SELECT id FROM cards WHERE house_id=? AND state!='active' ORDER BY inactive_sequence DESC,id DESC LIMIT 12)").run(houseId, houseId);
  }
  private depart(target: string, h: HomeRow, removed: boolean, sequence: number, now: number): void {
    const member = this.prepared("SELECT bedroom_id FROM members WHERE house_id=? AND identity_id=? AND status='active'").get(h.id, target) as { bedroom_id: string } | undefined;
    if (!member) fail("FORBIDDEN", "This person is not an active member.");
    this.gameEvent(h.id,{type:"depart",actorId:target,reason:removed ? "member_removed" : "left_lounge"},false,now);
    const r = this.bedroom(member.bedroom_id);
    this.prepared("UPDATE cards SET state='ownerLeft',revision=revision+1,inactive_sequence=? WHERE house_id=? AND author_id=? AND state='active'").run(sequence, h.id, target);
    const ownCards = (this.prepared("SELECT * FROM cards WHERE house_id=? AND author_id=? ORDER BY id").all(h.id, target) as CardRow[]).map(card);
    this.prepared("UPDATE bedrooms SET archived=1,open=0,revision=revision+1 WHERE id=?").run(r.id);
    this.prepared("INSERT INTO archives(id,identity_id,house_id,room,cards,at) VALUES (?,?,?,?,?,?)").run(randomUUID(), target, h.id, JSON.stringify({ ...room(r), open: false, revision: r.revision + 1 }), JSON.stringify(ownCards), Date.now());
    this.prepared("UPDATE members SET status=? WHERE house_id=? AND identity_id=?").run(removed ? "removed" : "left", h.id, target);
    if (removed) this.prepared("INSERT INTO removed_guards(house_id,identity_id) VALUES (?,?) ON CONFLICT DO NOTHING").run(h.id, target);
    this.trimCards(h.id);
  }

  private apply(id: string, c: HouseCommand, control: HouseGameControl | undefined, now: number): Outcome {
    const p = c.payload;
    if (c.type === "house.create") {
      keys(p, ["capacity", "name", "colour"], ["capacity", "name", "colour"]);
      if (!Number.isInteger(p.capacity) || (p.capacity as number) < 2 || (p.capacity as number) > 6) fail("INVALID_INPUT", "Choose capacity from two to six.");
      text(p.name, 40, true); colour(p.colour);
      if (this.active(id)) fail("ALREADY_MEMBER", "Leave your current house before creating another.");
      const houseId = randomUUID(), code = this.newCode(), entityRevision = this.setProfile(id, p);
      this.prepared("INSERT INTO houses(id,capacity,owner_id,code,status) VALUES (?,?,?,?,'active')").run(houseId, p.capacity as number, id, code);
      const h = this.prepared("SELECT * FROM houses WHERE id=?").get(houseId) as HomeRow;
      const bedroomId = this.claim(id, h, 0);
      return { streamId: "lounge:" + h.id, entityRevision, result: { houseId, bedroomId } };
    }
    if (c.type === "house.join") {
      keys(p, ["code", "name", "colour"], ["code", "name", "colour"]); text(p.name, 40, true); colour(p.colour);
      const code = text(p.code, 9, true).toUpperCase().replace("-", "");
      if (!/^[0-9A-HJKMNP-TV-Z]{8}$/.test(code)) fail("INVALID_INPUT", "Enter the eight-character house code.");
      const h = this.prepared("SELECT * FROM houses WHERE code=? AND status='active'").get(code) as HomeRow | undefined;
      if (!h) fail("FORBIDDEN", "This invitation is unavailable.");
      const current = this.active(id);
      if (current) {
        if (current.id !== h.id) fail("ALREADY_MEMBER", "Leave your current house before joining another.");
        return { streamId: "lounge:" + h.id, sequence: this.sequence("lounge:" + h.id), entityRevision: this.identity(id).revision, result: { houseId: h.id, bedroomId: current.bedroom_id } };
      }
      if (this.prepared("SELECT 1 FROM removed_guards WHERE house_id=? AND identity_id=?").get(h.id, id)) fail("FORBIDDEN", "The owner must reinstate this identity before it can rejoin.");
      const claimed = this.prepared("SELECT slot FROM members WHERE house_id=? AND status='active'").all(h.id) as { slot: number }[];
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
    if (c.type === "house.voice") {
      keys(p, ["url"], ["url"]);
      if (h.owner_id !== id) fail("FORBIDDEN", "Only the house owner can set the shared Discord destination.");
      const url = parseDiscordDestination(p.url);
      const previous = this.prepared("SELECT url,revision FROM house_voice WHERE house_id=?").get(h.id) as { url: string | null; revision: number } | undefined;
      const currentRevision = previous?.revision ?? 0;
      this.requireRevision(c.expectedRevision, currentRevision);
      this.prepared("INSERT INTO house_voice(house_id,url,revision) VALUES (?,?,?) ON CONFLICT(house_id) DO UPDATE SET url=excluded.url,revision=excluded.revision").run(h.id, url, currentRevision + 1);
      return { streamId: lounge, entityRevision: currentRevision + 1 };
    }
    if(c.type.startsWith("game.")) {
      const state=this.game(h.id), type=c.type.slice(5);
      const fields=type==="join" || type==="leave" ? ["roundId"] : type==="ready" ? ["roundId","rosterRevision"] : type==="resume" ? ["roundId","resumeRevision"] : ["roundId","column"];
      keys(p,fields,fields);
      if(!["join","move"].includes(type) && Object.hasOwn(c,"expectedRevision")) fail("INVALID_INPUT","This table action does not use a position revision.");
      if(type==="join" && (state.current ? p.roundId===null : p.roundId!==null)) fail("GAME_WRONG_ROUND","Choose the current table round; new rounds use a server ID.");
      const roundId=type==="join" && p.roundId===null ? randomUUID() : uuid(p.roundId);
      let action: GameAction;
      if(type==="join" || type==="move") {
        const expectedRevision=revision(c.expectedRevision);
        if(type==="move" && (!Number.isInteger(p.column) || (p.column as number)<0 || (p.column as number)>6))fail("INVALID_INPUT","Choose a column from one to seven.");
        action=type==="join" ? {type,roundId,expectedRevision} : {type,roundId,expectedRevision,column:p.column as number};
      } else if(type==="ready") action={type,roundId,rosterRevision:revision(p.rosterRevision)};
      else if(type==="resume") action={type,roundId,resumeRevision:revision(p.resumeRevision)};
      else action={type:"leave",roundId};
      const transition=applyGameAction(state,action,{actorId:id,isMember:true,isController:!!control?.isController,inLounge:control?.zoneId==="lounge",controlledInLounge:control?.controlledInLounge ?? []},now);
      if(!transition.ok)fail("GAME_"+transition.code.toUpperCase(),"The table changed or this action is unavailable. Reread its current state.");
      if(transition.changed)this.saveGame(h.id,transition.state);
      return {streamId:lounge,entityRevision:transition.state.revision,result:{roundId,code:transition.code},...(!transition.changed ? {sequence:this.sequence(lounge)} : {})};
    }
    if (c.type === "chat.send") {
      keys(p, ["zoneId", "text"], ["zoneId", "text"]);
      const value = text(p.text, 2000, true), zoneId = p.zoneId === "lounge" ? "lounge" : uuid(p.zoneId);
      const r = zoneId === "lounge" ? null : this.access(id, zoneId);
      const streamId = r ? "bedroom:" + r.id : lounge, sequence = this.bump(streamId), chatId = randomUUID();
      this.prepared("INSERT INTO chat(id,zone_id,author_id,name,text,at,sequence) VALUES (?,?,?,?,?,?,?)").run(chatId, streamId, id, this.identity(id).name, value, Date.now(), sequence);
      this.prepared("DELETE FROM chat WHERE at<?").run(Date.now() - CHAT_RETENTION_MS);
      this.prepared("DELETE FROM chat WHERE zone_id=? AND id NOT IN (SELECT id FROM chat WHERE zone_id=? ORDER BY sequence DESC LIMIT 100)").run(streamId, streamId);
      return { streamId, sequence, entityRevision: 0, result: { chatId }, ...(r ? { roomId: r.id } : {}) };
    }
    if (c.type === "room.starter" || c.type === "room.light") {
      const fields = c.type === "room.starter" ? ["roomId", "presetId"] : ["roomId", "light"];
      keys(p, fields, fields);
      const r = this.access(id, uuid(p.roomId));
      if (r.owner_id !== id) fail("FORBIDDEN", "Only the resident may edit their bedroom.");
      this.requireRevision(c.expectedRevision, r.revision);
      if (c.type === "room.starter") {
        if (typeof p.presetId !== "string" || !getRoomPreset(p.presetId)) fail("INVALID_INPUT", "Choose a supported starter room.");
        const starter = instantiateRoomPreset(p.presetId, () => randomUUID());
        this.prepared("UPDATE bedrooms SET placements=?,palette=?,light=?,origin_preset_id=?,origin_preset_version=?,revision=revision+1 WHERE id=?").run(JSON.stringify(starter.placements), starter.palette, starter.light, starter.originPresetId, starter.originPresetVersion, r.id);
      } else {
        if (typeof p.light !== "string" || !ROOM_LIGHTS.includes(p.light as RoomLight)) fail("INVALID_INPUT", "Choose a supported room light.");
        this.prepared("UPDATE bedrooms SET light=?,revision=revision+1 WHERE id=?").run(p.light, r.id);
      }
      return { streamId: "bedroom:" + r.id, roomId: r.id, entityRevision: r.revision + 1, result: { roomId: r.id } };
    }
    if (c.type === "room.configure" || c.type === "room.placements") {
      keys(p, c.type === "room.configure" ? ["roomId", "open", "palette"] : ["roomId", "placements"], c.type === "room.configure" ? ["roomId", "open", "palette"] : ["roomId", "placements"]);
      const r = this.access(id, uuid(p.roomId));
      if (r.owner_id !== id) fail("FORBIDDEN", "Only the resident may edit their bedroom.");
      this.requireRevision(c.expectedRevision, r.revision);
      if (c.type === "room.configure") {
        if (typeof p.open !== "boolean") fail("INVALID_INPUT", "Choose whether your door is open.");
        const palette = colour(p.palette);
        this.prepared("UPDATE bedrooms SET open=?,palette=?,revision=revision+1 WHERE id=?").run(p.open ? 1 : 0, palette, r.id);
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
        this.prepared("UPDATE bedrooms SET placements=?,revision=revision+1 WHERE id=?").run(JSON.stringify(placements), r.id);
      }
      return { streamId: "bedroom:" + r.id, roomId: r.id, entityRevision: r.revision + 1, result: { roomId: r.id } };
    }
    if (c.type === "card.save") {
      keys(p, ["cardId", "smallGoal", "question", "resourceUrl", "nextStep", "helpRequested"], ["smallGoal", "helpRequested"]);
      const smallGoal = text(p.smallGoal, 160, true), question = text(p.question ?? "", 400), resourceUrl = text(p.resourceUrl ?? "", 2048), nextStep = text(p.nextStep ?? "", 400);
      if (resourceUrl) { let url: URL; try { url = new URL(resourceUrl); } catch { return fail("INVALID_INPUT", "Enter an https resource link."); } if (url.protocol !== "https:" || url.username || url.password) fail("INVALID_INPUT", "Enter an https resource link without credentials."); }
      if (typeof p.helpRequested !== "boolean") fail("INVALID_INPUT", "Choose whether help is requested.");
      const requestedId = p.cardId === undefined ? undefined : uuid(p.cardId);
      const existing = requestedId ? this.prepared("SELECT * FROM cards WHERE id=?").get(requestedId) as CardRow | undefined : this.prepared("SELECT * FROM cards WHERE house_id=? AND author_id=? AND state='active'").get(h.id, id) as CardRow | undefined;
      if (requestedId && !existing) fail("FORBIDDEN", "This card is unavailable.");
      if (existing && (existing.author_id !== id || existing.house_id !== h.id)) fail("FORBIDDEN", "Only the author may edit their card.");
      if (existing && existing.state !== "active") fail("FORBIDDEN", "An inactive card is read-only. Start a new current card.");
      this.requireRevision(c.expectedRevision, existing?.revision ?? 0);
      const cardId = existing?.id ?? randomUUID(), entityRevision = (existing?.revision ?? 0) + 1;
      this.prepared("INSERT INTO cards(id,house_id,author_id,small_goal,question,resource_url,next_step,help_requested,state,revision) VALUES (?,?,?,?,?,?,?,?,'active',?) ON CONFLICT(id) DO UPDATE SET small_goal=excluded.small_goal,question=excluded.question,resource_url=excluded.resource_url,next_step=excluded.next_step,help_requested=excluded.help_requested,revision=excluded.revision").run(cardId, h.id, id, smallGoal, question, resourceUrl, nextStep, p.helpRequested ? 1 : 0, entityRevision);
      return { streamId: lounge, entityRevision, result: { cardId } };
    }
    if (c.type === "card.close") {
      keys(p, ["cardId"], ["cardId"]); const cardId = uuid(p.cardId);
      const existing = this.prepared("SELECT * FROM cards WHERE id=?").get(cardId) as CardRow | undefined;
      if (!existing || existing.author_id !== id || existing.house_id !== h.id) fail("FORBIDDEN", "Only the author may close this card.");
      this.requireRevision(c.expectedRevision, existing.revision);
      if (existing.state !== "active") fail("FORBIDDEN", "This card is already inactive.");
      const sequence = this.bump(lounge);
      this.prepared("UPDATE cards SET state='closed',revision=revision+1,inactive_sequence=? WHERE id=?").run(sequence, cardId); this.trimCards(h.id);
      return { streamId: lounge, sequence, entityRevision: existing.revision + 1, result: { cardId } };
    }
    if (c.type === "house.leave") {
      keys(p, []);
      const count = this.prepared("SELECT COUNT(*) AS count FROM members WHERE house_id=? AND status='active'").get(h.id) as { count: number };
      if (h.owner_id === id && count.count > 1) fail("FORBIDDEN", "Transfer ownership before leaving this house.");
      const sequence = this.bump(lounge); this.depart(id, h, false, sequence, now);
      if (count.count === 1) this.prepared("UPDATE houses SET status='archived',code=NULL WHERE id=?").run(h.id);
      return { streamId: lounge, sequence, entityRevision: 0, result: { houseId: h.id, archived: count.count === 1 } };
    }

    keys(p, ["memberId"], ["memberId"]); const target = uuid(p.memberId); this.requireOwner(id, h);
    if (c.type === "house.reinstate") {
      if (!this.prepared("SELECT 1 FROM removed_guards WHERE house_id=? AND identity_id=?").get(h.id, target)) fail("FORBIDDEN", "This identity has no removed membership to reinstate.");
      this.prepared("DELETE FROM removed_guards WHERE house_id=? AND identity_id=?").run(h.id, target);
      return { streamId: lounge, entityRevision: 0, result: { memberId: target } };
    }
    if (target === id) fail("FORBIDDEN", "Choose another current resident.");
    if (!this.prepared("SELECT 1 FROM members WHERE house_id=? AND identity_id=? AND status='active'").get(h.id, target)) fail("FORBIDDEN", "Choose a current member of this house.");
    if (c.type === "house.transfer") {
      this.prepared("UPDATE houses SET owner_id=? WHERE id=?").run(target, h.id);
      return { streamId: lounge, entityRevision: 0, result: { memberId: target } };
    }
    const sequence = this.bump(lounge); this.depart(target, h, true, sequence, now);
    this.prepared("UPDATE houses SET code=? WHERE id=?").run(this.newCode(h.code!), h.id);
    return { streamId: lounge, sequence, entityRevision: 0, result: { memberId: target } };
  }
}
