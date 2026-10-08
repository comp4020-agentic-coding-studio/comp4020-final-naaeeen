import { crc32 } from "node:zlib";
import { createHash } from "node:crypto";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { BOARD_LIMITS, BoardError, boardCanonical, boardFail, boardId, boardKeys, boardObject, boardText, boardUuid, orderBoardElements, validateBoardPatch, winningBoardElement } from "./board-contract.ts";
import type { BoardChat, BoardElement, BoardFile, BoardReceipt, BoardSnapshot } from "./board-contract.ts";
type ElementRow = {
    id: string;
    value: string;
    author_id: string;
};
type AssetRow = {
    id: string;
    mime_type: string;
    created: number;
    bytes: Uint8Array;
    digest: string;
};
const retentionMs = BOARD_LIMITS.chatDays * 86400000;
const storageError = (error: unknown): never => {
    if (error instanceof BoardError)
        throw error;
    return boardFail("STORAGE_UNAVAILABLE", "The board could not be saved. Keep your local work and retry.");
};
/** Separate database; receipt and authoritative winners commit in the same transaction. */
export class BoardStore {
    readonly db!: DatabaseSync;
    private closed = false;
    private utf8Storage = true;
    private readonly statements = new Map<string, StatementSync>();
    private prepared(sql: string): StatementSync {
        let s = this.statements.get(sql);
        if (!s) {
            s = this.db.prepare(sql);
            this.statements.set(sql, s);
        }
        return s;
    }
    constructor(path: string) {
        try {
            this.db = new DatabaseSync(path);
        }
        catch (e) {
            storageError(e);
        }
        try {
            const version = (this.prepared("PRAGMA user_version").get() as {
                user_version: number;
            }).user_version;
            if (version !== 0 && version !== 1)
                boardFail("STORAGE_UNAVAILABLE", "This board database version is unsupported.");
            if (version === 0) {
                if (this.prepared("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get())
                    boardFail("STORAGE_UNAVAILABLE", "The board data path contains a different database.");
                this.db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
                this.transaction(() => this.db.exec(`
 CREATE TABLE boards(house_id TEXT PRIMARY KEY,sequence INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE elements(house_id TEXT NOT NULL REFERENCES boards(house_id),id TEXT NOT NULL,value TEXT NOT NULL,author_id TEXT NOT NULL,PRIMARY KEY(house_id,id));
 CREATE TABLE contributions(house_id TEXT NOT NULL REFERENCES boards(house_id),actor_id TEXT NOT NULL,id TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(house_id,actor_id,id));
 CREATE TABLE assets(house_id TEXT NOT NULL REFERENCES boards(house_id),id TEXT NOT NULL,mime_type TEXT NOT NULL,bytes BLOB NOT NULL,digest TEXT NOT NULL,author_id TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(house_id,id));
 CREATE TABLE chat(house_id TEXT NOT NULL REFERENCES boards(house_id),id TEXT NOT NULL,author_id TEXT NOT NULL,name TEXT NOT NULL,text TEXT NOT NULL,at INTEGER NOT NULL,sequence INTEGER NOT NULL,PRIMARY KEY(house_id,id));
 CREATE INDEX chat_house_sequence ON chat(house_id,sequence);
 CREATE TABLE receipts(actor_id TEXT NOT NULL,id TEXT NOT NULL,command_hash TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(actor_id,id));
 PRAGMA user_version=1;`));
            }
            else {
                const required = ["boards", "elements", "contributions", "assets", "chat", "receipts"];
                const tables = (this.prepared("SELECT name FROM sqlite_master WHERE type='table'").all() as {
                    name: string;
                }[]).map(r => r.name);
                if (required.some(t => !tables.includes(t)))
                    boardFail("STORAGE_UNAVAILABLE", "The board data path contains a different database.");
                this.db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
            }
            this.utf8Storage = (this.prepared("PRAGMA encoding").get() as { encoding: string }).encoding === "UTF-8";
            this.prepared("SELECT house_id FROM boards LIMIT 1").get();
        }
        catch (e) {
            this.closed = true;
            this.db.close();
            storageError(e);
        }
    }
    private transaction<T>(action: () => T): T {
        this.db.exec("BEGIN IMMEDIATE");
        try {
            const result = action();
            this.db.exec("COMMIT");
            return result;
        }
        catch (e) {
            try {
                this.db.exec("ROLLBACK");
            }
            catch {
            }
            throw e;
        }
    }
    ready(): boolean {
        try {
            if (this.closed)
                return false;
            this.prepared("SELECT house_id FROM boards LIMIT 1").get();
            return true;
        }
        catch {
            return false;
        }
    }
    close(): void {
        if (!this.closed) {
            this.closed = true;
            this.statements.clear();
            this.db.close();
        }
    }
    private sequence(houseId: string): number {
        return (this.prepared("SELECT sequence FROM boards WHERE house_id=?").get(houseId) as {
            sequence: number;
        } | undefined)?.sequence ?? 0;
    }
    currentSequence(houseId: string): number {
        try {
            boardUuid(houseId);
            return this.sequence(houseId);
        }
        catch (error) {
            return storageError(error);
        }
    }
    private ensure(houseId: string): void {
        this.prepared("INSERT INTO boards(house_id,sequence) VALUES (?,0) ON CONFLICT(house_id) DO NOTHING").run(houseId);
    }
    private bump(houseId: string): number {
        this.prepared("UPDATE boards SET sequence=sequence+1 WHERE house_id=?").run(houseId);
        return this.sequence(houseId);
    }
    private rows(houseId: string): ElementRow[] {
        return this.prepared("SELECT id,value,author_id FROM elements WHERE house_id=?").all(houseId) as ElementRow[];
    }
    private elementTotals(houseId: string, actorId?: string): { count: number; bytes: number } {
        const own = actorId !== undefined;
        const args: string[] = own ? [houseId, actorId!] : [houseId];
        if (this.utf8Storage) {
            // octet_length reads stored byte lengths without materializing every JSON value.
            return this.prepared(own
                ? "SELECT COUNT(*) AS count,COALESCE(SUM(octet_length(value)),0) AS bytes FROM contributions WHERE house_id=? AND actor_id=?"
                : "SELECT COUNT(*) AS count,COALESCE(SUM(octet_length(value)),0) AS bytes FROM elements WHERE house_id=?").get(...args) as { count: number; bytes: number };
        }
        // Wire quotas are UTF8 even for a supported existing UTF16 SQLite file.
        const rows = this.prepared(own
            ? "SELECT value FROM contributions WHERE house_id=? AND actor_id=?"
            : "SELECT value FROM elements WHERE house_id=?").all(...args) as { value: string }[];
        return { count: rows.length, bytes: rows.reduce((total, row) => total + Buffer.byteLength(row.value), 0) };
    }
    private files(houseId: string): BoardFile[] {
        return (this.prepared("SELECT id,mime_type,created FROM assets WHERE house_id=? ORDER BY created,id").all(houseId) as Omit<AssetRow, "bytes" | "digest">[]).map(r => ({ id: r.id, mimeType: r.mime_type, created: r.created, url: `/api/board/asset?houseId=${encodeURIComponent(houseId)}&fileId=${encodeURIComponent(r.id)}` }));
    }
    private chats(houseId: string): BoardChat[] {
        return (this.prepared("SELECT id,author_id,name,text,at,sequence FROM chat WHERE house_id=? AND at>=? ORDER BY sequence DESC LIMIT 100").all(houseId, Date.now() - retentionMs) as {
            id: string;
            author_id: string;
            name: string;
            text: string;
            at: number;
            sequence: number;
        }[]).reverse().map(r => ({ id: r.id, authorId: r.author_id, name: r.name, text: r.text, at: r.at, sequence: r.sequence }));
    }
    snapshot(houseId: string): BoardSnapshot {
        try {
            boardUuid(houseId);
            return { schemaVersion: 1, houseId, sequence: this.sequence(houseId), elements: orderBoardElements(this.rows(houseId).map(r => JSON.parse(r.value) as BoardElement)), files: this.files(houseId), chat: this.chats(houseId) };
        }
        catch (e) {
            return storageError(e);
        }
    }
    private mutate(actorId: string, id: string, command: unknown, action: () => BoardReceipt): BoardReceipt {
        boardUuid(actorId);
        const hash = createHash("sha256").update(boardCanonical(command)).digest("hex");
        return this.transaction(() => {
            const prior = this.prepared("SELECT command_hash,response FROM receipts WHERE actor_id=? AND id=?").get(actorId, id) as {
                command_hash: string;
                response: string;
            } | undefined;
            if (prior) {
                if (prior.command_hash !== hash)
                    boardFail("ID_REUSED", "This save ID belongs to another edit. Keep the original pending action.");
                return JSON.parse(prior.response) as BoardReceipt;
            }
            const receipt = action();
            this.prepared("INSERT INTO receipts(actor_id,id,command_hash,response) VALUES (?,?,?,?)").run(actorId, id, hash, JSON.stringify(receipt));
            return receipt;
        });
    }
    patch(actorId: string, value: unknown): BoardReceipt {
        try {
            const p = validateBoardPatch(value);
            return this.mutate(actorId, p.id, { type: "patch", ...p }, () => {
                this.ensure(p.houseId);
                const totals = this.elementTotals(p.houseId);
                let count = totals.count, bytes = totals.bytes;
                const touched: BoardElement[] = [], serialized = new Map<string, string>();
                let changed = false;
                for (const incoming of p.elements) {
                    const row = this.prepared("SELECT value FROM elements WHERE house_id=? AND id=?").get(p.houseId, incoming.id) as { value: string } | undefined;
                    const previous = row ? JSON.parse(row.value) as BoardElement : undefined;
                    const winner = previous ? winningBoardElement(previous, incoming) : incoming;
                    const canonical = boardCanonical(winner);
                    touched.push(winner);
                    serialized.set(winner.id, canonical);
                    if (!previous || boardCanonical(previous) !== canonical) {
                        changed = true;
                        if (!row) count++;
                        bytes += Buffer.byteLength(canonical) - (row ? Buffer.byteLength(row.value) : 0);
                    }
                }
                // JSON array brackets and commas count toward the same serialized quota.
                if (count > BOARD_LIMITS.elements || bytes + Math.max(0, count - 1) + 2 > BOARD_LIMITS.sceneBytes)
                    boardFail("LIMIT_EXCEEDED", "The board is full (2,000 objects or 2 MiB). Export local work before simplifying it.");
                for (const e of touched) {
                    if (e.type === "image" && e.fileId !== null && !this.prepared("SELECT id FROM assets WHERE house_id=? AND id=?").get(p.houseId, e.fileId as string))
                        boardFail("INVALID_INPUT", "Save this image file before saving its canvas object.");
                }
                for (const e of p.elements) {
                    const prior = this.prepared("SELECT value FROM contributions WHERE house_id=? AND actor_id=? AND id=?").get(p.houseId, actorId, e.id) as {
                        value: string;
                    } | undefined;
                    const own = prior ? winningBoardElement(JSON.parse(prior.value) as BoardElement, e) : e;
                    this.prepared("INSERT INTO contributions(house_id,actor_id,id,value) VALUES (?,?,?,?) ON CONFLICT(house_id,actor_id,id) DO UPDATE SET value=excluded.value").run(p.houseId, actorId, e.id, boardCanonical(own));
                }
                const ownTotals = this.elementTotals(p.houseId, actorId);
                if (ownTotals.count > BOARD_LIMITS.elements || ownTotals.bytes + Math.max(0, ownTotals.count - 1) + 2 > BOARD_LIMITS.sceneBytes)
                    boardFail("LIMIT_EXCEEDED", "Your saved contributions exceed 2 MiB. Export before adding larger objects.");
                if (changed)
                    for (const e of touched)
                        this.prepared("INSERT INTO elements(house_id,id,value,author_id) VALUES (?,?,?,?) ON CONFLICT(house_id,id) DO UPDATE SET value=excluded.value").run(p.houseId, e.id, serialized.get(e.id)!, actorId);
                return { ok: true, id: p.id, houseId: p.houseId, sequence: changed ? this.bump(p.houseId) : this.sequence(p.houseId), elements: orderBoardElements(touched) };
            });
        }
        catch (e) {
            return storageError(e);
        }
    }
    asset(actorId: string, value: unknown): BoardReceipt {
        try {
            const p = boardObject(value);
            boardKeys(p, ["id", "houseId", "file"]);
            const id = boardUuid(p.id), houseId = boardUuid(p.houseId), f = boardObject(p.file);
            boardKeys(f, ["id", "mimeType", "dataURL"]);
            const fileId = boardId(f.id);
            if (!["image/png", "image/jpeg", "image/webp"].includes(f.mimeType as string) || typeof f.dataURL !== "string")
                boardFail("INVALID_INPUT", "Paste a PNG, JPEG or WebP image.");
            const prefix = `data:${f.mimeType};base64,`;
            if (!f.dataURL.startsWith(prefix))
                boardFail("INVALID_INPUT", "The image data URL does not match its format.");
            const encoded = f.dataURL.slice(prefix.length);
            if (encoded.length > Math.ceil(BOARD_LIMITS.assetBytes / 3) * 4 || /[^A-Za-z0-9+/=]/.test(encoded))
                boardFail("LIMIT_EXCEEDED", "An image must contain valid base64 and fit within 2 MiB.");
            const bytes = Buffer.from(encoded, "base64");
            if (bytes.length > BOARD_LIMITS.assetBytes)
                boardFail("LIMIT_EXCEEDED", "Images must fit within 2 MiB. Keep the local image and resize it before retrying.");
            if (bytes.length < 12 || bytes.toString("base64") !== encoded)
                boardFail("INVALID_INPUT", "The image bytes are invalid.");
            const mimeType = f.mimeType as string;
            validateImageBytes(bytes, mimeType);
            const digest = createHash("sha256").update(bytes).digest("hex");
            return this.mutate(actorId, id, { type: "asset", id, houseId, file: { id: fileId, mimeType, digest } }, () => {
                this.ensure(houseId);
                const prior = this.prepared("SELECT mime_type,digest FROM assets WHERE house_id=? AND id=?").get(houseId, fileId) as Pick<AssetRow, "mime_type" | "digest"> | undefined;
                if (prior && (prior.digest !== digest || prior.mime_type !== mimeType))
                    boardFail("ID_REUSED", "An image ID already contains different bytes.");
                if (!prior) {
                    const totals = this.prepared("SELECT COUNT(*) AS count,COALESCE(SUM(length(bytes)),0) AS bytes FROM assets WHERE house_id=?").get(houseId) as {
                        count: number;
                        bytes: number;
                    };
                    if (totals.count >= BOARD_LIMITS.assets || totals.bytes + bytes.length > BOARD_LIMITS.totalAssetBytes)
                        boardFail("LIMIT_EXCEEDED", "This board has reached its image limit (20 images or 20 MiB). Export before adding more.");
                    this.prepared("INSERT INTO assets(house_id,id,mime_type,bytes,digest,author_id,created) VALUES (?,?,?,?,?,?,?)").run(houseId, fileId, mimeType, bytes, digest, actorId, Date.now());
                    this.bump(houseId);
                }
                const file = this.files(houseId).find(x => x.id === fileId)!;
                return { ok: true, id, houseId, sequence: this.sequence(houseId), file };
            });
        }
        catch (e) {
            return storageError(e);
        }
    }
    getAsset(houseId: string, fileId: string): {
        mimeType: string;
        bytes: Buffer;
    } | undefined {
        try {
            boardUuid(houseId);
            boardId(fileId);
            const r = this.prepared("SELECT mime_type,bytes FROM assets WHERE house_id=? AND id=?").get(houseId, fileId) as Pick<AssetRow, "mime_type" | "bytes"> | undefined;
            // node:sqlite returns independently owned BLOB storage; retain its exact view.
            return r ? { mimeType: r.mime_type, bytes: Buffer.from(r.bytes.buffer, r.bytes.byteOffset, r.bytes.byteLength) } : undefined;
        }
        catch (e) {
            return storageError(e);
        }
    }
    chat(actorId: string, name: string, value: unknown): BoardReceipt {
        try {
            const p = boardObject(value);
            boardKeys(p, ["id", "houseId", "text"]);
            const id = boardUuid(p.id), houseId = boardUuid(p.houseId), text = boardText(p.text, BOARD_LIMITS.chatCharacters, true);
            boardText(name, 40, true);
            return this.mutate(actorId, id, { type: "chat", id, houseId, text }, () => {
                this.ensure(houseId);
                const sequence = this.bump(houseId), message = { id, authorId: actorId, name, text, at: Date.now(), sequence };
                this.prepared("INSERT INTO chat(house_id,id,author_id,name,text,at,sequence) VALUES (?,?,?,?,?,?,?)").run(houseId, id, actorId, name, text, message.at, sequence);
                this.prepared("DELETE FROM chat WHERE house_id=? AND (at<? OR id NOT IN (SELECT id FROM chat WHERE house_id=? ORDER BY sequence DESC LIMIT 100))").run(houseId, Date.now() - retentionMs, houseId);
                return { ok: true, id, houseId, sequence, message };
            });
        }
        catch (e) {
            return storageError(e);
        }
    }
    isOwnAsset(actorId: string, houseId: string, fileId: string): boolean {
        try {
            boardUuid(actorId);
            boardUuid(houseId);
            boardId(fileId);
            return !!this.prepared("SELECT id FROM assets WHERE house_id=? AND author_id=? AND id=?").get(houseId, actorId, fileId);
        }
        catch (e) {
            return storageError(e);
        }
    }
    ownExport(actorId: string, houseId: string): BoardSnapshot {
        try {
            boardUuid(actorId);
            boardUuid(houseId);
            const elements = (this.prepared("SELECT value FROM contributions WHERE house_id=? AND actor_id=?").all(houseId, actorId) as {
                value: string;
            }[]).map(r => JSON.parse(r.value) as BoardElement);
            const files = new Set((this.prepared("SELECT id FROM assets WHERE house_id=? AND author_id=?").all(houseId, actorId) as {
                id: string;
            }[]).map(r => r.id));
            return { schemaVersion: 1, houseId, sequence: 0, elements: orderBoardElements(elements), files: this.files(houseId).filter(f => files.has(f.id)), chat: this.chats(houseId).filter(m => m.authorId === actorId) };
        }
        catch (e) {
            return storageError(e);
        }
    }
}
/** Format and dimensions are checked locally; no remote fetch or SVG decoder exists. */
function validateImageBytes(bytes: Buffer, mime: string): void {
    let width = 0, height = 0;
    if (mime === "image/png") {
        if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.toString("ascii", 12, 16) !== "IHDR" || bytes.readUInt32BE(8) !== 13)
            boardFail("INVALID_INPUT", "The PNG signature or header is invalid.");
        width = bytes.readUInt32BE(16);
        height = bytes.readUInt32BE(20);
        let at = 8, rasterBytes = 0, hasData = false, endedData = false, palette = false, ended = false;
        const bitDepth = bytes[24]!, colour = bytes[25]!, validDepths: Record<number, number[]> = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
        if (!validDepths[colour]?.includes(bitDepth) || bytes[26] !== 0 || bytes[27] !== 0 || ![0, 1].includes(bytes[28]!))
            boardFail("INVALID_INPUT", "The PNG raster header is invalid.");
        while (at < bytes.length) {
            if (at + 12 > bytes.length)
                boardFail("INVALID_INPUT", "The PNG chunk is truncated.");
            const length = bytes.readUInt32BE(at), type = bytes.toString("ascii", at + 4, at + 8), next = at + length + 12;
            if (next > bytes.length || !/^[A-Za-z]{4}$/.test(type) || bytes.readUInt32BE(at + length + 8) !== crc32(bytes.subarray(at + 4, at + length + 8)))
                boardFail("INVALID_INPUT", "The PNG chunk integrity is invalid.");
            if (["acTL", "fcTL", "fdAT"].includes(type))
                boardFail("INVALID_INPUT", "Animated PNG images are not supported.");
            if (type === "IHDR" && at !== 8)
                boardFail("INVALID_INPUT", "The PNG contains a repeated header.");
            if (type === "PLTE") {
                if (hasData || palette || length === 0 || length > 768 || length % 3 !== 0)
                    boardFail("INVALID_INPUT", "The PNG palette is invalid.");
                palette = true;
            }
            if (type === "IDAT") {
                if (endedData)
                    boardFail("INVALID_INPUT", "The PNG raster chunks are invalid.");
                hasData = true;
                rasterBytes += length;
            }
            else if (hasData)
                endedData = true;
            if (type === "IEND") {
                if (length !== 0 || !hasData || rasterBytes === 0 || next !== bytes.length || colour === 3 && !palette)
                    boardFail("INVALID_INPUT", "The PNG raster data is missing or truncated.");
                ended = true;
            }
            if (type[0] === type[0]!.toUpperCase() && !["IHDR", "PLTE", "IDAT", "IEND"].includes(type))
                boardFail("INVALID_INPUT", "The PNG contains an unsupported critical chunk.");
            at = next;
        }
        if (!ended)
            boardFail("INVALID_INPUT", "The PNG end marker is missing.");
    }
    else if (mime === "image/jpeg") {
        if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217)
            boardFail("INVALID_INPUT", "The JPEG signature is invalid.");
        let at = 2;
        while (at + 4 <= bytes.length) {
            if (bytes[at++] !== 255)
                break;
            while (bytes[at] === 255)
                at++;
            const marker = bytes[at++]!;
            if (marker === 217 || marker === 218)
                break;
            const length = bytes.readUInt16BE(at);
            if (length < 2 || at + length > bytes.length)
                boardFail("INVALID_INPUT", "The JPEG header is invalid.");
            if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
                if (length < 8)
                    boardFail("INVALID_INPUT", "The JPEG dimensions are missing.");
                height = bytes.readUInt16BE(at + 3);
                width = bytes.readUInt16BE(at + 5);
                break;
            }
            at += length;
        }
    }
    else {
        if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP" || bytes.readUInt32LE(4) + 8 !== bytes.length)
            boardFail("INVALID_INPUT", "The WebP signature is invalid.");
        const kind = bytes.toString("ascii", 12, 16);
        if (kind === "VP8X" && bytes.length >= 30) {
            if (bytes[20]! & 2)
                boardFail("INVALID_INPUT", "Animated images are not supported.");
            width = 1 + bytes.readUIntLE(24, 3);
            height = 1 + bytes.readUIntLE(27, 3);
        }
        else if (kind === "VP8 " && bytes.length >= 30 && bytes.subarray(23, 26).equals(Buffer.from([157, 1, 42]))) {
            width = bytes.readUInt16LE(26) & 0x3fff;
            height = bytes.readUInt16LE(28) & 0x3fff;
        }
        else if (kind === "VP8L" && bytes.length >= 25 && bytes[20] === 47) {
            const bits = bytes.readUInt32LE(21);
            width = (bits & 0x3fff) + 1;
            height = ((bits >>> 14) & 0x3fff) + 1;
        }
        else
            boardFail("INVALID_INPUT", "The WebP image header is invalid.");
    }
    if (width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > 16000000)
        boardFail("LIMIT_EXCEEDED", "Images must fit within 8,192 pixels per side and 16 million pixels.");
}
