import { gzipSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import { BOARD_RECEIPT_MAX_DECODED_BYTES as maxBytes, decodeBoardReceipt, encodeBoardReceipt, validateBoardReceiptStorage } from "../src/board-receipt-codec.ts";
import type { BoardReceipt, BoardElement } from "../src/board-contract.ts";
const id = "17b387c3-b127-4579-8064-17b73dfb31e1", houseId = "565fcd72-7e20-41e8-bb53-3e4427b3f258";
const expected = { id, houseId, kind: "patch" as const }, header = Buffer.from("NNBR\0gzip1\0", "ascii");
const receipt = (changes: Partial<BoardReceipt> = {}): BoardReceipt => ({ ok: true, id, houseId, sequence: 7, elements: [], ...changes });
const tagged = (raw: string | Buffer) => Buffer.concat([header, gzipSync(raw)]);
const decode = (bytes: Uint8Array, type = "blob") => decodeBoardReceipt(bytes, type, "UTF-8", expected);
const padded = (size: number) => {
    const value = receipt({ elements: [{ historical: "" } as unknown as BoardElement] });
    value.elements![0]!.historical = "x".repeat(size - Buffer.byteLength(JSON.stringify(value)));
    return value;
};
describe("versioned bounded board receipt codec", () => {
    test("round-trips compressed responses without normalizing historical winners", () => {
        const value = padded(16000), encoded = encodeBoardReceipt(value, "UTF-8");
        expect(encoded).toBeInstanceOf(Buffer); expect(encoded.length).toBeLessThan(1000);
        expect(decode(encoded as Buffer)).toEqual(value);
        expect(decode(Buffer.from(JSON.stringify(value)), "text")).toEqual(value);
    });
    test("keeps a low-compression receipt as raw TEXT when tags make gzip larger", () => {
        // Different UUIDs and a small envelope give gzip little repetition to recover.
        const value = receipt(), text = JSON.stringify(value);
        expect(encodeBoardReceipt(value, "UTF-8")).toBe(text);
    });
    test("accepts the frozen decoded boundary and rejects one extra byte", () => {
        const value = padded(maxBytes), text = JSON.stringify(value);
        expect(Buffer.byteLength(text)).toBe(maxBytes);
        expect(decode(tagged(text))).toEqual(value);
        expect(decode(Buffer.from(text), "text")).toEqual(value);
        expect(() => encodeBoardReceipt(padded(maxBytes + 1), "UTF-8")).toThrow();
        expect(() => decode(tagged(JSON.stringify(padded(maxBytes + 1))))).toThrow();
        expect(() => decode(Buffer.from(text + " "), "text")).toThrow();
    });
    test.each([
        ["truncated gzip", (bytes: Buffer) => bytes.subarray(0, -1)],
        ["trailing byte", (bytes: Buffer) => Buffer.concat([bytes, Buffer.from([1])])],
        ["trailing zero", (bytes: Buffer) => Buffer.concat([bytes, Buffer.from([0])])],
        ["extra gzip member", (bytes: Buffer) => Buffer.concat([bytes, gzipSync("{}")])],
        ["unsupported tag", (bytes: Buffer) => Buffer.concat([Buffer.from("NNBR\0gzip2\0"), bytes.subarray(header.length)])],
        ["corrupt gzip", (bytes: Buffer) => { const copy = Buffer.from(bytes); copy[copy.length - 1] ^= 1; return copy; }],
    ])("rejects %s", (_name, corrupt) => {
        expect(() => decode(corrupt(tagged(JSON.stringify(receipt()))))).toThrow();
    });
    test("rejects invalid UTF8 rather than substituting characters in BLOB or legacy TEXT", () => {
        const text = JSON.stringify(receipt()).replace('"elements":[]', '"elements":["PLACE"]'), bytes = Buffer.from(text), at = bytes.indexOf("PLACE");
        bytes[at] = 255;
        expect(() => decode(tagged(bytes))).toThrow();
        expect(() => decode(bytes, "text")).toThrow();
    });
    test.each([
        null, [], {}, { ok: false }, { id: "another" }, { houseId: "another" },
        { sequence: -1 }, { sequence: 0.5 }, { sequence: Number.MAX_SAFE_INTEGER + 1 },
        { elements: null }, { elements: {} }, { message: {} }, { file: {} }, { unexpected: true },
    ])("rejects an invalid receipt envelope: %s", changes => {
        const value = changes === null || Array.isArray(changes) || Object.keys(changes).length === 0 ? changes : { ...receipt(), ...changes };
        expect(() => decode(tagged(JSON.stringify(value)))).toThrow();
    });
    test("validates the expected payload kind without regenerating historical content", () => {
        const patch = JSON.stringify(receipt());
        expect(() => decodeBoardReceipt(tagged(patch), "blob", "UTF-8", { ...expected, kind: "chat" })).toThrow();
        for (const kind of ["chat", "asset"] as const) {
            const payload = kind === "chat" ? "message" : "file", value = { ok: true, id, houseId, sequence: 0, [payload]: { historical: true } };
            expect(decodeBoardReceipt(tagged(JSON.stringify(value)), "blob", "UTF-8", { ...expected, kind })).toEqual(value);
            expect(() => decode(tagged(JSON.stringify(value)))).toThrow();
        }
    });
    test.each(["null", "integer", "real", "unknown", "text", "blob"])("bounds stored %s metadata before materialization", type => {
        if (type !== "text" && type !== "blob") expect(() => validateBoardReceiptStorage(type, 20, "UTF-8")).toThrow();
        expect(() => validateBoardReceiptStorage(type, maxBytes * 2 + 1, "UTF-16le")).toThrow();
        expect(() => validateBoardReceiptStorage(type, 0, "UTF-8")).toThrow();
        expect(() => validateBoardReceiptStorage(type, NaN, "UTF-8")).toThrow();
    });
    test("checks actual encoding and decoded UTF8 size for legacy UTF16", () => {
        const value = padded(1000), raw = Buffer.from(JSON.stringify(value), "utf16le");
        expect(decodeBoardReceipt(raw, "text", "UTF-16le", expected)).toEqual(value);
        expect(() => decodeBoardReceipt(raw.subarray(1), "text", "UTF-16le", expected)).toThrow();
        const overText = JSON.stringify(receipt({ elements: [{ historical: "学".repeat(Math.ceil(maxBytes / 3)) } as unknown as BoardElement] }));
        expect(Buffer.byteLength(overText)).toBeGreaterThan(maxBytes);
        const over = Buffer.from(overText, "utf16le");
        expect(over.length).toBeLessThan(maxBytes * 2);
        expect(() => decodeBoardReceipt(over, "text", "UTF-16le", expected)).toThrow();
        const bom = Buffer.concat([Buffer.from([239, 187, 191]), Buffer.from(JSON.stringify(value))]);
        expect(() => decode(bom, "text")).toThrow();
    });
});
