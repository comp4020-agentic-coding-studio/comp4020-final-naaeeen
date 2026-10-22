import { randomBytes } from "node:crypto";
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeStudioPng } from "../src/house-studio-codec.ts";

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function chunk(type: string, data: Buffer) {
  const out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length); out.write(type, 4); data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, -4)), out.length - 4); return out;
}
function header(width = 2, height = 2, colour = 2) {
  const out = Buffer.alloc(13); out.writeUInt32BE(width); out.writeUInt32BE(height, 4); out[8] = 8; out[9] = colour; return out;
}
function image(head: Buffer, chunks: Buffer[]) { return Buffer.concat([signature, chunk("IHDR", head), ...chunks]); }
const end = () => chunk("IEND", Buffer.alloc(0));
const pixels = Buffer.from([0, 1,2,3,10,20,30, 0, 4,5,6,40,50,60]);
function decodeOutput(bytes: Buffer) {
  expect(bytes.toString("ascii", 37, 41)).toBe("IDAT");
  const length = bytes.readUInt32BE(33); return inflateSync(bytes.subarray(41, 41 + length));
}
describe("strict bounded room PNG raster decoding", () => {
  it.each([
    ["None", [0,1,2,3,10,20,30, 0,4,5,6,40,50,60]],
    ["Sub", [1,1,2,3,9,18,27, 1,4,5,6,36,45,54]],
    ["Up", [2,1,2,3,10,20,30, 2,3,3,3,30,30,30]],
    ["Average", [3,1,2,3,10,19,29, 3,4,4,5,33,38,42]],
    ["Paeth", [4,1,2,3,9,18,27, 4,3,3,3,30,30,30]],
  ])("reconstructs known RGB pixels with %s filtering", (_name, raw) => {
    const encoded = image(header(), [chunk("IDAT", deflateSync(Buffer.from(raw))), end()]);
    const out = normalizeStudioPng(encoded);
    expect(out).toMatchObject({ width: 2, height: 2 });
    expect(decodeOutput(out.bytes)).toEqual(pixels);
    expect(normalizeStudioPng(out.bytes).bytes).toEqual(out.bytes);
  });
  it("covers Paeth left, above and upper-left predictions with known values", () => {
    const raw = Buffer.from([0,15,15,15,20,10,100, 4,251,85,251,6,1,2]);
    const out = normalizeStudioPng(image(header(), [chunk("IDAT", deflateSync(raw)), end()]));
    expect(decodeOutput(out.bytes)).toEqual(Buffer.from([0,15,15,15,20,10,100, 0,10,100,10,21,101,102]));
  });
  it("accepts contiguous split IDAT and strips an optional valid RGB palette", () => {
    const data = deflateSync(pixels);
    const out = normalizeStudioPng(image(header(), [chunk("PLTE", Buffer.from([1,2,3])), chunk("IDAT", data.subarray(0, 5)), chunk("IDAT", data.subarray(5)), end()]));
    expect(decodeOutput(out.bytes)).toEqual(pixels);
    expect(out.bytes.includes(Buffer.from("PLTE"))).toBe(false);
  });
  it.each([
    ["non-ASCII chunk-name bytes", () => {
      const data = chunk("IDAT", deflateSync(pixels)); data[4] = data[4]! | 128;
      data.writeUInt32BE(crc32(data.subarray(4, -4)), data.length - 4);
      return image(header(), [data, end()]);
    }],
    ["zero width", () => image(header(0), [chunk("IDAT", deflateSync(pixels)), end()])],
    ["16-bit raster", () => { const h = header(); h[8] = 16; return image(h, [chunk("IDAT", deflateSync(pixels)), end()]); }],
    ["interlacing", () => { const h = header(); h[12] = 1; return image(h, [chunk("IDAT", deflateSync(pixels)), end()]); }],
    ["reserved chunk-name bit", () => image(header(), [chunk("abcd", Buffer.alloc(0)), chunk("IDAT", deflateSync(pixels)), end()])],
    ["duplicate header", () => image(header(), [chunk("IHDR", header()), chunk("IDAT", deflateSync(pixels)), end()])],
    ["invalid optional palette", () => image(header(), [chunk("PLTE", Buffer.from([1])), chunk("IDAT", deflateSync(pixels)), end()])],
    ["repeated optional palette", () => image(header(), [chunk("PLTE", Buffer.from([1,2,3])), chunk("PLTE", Buffer.from([4,5,6])), chunk("IDAT", deflateSync(pixels)), end()])],
    ["noncontiguous raster chunks", () => { const d = deflateSync(pixels); return image(header(), [chunk("IDAT", d.subarray(0, 5)), chunk("tEXt", Buffer.alloc(0)), chunk("IDAT", d.subarray(5)), end()]); }],
    ["missing end", () => image(header(), [chunk("IDAT", deflateSync(pixels))])],
    ["early end", () => image(header(), [end(), chunk("IDAT", deflateSync(pixels))])],
    ["empty deflate stream", () => image(header(), [chunk("IDAT", Buffer.alloc(0)), end()])],
    ["trailing compressed data", () => image(header(), [chunk("IDAT", Buffer.concat([deflateSync(pixels), Buffer.from([0,1])])), end()])],
    ["too many metadata chunks", () => image(header(), [...Array.from({ length: 1025 }, () => chunk("tEXt", Buffer.alloc(0))), chunk("IDAT", deflateSync(pixels)), end()])],
  ])("rejects %s", (_name, make) => {
    expect(() => normalizeStudioPng(make())).toThrowError(expect.objectContaining({ code: "INVALID_INPUT" }));
  });
  it("bounds the re-encoded output as well as the input compressed bytes", () => {
    // Up filtering compresses a small increment sequence; its unfiltered pixels have high entropy.
    const width = 512, height = 512, stride = width * 4, raw = Buffer.alloc((stride + 1) * height, 1);
    randomBytes(stride).copy(raw, 1); for (let y = 0; y < height; y++) raw[y * (stride + 1)] = 2;
    const input = image(header(width, height, 6), [chunk("IDAT", deflateSync(raw)), end()]);
    expect(input.length).toBeLessThan(256 * 1024);
    expect(() => normalizeStudioPng(input)).toThrowError(expect.objectContaining({ code: "INVALID_INPUT" }));
  });
});

