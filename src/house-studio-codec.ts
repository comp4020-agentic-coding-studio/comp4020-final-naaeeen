import { crc32, deflateSync, inflateSync } from "node:zlib";
import { HouseError } from "./house-contract.ts";

export const ROOM_STUDIO_LIMITS = Object.freeze({
  maxImageBytes: 256 * 1024,
  maxPixels: 1024 * 1024,
  maxEdge: 2048,
  maxChunkBytes: 8192,
  maxUploadChunks: 32,
  uploadTtlMs: 5 * 60 * 1000,
  maxUploadsPerActor: 2,
  maxUploads: 12,
  maxReceiptBytesPerActor: 1024 * 1024,
  maxReceiptsPerActor: 4096,
  maxOwnerImageBytes: 8 * 1024 * 1024,
});
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function invalid(message: string): never { throw new HouseError("INVALID_INPUT", message); }
function pngChunk(type: string, data: Buffer): Buffer {
  const bytes = Buffer.allocUnsafe(data.length + 12);
  bytes.writeUInt32BE(data.length); bytes.write(type, 4, 4, "ascii"); data.copy(bytes, 8);
  bytes.writeUInt32BE(crc32(bytes.subarray(4, bytes.length - 4)), bytes.length - 4);
  return bytes;
}
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Canvas-style static PNG only. Decode bounded pixels and re-encode without metadata. */
export function normalizeStudioPng(bytes: Buffer): { bytes: Buffer; width: number; height: number } {
  if (bytes.length < 33 || bytes.length > ROOM_STUDIO_LIMITS.maxImageBytes || !bytes.subarray(0, 8).equals(SIGNATURE)
    || bytes.readUInt32BE(8) !== 13 || bytes.toString("latin1", 12, 16) !== "IHDR") invalid("Choose a supported static PNG image.");
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), colour = bytes[25]!;
  if (!width || !height || width > ROOM_STUDIO_LIMITS.maxEdge || height > ROOM_STUDIO_LIMITS.maxEdge
    || width * height > ROOM_STUDIO_LIMITS.maxPixels) invalid("The PNG exceeds the room reference dimensions.");
  if (bytes[24] !== 8 || ![2, 6].includes(colour) || bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] !== 0)
    invalid("Use an 8-bit RGB or RGBA, noninterlaced PNG.");
  const parts: Buffer[] = [];
  let position = 8, count = 0, hasData = false, endedData = false, ended = false, hasPalette = false;
  while (position < bytes.length) {
    if (++count > 1024 || position + 12 > bytes.length) invalid("The PNG chunk layout is invalid.");
    const length = bytes.readUInt32BE(position), type = bytes.toString("latin1", position + 4, position + 8), next = position + length + 12;
    if (next > bytes.length || !/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type)
      || bytes.readUInt32BE(next - 4) !== crc32(bytes.subarray(position + 4, next - 4))) invalid("The PNG chunk integrity is invalid.");
    if (type === "IHDR" && position !== 8) invalid("The PNG has a repeated header.");
    if (["acTL", "fcTL", "fdAT", "tRNS"].includes(type)) invalid("Animation and colour-key transparency are unsupported; choose a Canvas PNG.");
    if (type === "PLTE") {
      if (hasPalette || hasData || length < 3 || length > 768 || length % 3) invalid("The PNG palette is invalid.");
      hasPalette = true;
    }
    if (type === "IDAT") {
      if (endedData) invalid("The PNG raster chunks are not contiguous.");
      hasData = true; parts.push(bytes.subarray(position + 8, next - 4));
    } else if (hasData) endedData = true;
    if (type === "IEND") {
      if (length || !hasData || next !== bytes.length) invalid("The PNG end marker is invalid.");
      ended = true;
    }
    if (type[0] === type[0]!.toUpperCase() && !["IHDR", "PLTE", "IDAT", "IEND"].includes(type))
      invalid("The PNG contains an unsupported critical chunk.");
    position = next;
  }
  if (!ended) invalid("The PNG end marker is missing.");
  const channels = colour === 6 ? 4 : 3, stride = width * channels, rasterLength = (stride + 1) * height, compressed = Buffer.concat(parts);
  let raw: Buffer;
  try {
    const result = inflateSync(compressed, { maxOutputLength: rasterLength, info: true }) as unknown as { buffer: Buffer; engine: { bytesWritten: number } };
    if (result.buffer.length !== rasterLength || result.engine.bytesWritten !== compressed.length) invalid("The PNG raster size is invalid.");
    raw = result.buffer;
  } catch (error) {
    if (error instanceof HouseError) throw error;
    invalid("The PNG raster cannot be decoded within its declared dimensions.");
  }
  const raster = Buffer.allocUnsafe(rasterLength);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1), filter = raw[row]!;
    if (filter > 4) invalid("The PNG row filter is invalid.");
    raster[row] = 0;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? raster[row + 1 + x - channels]! : 0;
      const above = y ? raster[row + 1 + x - stride - 1]! : 0;
      const upperLeft = y && x >= channels ? raster[row + 1 + x - stride - 1 - channels]! : 0;
      const prediction = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above : filter === 3 ? Math.floor((left + above) / 2) : paeth(left, above, upperLeft);
      raster[row + 1 + x] = (raw[row + 1 + x]! + prediction) & 255;
    }
  }
  const header = Buffer.from(bytes.subarray(16, 29));
  const clean = Buffer.concat([SIGNATURE, pngChunk("IHDR", header), pngChunk("IDAT", deflateSync(raster, { level: 9 })), pngChunk("IEND", Buffer.alloc(0))]);
  if (clean.length > ROOM_STUDIO_LIMITS.maxImageBytes) invalid("The normalized PNG exceeds the room reference byte limit.");
  return { bytes: clean, width, height };
}

