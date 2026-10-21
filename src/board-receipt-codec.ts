import { gzipSync, gunzipSync, type ZlibOptions } from "node:zlib";
import type { BoardReceipt } from "./board-contract.ts";

// Storage-format limits are independent of future product/input quota changes.
export const BOARD_RECEIPT_MAX_DECODED_BYTES = 2 * 1024 * 1024 + 256;
const maxStoredBytes = BOARD_RECEIPT_MAX_DECODED_BYTES * 2;
const gzip1Header = Buffer.from("NNBR\0gzip1\0", "ascii");
export type BoardReceiptKind = "patch" | "asset" | "chat";
export type BoardTextEncoding = "UTF-8" | "UTF-16le" | "UTF-16be";
export type BoardReceiptExpectation = { id: string; houseId: string; kind: BoardReceiptKind };
const invalid = (): never => { throw new Error("The persisted board receipt is invalid."); };

/** Check SQLite metadata before selecting any response bytes into JavaScript. */
export function validateBoardReceiptStorage(type: unknown, bytes: unknown, encoding: BoardTextEncoding): void {
    const size = typeof bytes === "number" ? bytes : NaN;
    const limit = type === "text" && encoding === "UTF-8" ? BOARD_RECEIPT_MAX_DECODED_BYTES : maxStoredBytes;
    if ((type !== "text" && type !== "blob") || !Number.isSafeInteger(size) || size <= 0 || size > limit)
        invalid();
    if (type === "text" && encoding !== "UTF-8" && size % 2 !== 0)
        invalid();
}

/** The exact JSON stays TEXT unless the tagged gzip BLOB saves actual SQLite bytes. */
export function encodeBoardReceipt(receipt: BoardReceipt, encoding: BoardTextEncoding): string | Buffer {
    const text = JSON.stringify(receipt), raw = Buffer.from(text);
    if (raw.length > BOARD_RECEIPT_MAX_DECODED_BYTES)
        invalid();
    const encoded = Buffer.concat([gzip1Header, gzipSync(raw, { level: 1 })]);
    const textBytes = encoding === "UTF-8" ? raw.length : text.length * 2;
    return encoded.length < textBytes ? encoded : text;
}

/** Decode a bounded stored value; validate its envelope without rewriting old winners. */
export function decodeBoardReceipt(bytes: Uint8Array, type: string, encoding: BoardTextEncoding, expected: BoardReceiptExpectation): BoardReceipt {
    validateBoardReceiptStorage(type, bytes.byteLength, encoding);
    const stored = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let text: string;
    if (type === "text") {
        const label = encoding === "UTF-8" ? "utf-8" : encoding === "UTF-16le" ? "utf-16le" : "utf-16be";
        text = new TextDecoder(label, { fatal: true, ignoreBOM: true }).decode(stored);
        if (Buffer.byteLength(text) > BOARD_RECEIPT_MAX_DECODED_BYTES)
            invalid();
    }
    else {
        if (!stored.subarray(0, gzip1Header.length).equals(gzip1Header))
            invalid();
        // Normal Z_FINISH rejects truncation; this option also rejects extra members.
        // Node 24.21 supports this strict option; the installed Node typings lag it.
        const options: ZlibOptions & { rejectGarbageAfterEnd: boolean } = {
            maxOutputLength: BOARD_RECEIPT_MAX_DECODED_BYTES, rejectGarbageAfterEnd: true,
        };
        const raw = gunzipSync(stored.subarray(gzip1Header.length), options);
        text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw);
    }
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
        invalid();
    const r = value as Record<string, unknown>, payload = expected.kind === "patch" ? "elements" : expected.kind === "asset" ? "file" : "message";
    if (r.ok !== true || r.id !== expected.id || r.houseId !== expected.houseId || !Number.isSafeInteger(r.sequence) || (r.sequence as number) < 0
        || Object.keys(r).some(key => !["ok", "id", "houseId", "sequence", payload].includes(key)))
        invalid();
    if (payload === "elements" ? !Array.isArray(r.elements) : !r[payload] || typeof r[payload] !== "object" || Array.isArray(r[payload]))
        invalid();
    return value as BoardReceipt;
}
