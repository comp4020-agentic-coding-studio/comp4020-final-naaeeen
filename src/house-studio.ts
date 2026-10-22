import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { HouseError } from "./house-contract.ts";
import { normalizeStudioPng, ROOM_STUDIO_LIMITS } from "./house-studio-codec.ts";
export { ROOM_STUDIO_LIMITS } from "./house-studio-codec.ts";

export type StudioSoundscape = "off" | "rain" | "fire" | "night";
export interface StudioView { x: number; y: number; zoom: number }
export interface StudioImage { id: string; width: number; height: number; bytes: number }
export interface StudioState {
  ok: true; roomId: string; ownerId: string; revision: number; image: StudioImage | null;
  view: StudioView; soundscape: StudioSoundscape; writable: boolean;
}
export interface StudioReceipt {
  ok: true; commandId: string; roomId: string; revision: number;
  result?: { uploadId?: string; expiresAt?: number; nextIndex?: number; receivedBytes?: number; imageId?: string };
}
export interface StudioExportRoom {
  roomId: string; ownerId: string; revision: number; view: StudioView; soundscape: StudioSoundscape;
  image: (StudioImage & { mime: "image/png"; data: string }) | null;
}
export interface StudioOptions {
  authorizeRead: (actorId: string, roomId: string) => { ownerId: string };
  authorizeExport?: (actorId: string) => void;
  now?: () => number;
}
export interface StudioCommand {
  commandId: string; roomId: string; expectedRevision: number;
  type: "studio.upload.begin" | "studio.upload.chunk" | "studio.upload.commit" | "studio.upload.abort" | "studio.view" | "studio.soundscape" | "studio.clear";
  payload: Record<string, unknown>;
}
type Row = {
  room_id: string; owner_id: string; revision: number; image_id: string | null; width: number | null; height: number | null;
  image_bytes: number | null; x: number; y: number; zoom: number; soundscape: StudioSoundscape;
};
type Upload = {
  id: string; actor_id: string; room_id: string; base_revision: number; total_bytes: number; received_bytes: number;
  next_index: number; expires_at: number; data: Uint8Array;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRESETS = ["off", "rain", "fire", "night"];
const COLUMNS = "room_id,owner_id,revision,image_id,width,height,length(image) AS image_bytes,x,y,zoom,soundscape";
function fail(code: string, message: string): never { throw new HouseError(code, message); }
function storageError(error: unknown): never {
  if (error instanceof HouseError) throw error;
  return fail("STORAGE_UNAVAILABLE", "The saved room studio is temporarily unavailable. Please retry.");
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype)
    fail("INVALID_INPUT", "Expected a studio command object.");
  return value as Record<string, unknown>;
}
function fields(value: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(value).length !== allowed.length || allowed.some(key => !Object.hasOwn(value, key)))
    fail("INVALID_INPUT", "The studio command has missing or unsupported fields.");
}
function uuid(value: unknown): string {
  if (typeof value !== "string" || value.length !== 36 || !UUID.test(value)) fail("INVALID_INPUT", "A valid studio UUID is required.");
  return value.toLowerCase();
}
function integer(value: unknown, low: number, high: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < low || (value as number) > high) fail("INVALID_INPUT", "A studio number is outside its supported range.");
  return value as number;
}
function number(value: unknown, low: number, high: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < low || value > high) fail("INVALID_INPUT", "A studio view is outside its supported range.");
  return value;
}
function synchronous(value: unknown): void {
  if (value && (typeof value === "object" || typeof value === "function") && typeof (value as { then?: unknown }).then === "function")
    fail("INVALID_INPUT", "Studio authorization must finish synchronously.");
}
function canonical(value: unknown): string {
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return "{" + Object.keys(object).sort().map(key => JSON.stringify(key) + ":" + canonical(object[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}
function base64(value: unknown): string {
  if (typeof value !== "string" || !value.length || value.length > Math.ceil(ROOM_STUDIO_LIMITS.maxChunkBytes / 3) * 4
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) fail("INVALID_INPUT", "The PNG chunk encoding is invalid.");
  const decoded = Buffer.from(value, "base64");
  if (!decoded.length || decoded.length > ROOM_STUDIO_LIMITS.maxChunkBytes || decoded.toString("base64") !== value)
    fail("INVALID_INPUT", "The PNG chunk encoding is invalid.");
  return value;
}
function parseCommand(input: unknown): StudioCommand {
  const c = record(input); fields(c, ["commandId", "roomId", "expectedRevision", "type", "payload"]);
  const commandId = uuid(c.commandId), roomId = uuid(c.roomId), expectedRevision = integer(c.expectedRevision, 0, Number.MAX_SAFE_INTEGER - 1), p = record(c.payload);
  let payload: Record<string, unknown>;
  switch (c.type) {
    case "studio.upload.begin":
      fields(p, ["bytes", "mime"]); if (p.mime !== "image/png") fail("INVALID_INPUT", "Only a static PNG can be selected.");
      payload = { bytes: integer(p.bytes, 1, ROOM_STUDIO_LIMITS.maxImageBytes), mime: "image/png" }; break;
    case "studio.upload.chunk":
      fields(p, ["uploadId", "index", "data"]);
      payload = { uploadId: uuid(p.uploadId), index: integer(p.index, 0, ROOM_STUDIO_LIMITS.maxUploadChunks - 1), data: base64(p.data) }; break;
    case "studio.upload.commit": case "studio.upload.abort":
      fields(p, ["uploadId"]); payload = { uploadId: uuid(p.uploadId) }; break;
    case "studio.view":
      fields(p, ["x", "y", "zoom"]); payload = { x: number(p.x, 0, 1), y: number(p.y, 0, 1), zoom: number(p.zoom, 1, 4) }; break;
    case "studio.soundscape":
      fields(p, ["preset"]); if (typeof p.preset !== "string" || !PRESETS.includes(p.preset)) fail("INVALID_INPUT", "Choose a supported room soundscape.");
      payload = { preset: p.preset }; break;
    case "studio.clear": fields(p, []); payload = {}; break;
    default: return fail("INVALID_INPUT", "Unknown studio action.");
  }
  const command = { commandId, roomId, expectedRevision, type: c.type, payload } as StudioCommand;
  if (Buffer.byteLength(JSON.stringify(input)) > 16 * 1024) fail("INVALID_INPUT", "The studio command exceeds the request limit.");
  return command;
}
function imageMetadata(row: Row): StudioImage | null {
  if (!row.image_id) return null;
  return { id: row.image_id, width: row.width!, height: row.height!, bytes: row.image_bytes! };
}
function validateRow(row: Row): Row {
  const valid = Number.isSafeInteger(row.revision) && row.revision >= 0 && row.revision < Number.MAX_SAFE_INTEGER
    && PRESETS.includes(row.soundscape) && Number.isFinite(row.x) && row.x >= 0 && row.x <= 1
    && Number.isFinite(row.y) && row.y >= 0 && row.y <= 1 && Number.isFinite(row.zoom) && row.zoom >= 1 && row.zoom <= 4;
  const validImage = row.image_id === null ? row.width === null && row.height === null && row.image_bytes === null
    : UUID.test(row.image_id) && Number.isInteger(row.width) && Number.isInteger(row.height)
      && row.width! > 0 && row.height! > 0 && row.width! <= ROOM_STUDIO_LIMITS.maxEdge && row.height! <= ROOM_STUDIO_LIMITS.maxEdge
      && row.width! * row.height! <= ROOM_STUDIO_LIMITS.maxPixels && Number.isInteger(row.image_bytes)
      && row.image_bytes! > 0 && row.image_bytes! <= ROOM_STUDIO_LIMITS.maxImageBytes;
  if (!valid || !validImage) fail("STORAGE_UNAVAILABLE", "The saved room studio is invalid.");
  return row;
}

/** Separate connection, same house file. No HouseStore transaction/callback is nested. */
export class RoomStudioStore {
  private readonly db!: DatabaseSync;
  private readonly options: StudioOptions;
  private closed = false;
  private readonly statements = new Map<string, StatementSync>();
  constructor(path: string, options: StudioOptions) {
    if (!existsSync(path)) fail("STORAGE_UNAVAILABLE", "Open the existing house database before its studio.");
    if (!options || typeof options.authorizeRead !== "function") fail("INVALID_INPUT", "Current room authorization is required.");
    this.options = options;
    try { this.db = new DatabaseSync(path); } catch (error) { return storageError(error); }
    try {
      this.db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;");
      this.db.prepare("SELECT id,owner_id FROM bedrooms LIMIT 0").all();
      this.transaction(() => {
        this.db.exec("CREATE TABLE IF NOT EXISTS room_studio_meta (singleton INTEGER PRIMARY KEY CHECK(singleton=1),version INTEGER NOT NULL); INSERT OR IGNORE INTO room_studio_meta(singleton,version) VALUES(1,1);");
        if ((this.prepared("SELECT version FROM room_studio_meta WHERE singleton=1").get() as { version: number }).version !== 1)
          fail("STORAGE_UNAVAILABLE", "Unsupported room studio schema version.");
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS room_studio_rooms (
            room_id TEXT PRIMARY KEY REFERENCES bedrooms(id), owner_id TEXT NOT NULL REFERENCES identities(id),
            revision INTEGER NOT NULL CHECK(revision>=0), image_id TEXT UNIQUE, image BLOB, width INTEGER, height INTEGER,
            x REAL NOT NULL CHECK(x BETWEEN 0 AND 1), y REAL NOT NULL CHECK(y BETWEEN 0 AND 1), zoom REAL NOT NULL CHECK(zoom BETWEEN 1 AND 4),
            soundscape TEXT NOT NULL CHECK(soundscape IN ('off','rain','fire','night')),
            CHECK((image_id IS NULL AND image IS NULL AND width IS NULL AND height IS NULL) OR
              (image_id IS NOT NULL AND typeof(image)='blob' AND length(image) BETWEEN 1 AND 262144 AND width BETWEEN 1 AND 2048 AND height BETWEEN 1 AND 2048 AND width*height<=1048576))
          );
          CREATE INDEX IF NOT EXISTS room_studio_rooms_owner ON room_studio_rooms(owner_id,room_id);
          CREATE TABLE IF NOT EXISTS room_studio_uploads (
            id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES identities(id), room_id TEXT NOT NULL REFERENCES bedrooms(id),
            base_revision INTEGER NOT NULL, total_bytes INTEGER NOT NULL CHECK(total_bytes BETWEEN 1 AND 262144),
            received_bytes INTEGER NOT NULL CHECK(received_bytes BETWEEN 0 AND total_bytes),
            next_index INTEGER NOT NULL CHECK(next_index BETWEEN 0 AND 32), expires_at INTEGER NOT NULL, data BLOB NOT NULL,
            CHECK(typeof(data)='blob' AND length(data)=received_bytes)
          );
          CREATE INDEX IF NOT EXISTS room_studio_uploads_actor ON room_studio_uploads(actor_id);
          CREATE TABLE IF NOT EXISTS room_studio_receipts (
            actor_id TEXT NOT NULL REFERENCES identities(id), command_id TEXT NOT NULL, room_id TEXT NOT NULL REFERENCES bedrooms(id),
            command_hash TEXT NOT NULL CHECK(length(command_hash)=64), response TEXT NOT NULL CHECK(length(response)<=512),
            PRIMARY KEY(actor_id,command_id)
          );
        `);
        this.prune(this.now());
      });
    } catch (error) { this.closed = true; this.statements.clear(); this.db.close(); storageError(error); }
  }
  private prepared(sql: string): StatementSync {
    this.requireOpen();
    let statement = this.statements.get(sql);
    if (!statement) {
      if (this.statements.size >= 48) fail("STORAGE_UNAVAILABLE", "The studio query catalogue exceeds its supported bound.");
      statement = this.db.prepare(sql); this.statements.set(sql, statement);
    }
    return statement;
  }
  private requireOpen(): void { if (this.closed) fail("STORAGE_UNAVAILABLE", "The room studio connection is closed."); }
  private now(): number { return integer((this.options.now ?? Date.now)(), 0, Number.MAX_SAFE_INTEGER - ROOM_STUDIO_LIMITS.uploadTtlMs); }
  private transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = work(); this.db.exec("COMMIT"); return result; }
    catch (error) { try { this.db.exec("ROLLBACK"); } catch { /* Keep the original error. */ } throw error; }
  }
  private authorizeRead(actorId: string, roomId: string): string {
    this.requireOpen();
    const result = this.options.authorizeRead(actorId, roomId); synchronous(result);
    return uuid(result?.ownerId);
  }
  private authorizeExport(actorId: string): void {
    this.requireOpen(); if (this.options.authorizeExport) synchronous(this.options.authorizeExport(actorId));
  }
  private row(roomId: string): Row | undefined {
    const row = this.prepared("SELECT " + COLUMNS + " FROM room_studio_rooms WHERE room_id=?").get(roomId) as Row | undefined;
    return row && validateRow(row);
  }
  private checkOwner(row: Row | undefined, ownerId: string): void {
    if (row && row.owner_id !== ownerId) fail("FORBIDDEN", "This studio belongs to its original room owner.");
  }
  private project(roomId: string, ownerId: string, actorId: string, row?: Row): StudioState {
    return { ok: true, roomId, ownerId, revision: row?.revision ?? 0, image: row ? imageMetadata(row) : null,
      view: row ? { x: row.x, y: row.y, zoom: row.zoom } : { x: .5, y: .5, zoom: 1 },
      soundscape: row?.soundscape ?? "off", writable: actorId === ownerId };
  }
  state(actorId: string, roomId: string): StudioState {
    try {
      actorId = uuid(actorId); roomId = uuid(roomId);
      const ownerId = this.authorizeRead(actorId, roomId), row = this.row(roomId); this.checkOwner(row, ownerId);
      return this.project(roomId, ownerId, actorId, row);
    } catch (error) { return storageError(error); }
  }
  image(actorId: string, roomId: string, imageId: string): { bytes: Buffer; mime: "image/png"; image: StudioImage } {
    try {
      actorId = uuid(actorId); roomId = uuid(roomId); imageId = uuid(imageId);
      const ownerId = this.authorizeRead(actorId, roomId), row = this.row(roomId); this.checkOwner(row, ownerId);
      if (!row?.image_id || row.image_id !== imageId) fail("FORBIDDEN", "This room reference is no longer selected.");
      const value = this.prepared("SELECT image FROM room_studio_rooms WHERE room_id=? AND image_id=?").get(roomId, imageId) as { image: Uint8Array };
      return { bytes: Buffer.from(value.image), mime: "image/png", image: imageMetadata(row)! };
    } catch (error) { return storageError(error); }
  }
  private exportRow(row: Row): StudioExportRoom {
    const state = this.project(row.room_id, row.owner_id, row.owner_id, row), image = state.image;
    const value = image ? this.prepared("SELECT image FROM room_studio_rooms WHERE room_id=?").get(row.room_id) as { image: Uint8Array } : null;
    return { roomId: row.room_id, ownerId: row.owner_id, revision: state.revision, view: state.view, soundscape: state.soundscape,
      image: image ? { ...image, mime: "image/png", data: Buffer.from(value!.image).toString("base64") } : null };
  }
  exportOwn(actorId: string, cursor?: string): { schemaVersion: 1; rooms: StudioExportRoom[]; nextCursor: string | null } {
    try {
      actorId = uuid(actorId); if (cursor !== undefined) cursor = uuid(cursor); this.authorizeExport(actorId);
      const rows = this.prepared("SELECT " + COLUMNS + " FROM room_studio_rooms WHERE owner_id=? AND room_id>? ORDER BY room_id LIMIT 3").all(actorId, cursor ?? "") as Row[];
      return { schemaVersion: 1, rooms: rows.slice(0, 2).map(row => this.exportRow(validateRow(row))), nextCursor: rows.length > 2 ? rows[1]!.room_id : null };
    } catch (error) { return storageError(error); }
  }
  exportRoom(actorId: string, roomId: string): StudioExportRoom {
    try {
      actorId = uuid(actorId); roomId = uuid(roomId); this.authorizeExport(actorId);
      const row = this.row(roomId); if (!row || row.owner_id !== actorId) fail("FORBIDDEN", "Only the original room owner can export this material.");
      return this.exportRow(row);
    } catch (error) { return storageError(error); }
  }
  private prune(now: number): void { this.prepared("DELETE FROM room_studio_uploads WHERE expires_at<=?").run(now); }
  private upload(actorId: string, command: StudioCommand, now: number): Upload {
    const upload = this.prepared("SELECT * FROM room_studio_uploads WHERE id=? AND actor_id=? AND room_id=? AND expires_at>?")
      .get(command.payload.uploadId as string, actorId, command.roomId, now) as Upload | undefined;
    if (!upload) fail("UPLOAD_EXPIRED", "This temporary upload has expired or is unavailable. Choose the PNG again.");
    if (upload.base_revision !== command.expectedRevision) fail("REVISION_CONFLICT", "The room changed after this upload started. Choose the PNG again.");
    return upload;
  }
  private updateRoom(command: StudioCommand, sql: string, values: (string | number | Buffer | null)[] = []): number {
    const next = command.expectedRevision + 1;
    this.prepared("UPDATE room_studio_rooms SET " + sql + ",revision=? WHERE room_id=?").run(...values, next, command.roomId);
    return next;
  }
  execute(actorId: string, untrusted: unknown, authorizeWrite: () => void): StudioReceipt {
    try {
      actorId = uuid(actorId); const command = parseCommand(untrusted), now = this.now();
      // No studio transaction is held while parent callbacks read/write HouseStore.
      const ownerId = this.authorizeRead(actorId, command.roomId);
      if (ownerId !== actorId) fail("FORBIDDEN", "Only the original room owner can change this studio.");
      if (typeof authorizeWrite !== "function") fail("INVALID_INPUT", "Current room control is required.");
      synchronous(authorizeWrite());
      const hash = createHash("sha256").update(actorId + "\n" + canonical(command)).digest("hex");
      return this.transaction(() => {
        const row = this.row(command.roomId); this.checkOwner(row, ownerId);
        const previous = this.prepared("SELECT command_hash,response FROM room_studio_receipts WHERE actor_id=? AND command_id=?").get(actorId, command.commandId) as { command_hash: string; response: string } | undefined;
        if (previous) {
          if (previous.command_hash !== hash) fail("COMMAND_ID_REUSED", "This studio command ID already belongs to another action.");
          return JSON.parse(previous.response) as StudioReceipt;
        }
        if (command.type !== "studio.upload.abort" && command.expectedRevision !== (row?.revision ?? 0))
          fail("REVISION_CONFLICT", "The room studio changed. Keep your local image and reread the saved state.");
        const quota = this.prepared("SELECT count(*) AS count,coalesce(sum(length(response)),0) AS bytes FROM room_studio_receipts WHERE actor_id=?").get(actorId) as { count: number; bytes: number };
        if (quota.count >= ROOM_STUDIO_LIMITS.maxReceiptsPerActor) fail("STUDIO_LIMIT", "This identity reached its studio receipt limit. Existing material remains available.");
        this.prune(now);
        if (!row) this.prepared("INSERT INTO room_studio_rooms(room_id,owner_id,revision,x,y,zoom,soundscape) VALUES(?,?,0,0.5,0.5,1,'off')").run(command.roomId, ownerId);
        const receipt: StudioReceipt = { ok: true, commandId: command.commandId, roomId: command.roomId, revision: row?.revision ?? 0 };
        const p = command.payload;
        switch (command.type) {
          case "studio.upload.begin": {
            const count = this.prepared("SELECT count(*) AS total,coalesce(sum(actor_id=?),0) AS actor FROM room_studio_uploads").get(actorId) as { total: number; actor: number };
            if (count.actor >= ROOM_STUDIO_LIMITS.maxUploadsPerActor || count.total >= ROOM_STUDIO_LIMITS.maxUploads) fail("STUDIO_LIMIT", "Too many PNG uploads are pending. Finish or cancel one first.");
            const uploadId = randomUUID(), expiresAt = now + ROOM_STUDIO_LIMITS.uploadTtlMs;
            this.prepared("INSERT INTO room_studio_uploads(id,actor_id,room_id,base_revision,total_bytes,received_bytes,next_index,expires_at,data) VALUES(?,?,?,?,?,0,0,?,?)")
              .run(uploadId, actorId, command.roomId, command.expectedRevision, p.bytes as number, expiresAt, Buffer.alloc(0));
            receipt.result = { uploadId, expiresAt, nextIndex: 0, receivedBytes: 0 }; break;
          }
          case "studio.upload.chunk": {
            const upload = this.upload(actorId, command, now);
            if (p.index !== upload.next_index) fail("UPLOAD_CONFLICT", "Send the next PNG chunk, or retry its original command ID.");
            const data = Buffer.from(p.data as string, "base64"), remaining = upload.total_bytes - upload.received_bytes;
            if (!remaining || data.length !== Math.min(ROOM_STUDIO_LIMITS.maxChunkBytes, remaining)) fail("INVALID_INPUT", "The PNG chunk does not match its declared remaining bytes.");
            const nextIndex = upload.next_index + 1, receivedBytes = upload.received_bytes + data.length;
            this.prepared("UPDATE room_studio_uploads SET data=?,received_bytes=?,next_index=? WHERE id=?")
              .run(Buffer.concat([upload.data, data]), receivedBytes, nextIndex, upload.id);
            receipt.result = { uploadId: upload.id, nextIndex, receivedBytes }; break;
          }
          case "studio.upload.commit": {
            const upload = this.upload(actorId, command, now);
            if (upload.received_bytes !== upload.total_bytes) fail("UPLOAD_INCOMPLETE", "The PNG upload is incomplete. Keep the selected local image.");
            const image = normalizeStudioPng(Buffer.from(upload.data));
            const owned = this.prepared("SELECT coalesce(sum(length(image)),0) AS bytes FROM room_studio_rooms WHERE owner_id=?").get(actorId) as { bytes: number };
            if (owned.bytes - (row?.image_bytes ?? 0) + image.bytes.length > ROOM_STUDIO_LIMITS.maxOwnerImageBytes)
              fail("STUDIO_LIMIT", "Active and archived room references reached this identity's 8 MiB image limit.");
            const imageId = randomUUID();
            receipt.revision = this.updateRoom(command, "image_id=?,image=?,width=?,height=?,x=0.5,y=0.5,zoom=1", [imageId, image.bytes, image.width, image.height]);
            this.prepared("DELETE FROM room_studio_uploads WHERE id=?").run(upload.id);
            receipt.result = { imageId }; break;
          }
          case "studio.upload.abort":
            this.prepared("DELETE FROM room_studio_uploads WHERE id=? AND actor_id=? AND room_id=?").run(p.uploadId as string, actorId, command.roomId); break;
          case "studio.view":
            if (!row?.image_id) fail("INVALID_INPUT", "Choose a PNG before saving its view.");
            receipt.revision = this.updateRoom(command, "x=?,y=?,zoom=?", [p.x as number, p.y as number, p.zoom as number]); break;
          case "studio.soundscape":
            receipt.revision = this.updateRoom(command, "soundscape=?", [p.preset as string]); break;
          case "studio.clear":
            receipt.revision = this.updateRoom(command, "image_id=NULL,image=NULL,width=NULL,height=NULL,x=0.5,y=0.5,zoom=1"); break;
        }
        const response = JSON.stringify(receipt), bytes = Buffer.byteLength(response);
        if (bytes > 512) fail("STORAGE_UNAVAILABLE", "The studio receipt exceeds its supported bound.");
        if (quota.bytes + bytes > ROOM_STUDIO_LIMITS.maxReceiptBytesPerActor) fail("STUDIO_LIMIT", "This identity reached its studio receipt byte limit. Existing material remains available.");
        this.prepared("INSERT INTO room_studio_receipts(actor_id,command_id,room_id,command_hash,response) VALUES(?,?,?,?,?)")
          .run(actorId, command.commandId, command.roomId, hash, response);
        return receipt;
      });
    } catch (error) { return storageError(error); }
  }
  close(): void {
    if (this.closed) return;
    this.closed = true; this.statements.clear(); this.db.close();
  }
}

