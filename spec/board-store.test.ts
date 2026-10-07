import { crc32 } from "node:zlib";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { BoardStore } from "../src/board-store.ts";
export function shape(id = "shape_a", changes: Record<string, unknown> = {}) {
    return { id, type: "rectangle", x: 0, y: 0, width: 100, height: 80, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, seed: 1, version: 1, versionNonce: 100, index: "a0", isDeleted: false, groupIds: [], frameId: null, boundElements: null, updated: 1000, link: null, locked: false, roundness: null, ...changes };
}
const cleanups: (() => void)[] = [];
afterEach(() => {
    for (const cleanup of cleanups.splice(0).reverse())
        cleanup();
});
function fixture() {
    const path = mkdtempSync(join(tmpdir(), "board-store-"));
    const store = new BoardStore(join(path, "board.sqlite"));
    cleanups.push(() => rmSync(path, { recursive: true, force: true }), () => store.close());
    return { store, path, houseId: randomUUID(), actorId: randomUUID() };
}
const patch = (f: ReturnType<typeof fixture>, elements: unknown[], id = randomUUID()) => f.store.patch(f.actorId, { id, houseId: f.houseId, elements });
describe("durable board authority", () => {
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
