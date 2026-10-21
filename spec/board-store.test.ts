import { crc32 } from "node:zlib";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { BoardStore } from "../src/board-store.ts";
export function shape(id = "shape_a", changes: Record<string, unknown> = {}) {
    return { id, type: "rectangle", x: 0, y: 0, width: 100, height: 80, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, seed: 1, version: 1, versionNonce: 100, index: "a0", isDeleted: false, groupIds: [], frameId: null, boundElements: null, updated: 1000, link: null, locked: false, roundness: null, ...changes };
}
const cleanups: (() => void)[] = [];
afterEach(() => {
    for (const cleanup of cleanups.splice(0).reverse())
        cleanup();
    vi.restoreAllMocks();
});
function fixture() {
    const path = mkdtempSync(join(tmpdir(), "board-store-"));
    const store = new BoardStore(join(path, "board.sqlite"));
    cleanups.push(() => rmSync(path, { recursive: true, force: true }), () => store.close());
    return { store, path, houseId: randomUUID(), actorId: randomUUID() };
}
const patch = (f: ReturnType<typeof fixture>, elements: unknown[], id = randomUUID()) => f.store.patch(f.actorId, { id, houseId: f.houseId, elements });
describe("durable board authority", () => {
    test("retains UTF8 wire quotas for an existing UTF16 database", () => {
        const f = fixture(), path = join(f.path, "utf16.sqlite"), initialized = new DatabaseSync(path);
        initialized.exec("PRAGMA encoding='UTF-16le'; CREATE TABLE encoding_probe(x TEXT); DROP TABLE encoding_probe"); initialized.close();
        const store = new BoardStore(path); cleanups.push(() => store.close());
        expect((store.db.prepare("PRAGMA encoding").get() as { encoding: string }).encoding).toBe("UTF-16le");
        const text = "x".repeat(14000) + "学".repeat(100);
        for (let n = 0; n < 40; n += 3) {
            const elements = Array.from({ length: Math.min(3, 40 - n) }, (_, k) => shape("utf16_" + (n + k), { type: "text", fontSize: 20, fontFamily: 5, text, originalText: text, textAlign: "left", verticalAlign: "top", containerId: null, autoResize: true, lineHeight: 1.25 }));
            store.patch(f.actorId, { id: randomUUID(), houseId: f.houseId, elements });
        }
        const snapshot = store.snapshot(f.houseId);
        expect(snapshot.elements).toHaveLength(40);
        expect(Buffer.byteLength(JSON.stringify(snapshot.elements))).toBeLessThan(2 * 1024 * 1024);
    });

    test("counts UTF8 scene bytes and rolls back an overflowing partial patch", () => {
        const f = fixture(), text = "😀".repeat(3750);
        const note = (id: string, version = 1, content = text) => shape(id, { type: "text", version, fontSize: 20, fontFamily: 5, text: content, originalText: content, textAlign: "left", verticalAlign: "top", containerId: null, autoResize: true, lineHeight: 1.25 });
        for (let n = 0; n < 66; n += 3) patch(f, Array.from({ length: 3 }, (_, k) => note("utf8_" + (n + k))));
        const before = f.store.snapshot(f.houseId), extra = Array.from({ length: 4 }, (_, n) => note("extra_" + n));
        const hypothetical = JSON.stringify([...before.elements, ...extra]);
        expect(Buffer.byteLength(hypothetical)).toBeGreaterThan(2 * 1024 * 1024);
        expect(hypothetical.length).toBeLessThan(2 * 1024 * 1024);
        expect(Buffer.byteLength(JSON.stringify({ id: randomUUID(), houseId: f.houseId, elements: extra }))).toBeLessThan(128 * 1024);
        const retryId = randomUUID();
        expect(() => patch(f, extra, retryId)).toThrowError(expect.objectContaining({ code: "LIMIT_EXCEEDED" }));
        expect(f.store.snapshot(f.houseId)).toEqual(before);
        patch(f, [note("utf8_0", 2, "small"), note("utf8_1", 2, "small")]);
        expect(patch(f, extra, retryId).elements).toHaveLength(4);
        expect(Buffer.byteLength(JSON.stringify(f.store.snapshot(f.houseId).elements))).toBeLessThanOrEqual(2 * 1024 * 1024);
    });
    test("keeps own UTF8 contribution quota after peer compaction and rollback", () => {
        const f = fixture(), text = "😀".repeat(3750), peer = randomUUID();
        const note = (id: string, version = 1, content = text) => shape(id, { type: "text", version, fontSize: 20, fontFamily: 5, text: content, originalText: content, textAlign: "left", verticalAlign: "top", containerId: null, autoResize: true, lineHeight: 1.25 });
        for (let n = 0; n < 66; n += 3) patch(f, Array.from({ length: 3 }, (_, k) => note("own_utf8_" + (n + k))));
        f.store.patch(peer, { id: randomUUID(), houseId: f.houseId, elements: Array.from({ length: 66 }, (_, n) => note("own_utf8_" + n, 2, "peer compacted")) });
        const before = f.store.snapshot(f.houseId), ownBefore = f.store.ownExport(f.actorId, f.houseId), extra = Array.from({ length: 4 }, (_, n) => note("own_extra_" + n));
        expect(Buffer.byteLength(JSON.stringify([...before.elements, ...extra]))).toBeLessThan(2 * 1024 * 1024);
        expect(Buffer.byteLength(JSON.stringify([...ownBefore.elements, ...extra]))).toBeGreaterThan(2 * 1024 * 1024);
        const retryId = randomUUID();
        expect(() => patch(f, extra, retryId)).toThrowError(expect.objectContaining({ code: "LIMIT_EXCEEDED" }));
        expect(f.store.snapshot(f.houseId)).toEqual(before);
        expect(f.store.ownExport(f.actorId, f.houseId)).toEqual(ownBefore);
        expect(patch(f, extra.map(e => ({ ...e, text: "small", originalText: "small" })), retryId).elements).toHaveLength(4);
    });

    test("preserves peer elements across independent patches and retry", () => {
        const f = fixture();
        patch(f, [shape("a")]);
        const id = randomUUID();
        const receipt = patch(f, [shape("b")], id);
        expect(f.store.snapshot(f.houseId).elements.map(e => e.id)).toEqual(["a", "b"]);
        expect(patch(f, [shape("b")], id)).toEqual(receipt);
        expect(f.store.snapshot(f.houseId).sequence).toBe(2);
    });
    test("converges conflicting versions and nonce permutations", () => {
        const snapshots = [];
        for (const order of [[100, 50], [50, 100]]) {
            const f = fixture();
            for (const nonce of order)
                patch(f, [shape("a", { version: 2, versionNonce: nonce, x: nonce })]);
            snapshots.push(f.store.snapshot(f.houseId).elements);
        }
        expect(snapshots[0]).toEqual(snapshots[1]);
        expect(snapshots[0]![0]!.x).toBe(50);
    });
    test("retains tombstones against stale resurrection and undo preserves peer", () => {
        const f = fixture();
        patch(f, [shape("a"), shape("peer")]);
        patch(f, [shape("a", { version: 2, isDeleted: true })]);
        patch(f, [shape("a")]);
        expect(f.store.snapshot(f.houseId).elements.find(e => e.id === "a")!.isDeleted).toBe(true);
        patch(f, [shape("a", { version: 3 })]);
        expect(f.store.snapshot(f.houseId).elements).toHaveLength(2);
        expect(f.store.snapshot(f.houseId).elements.find(e => e.id === "a")!.isDeleted).toBe(false);
    });
    test("persists receipts, assets, chat and scene across SQLite restart", () => {
        const f = fixture();
        const id = randomUUID();
        const receipt = patch(f, [shape()], id);
        f.store.chat(f.actorId, "Ada", { id: randomUUID(), houseId: f.houseId, text: "Line one\nLine two" });
        f.store.close();
        const next = new BoardStore(join(f.path, "board.sqlite"));
        cleanups.push(() => next.close());
        expect(next.snapshot(f.houseId).elements).toHaveLength(1);
        expect(next.snapshot(f.houseId).chat[0]!.text).toBe("Line one\nLine two");
        expect(next.patch(f.actorId, { id, houseId: f.houseId, elements: [shape()] })).toEqual(receipt);
    });
    test("rejects reused command IDs and invalid scene before changing state", () => {
        const f = fixture(), id = randomUUID();
        patch(f, [shape()], id);
        expect(() => patch(f, [shape("b")], id)).toThrow();
        expect(() => patch(f, [shape("a", { x: Infinity })])).toThrow();
        expect(() => patch(f, [shape("embed", { type: "embeddable", link: "https://example.com" })])).toThrow();
        expect(f.store.snapshot(f.houseId).sequence).toBe(1);
    });
    test("bounds scene retention and validates text and collections", () => {
        const f = fixture();
        expect(() => patch(f, Array.from({ length: 2001 }, (_, n) => shape("e" + n)))).toThrow();
        expect(() => patch(f, [shape("a", { groupIds: Array(65).fill("group") })])).toThrow();
        expect(() => f.store.chat(f.actorId, "Ada", { id: randomUUID(), houseId: f.houseId, text: "x".repeat(4001) })).toThrow();
    });
    test("rolls back winners and receipts when SQLite cannot save an acknowledgement", () => {
        const f = fixture(), id = randomUUID();
        f.store.db.exec("CREATE TRIGGER fail_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT,'fixture failure'); END;");
        expect(() => patch(f, [shape()], id)).toThrow();
        expect(f.store.snapshot(f.houseId).elements).toEqual([]);
        expect(f.store.snapshot(f.houseId).sequence).toBe(0);
        f.store.db.exec("DROP TRIGGER fail_receipt");
        expect(patch(f, [shape()], id).sequence).toBe(1);
    });
    test("converges exact nonce collisions and defeats scene-replacement negative control", () => {
        const states = [];
        for (const order of [[1, 2], [2, 1]]) {
            const f = fixture();
            for (const x of order)
                patch(f, [shape("a", { x })]);
            states.push(f.store.snapshot(f.houseId).elements);
        }
        expect(states[0]).toEqual(states[1]);
        const expectedIds = ["local", "peer"], valid = (elements: {
            id: string;
        }[]) => expectedIds.every(id => elements.some(e => e.id === id));
        const f = fixture();
        patch(f, [shape("local")]);
        patch(f, [shape("peer")]);
        expect(valid(f.store.snapshot(f.houseId).elements)).toBe(true);
        expect(valid([shape("peer")])).toBe(false);
    });
    test("full editor undo scene cannot overwrite a peer's newer unrelated object", () => {
        const f = fixture();
        patch(f, [shape("local"), shape("peer")]);
        patch(f, [shape("peer", { version: 2, x: 44 })]);
        patch(f, [shape("local", { version: 2, isDeleted: true }), shape("peer")]);
        patch(f, [shape("local", { version: 3 }), shape("peer")]);
        expect(f.store.snapshot(f.houseId).elements.find(e => e.id === "peer")!.x).toBe(44);
    });
    test("retains each actor's latest own object without exporting peer rewrites", () => {
        const f = fixture(), peer = randomUUID();
        patch(f, [shape("shared", { x: 12 })]);
        f.store.patch(peer, { id: randomUUID(), houseId: f.houseId, elements: [shape("shared", { version: 2, x: 99 }), shape("peerOnly")] });
        expect(f.store.ownExport(f.actorId, f.houseId).elements.map(e => [e.id, e.x])).toEqual([["shared", 12]]);
        expect(f.store.snapshot(f.houseId).elements.find(e => e.id === "shared")!.x).toBe(99);
    });
    test("bounds retained messages by count and seven-day age without replay duplicates", () => {
        const f = fixture();
        for (let n = 0; n < 101; n++)
            f.store.chat(f.actorId, "Ada", { id: randomUUID(), houseId: f.houseId, text: String(n) });
        let snapshot = f.store.snapshot(f.houseId);
        expect(snapshot.chat).toHaveLength(100);
        expect(snapshot.chat[0]!.text).toBe("1");
        f.store.db.prepare("UPDATE chat SET at=? WHERE id=?").run(Date.now() - 8 * 86400000, snapshot.chat[0]!.id);
        expect(f.store.snapshot(f.houseId).chat).toHaveLength(99);
        const id = randomUUID(), body = { id, houseId: f.houseId, text: "once" }, saved = f.store.chat(f.actorId, "Ada", body);
        expect(f.store.chat(f.actorId, "Ada", body)).toEqual(saved);
        expect(f.store.snapshot(f.houseId).chat.filter(m => m.id === id)).toHaveLength(1);
    });
    test("retains tombstones at hard capacity and reports board-full without dropping them", () => {
        const f = fixture();
        for (let batch = 0; batch < 10; batch++)
            patch(f, Array.from({ length: 200 }, (_, n) => shape("e" + (batch * 200 + n), { isDeleted: true })));
        expect(() => patch(f, [shape("overflow")])).toThrowError(expect.objectContaining({ code: "LIMIT_EXCEEDED" }));
        expect(f.store.snapshot(f.houseId).elements).toHaveLength(2000);
        expect(f.store.snapshot(f.houseId).elements.every(e => e.isDeleted)).toBe(true);
    });
    test("bounds serialized scene independently of element count and preserves earlier save", () => {
        const f = fixture(), textShape = (id: string) => shape(id, { type: "text", fontSize: 20, fontFamily: 5, text: "x".repeat(14500), originalText: "x".repeat(14500), textAlign: "left", verticalAlign: "top", containerId: null, autoResize: true, lineHeight: 1.25 });
        for (let n = 0; n < 65; n++)
            patch(f, [textShape("text" + n)]);
        expect(() => {
            for (let n = 65; n < 80; n++)
                patch(f, [textShape("text" + n)]);
        }).toThrowError(expect.objectContaining({ code: "LIMIT_EXCEEDED" }));
        expect(f.store.snapshot(f.houseId).elements.length).toBeGreaterThan(65);
        expect(Buffer.byteLength(JSON.stringify(f.store.snapshot(f.houseId).elements))).toBeLessThanOrEqual(2 * 1024 * 1024);
    });
    test("validates format/dimensions, immutable file IDs, missing references and twenty-image bound", () => {
        const f = fixture(), png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", file = (id: string, data = png) => ({ id: randomUUID(), houseId: f.houseId, file: { id, mimeType: "image/png", dataURL: "data:image/png;base64," + data } });
        for (let n = 0; n < 20; n++)
            f.store.asset(f.actorId, file("image" + n));
        expect(() => f.store.asset(f.actorId, file("overflow"))).toThrowError(expect.objectContaining({ code: "LIMIT_EXCEEDED" }));
        const bad = Buffer.from(png, "base64");
        bad.writeUInt32BE(9000, 16);
        bad.writeUInt32BE(crc32(bad.subarray(12, 29)), 29);
        expect(() => f.store.asset(f.actorId, file("image0", bad.toString("base64")))).toThrowError(expect.objectContaining({ code: "LIMIT_EXCEEDED" }));
        bad.writeUInt32BE(2, 16);
        bad.writeUInt32BE(crc32(bad.subarray(12, 29)), 29);
        expect(() => f.store.asset(f.actorId, file("image0", bad.toString("base64")))).toThrowError(expect.objectContaining({ code: "ID_REUSED" }));
        expect(() => patch(f, [shape("image_shape", { type: "image", fileId: "missing", status: "saved", scale: [1, 1], crop: null })])).toThrow();
        expect(f.store.snapshot(f.houseId).files[0]).not.toHaveProperty("dataURL");
    });
    test("wrong existing database and unsupported versions fail without migration damage", () => {
        const f = fixture();
        f.store.db.exec("PRAGMA user_version=99");
        f.store.close();
        expect(() => new BoardStore(join(f.path, "board.sqlite"))).toThrow();
        const other = new BoardStore(join(f.path, "other.sqlite"));
        other.db.exec("PRAGMA user_version=0");
        other.close();
        expect(() => new BoardStore(join(f.path, "other.sqlite"))).toThrow();
    });
    test("persists binary assets and own contribution records across restart", () => {
        const f = fixture(), png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", file = { id: randomUUID(), houseId: f.houseId, file: { id: "restart-image", mimeType: "image/png", dataURL: "data:image/png;base64," + png } };
        const saved = f.store.asset(f.actorId, file);
        patch(f, [shape("contribution")]);
        expect(f.store.ready()).toBe(true);
        f.store.close();
        expect(f.store.ready()).toBe(false);
        const restarted = new BoardStore(join(f.path, "board.sqlite"));
        cleanups.push(() => restarted.close());
        expect(restarted.asset(f.actorId, file)).toEqual(saved);
        expect(restarted.getAsset(f.houseId, "restart-image")!.bytes.toString("base64")).toBe(png);
        expect(restarted.ownExport(f.actorId, f.houseId).elements[0]!.id).toBe("contribution");
        expect(restarted.isOwnAsset(f.actorId, f.houseId, "restart-image")).toBe(true);
        expect(restarted.isOwnAsset(randomUUID(), f.houseId, "restart-image")).toBe(false);
        expect(restarted.getAsset(f.houseId, "missing")).toBeUndefined();
    });
    test("checks existing image metadata without materializing its near-limit BLOB", () => {
        const f = fixture(), png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", "base64");
        // Ancillary text enlarges a valid PNG while retaining its original raster.
        const text = Buffer.alloc(1900 * 1024 + 12, 120);
        text.writeUInt32BE(text.length - 12);
        text.write("tEXt", 4, "ascii");
        text.write("allocation\0", 8, "ascii");
        text.writeUInt32BE(crc32(text.subarray(4, -4)), text.length - 4);
        const bytes = Buffer.concat([png.subarray(0, -12), text, png.subarray(-12)]);
        const upload = () => ({ id: randomUUID(), houseId: f.houseId, file: { id: "large-metadata", mimeType: "image/png", dataURL: "data:image/png;base64," + bytes.toString("base64") } });
        const metadataReads: Record<string, unknown>[] = [], nativePrepare = f.store.db.prepare.bind(f.store.db);
        vi.spyOn(f.store.db, "prepare").mockImplementation(sql => {
            const statement = nativePrepare(sql), nativeGet = statement.get.bind(statement);
            vi.spyOn(statement, "get").mockImplementation((...args) => {
                const row = nativeGet(...args);
                if (row && Object.hasOwn(row, "digest")) metadataReads.push(row);
                return row;
            });
            return statement;
        });
        const first = f.store.asset(f.actorId, upload()), duplicate = f.store.asset(f.actorId, upload());
        expect(duplicate.file).toEqual(first.file);
        expect(duplicate.sequence).toBe(first.sequence);
        expect(metadataReads).toHaveLength(1);
        expect(Object.hasOwn(metadataReads[0]!, "bytes")).toBe(false);
        expect(f.store.getAsset(f.houseId, "large-metadata")!.bytes.equals(bytes)).toBe(true);
    });
    test("adapts only a SQLite byte view's bounded backing storage without another allocation", () => {
        const f = fixture(), backing = Uint8Array.from([201, 202, 203, 204, 205, 0, 255, 17, 128, 0, 42, 9, 13, 206, 207]);
        const bytes = backing.subarray(5, 13), statement = f.store.db.prepare("SELECT 1");
        vi.spyOn(statement, "get").mockReturnValue({ mime_type: "image/png", bytes });
        vi.spyOn(f.store.db, "prepare").mockReturnValue(statement);
        const asset = f.store.getAsset(f.houseId, "bounded-view")!;
        expect(Buffer.isBuffer(asset.bytes)).toBe(true);
        expect(asset.mimeType).toBe("image/png");
        expect([...asset.bytes]).toEqual([0, 255, 17, 128, 0, 42, 9, 13]);
        expect(asset.bytes.buffer === bytes.buffer).toBe(true);
        expect(asset.bytes.byteOffset).toBe(bytes.byteOffset);
        expect(asset.bytes.byteLength).toBe(bytes.byteLength);
        asset.bytes.fill(7);
        expect([...backing.subarray(0, 5)]).toEqual([201, 202, 203, 204, 205]);
        expect([...backing.subarray(13)]).toEqual([206, 207]);
    });
    test("keeps native SQLite BLOB results alive and download mutations separate from persisted bytes", () => {
        const f = fixture(), valid = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", "base64");
        f.store.asset(f.actorId, { id: randomUUID(), houseId: f.houseId, file: { id: "owned-blob", mimeType: "image/png", dataURL: "data:image/png;base64," + valid.toString("base64") } });
        const statement = f.store.db.prepare("SELECT bytes FROM assets WHERE house_id=? AND id=?");
        const native = statement.get(f.houseId, "owned-blob")!.bytes as Uint8Array;
        const nextNative = statement.get(f.houseId, "owned-blob")!.bytes as Uint8Array;
        expect(native).toBeInstanceOf(Uint8Array);
        expect(native.buffer).not.toBe(nextNative.buffer);
        const first = f.store.getAsset(f.houseId, "owned-blob")!, second = f.store.getAsset(f.houseId, "owned-blob")!;
        first.bytes[0] = 0;
        const mutated = Buffer.from(valid); mutated[0] = 0;
        f.store.chat(f.actorId, "Ada", { id: randomUUID(), houseId: f.houseId, text: "Later database work" });
        f.store.snapshot(f.houseId);
        expect(f.store.getAsset(f.houseId, "owned-blob")!.bytes.equals(valid)).toBe(true);
        f.store.close();
        expect([...native]).toEqual([...valid]);
        expect([...nextNative]).toEqual([...valid]);
        expect(second.bytes.equals(valid)).toBe(true);
        expect(first.bytes.equals(mutated)).toBe(true);
    });
    test("accepts bounded JPEG/WebP headers and rejects unsupported, truncated or animated formats", () => {
        const f = fixture(), upload = (id: string, mimeType: string, bytes: Buffer) => f.store.asset(f.actorId, { id: randomUUID(), houseId: f.houseId, file: { id, mimeType, dataURL: `data:${mimeType};base64,` + bytes.toString("base64") } });
        const jpeg = Buffer.from([255, 216, 255, 192, 0, 8, 8, 0, 1, 0, 1, 1, 255, 217]);
        expect(upload("jpeg", "image/jpeg", jpeg).file!.mimeType).toBe("image/jpeg");
        const webp = Buffer.alloc(30);
        webp.write("RIFF");
        webp.writeUInt32LE(22, 4);
        webp.write("WEBP", 8);
        webp.write("VP8X", 12);
        webp.writeUInt32LE(10, 16);
        expect(upload("webp", "image/webp", webp).file!.mimeType).toBe("image/webp");
        webp[20] = 2;
        expect(() => upload("animated", "image/webp", webp)).toThrow();
        webp[20] = 0;
        webp.write("NOPE", 12);
        expect(() => upload("badWebp", "image/webp", webp)).toThrow();
        const lossless = Buffer.alloc(26);
        lossless.write("RIFF");
        lossless.writeUInt32LE(18, 4);
        lossless.write("WEBP", 8);
        lossless.write("VP8L", 12);
        lossless.writeUInt32LE(5, 16);
        lossless[20] = 47;
        expect(upload("lossless", "image/webp", lossless).file!.mimeType).toBe("image/webp");
        const lossy = Buffer.alloc(30);
        lossy.write("RIFF");
        lossy.writeUInt32LE(22, 4);
        lossy.write("WEBP", 8);
        lossy.write("VP8 ", 12);
        lossy.writeUInt32LE(10, 16);
        Buffer.from([157, 1, 42]).copy(lossy, 23);
        lossy.writeUInt16LE(1, 26);
        lossy.writeUInt16LE(1, 28);
        expect(upload("lossy", "image/webp", lossy).file!.mimeType).toBe("image/webp");
        expect(() => upload("svg", "image/svg+xml", Buffer.from("<svg></svg>"))).toThrow();
        expect(() => upload("truncated", "image/jpeg", jpeg.subarray(0, -2))).toThrow();
        expect(() => upload("badHeader", "image/png", Buffer.alloc(40))).toThrow();
        expect(() => f.store.asset(f.actorId, { id: randomUUID(), houseId: f.houseId, file: { id: "url", mimeType: "image/png", dataURL: "https://example.com/file.png" } })).toThrow();
        expect(() => f.store.asset(f.actorId, { id: randomUUID(), houseId: f.houseId, file: { id: "badBase64", mimeType: "image/png", dataURL: "data:image/png;base64,???" } })).toThrow();
    });
    test("reports the decoded image boundary and per-house total explicitly", () => {
        const f = fixture(), bytes = Buffer.alloc(2 * 1024 * 1024 + 1);
        expect(() => f.store.asset(f.actorId, { id: randomUUID(), houseId: f.houseId, file: { id: "tooLarge", mimeType: "image/png", dataURL: "data:image/png;base64," + bytes.toString("base64") } })).toThrowError(expect.objectContaining({ code: "LIMIT_EXCEEDED" }));
    });
    test("rejects PNG without raster chunks or with invalid chunk integrity", () => {
        const f = fixture(), png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", "base64"), upload = (bytes: Buffer) => f.store.asset(f.actorId, { id: randomUUID(), houseId: f.houseId, file: { id: "invalid-png", mimeType: "image/png", dataURL: "data:image/png;base64," + bytes.toString("base64") } });
        expect(() => upload(Buffer.concat([png.subarray(0, 33), png.subarray(-12)]))).toThrowError(expect.objectContaining({ code: "INVALID_INPUT" }));
        png[45] = png[45]! ^ 1;
        expect(() => upload(png)).toThrowError(expect.objectContaining({ code: "INVALID_INPUT" }));
        expect(f.store.snapshot(f.houseId).files).toEqual([]);
    });
    test("accepts valid PNG zero-length IDAT chunks beside raster data", () => {
        const f = fixture(), png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", "base64"), empty = Buffer.alloc(12);
        empty.write("IDAT", 4, "ascii");
        empty.writeUInt32BE(crc32(empty.subarray(4, 8)), 8);
        const data = Buffer.concat([png.subarray(0, 33), empty, png.subarray(33)]);
        expect(f.store.asset(f.actorId, { id: randomUUID(), houseId: f.houseId, file: { id: "zero-idat", mimeType: "image/png", dataURL: "data:image/png;base64," + data.toString("base64") } }).file!.id).toBe("zero-idat");
    });
});


describe("lossless receipt storage", () => {
    const decodedLimit = 2 * 1024 * 1024 + 256;
    const note = (id: string, text = "saved ".repeat(2000), version = 1) => shape(id, { type: "text", version, fontSize: 20, fontFamily: 5, text, originalText: text, textAlign: "left", verticalAlign: "top", containerId: null, autoResize: true, lineHeight: 1.25 });
    test("creates schema 2 and stores smaller receipts as versioned BLOBs", () => {
        const f = fixture(), id = randomUUID(), saved = patch(f, [note("compress")], id);
        const row = f.store.db.prepare("SELECT typeof(response) AS type,octet_length(response) AS bytes FROM receipts WHERE id=?").get(id)!;
        expect(f.store.db.prepare("PRAGMA user_version").get()!.user_version).toBe(2);
        expect(row.type).toBe("blob");
        expect(row.bytes).toBeLessThan(Buffer.byteLength(JSON.stringify(saved)) / 10);
        expect(patch(f, [note("compress")], id)).toEqual(saved);
    });
    test.each(["UTF-16le", "UTF-16be"])("uses actual %s storage bytes for incompressible CJK fallback", encoding => {
        const f = fixture(), path = join(f.path, "encoding.sqlite"), initialized = new DatabaseSync(path);
        initialized.exec(`PRAGMA encoding='${encoding}'; CREATE TABLE encoding_probe(x TEXT); DROP TABLE encoding_probe`); initialized.close();
        const store = new BoardStore(path); cleanups.push(() => store.close());
        let state = 19;
        const text = Array.from({ length: 4000 }, () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return String.fromCharCode(0x4e00 + state % 20000); }).join("");
        const id = randomUUID(), command = { id, houseId: f.houseId, text }, saved = store.chat(f.actorId, "Ada", command);
        const row = store.db.prepare("SELECT typeof(response) AS type,octet_length(response) AS bytes FROM receipts WHERE id=?").get(id)!;
        expect(row.type).toBe("text");
        expect(row.bytes).toBe(JSON.stringify(saved).length * 2);
        expect(store.chat(f.actorId, "Ada", command)).toEqual(saved);
    });
    test("replays mixed legacy and encoded original winners after later edits and restart", () => {
        const f = fixture(), id = randomUUID(), original = patch(f, [note("original")], id), legacyId = randomUUID();
        const legacy = f.store.chat(f.actorId, "Ada", { id: legacyId, houseId: f.houseId, text: "legacy message" });
        f.store.db.prepare("UPDATE receipts SET response=? WHERE id=?").run(JSON.stringify(legacy), legacyId);
        f.store.db.prepare("UPDATE chat SET at=0 WHERE id=?").run(legacyId);
        f.store.patch(randomUUID(), { id: randomUUID(), houseId: f.houseId, elements: [note("original", "new peer winner", 2)] });
        const own = f.store.ownExport(f.actorId, f.houseId);
        f.store.close();
        const reopened = new BoardStore(join(f.path, "board.sqlite")); cleanups.push(() => reopened.close());
        expect(reopened.patch(f.actorId, { id, houseId: f.houseId, elements: [note("original")] })).toEqual(original);
        expect(reopened.chat(f.actorId, "Renamed", { id: legacyId, houseId: f.houseId, text: "legacy message" })).toEqual(legacy);
        expect(reopened.snapshot(f.houseId).chat).toEqual([]);
        expect(reopened.snapshot(f.houseId).elements[0]!.text).toBe("new peer winner");
        expect(reopened.ownExport(f.actorId, f.houseId)).toEqual(own);
    });
    test("keeps a near-scene-sized losing-patch receipt above the input patch limit", () => {
        const f = fixture(), ids = Array.from({ length: 66 }, (_, n) => "large_" + n);
        for (let n = 0; n < ids.length; n += 3) patch(f, ids.slice(n, n + 3).map(id => note(id, "x".repeat(14500), 2)));
        const id = randomUUID(), elements = ids.map(id => shape(id)), command = { id, houseId: f.houseId, elements };
        expect(Buffer.byteLength(JSON.stringify(command))).toBeLessThan(128 * 1024);
        const saved = f.store.patch(f.actorId, command);
        expect(Buffer.byteLength(JSON.stringify(saved))).toBeGreaterThan(1800 * 1024);
        expect(Buffer.byteLength(JSON.stringify(saved))).toBeLessThan(decodedLimit);
        f.store.close();
        const reopened = new BoardStore(join(f.path, "board.sqlite")); cleanups.push(() => reopened.close());
        expect(reopened.patch(f.actorId, command)).toEqual(saved);
    });
    test("upgrades v1 metadata without rewriting TEXT and reopens v2 idempotently", () => {
        const f = fixture(), id = randomUUID(), receipt = patch(f, [shape()], id), text = JSON.stringify(receipt);
        f.store.db.prepare("UPDATE receipts SET response=? WHERE id=?").run(text, id);
        f.store.db.exec("PRAGMA user_version=1");
        f.store.close();
        for (let n = 0; n < 2; n++) {
            const reopened = new BoardStore(join(f.path, "board.sqlite"));
            expect(reopened.db.prepare("PRAGMA user_version").get()!.user_version).toBe(2);
            expect(reopened.db.prepare("SELECT total_changes() AS changes").get()!.changes).toBe(0);
            expect(reopened.db.prepare("SELECT response FROM receipts WHERE id=?").get(id)!.response).toBe(text);
            expect(reopened.patch(f.actorId, { id, houseId: f.houseId, elements: [shape()] })).toEqual(receipt);
            reopened.close();
        }
    });
    test.each([
        "CREATE TABLE receipts(actor_id TEXT,id TEXT,command_hash TEXT,response TEXT)",
        "CREATE TABLE receipts(actor_id TEXT NOT NULL,id TEXT NOT NULL,command_hash TEXT NOT NULL,response BLOB NOT NULL,PRIMARY KEY(actor_id,id))",
        "CREATE TABLE receipts(actor_id TEXT NOT NULL,id TEXT NOT NULL,command_hash TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(actor_id,id)) STRICT",
    ])("rejects malformed v1 without advancing its metadata: %s", ddl => {
        const f = fixture();
        f.store.db.exec("DROP TABLE receipts; " + ddl + "; PRAGMA user_version=1"); f.store.close();
        expect(() => new BoardStore(join(f.path, "board.sqlite"))).toThrowError(expect.objectContaining({ code: "STORAGE_UNAVAILABLE" }));
        const native = new DatabaseSync(join(f.path, "board.sqlite"));
        expect(native.prepare("PRAGMA user_version").get()!.user_version).toBe(1); native.close();
    });
    test.each([null, 17, "null", "{}", "[]", "{", new Uint8Array([1, 2, 3])])("rejects corrupt receipt %s while preserving hash precedence", response => {
        const f = fixture(), id = randomUUID(); patch(f, [shape()], id);
        // NULL violates the existing NOT NULL contract, so represent it as JSON null.
        f.store.db.prepare("UPDATE receipts SET response=? WHERE id=?").run(response === null ? "null" : response, id);
        const before = f.store.snapshot(f.houseId);
        expect(() => patch(f, [shape()], id)).toThrowError(expect.objectContaining({ code: "STORAGE_UNAVAILABLE" }));
        expect(() => patch(f, [shape("changed")], id)).toThrowError(expect.objectContaining({ code: "ID_REUSED" }));
        expect(f.store.snapshot(f.houseId)).toEqual(before);
    });
    test("rejects malformed legacy TEXT bytes and a mismatched receipt envelope without applying another effect", () => {
        const f = fixture(), id = randomUUID(), saved = patch(f, [shape()], id), before = f.store.snapshot(f.houseId);
        for (const response of [JSON.stringify({ ...saved, id: randomUUID() }), JSON.stringify({ ...saved, houseId: randomUUID() }), JSON.stringify({ ...saved, elements: undefined, message: {} })]) {
            f.store.db.prepare("UPDATE receipts SET response=? WHERE id=?").run(response, id);
            expect(() => patch(f, [shape()], id)).toThrowError(expect.objectContaining({ code: "STORAGE_UNAVAILABLE" }));
        }
        const malformed = Buffer.from(JSON.stringify(saved)), index = malformed.indexOf("shape_a"); malformed[index] = 255;
        f.store.db.prepare("UPDATE receipts SET response=CAST(? AS TEXT) WHERE id=?").run(malformed, id);
        expect(() => patch(f, [shape()], id)).toThrowError(expect.objectContaining({ code: "STORAGE_UNAVAILABLE" }));
        expect(f.store.snapshot(f.houseId)).toEqual(before);
    });
    test("checks stored response type/size before selecting response bytes", () => {
        const f = fixture(), id = randomUUID(); patch(f, [shape()], id);
        f.store.db.prepare("UPDATE receipts SET response=zeroblob(?) WHERE id=?").run(decodedLimit * 2 + 1, id); f.store.close();
        const reopened = new BoardStore(join(f.path, "board.sqlite")); cleanups.push(() => reopened.close());
        const reads: string[] = [], native = reopened.db.prepare.bind(reopened.db);
        vi.spyOn(reopened.db, "prepare").mockImplementation(sql => {
            const statement = native(sql), get = statement.get.bind(statement);
            vi.spyOn(statement, "get").mockImplementation((...args) => { reads.push(sql); return get(...args); }); return statement;
        });
        expect(() => reopened.patch(f.actorId, { id, houseId: f.houseId, elements: [shape()] })).toThrowError(expect.objectContaining({ code: "STORAGE_UNAVAILABLE" }));
        expect(reads.some(sql => /typeof\(response\)/i.test(sql) && /octet_length\(response\)/i.test(sql))).toBe(true);
        expect(reads.filter(sql => /FROM receipts/i.test(sql))).toHaveLength(1);
        expect(() => reopened.patch(f.actorId, { id, houseId: f.houseId, elements: [shape("different")] })).toThrowError(expect.objectContaining({ code: "ID_REUSED" }));
    });
    test("rolls back compressed state and contribution writes when receipt insertion fails, then reopens and retries", () => {
        const f = fixture(), id = randomUUID(), elements = [note("rollback")];
        f.store.db.exec("CREATE TRIGGER fail_encoded BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT,'fixture failure'); END");
        expect(() => patch(f, elements, id)).toThrowError(expect.objectContaining({ code: "STORAGE_UNAVAILABLE" }));
        expect(f.store.snapshot(f.houseId)).toMatchObject({ sequence: 0, elements: [] });
        expect(f.store.ownExport(f.actorId, f.houseId).elements).toEqual([]);
        expect(f.store.db.prepare("SELECT count(*) AS count FROM receipts").get()!.count).toBe(0);
        f.store.db.exec("DROP TRIGGER fail_encoded"); f.store.close();
        const reopened = new BoardStore(join(f.path, "board.sqlite")); cleanups.push(() => reopened.close());
        const command = { id, houseId: f.houseId, elements }, saved = reopened.patch(f.actorId, command);
        expect(saved.sequence).toBe(1); expect(reopened.patch(f.actorId, command)).toEqual(saved);
        expect(reopened.db.prepare("SELECT count(*) AS count FROM receipts").get()!.count).toBe(1);
    });
});


describe("supported receipt schema migration boundary", () => {
    const canonical = "CREATE TABLE receipts(actor_id TEXT NOT NULL,id TEXT NOT NULL,command_hash TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(actor_id,id))";
    test.each([
        ["TEXT-only CHECK", canonical.replace("response TEXT NOT NULL", "response TEXT NOT NULL CHECK(typeof(response)='text')")],
        ["size-conditional CHECK", canonical.replace("response TEXT NOT NULL", "response TEXT NOT NULL CHECK(typeof(response)='text' OR length(response)<=512)")],
        ["receipt trigger", canonical + "; CREATE TRIGGER reject_blob BEFORE INSERT ON receipts WHEN typeof(NEW.response)='blob' BEGIN SELECT RAISE(ABORT,'no encoded receipts'); END"],
        ["explicit receipt unique index", canonical + "; CREATE UNIQUE INDEX one_actor_receipt ON receipts(actor_id)"],
    ])("rejects noncanonical v1 %s before metadata promotion", (_name, ddl) => {
        const f = fixture();
        f.store.db.exec("DROP TABLE receipts; " + ddl + "; PRAGMA user_version=1");
        f.store.close();
        expect(() => new BoardStore(join(f.path, "board.sqlite"))).toThrowError(expect.objectContaining({ code: "STORAGE_UNAVAILABLE" }));
        const native = new DatabaseSync(join(f.path, "board.sqlite"));
        expect(native.prepare("PRAGMA user_version").get()!.user_version).toBe(1);
        native.close();
    });
    test("rejects a mixed-case receipt trigger before changing v1 metadata or legacy rows", () => {
        const f = fixture(), id = randomUUID(), command = { id, houseId: f.houseId, text: "legacy accepted ".repeat(100) };
        const saved = f.store.chat(f.actorId, "Ada", command);
        f.store.db.prepare("UPDATE receipts SET response=? WHERE id=?").run(JSON.stringify(saved), id);
        f.store.db.exec("CREATE TRIGGER reject_mixed_blob BEFORE INSERT ON ReCeIpTs WHEN typeof(NEW.response)='blob' BEGIN SELECT RAISE(ABORT,'no encoded receipts'); END; PRAGMA user_version=1");
        expect(f.store.db.prepare("SELECT tbl_name FROM sqlite_schema WHERE name='reject_mixed_blob'").get()!.tbl_name).toBe("ReCeIpTs");
        const rows = f.store.db.prepare("SELECT actor_id,id,command_hash,response FROM receipts ORDER BY actor_id,id").all();
        f.store.close();
        expect(() => new BoardStore(join(f.path, "board.sqlite"))).toThrowError(expect.objectContaining({ code: "STORAGE_UNAVAILABLE" }));
        const native = new DatabaseSync(join(f.path, "board.sqlite"));
        expect(native.prepare("PRAGMA user_version").get()!.user_version).toBe(1);
        expect(native.prepare("SELECT actor_id,id,command_hash,response FROM receipts ORDER BY actor_id,id").all()).toEqual(rows);
        native.close();
    });
    test.each(["UTF-8", "UTF-16le", "UTF-16be"])("accepts canonical v1 %s DDL with harmless whitespace/case differences", encoding => {
        const f = fixture(), path = join(f.path, "canonical.sqlite"), native = new DatabaseSync(path);
        native.exec(`PRAGMA encoding='${encoding}'; CREATE TABLE encoding_probe(x TEXT); DROP TABLE encoding_probe`); native.close();
        const original = new BoardStore(path), id = randomUUID(), command = { id, houseId: f.houseId, text: "accepted legacy ".repeat(100) }, saved = original.chat(f.actorId, "Ada", command);
        original.db.prepare("UPDATE receipts SET response=? WHERE id=?").run(JSON.stringify(saved), id);
        const row = original.db.prepare("SELECT actor_id,id,command_hash,response FROM receipts WHERE id=?").get(id)!;
        original.db.exec("DROP TABLE receipts; " + canonical.toLowerCase().replaceAll(",", ", \n\t").replace("receipts(", "receipts ( \n") + "; PRAGMA user_version=1");
        original.db.prepare("INSERT INTO receipts(actor_id,id,command_hash,response) VALUES(?,?,?,?)").run(row.actor_id, row.id, row.command_hash, row.response); original.close();
        const reopened = new BoardStore(path); cleanups.push(() => reopened.close());
        expect(reopened.db.prepare("PRAGMA user_version").get()!.user_version).toBe(2);
        expect(reopened.db.prepare("SELECT total_changes() AS changes").get()!.changes).toBe(0);
        expect(reopened.chat(f.actorId, "Ada", command)).toEqual(saved);
        const newId = randomUUID(), next = reopened.chat(f.actorId, "Ada", { ...command, id: newId });
        expect(reopened.db.prepare("SELECT typeof(response) AS type FROM receipts WHERE id=?").get(newId)!.type).toBe("blob");
        expect(next.message!.text).toBe(command.text);
    });
});
