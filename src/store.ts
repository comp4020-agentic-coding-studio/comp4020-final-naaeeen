import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { canonicalCommand, createFurniture, DomainError, mutateFurniture, validateContribution, validateProfile } from "./domain.ts";
import type { Furniture } from "./domain.ts";

export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export interface Identity { visitorId: string; token: string; digest: string; created: boolean }
export interface Command { commandId: string; type: string; targetId: string; expectedRevision: number; payload: Record<string, unknown> }
export interface Receipt { ok: true; commandId: string; sequence: number; entityRevision: number; changed: boolean }
export interface Visitor { id: string; name: string; windowColour: string; published: boolean; revision: number }
export interface Part { id: string; owner: string; name: string; colour: string; note: string; revision: number }
export interface State {
  schemaVersion: 1; sequence: number; visitor: Visitor;
  room: { id: string; revision: number; furniture: Furniture[] };
  lantern: { parts: Part[]; ownRevision: number }; neighbours: Omit<Visitor, "published">[];
  catalogueVersion: 1;
}
interface VisitorRow { id: string; name: string; window_colour: string; published: number; revision: number }
interface RoomRow { id: string; revision: number; furniture: string }
interface PartRow { id: string; owner: string; name: string; colour: string; note: string; revision: number }

export function sessionDigest(token: string): string { return createHash("sha256").update(token).digest("hex"); }
function visitorProjection(row: VisitorRow): Visitor {
  return { id: row.id, name: row.name, windowColour: row.window_colour, published: row.published === 1, revision: row.revision };
}
function publicVisitor(row: VisitorRow): Omit<Visitor, "published"> {
  return { id: row.id, name: row.name, windowColour: row.window_colour, revision: row.revision };
}
function storageError(error: unknown): never {
  if (error instanceof DomainError) throw error;
  throw new DomainError("STORAGE_UNAVAILABLE", "The saved neighbourhood is temporarily unavailable. Please retry.");
}

/** A synchronous transaction boundary keeps state and receipts in the same durable commit. */
export class Store {
  readonly db: DatabaseSync;
  private closed = false;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    try {
      this.db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;");
      const version = (this.db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
      if (version !== 0 && version !== 1) throw new Error("Unsupported database schema");
      if (version === 0) {
        this.transaction(() => {
          this.db.exec(`
            CREATE TABLE meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
            INSERT INTO meta (key, value) VALUES ('sequence', 0);
            CREATE TABLE visitors (id TEXT PRIMARY KEY, name TEXT NOT NULL, window_colour TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 0, updated_sequence INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE sessions (token_digest TEXT PRIMARY KEY, visitor_id TEXT NOT NULL REFERENCES visitors(id), expires_at INTEGER NOT NULL);
            CREATE TABLE rooms (id TEXT PRIMARY KEY, visitor_id TEXT NOT NULL UNIQUE REFERENCES visitors(id), revision INTEGER NOT NULL DEFAULT 0, furniture TEXT NOT NULL);
            CREATE TABLE parts (owner TEXT PRIMARY KEY REFERENCES visitors(id), id TEXT NOT NULL UNIQUE, colour TEXT NOT NULL, note TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 0, updated_sequence INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE receipts (command_id TEXT PRIMARY KEY, visitor_id TEXT NOT NULL REFERENCES visitors(id), command_hash TEXT NOT NULL, response TEXT NOT NULL);
            CREATE INDEX visitors_published_sequence ON visitors(published, updated_sequence DESC);
            CREATE INDEX parts_active_sequence ON parts(active, updated_sequence DESC);
            PRAGMA user_version=1;
          `);
        });
      }
      this.sequence();
    } catch (error) { this.db.close(); this.closed = true; storageError(error); }
  }
  private transaction<T>(action: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const value = action(); this.db.exec("COMMIT"); return value; }
    catch (error) { try { this.db.exec("ROLLBACK"); } catch { /* Retain the original failure. */ } throw error; }
  }
  sequence(): number {
    const row = this.db.prepare("SELECT value FROM meta WHERE key='sequence'").get() as { value: number } | undefined;
    if (!row || !Number.isSafeInteger(row.value) || row.value < 0) throw new DomainError("STORAGE_UNAVAILABLE", "The saved neighbourhood cannot be read.");
    return row.value;
  }
  ready(): boolean {
    try { return !this.closed && this.sequence() >= 0; } catch { return false; }
  }
  ensureSession(token?: string): Identity {
    try {
      if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
        const digest = sessionDigest(token);
        const row = this.db.prepare("SELECT visitor_id FROM sessions WHERE token_digest=? AND expires_at>?").get(digest, Date.now()) as { visitor_id: string } | undefined;
        if (row) return { visitorId: row.visitor_id, token, digest, created: false };
      }
      const nextToken = randomBytes(32).toString("base64url"); const digest = sessionDigest(nextToken); const visitorId = randomUUID();
      this.transaction(() => {
        this.db.prepare("INSERT INTO visitors (id, name, window_colour) VALUES (?, ?, ?)").run(visitorId, "Night visitor", "amber");
        this.db.prepare("INSERT INTO rooms (id, visitor_id, furniture) VALUES (?, ?, ?)").run(randomUUID(), visitorId, JSON.stringify(createFurniture(visitorId)));
        this.db.prepare("INSERT INTO sessions (token_digest, visitor_id, expires_at) VALUES (?, ?, ?)").run(digest, visitorId, Date.now() + SESSION_SECONDS * 1000);
      });
      return { visitorId, token: nextToken, digest, created: true };
    } catch (error) { return storageError(error); }
  }
  session(digest: string): { visitorId: string } | undefined {
    const row = this.db.prepare("SELECT visitor_id FROM sessions WHERE token_digest=? AND expires_at>?").get(digest, Date.now()) as { visitor_id: string } | undefined;
    return row ? { visitorId: row.visitor_id } : undefined;
  }
  state(visitorId: string): State {
    try {
      const visitor = this.db.prepare("SELECT id, name, window_colour, published, revision FROM visitors WHERE id=?").get(visitorId) as unknown as VisitorRow | undefined;
      const room = this.db.prepare("SELECT id, revision, furniture FROM rooms WHERE visitor_id=?").get(visitorId) as unknown as RoomRow | undefined;
      if (!visitor || !room) throw new DomainError("FORBIDDEN", "This visitor's room is unavailable.");
      const neighbours = this.db.prepare("SELECT id, name, window_colour, published, revision FROM visitors WHERE published=1 ORDER BY updated_sequence DESC, id LIMIT 8").all() as unknown as VisitorRow[];
      if (visitor.published === 1 && !neighbours.some((row) => row.id === visitorId)) neighbours.push(visitor);
      const parts = this.db.prepare("SELECT p.id, p.owner, v.name, p.colour, p.note, p.revision FROM parts p JOIN visitors v ON v.id=p.owner WHERE p.active=1 ORDER BY p.updated_sequence DESC, p.id LIMIT 8").all() as unknown as PartRow[];
      const own = this.db.prepare("SELECT p.id, p.owner, v.name, p.colour, p.note, p.revision, p.active FROM parts p JOIN visitors v ON v.id=p.owner WHERE p.owner=?").get(visitorId) as (PartRow & { active: number }) | undefined;
      if (own?.active === 1 && !parts.some((row) => row.owner === visitorId)) {
        parts.push({ id: own.id, owner: own.owner, name: own.name, colour: own.colour, note: own.note, revision: own.revision });
      }
      return { schemaVersion: 1, sequence: this.sequence(), visitor: visitorProjection(visitor), room: { id: room.id, revision: room.revision, furniture: JSON.parse(room.furniture) as Furniture[] }, lantern: { parts, ownRevision: own?.revision ?? 0 }, neighbours: neighbours.map(publicVisitor), catalogueVersion: 1 };
    } catch (error) { return storageError(error); }
  }
  execute(visitorId: string, untrustedCommand: unknown): Receipt {
    try {
      const canonical = canonicalCommand(untrustedCommand);
      const command = JSON.parse(canonical) as Command;
      const hash = createHash("sha256").update(visitorId + "\n" + canonical).digest("hex");
      return this.transaction(() => {
        const previous = this.db.prepare("SELECT visitor_id, command_hash, response FROM receipts WHERE command_id=?").get(command.commandId) as { visitor_id: string; command_hash: string; response: string } | undefined;
        if (previous) {
          if (previous.visitor_id !== visitorId || previous.command_hash !== hash) throw new DomainError("COMMAND_ID_REUSED", "This command ID was already used for another edit.");
          return JSON.parse(previous.response) as Receipt;
        }
        const visitor = this.db.prepare("SELECT id, name, window_colour, published, revision FROM visitors WHERE id=?").get(visitorId) as unknown as VisitorRow | undefined;
        if (!visitor) throw new DomainError("FORBIDDEN", "A current visitor session is required.");
        let apply: (sequence: number) => void;
        let entityRevision: number;
        if (command.type === "window.configure") {
          this.requireOwner(command.targetId, visitorId); this.requireRevision(command.expectedRevision, visitor.revision);
          const profile = validateProfile(command.payload); entityRevision = visitor.revision + 1;
          apply = (sequence) => { this.db.prepare("UPDATE visitors SET name=?, window_colour=?, published=1, revision=?, updated_sequence=? WHERE id=?").run(profile.name, profile.windowColour, entityRevision, sequence, visitorId); };
        } else if (command.type === "placement.move" || command.type === "placement.rotate") {
          const room = this.db.prepare("SELECT id, revision, furniture FROM rooms WHERE visitor_id=?").get(visitorId) as unknown as RoomRow;
          const next = mutateFurniture(JSON.parse(room.furniture) as Furniture[], command, visitorId); entityRevision = next.entityRevision;
          apply = () => { this.db.prepare("UPDATE rooms SET furniture=?, revision=? WHERE id=?").run(JSON.stringify(next.furniture), room.revision + 1, room.id); };
        } else {
          this.requireOwner(command.targetId, visitorId);
          const part = this.db.prepare("SELECT id, revision FROM parts WHERE owner=?").get(visitorId) as { id: string; revision: number } | undefined;
          this.requireRevision(command.expectedRevision, part?.revision ?? 0); entityRevision = (part?.revision ?? 0) + 1;
          if (command.type === "contribution.put") {
            const contribution = validateContribution(command.payload);
            apply = (sequence) => { this.db.prepare("INSERT INTO parts (owner, id, colour, note, revision, active, updated_sequence) VALUES (?, ?, ?, ?, ?, 1, ?) ON CONFLICT(owner) DO UPDATE SET colour=excluded.colour, note=excluded.note, revision=excluded.revision, active=1, updated_sequence=excluded.updated_sequence").run(visitorId, part?.id ?? randomUUID(), contribution.colour, contribution.note, entityRevision, sequence); };
          } else {
            apply = (sequence) => { this.db.prepare("INSERT INTO parts (owner, id, colour, note, revision, active, updated_sequence) VALUES (?, ?, ?, '', ?, 0, ?) ON CONFLICT(owner) DO UPDATE SET note='', revision=excluded.revision, active=0, updated_sequence=excluded.updated_sequence").run(visitorId, part?.id ?? randomUUID(), "#ffc47b", entityRevision, sequence); };
          }
        }
        const sequence = this.sequence() + 1;
        apply(sequence);
        this.db.prepare("UPDATE meta SET value=? WHERE key='sequence'").run(sequence);
        const receipt: Receipt = { ok: true, commandId: command.commandId, sequence, entityRevision, changed: true };
        this.db.prepare("INSERT INTO receipts (command_id, visitor_id, command_hash, response) VALUES (?, ?, ?, ?)").run(command.commandId, visitorId, hash, JSON.stringify(receipt));
        return receipt;
      });
    } catch (error) { return storageError(error); }
  }
  private requireOwner(target: string, visitorId: string): void { if (target !== visitorId) throw new DomainError("FORBIDDEN", "You can edit only your own window and lantern part."); }
  private requireRevision(expected: number, actual: number): void { if (expected !== actual) throw new DomainError("REVISION_CONFLICT", "This item changed. Reread the saved state before trying again."); }
  close(): void { if (!this.closed) { this.closed = true; this.db.close(); } }
}
