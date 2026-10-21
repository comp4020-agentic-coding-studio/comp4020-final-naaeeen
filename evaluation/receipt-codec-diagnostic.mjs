import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { gzipSync, gunzipSync, brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";
import { BoardStore } from "../src/board-store.ts";
import { encodeBoardReceipt, decodeBoardReceipt } from "../src/board-receipt-codec.ts";
const digest = value => createHash("sha256").update(value).digest("hex");
const sourcePaths = ["src/board-store.ts", "src/board-receipt-codec.ts", "evaluation/receipt-codec-diagnostic.mjs", "evaluation/receipt-codec-diagnostic.protocol.json"];
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = uuid(1), houseId = uuid(2), samples = [], store = new BoardStore(":memory:");
const shape = (id, changes = {}) => ({ id, type: "rectangle", x: 0, y: 0, width: 100, height: 80, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, seed: 1, version: 1, versionNonce: 100, index: "a0", isDeleted: false, groupIds: [], frameId: null, boundElements: null, updated: 1000, link: null, locked: false, roundness: null, ...changes });
const note = version => shape("note", { type: "text", version, fontSize: 20, fontFamily: 5, text: "reviewed receipt ".repeat(700), originalText: "reviewed receipt ".repeat(700), textAlign: "left", verticalAlign: "top", containerId: null, autoResize: true, lineHeight: 1.25 });
const collect = (name, kind, receipt) => samples.push({ name, kind, receipt, raw: Buffer.from(JSON.stringify(receipt)) });
const originalNow = Date.now;
try {
    Date.now = () => 1792600000000;
    collect("rectangle", "patch", store.patch(actor, { id: uuid(10), houseId, elements: [shape("rectangle")] }));
    collect("repetitive-text", "patch", store.patch(actor, { id: uuid(11), houseId, elements: [note(1)] }));
    collect("later-winner", "patch", store.patch(actor, { id: uuid(12), houseId, elements: [note(2)] }));
    collect("short-chat", "chat", store.chat(actor, "Example", { id: uuid(13), houseId, text: "one next step" }));
    collect("repetitive-chat", "chat", store.chat(actor, "Example", { id: uuid(14), houseId, text: "saved response ".repeat(200) }));
    let seed = 17;
    const text = Array.from({ length: 4000 }, () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return String.fromCodePoint(0x4e00 + seed % 20902); }).join("");
    collect("incompressible-CJK", "chat", store.chat(actor, "Example", { id: uuid(15), houseId, text }));
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
    collect("PNG-asset", "asset", store.asset(actor, { id: uuid(16), houseId, file: { id: "image", mimeType: "image/png", dataURL: "data:image/png;base64," + png } }));
}
finally { Date.now = originalNow; store.close(); }
const codecBytes = samples.map(({ name, raw }) => {
    const gzip1 = gzipSync(raw, { level: 1 }), gzip6 = gzipSync(raw, { level: 6 }), brotli4 = brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } });
    assert.deepEqual(gunzipSync(gzip1), raw); assert.deepEqual(gunzipSync(gzip6), raw); assert.deepEqual(brotliDecompressSync(brotli4), raw);
    return { name, rawUTF8Bytes: raw.length, gzip1PayloadBytes: gzip1.length, gzip6PayloadBytes: gzip6.length, brotli4PayloadBytes: brotli4.length, allRawRoundTrips: true };
});
const storage = [];
for (const encoding of ["UTF-8", "UTF-16le", "UTF-16be"]) {
    const db = new DatabaseSync(":memory:");
    try {
        db.exec(`PRAGMA encoding='${encoding}'; CREATE TABLE probe(raw TEXT NOT NULL,encoded TEXT NOT NULL)`);
        for (const { name, kind, receipt, raw } of samples) {
            db.exec("DELETE FROM probe");
            db.prepare("INSERT INTO probe(raw,encoded) VALUES (?,?)").run(raw.toString(), encodeBoardReceipt(receipt, encoding));
            const metadata = db.prepare("SELECT typeof(encoded) AS type,octet_length(raw) AS rawBytes,octet_length(encoded) AS storedBytes FROM probe").get();
            const bytes = db.prepare("SELECT CAST(encoded AS BLOB) AS bytes FROM probe").get().bytes;
            const decoded = decodeBoardReceipt(bytes, metadata.type, encoding, { id: receipt.id, houseId, kind });
            assert.deepEqual(decoded, receipt); assert.ok(metadata.storedBytes <= metadata.rawBytes);
            storage.push({ encoding, name, ...metadata, exactReceipt: true });
        }
    }
    finally { db.close(); }
}
const sqlite = new DatabaseSync(":memory:"), sqliteVersion = sqlite.prepare("SELECT sqlite_version() AS version").get().version; sqlite.close();
const result = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), node: process.version, sqliteVersion,
    head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    sources: Object.fromEntries(sourcePaths.map(path => [path, digest(readFileSync(path))])),
    corpusSHA256: digest(Buffer.concat(samples.map(sample => sample.raw))), sampleCount: samples.length,
    codecBytes, storage,
    result: "PASS: bounded synthetic byte/correctness diagnostic only",
    limits: ["No timing, RSS or universal codec ranking", "Not the historical 66-sample corpus", "Browser/full-suite/sustained 16MiB growth acceptance not run here", "No existing database, frozen workload or production data modified"],
};
writeFileSync("evaluation/receipt-codec-diagnostic.results.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ result: result.result, samples: samples.length, storageCases: storage.length, corpusSHA256: result.corpusSHA256 }));
