// Offline representation accounting after the measured server exits.
// This is not a latency benchmark or a replacement for the accepted-ACK ledger.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
const path = process.argv[2];
if (!path) throw new Error("Supply the closed fixture board.sqlite path.");
const hash = () => createHash("sha256").update(readFileSync(path)).digest("hex");
const before = hash();
const db = new DatabaseSync(path, { readOnly: true });
const header = Buffer.from("NNBR\0gzip1\0", "ascii");
let rowId = 0, count = 0, storedBytes = 0, decodedUTF8Bytes = 0, largestBatch = 0;
try {
  if (db.prepare("PRAGMA encoding").get().encoding !== "UTF-8") throw new Error("This comparison requires the measured UTF-8 fixture.");
  const select = db.prepare("SELECT rowid, typeof(response) AS type, octet_length(response) AS bytes, CAST(response AS BLOB) AS response FROM receipts WHERE rowid > ? ORDER BY rowid LIMIT 64");
  for (;;) {
    const rows = select.all(rowId);
    if (!rows.length) break;
    largestBatch = Math.max(largestBatch, rows.length);
    for (const row of rows) {
      const stored = Buffer.from(row.response);
      if (stored.length !== row.bytes) throw new Error("Stored-length mismatch.");
      let raw;
      if (row.type === "text") raw = stored;
      else if (row.type === "blob" && stored.subarray(0, header.length).equals(header))
        raw = gunzipSync(stored.subarray(header.length), { maxOutputLength: 2 * 1024 * 1024 + 256, rejectGarbageAfterEnd: true });
      else throw new Error("Unexpected receipt representation.");
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
      storedBytes += row.bytes; decodedUTF8Bytes += raw.length; count++; rowId = row.rowid;
    }
  }
} finally { db.close(); }
const after = hash();
if (before !== after) throw new Error("Read-only main database changed.");
console.log(JSON.stringify({ scope: "Same closed combined-run fixture, all retained response values, including bootstrap. JSON byte representation only; excludes indexes, user assets, current scene, WAL, filesystem overhead and RAM.", count, storedBytes, decodedUTF8Bytes, bytesSaved: decodedUTF8Bytes - storedBytes, reductionPercent: 100 * (1 - storedBytes / decodedUTF8Bytes), largestBatch, mainDatabaseBeforeSHA256: before, mainDatabaseAfterSHA256: after, readOnly: true }));
