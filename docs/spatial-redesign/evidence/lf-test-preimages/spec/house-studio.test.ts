import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { HouseStore } from "../src/house-store.ts";
import { HouseError } from "../src/house-contract.ts";
import { RoomStudioStore, ROOM_STUDIO_LIMITS } from "../src/house-studio.ts";

const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).reverse().forEach(fn => fn()));
const fails = (code: string) => expect.objectContaining({ code });
function chunk(type: string, data: Buffer) {
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length); result.write(type, 4); data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4); return result;
}
function png(width = 2, height = 2, raster?: Buffer, extra: Buffer[] = []) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const raw = raster ?? Buffer.from(Array.from({ length: height * (width * 4 + 1) }, (_, i) => i % (width * 4 + 1) === 0 ? 0 : (i * 17) & 255));
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), ...extra, chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
function setup(capacity = 2) {
  const root = mkdtempSync(join(tmpdir(), "house-studio-")), path = join(root, "house.sqlite");
  let house = new HouseStore(path), now = 1_000;
  const a = house.ensureSession().id, b = house.ensureSession().id;
  house.execute(a, { commandId: randomUUID(), type: "house.create", payload: { capacity, name: "A", colour: "sage" } });
  const home = house.me(a).home!;
  house.execute(b, { commandId: randomUUID(), type: "house.join", payload: { code: home.code, name: "B", colour: "blue" } });
  const roomA = house.snapshot(a).residents.find(r => r.id === a)!.bedroomId, roomB = house.snapshot(b).residents.find(r => r.id === b)!.bedroomId;
  const authority = {
    authorizeRead(actor: string, roomId: string) {
      house.authorizeZone(actor, roomId); return { ownerId: house.snapshot(actor, roomId).room!.ownerId };
    },
    authorizeExport(actor: string) { house.exportOwn(actor); },
    now: () => now,
  };
  let studio = new RoomStudioStore(path, authority);
  cleanup.push(() => { studio.close(); house.close(); rmSync(root, { recursive: true, force: true }); });
  let controller = true, currentRoom = roomA;
  const control = () => {
    if (!controller) throw new HouseError("NOT_CONTROLLER", "Current controller required.");
    if (currentRoom !== roomA) throw new HouseError("STALE_ZONE", "Current room required.");
  };
  const command = (type: string, payload: Record<string, unknown> = {}, expectedRevision = studio.state(a, roomA).revision, roomId = roomA) =>
    ({ commandId: randomUUID(), roomId, expectedRevision, type, payload });
  const execute = (type: string, payload: Record<string, unknown> = {}, revision?: number) => studio.execute(a, command(type, payload, revision), control);
  function begin(bytes: Buffer, revision?: number) { return execute("studio.upload.begin", { bytes: bytes.length, mime: "image/png" }, revision).result!.uploadId as string; }
  function stage(bytes: Buffer, revision?: number) {
    const uploadId = begin(bytes, revision);
    for (let offset = 0, index = 0; offset < bytes.length; offset += 8192, index++)
      execute("studio.upload.chunk", { uploadId, index, data: bytes.subarray(offset, offset + 8192).toString("base64") }, revision);
    return uploadId;
  }
  function upload(bytes = png(), revision?: number) {
    const uploadId = stage(bytes, revision);
    return execute("studio.upload.commit", { uploadId }, revision);
  }
  function houseCommand(actor: string, type: string, payload: Record<string, unknown> = {}, expectedRevision?: number) {
    return house.execute(actor, { commandId: randomUUID(), type, houseId: home.id, payload, ...(expectedRevision === undefined ? {} : { expectedRevision }) });
  }
  const open = () => houseCommand(a, "room.configure", { roomId: roomA, open: true, palette: "sage" }, house.snapshot(a, roomA).room!.revision);
  return { root, path, a, b, home, roomA, roomB, authority, command, execute, begin, stage, upload, houseCommand, open, control,
    get house() { return house; }, get studio() { return studio; },
    setController(value: boolean) { controller = value; }, moveAway() { currentRoom = "lounge"; },
    advance(ms: number) { now += ms; },
    restart() { studio.close(); house.close(); house = new HouseStore(path); studio = new RoomStudioStore(path, authority); },
  };
}

describe("owned room studio authority and durable context", () => {
  it("adds namespaced tables to the existing file without changing house schema version or existing room/card data", () => {
    const f = setup(), before = f.house.snapshot(f.a, f.roomA), version = f.house.db.prepare("PRAGMA user_version").get();
    expect(f.studio.state(f.a, f.roomA)).toEqual({ ok: true, roomId: f.roomA, ownerId: f.a, revision: 0, image: null, view: { x: .5, y: .5, zoom: 1 }, soundscape: "off", writable: true });
    f.upload();
    expect(f.house.db.prepare("PRAGMA user_version").get()).toEqual(version);
    expect(f.house.snapshot(f.a, f.roomA)).toEqual(before);
    expect(readdirSync(f.root).every(name => name.startsWith("house.sqlite"))).toBe(true);
    f.restart(); expect(f.studio.state(f.a, f.roomA).image).toMatchObject({ width: 2, height: 2 });
  });

  it("saves the owner's selected PNG, view and opt-in preset and restores all on restart", () => {
    const f = setup(); f.upload();
    f.execute("studio.view", { x: .25, y: .75, zoom: 3 });
    f.execute("studio.soundscape", { preset: "rain" });
    const saved = f.studio.state(f.a, f.roomA), bytes = f.studio.image(f.a, f.roomA, saved.image!.id).bytes;
    expect(saved).toMatchObject({ revision: 3, view: { x: .25, y: .75, zoom: 3 }, soundscape: "rain" });
    expect(saved.image!.bytes).toBe(bytes.length);
    f.restart(); expect(f.studio.state(f.a, f.roomA)).toEqual(saved);
    expect(f.studio.image(f.a, f.roomA, saved.image!.id).bytes).toEqual(bytes);
  });

  it("visitors see the owner's material and saved context but cannot overwrite any studio property", () => {
    const f = setup(); f.upload(); f.open();
    expect(f.studio.state(f.b, f.roomA)).toMatchObject({ ownerId: f.a, writable: false, image: { id: f.studio.state(f.a, f.roomA).image!.id } });
    for (const [type, payload] of [["studio.view", { x: 0, y: 0, zoom: 2 }], ["studio.soundscape", { preset: "fire" }], ["studio.clear", {}], ["studio.upload.begin", { bytes: 20, mime: "image/png" }]] as const)
      expect(() => f.studio.execute(f.b, f.command(type, payload), () => {})).toThrowError(fails("FORBIDDEN"));
    const owner = f.studio.state(f.a, f.roomA);
    expect(f.studio.image(f.b, f.roomA, owner.image!.id).image).toEqual(owner.image);
    expect(f.studio.state(f.b, f.roomB).image).toBeNull();
  });

  it("rechecks current door and member permission for metadata, bytes and accepted retry", () => {
    const f = setup(); const receipt = f.upload(); f.open();
    const imageId = f.studio.state(f.a, f.roomA).image!.id;
    f.houseCommand(f.a, "room.configure", { roomId: f.roomA, open: false, palette: "sage" }, f.house.snapshot(f.a, f.roomA).room!.revision);
    expect(() => f.studio.state(f.b, f.roomA)).toThrowError(fails("FORBIDDEN"));
    expect(() => f.studio.image(f.b, f.roomA, imageId)).toThrowError(fails("FORBIDDEN"));
    f.open(); f.houseCommand(f.a, "house.remove", { memberId: f.b });
    expect(() => f.studio.image(f.b, f.roomA, imageId)).toThrowError(fails("FORBIDDEN"));
    expect(() => f.studio.state(f.b, f.roomB)).toThrowError(fails("FORBIDDEN"));
    expect(receipt.ok).toBe(true);
  });

  it("rejects observer, stale-controller and wrong-room callbacks before side effects, including accepted retries", () => {
    const f = setup(), command = f.command("studio.soundscape", { preset: "night" });
    const receipt = f.studio.execute(f.a, command, f.control); f.setController(false);
    expect(() => f.studio.execute(f.a, command, f.control)).toThrowError(fails("NOT_CONTROLLER"));
    f.setController(true); f.moveAway();
    expect(() => f.studio.execute(f.a, f.command("studio.clear"), f.control)).toThrowError(fails("STALE_ZONE"));
    expect(f.studio.state(f.a, f.roomA).revision).toBe(receipt.revision);
  });

  it("replays the exact receipt before revision conflict and rejects UUID reuse with a different payload", () => {
    const f = setup(), command = f.command("studio.soundscape", { preset: "fire" });
    const receipt = f.studio.execute(f.a, command, f.control); f.execute("studio.soundscape", { preset: "night" });
    expect(f.studio.execute(f.a, command, f.control)).toEqual(receipt);
    expect(() => f.studio.execute(f.a, { ...command, payload: { preset: "rain" } }, f.control)).toThrowError(fails("COMMAND_ID_REUSED"));
    expect(() => f.execute("studio.soundscape", { preset: "off" }, 0)).toThrowError(fails("REVISION_CONFLICT"));
    expect(f.studio.state(f.a, f.roomA).revision).toBe(2);
  });

  it("performs HouseStore authorization outside the studio transaction and rejects asynchronous callbacks", () => {
    const f = setup();
    // Real HouseStore methods use BEGIN IMMEDIATE: nesting either callback inside the studio write deadlocks/fails.
    expect(f.execute("studio.soundscape", { preset: "rain" }).ok).toBe(true);
    expect(() => f.studio.execute(f.a, f.command("studio.clear"), (() => Promise.resolve()) as unknown as () => void)).toThrowError(fails("INVALID_INPUT"));
    const other = new RoomStudioStore(f.path, { authorizeRead: (() => Promise.resolve({ ownerId: f.a })) as any });
    cleanup.push(() => other.close());
    expect(() => other.state(f.a, f.roomA)).toThrowError(fails("INVALID_INPUT"));
  });

  it("commits room changes and the receipt together and preserves exact retry after a receipt write failure", () => {
    const f = setup(), command = f.command("studio.soundscape", { preset: "night" });
    f.house.db.exec("CREATE TRIGGER fail_studio_receipt BEFORE INSERT ON room_studio_receipts BEGIN SELECT RAISE(ABORT,'injected'); END;");
    expect(() => f.studio.execute(f.a, command, f.control)).toThrowError(fails("STORAGE_UNAVAILABLE"));
    expect(f.studio.state(f.a, f.roomA)).toMatchObject({ revision: 0, soundscape: "off" });
    f.house.db.exec("DROP TRIGGER fail_studio_receipt");
    const receipt = f.studio.execute(f.a, command, f.control); f.restart();
    expect(f.studio.execute(f.a, command, f.control)).toEqual(receipt);
    expect(Buffer.byteLength(JSON.stringify(receipt))).toBeLessThanOrEqual(512);
  });

  it("allows departed authors to export their chosen bytes while denying current reads and all other authors' exports", () => {
    const f = setup(); f.upload(); const saved = f.studio.state(f.a, f.roomA), original = f.studio.exportRoom(f.a, f.roomA);
    expect(Buffer.from(original.image!.data, "base64")).toEqual(f.studio.image(f.a, f.roomA, saved.image!.id).bytes);
    f.houseCommand(f.a, "house.transfer", { memberId: f.b }); f.houseCommand(f.a, "house.leave");
    expect(() => f.studio.state(f.a, f.roomA)).toThrowError(fails("FORBIDDEN"));
    expect(() => f.studio.image(f.a, f.roomA, saved.image!.id)).toThrowError(fails("FORBIDDEN"));
    expect(f.studio.exportOwn(f.a).rooms).toEqual([original]); expect(f.studio.exportOwn(f.a).nextCursor).toBeNull();
    expect(f.studio.exportRoom(f.a, f.roomA)).toEqual(original);
    expect(() => f.studio.exportRoom(f.b, f.roomA)).toThrowError(fails("FORBIDDEN"));
    f.restart(); expect(f.studio.exportRoom(f.a, f.roomA)).toEqual(original);
  });

  it("does not accept another room's current image ID or keep replaced/withdrawn bytes reachable", () => {
    const f = setup(); f.upload(); const old = f.studio.state(f.a, f.roomA).image!.id;
    expect(() => f.studio.image(f.b, f.roomB, old)).toThrowError(fails("FORBIDDEN"));
    f.upload(png(3, 1)); expect(() => f.studio.image(f.a, f.roomA, old)).toThrowError(fails("FORBIDDEN"));
    const current = f.studio.state(f.a, f.roomA).image!.id;
    f.execute("studio.soundscape", { preset: "rain" }); f.execute("studio.clear");
    expect(f.studio.state(f.a, f.roomA)).toMatchObject({ image: null, view: { x: .5, y: .5, zoom: 1 }, soundscape: "rain" });
    expect(() => f.studio.image(f.a, f.roomA, current)).toThrowError(fails("FORBIDDEN"));
    expect(f.studio.exportRoom(f.a, f.roomA).image).toBeNull();
  });

  it("closes idempotently and reports unsupported metadata without changing HouseStore version", () => {
    const f = setup(); f.studio.close(); f.studio.close();
    expect(() => f.studio.state(f.a, f.roomA)).toThrowError(fails("STORAGE_UNAVAILABLE"));
    f.house.db.prepare("UPDATE room_studio_meta SET version=99").run();
    expect(() => new RoomStudioStore(f.path, f.authority)).toThrowError(fails("STORAGE_UNAVAILABLE"));
    expect(f.house.db.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: 5 });
  });
});

describe("bounded staged PNG replacement", () => {
  it("keeps the old image until complete validated commit, with bounded metadata-only receipts", () => {
    const f = setup(); f.upload(); const old = f.studio.state(f.a, f.roomA), bytes = png(4, 3), uploadId = f.begin(bytes);
    expect(() => f.execute("studio.upload.commit", { uploadId })).toThrowError(fails("UPLOAD_INCOMPLETE"));
    expect(f.studio.state(f.a, f.roomA)).toEqual(old);
    const command = f.command("studio.upload.chunk", { uploadId, index: 0, data: bytes.toString("base64") });
    const receipt = f.studio.execute(f.a, command, f.control);
    expect(f.studio.execute(f.a, command, f.control)).toEqual(receipt);
    expect(JSON.stringify(receipt)).not.toContain(bytes.toString("base64"));
    const commit = f.command("studio.upload.commit", { uploadId }); const accepted = f.studio.execute(f.a, commit, f.control);
    expect(f.studio.execute(f.a, commit, f.control)).toEqual(accepted);
    expect(f.studio.state(f.a, f.roomA)).toMatchObject({ revision: 2, image: { width: 4, height: 3 } });
  });

  it("resumes an interrupted upload after closing both actual SQLite connections", () => {
    const f = setup(), bytes = png(); const uploadId = f.begin(bytes); f.restart();
    f.execute("studio.upload.chunk", { uploadId, index: 0, data: bytes.toString("base64") }); f.restart();
    f.execute("studio.upload.commit", { uploadId }); expect(f.studio.state(f.a, f.roomA).image).toMatchObject({ width: 2 });
  });

  it("binds upload to room, actor, base revision and bounded TTL, and permits abort after revision changed", () => {
    const f = setup(), bytes = png(), uploadId = f.begin(bytes);
    expect(() => f.execute("studio.upload.chunk", { uploadId, index: 1, data: bytes.toString("base64") })).toThrowError(fails("UPLOAD_CONFLICT"));
    expect(() => f.studio.execute(f.b, f.command("studio.upload.commit", { uploadId }, 0, f.roomB), () => {})).toThrowError(fails("UPLOAD_EXPIRED"));
    f.execute("studio.soundscape", { preset: "fire" });
    expect(() => f.execute("studio.upload.chunk", { uploadId, index: 0, data: bytes.toString("base64") })).toThrowError(fails("REVISION_CONFLICT"));
    f.execute("studio.upload.abort", { uploadId }, 0);
    const expiring = f.begin(bytes); f.advance(ROOM_STUDIO_LIMITS.uploadTtlMs);
    expect(() => f.execute("studio.upload.chunk", { uploadId: expiring, index: 0, data: bytes.toString("base64") })).toThrowError(fails("UPLOAD_EXPIRED"));
  });

  it("caps per-actor uploads and rejects excess/short/noncanonical data without consuming saved bytes", () => {
    const f = setup(), bytes = Buffer.alloc(9000), first = f.begin(bytes); f.begin(bytes);
    expect(() => f.begin(bytes)).toThrowError(fails("STUDIO_LIMIT"));
    for (const data of ["!", "YQ", "YR==", Buffer.alloc(8193).toString("base64"), Buffer.alloc(10).toString("base64")])
      expect(() => f.execute("studio.upload.chunk", { uploadId: first, index: 0, data })).toThrowError(fails("INVALID_INPUT"));
    f.execute("studio.upload.chunk", { uploadId: first, index: 0, data: Buffer.alloc(8192).toString("base64") });
    expect(() => f.execute("studio.upload.chunk", { uploadId: first, index: 1, data: Buffer.alloc(809).toString("base64") })).toThrowError(fails("INVALID_INPUT"));
    f.execute("studio.upload.abort", { uploadId: first });
    expect(f.begin(png())).toBeTypeOf("string");
  });

  it("strips ancillary metadata and reconstructs the actual decoded PNG pixels", () => {
    const f = setup(); const bytes = png(2, 2, undefined, [chunk("tEXt", Buffer.from("filename\u0000private.png"))]);
    f.upload(bytes); const saved = f.studio.state(f.a, f.roomA); const output = f.studio.image(f.a, f.roomA, saved.image!.id).bytes;
    expect(output.includes(Buffer.from("private.png"))).toBe(false);
    expect(output.toString("ascii", 37, 41)).toBe("IDAT");
    const length = output.readUInt32BE(33); expect(inflateSync(output.subarray(41, 41 + length))).toEqual(inflateSync(png().subarray(41, -16)));
    expect(f.studio.exportRoom(f.a, f.roomA).image!.data).toBe(output.toString("base64"));
  });

  it.each([
    ["wrong signature", () => Buffer.from("<svg/>")],
    ["bad CRC", () => { const bytes = png(); bytes[29] ^= 1; return bytes; }],
    ["too many pixels", () => png(1025, 1024, Buffer.from([0]))],
    ["overlong edge", () => png(2049, 1, Buffer.from([0]))],
    ["truncated raster", () => png(2, 2, Buffer.from([0]))],
    ["inflate excess", () => png(1, 1, Buffer.alloc(50_000))],
    ["invalid row filter", () => png(1, 1, Buffer.from([5,1,2,3,4]))],
    ["animation", () => png(2, 2, undefined, [chunk("acTL", Buffer.alloc(8))])],
    ["unsupported critical chunk", () => png(2, 2, undefined, [chunk("ABCD", Buffer.alloc(0))])],
    ["trailing bytes", () => Buffer.concat([png(), Buffer.from([0])])],
  ])("rejects %s and retains previous material without advancing revision", (_name, make) => {
    const f = setup(); f.upload(); const previous = f.studio.state(f.a, f.roomA);
    const uploadId = f.stage(make()); expect(() => f.execute("studio.upload.commit", { uploadId })).toThrowError(fails("INVALID_INPUT"));
    expect(f.studio.state(f.a, f.roomA)).toEqual(previous);
  });

  it.each([
    ["studio.upload.begin", { bytes: 262145, mime: "image/png" }],
    ["studio.upload.begin", { bytes: 10, mime: "image/jpeg" }],
    ["studio.upload.begin", { bytes: 0, mime: "image/png" }],
    ["studio.view", { x: -1, y: .5, zoom: 1 }],
    ["studio.view", { x: .5, y: Infinity, zoom: 1 }],
    ["studio.view", { x: .5, y: .5, zoom: 5 }],
    ["studio.soundscape", { preset: "remote.mp3" }],
    ["studio.clear", { unexpected: true }],
    ["unknown", {}],
  ])("rejects invalid %s payload %#", (type, payload) => {
    const f = setup(); expect(() => f.execute(type, payload)).toThrowError(fails("INVALID_INPUT"));
    expect(f.studio.state(f.a, f.roomA).revision).toBe(0);
  });

  it("rejects malformed envelopes, oversized JSON and async export without persisting", () => {
    const f = setup(), valid = f.command("studio.clear");
    for (const bad of [null, [], { ...valid, commandId: "bad" }, { ...valid, expectedRevision: -1 }, { ...valid, roomId: "bad" }, { ...valid, actorId: f.b }, { ...valid, payload: { data: "x".repeat(17000) } }])
      expect(() => f.studio.execute(f.a, bad, f.control)).toThrowError(fails("INVALID_INPUT"));
    const other = new RoomStudioStore(f.path, { ...f.authority, authorizeExport: (() => Promise.resolve()) as any });
    cleanup.push(() => other.close());
    expect(() => other.exportOwn(f.a)).toThrowError(fails("INVALID_INPUT"));
    expect(() => f.studio.exportOwn(f.a, "bad")).toThrowError(fails("INVALID_INPUT"));
  });
});


describe("retained material and receipt admission budgets", () => {
  function seedArchived(f: ReturnType<typeof setup>, bytes: Buffer | null = null, width = 2, height = 2) {
    const roomId = randomUUID(), imageId = bytes ? randomUUID() : null;
    f.house.db.prepare("INSERT INTO bedrooms(id,house_id,owner_id,slot,palette,placements,archived) VALUES(?,?,?,0,'sage','[]',1)").run(roomId, f.home.id, f.a);
    f.house.db.prepare("INSERT INTO room_studio_rooms(room_id,owner_id,revision,image_id,image,width,height,x,y,zoom,soundscape) VALUES(?,?,1,?,?,?,?,0.5,0.5,1,'night')")
      .run(roomId, f.a, imageId, bytes, bytes ? width : null, bytes ? height : null);
    return roomId;
  }
  it("exports at most two original-owned rooms per page with real image bytes, no duplicates and a bounded cursor", () => {
    const f = setup(); f.upload(); const current = f.studio.state(f.a, f.roomA), bytes = f.studio.image(f.a, f.roomA, current.image!.id).bytes;
    const expected = [f.roomA, seedArchived(f, bytes), seedArchived(f, bytes), seedArchived(f), seedArchived(f)].sort();
    const rows = []; let cursor: string | undefined;
    do {
      const page = f.studio.exportOwn(f.a, cursor);
      expect(page.rooms.length).toBeLessThanOrEqual(2); expect(Buffer.byteLength(JSON.stringify(page))).toBeLessThan(710_000);
      rows.push(...page.rooms); cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(rows.map(row => row.roomId)).toEqual(expected);
    for (const room of rows) if (room.image) expect(Buffer.from(room.image.data, "base64")).toEqual(bytes);
    expect(f.studio.exportOwn(f.b).rooms).toEqual([]);
  });
  it("rejects retained image growth above 8 MiB across active and archived rooms while preserving old current bytes", () => {
    const f = setup(), width = 256, height = 255, stride = width * 4, raster = randomBytes((stride + 1) * height);
    for (let y = 0; y < height; y++) raster[y * (stride + 1)] = 0;
    const large = png(width, height, raster); expect(large.length).toBeLessThanOrEqual(256 * 1024);
    f.upload(large); const metadata = f.studio.state(f.a, f.roomA).image!, canonical = f.studio.image(f.a, f.roomA, metadata.id).bytes;
    f.execute("studio.clear"); f.upload(png()); const previous = f.studio.state(f.a, f.roomA);
    // Valid normalized reference fixtures provide a near-cap archived identity, without a 1,000-command setup loop.
    const count = Math.floor((ROOM_STUDIO_LIMITS.maxOwnerImageBytes - previous.image!.bytes) / canonical.length);
    for (let i = 0; i < count; i++) seedArchived(f, canonical, width, height);
    const uploadId = f.stage(large);
    expect(() => f.execute("studio.upload.commit", { uploadId })).toThrowError(fails("STUDIO_LIMIT"));
    expect(f.studio.state(f.a, f.roomA)).toEqual(previous);
    expect(f.studio.exportRoom(f.a, f.roomA).image!.bytes).toBe(previous.image!.bytes);
  });
  it("caps global staged uploads across houses, expires them and admits a clean replacement", () => {
    const f = setup(6), actors = [f.a, f.b];
    for (let i = 0; i < 4; i++) {
      const actor = f.house.ensureSession().id; actors.push(actor);
      f.house.execute(actor, { commandId: randomUUID(), type: "house.join", payload: { code: f.home.code, name: "Friend", colour: "blue" } });
    }
    for (const actor of actors) {
      const roomId = f.house.snapshot(actor).residents.find(r => r.id === actor)!.bedroomId;
      for (let n = 0; n < 2; n++) f.studio.execute(actor, { commandId: randomUUID(), roomId, expectedRevision: 0, type: "studio.upload.begin", payload: { bytes: 100, mime: "image/png" } }, () => {});
    }
    const outsider = f.house.ensureSession().id;
    f.house.execute(outsider, { commandId: randomUUID(), type: "house.create", payload: { capacity: 2, name: "Other house", colour: "sage" } });
    const roomId = f.house.snapshot(outsider).residents.find(r => r.id === outsider)!.bedroomId;
    const command = { commandId: randomUUID(), roomId, expectedRevision: 0, type: "studio.upload.begin", payload: { bytes: 100, mime: "image/png" } };
    expect(() => f.studio.execute(outsider, command, () => {})).toThrowError(fails("STUDIO_LIMIT"));
    f.advance(ROOM_STUDIO_LIMITS.uploadTtlMs);
    expect(f.studio.execute(outsider, command, () => {}).ok).toBe(true);
    expect(f.house.db.prepare("SELECT count(*) AS count FROM room_studio_uploads").get()).toEqual({ count: 1 });
  });
  it.each(["count", "bytes"] as const)("stops fresh admission at the receipt %s cap without forgetting accepted UUIDs or applying a change", kind => {
    const f = setup(), command = f.command("studio.soundscape", { preset: "rain" }), accepted = f.studio.execute(f.a, command, f.control);
    const insert = f.house.db.prepare("INSERT INTO room_studio_receipts(actor_id,command_id,room_id,command_hash,response) VALUES(?,?,?,?,?)");
    f.house.db.exec("BEGIN IMMEDIATE");
    const target = kind === "count" ? ROOM_STUDIO_LIMITS.maxReceiptsPerActor - 1 : 3500;
    for (let i = 0; i < target; i++) {
      const commandId = randomUUID(), response = JSON.stringify({ ...accepted, commandId, ...(kind === "bytes" ? { result: {
        uploadId: randomUUID(), imageId: randomUUID(), expiresAt: Number.MAX_SAFE_INTEGER, nextIndex: 32, receivedBytes: 262144,
      } } : {}) });
      insert.run(f.a, commandId, f.roomA, "0".repeat(64), response);
    }
    f.house.db.exec("COMMIT");
    if (kind === "bytes") expect((f.house.db.prepare("SELECT sum(length(response)) AS bytes FROM room_studio_receipts").get() as { bytes: number }).bytes).toBeGreaterThan(ROOM_STUDIO_LIMITS.maxReceiptBytesPerActor);
    expect(() => f.execute("studio.soundscape", { preset: "night" })).toThrowError(fails("STUDIO_LIMIT"));
    expect(f.studio.state(f.a, f.roomA)).toMatchObject({ revision: 1, soundscape: "rain" });
    expect(f.studio.execute(f.a, command, f.control)).toEqual(accepted);
  });
  it("fails safely on corrupt saved studio metadata and an unavailable existing house path", () => {
    const f = setup(); f.execute("studio.soundscape", { preset: "night" });
    f.house.db.exec("PRAGMA ignore_check_constraints=ON");
    f.house.db.prepare("UPDATE room_studio_rooms SET soundscape='unsupported' WHERE room_id=?").run(f.roomA);
    expect(() => f.studio.state(f.a, f.roomA)).toThrowError(fails("STORAGE_UNAVAILABLE"));
    expect(() => new RoomStudioStore(join(f.root, "missing.sqlite"), f.authority)).toThrowError(fails("STORAGE_UNAVAILABLE"));
    expect(() => new RoomStudioStore(f.path, undefined as any)).toThrowError(fails("INVALID_INPUT"));
  });
});

