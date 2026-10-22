import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { io, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HOUSE_WORLD_VERSION, createLayout, findRoute } from "../public/house-geometry.js";
import type { LiveSnapshot } from "../src/house-contract.ts";
import type { StudioReceipt } from "../src/house-studio.ts";
import { createService } from "../src/server.ts";
import { normalizeStudioPng } from "../src/house-studio-codec.ts";

const cleanup: (() => unknown | Promise<unknown>)[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const close of cleanup.splice(0).reverse()) await close(); });
const ask = (socket: Socket, event: string, body: unknown) => socket.timeout(2500).emitWithAck(event, body);
type Actor = { id: string; token: string; cookie: string };
type Control = { socket: Socket; token: string; state: LiveSnapshot; actor: Actor; motion: number };
function png() {
  const chunk = (type: string, data: Buffer) => {
    const bytes = Buffer.alloc(data.length + 12); bytes.writeUInt32BE(data.length); bytes.write(type, 4); data.copy(bytes, 8);
    bytes.writeUInt32BE(crc32(bytes.subarray(4, -4)), bytes.length - 4); return bytes;
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.from([0, 25, 50, 75, 255]))), chunk("IEND", Buffer.alloc(0))]);
}
async function fixture(members = 2) {
  const directory = mkdtempSync(join(tmpdir(), "house-spatial-http-")); cleanup.push(() => rmSync(directory, { recursive: true, force: true }));
  const app = createService({ dataDir: directory, secureCookies: false, activityLog: () => {} }); cleanup.push(() => app.close());
  const people: Actor[] = Array.from({ length: members }, () => { const person = app.houseStore.ensureSession(); return { ...person, cookie: "house_session=" + person.token }; });
  const owner = people[0]!;
  app.houseStore.execute(owner.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 2, name: "Ada", colour: "sage" } });
  const home = app.houseStore.me(owner.id).home!;
  for (const person of people.slice(1)) app.houseStore.execute(person.id, { commandId: randomUUID(), type: "house.join", payload: { code: home.code, name: "Robin", colour: "rose" } });
  const room = app.houseStore.snapshot(owner.id).residents.find(person => person.id === owner.id)!.bedroomId;
  await new Promise<void>(resolve => app.server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + (app.server.address() as { port: number }).port;
  let now = Date.now(); vi.spyOn(Date, "now").mockImplementation(() => now);
  function headers(actor = owner, control?: Control): Record<string, string> {
    return { Cookie: actor.cookie, Origin: base, "Content-Type": "application/json", "X-House-Identity": actor.id,
      ...(control ? { "X-House-Generation": String(control.state.generation), "X-House-Controller-Token": control.token, "X-House-Access-Generation": String(control.state.accessGeneration), "X-House-Seat-Generation": String(control.state.players.find(person => person.id === actor.id)?.seatGeneration) } : {}) };
  }
  async function post(path: string, body: unknown, actor = owner, control?: Control) {
    const response = await fetch(base + path, { method: "POST", headers: headers(actor, control), body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  async function connect(actor = owner, zoneId = room, token: string = randomUUID()) {
    const socket = io(base, { auth: { worldVersion: HOUSE_WORLD_VERSION }, transports: ["websocket"], reconnection: false, extraHeaders: { Cookie: actor.cookie, Origin: base } });
    cleanup.push(() => socket.disconnect());
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
    const response = await ask(socket, "house.subscribe", { zoneId, controllerToken: token });
    expect(response.ok).toBe(true);
    const client: Control = { socket, token, actor, state: response.snapshot, motion: 0 };
    socket.on("house.snapshot", state => { client.state = state; }); return client;
  }
  async function subscribe(client: Control, zoneId: string) {
    const response = await ask(client.socket, "house.subscribe", { zoneId, controllerToken: client.token }); expect(response.ok).toBe(true); client.state = response.snapshot;
  }
  const studioCommand = (type = "studio.soundscape", payload: Record<string, unknown> = { preset: "rain" }, revision = 0, roomId = room) => ({ commandId: randomUUID(), roomId, expectedRevision: revision, type, payload });
  const studio = (body: unknown, client: Control) => post("/api/house/studio/command", body, client.actor, client);
  async function upload(client: Control) {
    const image = png(), begin = await studio(studioCommand("studio.upload.begin", { mime: "image/png", bytes: image.length }), client); expect(begin.status).toBe(200);
    const uploadId = begin.body.result.uploadId;
    expect((await studio(studioCommand("studio.upload.chunk", { uploadId, index: 0, data: image.toString("base64") }), client)).status).toBe(200);
    const commit = await studio(studioCommand("studio.upload.commit", { uploadId }), client); expect(commit.status).toBe(200); return commit.body as StudioReceipt;
  }
  async function configure(open: boolean) {
    const revision = app.houseStore.snapshot(owner.id, room).room!.revision;
    app.houseStore.execute(owner.id, { commandId: randomUUID(), houseId: home.id, type: "room.configure", expectedRevision: revision, payload: { roomId: room, open, palette: "sage" } });
  }
  async function sit(client: Control, seatId: string) {
    const layout = createLayout(2), self = client.state.players.find(person => person.id === client.actor.id)!;
    const seat = layout.seats.find(candidate => candidate.id === seatId)!;
    const route = findRoute(layout, { x: self.x!, z: self.z! }, seat.target); expect(route).not.toBeNull();
    for (const point of route!.slice(1)) { now += 80; const moved = await ask(client.socket, "house.move", { generation: client.state.generation, sequence: ++client.motion, ...point, heading: 0 }); expect(moved, JSON.stringify(moved)).toMatchObject({ ok: true }); }
    expect(await ask(client.socket, "house.seat", { generation: client.state.generation, seatId })).toMatchObject({ ok: true });
    await vi.waitFor(() => expect(client.state.players.find(person => person.id === client.actor.id)?.seatId).toBe(seatId));
  }
  async function getStudio(actor = owner) { return fetch(base + "/api/house/studio?roomId=" + room, { headers: { Cookie: actor.cookie } }); }
  async function state(kind: "study" | "sofa", actor = owner) { const response = await fetch(base + "/api/house/gathering?kind=" + kind, { headers: { Cookie: actor.cookie } }); expect(response.status).toBe(200); return response.json(); }
  const gatheringCommand = (sessionId: string, type: string, payload: Record<string, unknown> = {}, kind = "study") => ({ commandId: randomUUID(), kind, sessionId, type: "gathering." + type, payload });
  return { app, people, owner, home, room, base, headers, post, connect, subscribe, studioCommand, studio, upload, configure, sit, getStudio, state, gatheringCommand };
}

// Hold a real request after the handler has begun reading its body, then change authority.
async function heldPost(f: Awaited<ReturnType<typeof fixture>>, path: string, body: unknown, control: Control) {
  const bytes = JSON.stringify(body); let arrived!: () => void;
  const started = new Promise<void>(resolve => { arrived = resolve; });
  f.app.server.once("request", () => arrived());
  let finish!: () => void;
  const result = new Promise<{ status: number; body: any }>((resolve, reject) => {
    const request = httpRequest(f.base + path, { method: "POST", headers: { ...f.headers(control.actor, control), "Content-Length": Buffer.byteLength(bytes) } }, response => {
      let text = ""; response.setEncoding("utf8"); response.on("data", chunk => { text += chunk; }); response.on("end", () => resolve({ status: response.statusCode!, body: JSON.parse(text) }));
    });
    request.on("error", reject); cleanup.push(() => request.destroy()); request.write(bytes.slice(0, -1)); finish = () => request.end(bytes.slice(-1));
  });
  await started; return { finish, result };
}

describe("spatial capabilities through real HTTP and Socket.IO authority", () => {
  it("enforces current cookie identity, same origin and the exact 16 KiB JSON boundary", async () => {
    const f = await fixture(), control = await f.connect(), command = f.studioCommand();
    for (const path of ["/api/house/studio/command", "/api/house/gathering", "/api/house/studio/export"]) {
      const body = path.endsWith("export") ? {} : command;
      for (const replacement of [{ Origin: "https://attacker.invalid" }, { "X-House-Identity": f.people[1]!.id }, { Cookie: "" }] as Record<string, string>[]) {
        const response = await fetch(f.base + path, { method: "POST", headers: { ...f.headers(f.owner, control), ...replacement }, body: JSON.stringify(body) }); expect(response.status, path).toBe(403);
      }
    }
    const crossedRead = await fetch(f.base + "/api/house/studio?roomId=" + f.room, { headers: { Cookie: f.owner.cookie, "X-House-Identity": f.people[1]!.id } });
    expect(crossedRead.status).toBe(403); expect((await crossedRead.json()).code).toBe("IDENTITY_CHANGED");
    const text = JSON.stringify(command), exact = text + " ".repeat(16384 - Buffer.byteLength(text));
    expect((await fetch(f.base + "/api/house/studio/command", { method: "POST", headers: f.headers(f.owner, control), body: exact })).status).toBe(200);
    const tooBig = await fetch(f.base + "/api/house/studio/command", { method: "POST", headers: f.headers(f.owner, control), body: exact + " " });
    expect(tooBig.status).toBe(400); expect((await tooBig.json()).code).toBe("INVALID_INPUT");
    expect((await (await f.getStudio()).json()).revision).toBe(1);
  });

  it("allows exact-bedroom owner control and blocks observers, stale secrets, wrong zones and guests", async () => {
    const f = await fixture(), control = await f.connect(), observer = await f.connect();
    expect(observer.state.controller).toBe(false);
    expect((await f.studio(f.studioCommand(), observer)).body.code).toBe("NOT_CONTROLLER");
    expect((await f.studio(f.studioCommand(), { ...control, token: randomUUID() })).body.code).toBe("NOT_CONTROLLER");
    const accepted = f.studioCommand(); expect((await f.studio(accepted, control)).status).toBe(200);
    expect((await f.studio(accepted, control)).body).toMatchObject({ revision: 1 });
    await f.configure(true); const guest = await f.connect(f.people[1], f.room);
    expect((await f.studio(f.studioCommand("studio.clear", {}, 1), guest)).body.code).toBe("FORBIDDEN");
    await f.subscribe(control, "lounge"); expect((await f.studio(f.studioCommand("studio.clear", {}, 1), control)).body.code).toBe("STALE_ZONE");
    expect((await (await f.getStudio()).json()).soundscape).toBe("rain");
  });

  it("rechecks door permission for metadata and PNG bytes after a permitted preview", async () => {
    const f = await fixture(), owner = await f.connect(), receipt = await f.upload(owner), imageId = receipt.result!.imageId!;
    await f.configure(true); const guest = f.people[1]!;
    const preview = await f.getStudio(guest); expect(preview.status).toBe(200); expect((await preview.json()).writable).toBe(false);
    const url = f.base + "/api/house/studio/image?roomId=" + f.room + "&imageId=" + imageId;
    const image = await fetch(url, { headers: { Cookie: guest.cookie } }); expect(image.status).toBe(200); expect(image.headers.get("cache-control")).toContain("no-store"); expect(Buffer.from(await image.arrayBuffer())).toEqual(normalizeStudioPng(png()).bytes);
    await f.configure(false);
    expect((await f.getStudio(guest)).status).toBe(403);
    const revoked = await fetch(url, { headers: { Cookie: guest.cookie } }); expect(revoked.status).toBe(403); expect(revoked.headers.get("content-type")).toContain("json");
    expect((await fetch(url, { headers: { Cookie: f.owner.cookie } })).status).toBe(200);
    expect((await fetch(url)).status).toBe(403);
  });

  it("exports original-owner archived rooms with a bounded continuation and integrated first page", async () => {
    const f = await fixture(1); const rooms: string[] = [];
    for (let index = 0; index < 3; index++) {
      const room = f.app.houseStore.snapshot(f.owner.id).residents[0]!.bedroomId, home = f.app.houseStore.me(f.owner.id).home!; rooms.push(room);
      const control = await f.connect(f.owner, room);
      if (index === 0) await f.upload(control);
      expect((await f.studio(f.studioCommand("studio.soundscape", { preset: "night" }, index === 0 ? 1 : 0, room), control)).status).toBe(200); control.socket.disconnect();
      f.app.houseStore.execute(f.owner.id, { commandId: randomUUID(), houseId: home.id, type: "house.leave", payload: {} });
      if (index < 2) f.app.houseStore.execute(f.owner.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 2, name: "Ada", colour: "sage" } });
    }
    expect((await f.getStudio()).status).toBe(403);
    const first = await f.post("/api/house/studio/export", {}); expect(first.status).toBe(200); expect(first.body.rooms).toHaveLength(2); expect(first.body.nextCursor).toBeTruthy();
    const second = await f.post("/api/house/studio/export", { cursor: first.body.nextCursor }); expect(second.body.rooms).toHaveLength(1); expect(second.body.nextCursor).toBeNull();
    expect([...first.body.rooms, ...second.body.rooms].map(room => room.roomId)).toEqual([...rooms].sort());
    const integrated = await f.post("/api/house/export", {}); expect(integrated.body.studio).toEqual(first.body);
    const archived = await f.post("/api/house/studio/export", { roomId: rooms[0] });
    expect(archived.body).toMatchObject({ roomId: rooms[0], ownerId: f.owner.id, soundscape: "night" });
    expect(Buffer.from(archived.body.image.data, "base64")).toEqual(normalizeStudioPng(png()).bytes);
    const stranger = f.app.houseStore.ensureSession();
    expect((await f.post("/api/house/studio/export", { roomId: rooms[0] }, { ...stranger, cookie: "house_session=" + stranger.token })).status).toBe(403);
  });

  it("requires actual study seating plus explicit Join and accepts Leave after Stand", async () => {
    const f = await fixture(), control = await f.connect(f.owner, "lounge"), initial = await f.state("study");
    const post = (body: unknown) => f.post("/api/house/gathering", body, f.owner, control), participationId = randomUUID();
    expect(initial).toMatchObject({ selfJoined: false, members: [] });
    expect((await post(f.gatheringCommand(initial.sessionId, "join", { participationId }))).body.code).toBe("GATHERING_SEAT_REQUIRED");
    await f.sit(control, "rest-seat-1"); expect((await post(f.gatheringCommand(initial.sessionId, "join", { participationId }))).body.code).toBe("GATHERING_SEAT_REQUIRED");
    expect(await ask(control.socket, "house.stand", { generation: control.state.generation })).toMatchObject({ ok: true });
    await vi.waitFor(() => expect(control.state.players.find(person => person.id === f.owner.id)?.seatId).toBeNull()); await f.sit(control, "seat-1");
    expect((await f.state("study")).selfJoined).toBe(false);
    expect((await post(f.gatheringCommand(initial.sessionId, "share"))).body.code).toBe("GATHERING_NOT_JOINED");
    const joined = await post(f.gatheringCommand(initial.sessionId, "join", { participationId })); expect(joined.body.state.selfJoined).toBe(true);
    expect((await post(f.gatheringCommand(initial.sessionId, "share"))).body.state.presenterId).toBe(f.owner.id);
    expect(await ask(control.socket, "house.stand", { generation: control.state.generation })).toMatchObject({ ok: true });
    expect((await post(f.gatheringCommand(initial.sessionId, "leave", { participationId }))).body.state).toMatchObject({ selfJoined: false, presenterId: null });
  });

  it("publishes an original-owner sofa PNG copy that survives closing the source door", async () => {
    const f = await fixture(), owner = await f.connect(), receipt = await f.upload(owner); await f.configure(true); await f.subscribe(owner, "lounge"); await f.sit(owner, "rest-seat-1");
    const guest = await f.connect(f.people[1], "lounge"); await f.sit(guest, "rest-seat-2");
    const initial = await f.state("sofa"), submit = (client: Control, type: string, payload: Record<string, unknown>) => f.post("/api/house/gathering", f.gatheringCommand(initial.sessionId, type, payload, "sofa"), client.actor, client);
    await submit(owner, "join", { participationId: randomUUID() }); await submit(guest, "join", { participationId: randomUUID() });
    expect((await submit(guest, "share", { roomId: f.room })).body.code).toBe("FORBIDDEN");
    const published = await submit(owner, "share", { roomId: f.room }); expect(published.status).toBe(200);
    const item = published.body.state.item; expect(item).toMatchObject({ ownerId: f.owner.id, sourceImageId: receipt.result!.imageId }); expect(JSON.stringify(published.body.state)).not.toContain(f.room);
    await f.configure(false);
    const response = await fetch(f.base + "/api/house/gathering/image?kind=sofa&itemId=" + item.id, { headers: { Cookie: guest.actor.cookie } });
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store"); expect(Buffer.from(await response.arrayBuffer())).toEqual(normalizeStudioPng(png()).bytes);
    expect((await submit(owner, "clear", {})).status).toBe(200);
    expect((await fetch(f.base + "/api/house/gathering/image?kind=sofa&itemId=" + item.id, { headers: { Cookie: guest.actor.cookie } })).status).not.toBe(200);
  });

  it.each(["studio", "gathering"] as const)("denies a late %s body after session revocation", async capability => {
    const f = await fixture(), control = await f.connect(f.owner, capability === "studio" ? f.room : "lounge");
    const body = capability === "studio" ? f.studioCommand() : f.gatheringCommand((await f.state("study")).sessionId, "leave", { participationId: randomUUID() });
    const held = await heldPost(f, capability === "studio" ? "/api/house/studio/command" : "/api/house/gathering", body, control);
    f.app.houseStore.recover(f.app.houseStore.issueRecovery(f.owner.id)); held.finish();
    const result = await held.result; expect(result.status).toBe(403); expect(result.body.code).toBe("FORBIDDEN");
    expect(f.app.studio.state(f.owner.id, f.room).revision).toBe(0);
  });

  it.each(["studio", "gathering"] as const)("denies a late %s body after controller-token takeover", async capability => {
    const f = await fixture(), zoneId = capability === "studio" ? f.room : "lounge", control = await f.connect(f.owner, zoneId);
    const body = capability === "studio" ? f.studioCommand() : f.gatheringCommand((await f.state("study")).sessionId, "leave", { participationId: randomUUID() });
    const held = await heldPost(f, capability === "studio" ? "/api/house/studio/command" : "/api/house/gathering", body, control), replacement = await f.connect(f.owner, zoneId);
    expect(await ask(replacement.socket, "house.takeover", { controllerToken: replacement.token })).toMatchObject({ ok: true }); held.finish();
    const result = await held.result; expect([403, 409]).toContain(result.status); expect(["STALE_GENERATION", "NOT_CONTROLLER"]).toContain(result.body.code);
    expect(f.app.studio.state(f.owner.id, f.room).revision).toBe(0);
  });

  it("replays an accepted Join after re-sitting without reviving historical consent", async () => {
    const f = await fixture(), control = await f.connect(f.owner, "lounge"); await f.sit(control, "seat-1");
    const initial = await f.state("study"), command = f.gatheringCommand(initial.sessionId, "join", { participationId: randomUUID() });
    const capturedHeaders = f.headers(f.owner, control), accepted = await f.post("/api/house/gathering", command, f.owner, control);
    expect(accepted.status).toBe(200); expect(accepted.body.state.selfJoined).toBe(true);
    expect(await ask(control.socket, "house.stand", { generation: control.state.generation })).toMatchObject({ ok: true });
    await vi.waitFor(() => expect(control.state.players.find(person => person.id === f.owner.id)?.seatId).toBeNull()); await f.sit(control, "seat-1");
    const replay = await fetch(f.base + "/api/house/gathering", { method: "POST", headers: capturedHeaders, body: JSON.stringify(command) });
    expect(replay.status).toBe(200); const result = await replay.json();
    expect(result.receipt).toEqual(accepted.body.receipt); expect(result.state.selfJoined).toBe(false);
  });
  it.each(["missing", "stale"] as const)("requires %s connection and seat authority for new HTTP effects", async mode => {
    const f = await fixture(), roomControl = await f.connect();
    const studioHeaders = f.headers(f.owner, roomControl);
    if (mode === "missing") delete studioHeaders["X-House-Access-Generation"]; else studioHeaders["X-House-Access-Generation"] = "0";
    const studioResponse = await fetch(f.base + "/api/house/studio/command", { method: "POST", headers: studioHeaders, body: JSON.stringify(f.studioCommand()) });
    expect(studioResponse.status).toBe(409); expect((await (await f.getStudio()).json()).revision).toBe(0);
    await f.subscribe(roomControl, "lounge");
    const initial = await f.state("study");
    for (const field of ["X-House-Access-Generation", "X-House-Seat-Generation"]) {
      const headers = f.headers(f.owner, roomControl); if (mode === "missing") delete headers[field]; else headers[field] = "0";
      const response = await fetch(f.base + "/api/house/gathering", { method: "POST", headers, body: JSON.stringify(f.gatheringCommand(initial.sessionId, "leave", { participationId: randomUUID() })) });
      expect(response.status, field).toBe(409); expect((await response.json()).ok).toBe(false);
    }
  });
  it.each(["stand/re-sit", "same-token reconnect"] as const)("rejects a delayed unaccepted Join after %s", async transition => {
    const f = await fixture(), control = await f.connect(f.owner, "lounge"); await f.sit(control, "seat-1");
    const initial = await f.state("study"), join = f.gatheringCommand(initial.sessionId, "join", { participationId: randomUUID() });
    expect(initial.selfJoined).toBe(false);
    const held = await heldPost(f, "/api/house/gathering", join, control);
    if (transition === "stand/re-sit") {
      expect(await ask(control.socket, "house.stand", { generation: control.state.generation })).toMatchObject({ ok: true });
      await vi.waitFor(() => expect(control.state.players.find(person => person.id === f.owner.id)?.seatId).toBeNull());
      await f.sit(control, "seat-1");
    } else {
      control.socket.disconnect();
      // Wait for the server to observe the closed transport before resuming its reserved lease.
      const observer = await f.connect(f.people[1], "lounge");
      await vi.waitFor(() => expect(observer.state.players.find(person => person.id === f.owner.id)?.connected).toBe(false));
      const resumed = await f.connect(f.owner, "lounge", control.token);
      expect(resumed.state.controller).toBe(true); expect(resumed.state.generation).toBe(control.state.generation);
      expect(resumed.state.accessGeneration).not.toBe(control.state.accessGeneration);
    }
    held.finish(); const result = await held.result;
    expect(result.status).toBe(409); expect(result.body.ok).toBe(false);
    expect((await f.state("study")).selfJoined).toBe(false);
  });
  it("serves the spatial modules and refuses absent allowlisted assets", async () => {
    const f = await fixture();
    for (const path of ["/house-studio-ui.js", "/house-studio.css", "/house-ambience.js", "/house-gathering-ui.js", "/house-gathering.css"]) expect((await fetch(f.base + path)).status).toBe(200);
    const directory = mkdtempSync(join(tmpdir(), "house-spatial-empty-public-")); cleanup.push(() => rmSync(directory, { recursive: true, force: true }));
    const app = createService({ dataDir: directory, publicDir: directory, secureCookies: false, activityLog: () => {} }); cleanup.push(() => app.close());
    await new Promise<void>(resolve => app.server.listen(0, "127.0.0.1", resolve)); const base = "http://127.0.0.1:" + (app.server.address() as { port: number }).port;
    expect((await fetch(base + "/house-studio-ui.js")).status).toBe(404);
  });
});
