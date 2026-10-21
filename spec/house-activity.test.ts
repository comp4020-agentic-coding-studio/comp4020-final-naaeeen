import { HOUSE_WORLD_VERSION } from "../public/house-version.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, expect, test, vi } from "vitest";
import { io, type Socket } from "socket.io-client";
import { createService } from "../src/server.ts";
import type { ActivityRecord } from "../src/activity-log.ts";

const sockets: Socket[] = [];
const fixtures: { app: ReturnType<typeof createService>; directory: string }[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const socket of sockets.splice(0)) socket.disconnect();
  for (const f of fixtures.splice(0).reverse()) { await f.app.close(); rmSync(f.directory, { recursive: true, force: true }); }
});
async function fixture(defaultSink = false) {
  const directory = mkdtempSync(join(tmpdir(), "crit10-activity-"));
  const records: ActivityRecord[] = [];
  const app = createService({ dataDir: directory, secureCookies: false,
    ...(!defaultSink ? { activityLog: (record: ActivityRecord) => records.push(record) } : {}) });
  fixtures.push({ app, directory });
  await new Promise<void>(resolve => app.server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + (app.server.address() as { port: number }).port;
  const owner = app.houseStore.ensureSession(), peer = app.houseStore.ensureSession();
  const post = async (path: string, body: unknown, actor = owner, extra: Record<string,string> = {}) => {
    const response = await fetch(origin + path, { method: "POST", headers: {
      Origin: origin, Cookie: "house_session=" + actor.token, "Content-Type": "application/json",
      "X-House-Identity": actor.id, ...extra }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() as any };
  };
  const create = () => ({ commandId: randomUUID(), type: "house.create",
    payload: { capacity: 3, name: "Private chosen alias", colour: "sage" } });
  return { app, records, origin, owner, peer, post, create };
}

test("accepted house retries share an interaction ID and receipt instead of claiming two mutations", async () => {
  const f = await fixture(), command = f.create();
  const a = await f.post("/api/house/command", command), b = await f.post("/api/house/command", command);
  expect(a.status).toBe(200); expect(b.body).toEqual(a.body);
  const records = f.records.filter(row => row.action === "house.create");
  expect(records).toHaveLength(2);
  for (const row of records) {
    expect(row).toMatchObject({ actor: f.owner.id, action: "house.create", outcome: "accepted",
      commandId: command.commandId, houseId: f.app.houseStore.me(f.owner.id).home!.id, sequence: a.body.sequence, transport: "http" });
    expect(typeof row.at).toBe("string");
  }
  expect(f.app.houseStore.snapshot(f.owner.id).residents).toHaveLength(1);
});

test("authenticated identity mismatch is observable under the cookie actor, without the rejected payload", async () => {
  const f = await fixture(), command = f.create();
  command.payload.name = "PRIVATE_REQUEST_CANARY";
  const response = await f.post("/api/house/command", command, f.peer, { "X-House-Identity": f.owner.id });
  expect(response.status).toBe(403); expect(response.body.code).toBe("IDENTITY_CHANGED");
  expect(f.app.houseStore.me(f.peer.id).home).toBeNull();
  expect(f.records).toContainEqual(expect.objectContaining({
    actor: f.peer.id, action: "house.command", outcome: "IDENTITY_CHANGED", transport: "http"
  }));
  const serialized = JSON.stringify(f.records);
  for (const secret of ["PRIVATE_REQUEST_CANARY", f.peer.token, f.owner.token]) expect(serialized).not.toContain(secret);
});

test("a denied private-room HTTP read records the boundary without recording room content", async () => {
  const f = await fixture();
  f.app.houseStore.execute(f.owner.id, f.create());
  const home = f.app.houseStore.me(f.owner.id).home!;
  f.app.houseStore.execute(f.peer.id, { commandId: randomUUID(), type: "house.join",
    payload: { code: home.code, name: "Peer", colour: "blue" } });
  const roomId = f.app.houseStore.snapshot(f.owner.id).residents.find(x => x.id === f.owner.id)!.bedroomId;
  const reply = await fetch(f.origin + "/api/house/snapshot?zone=" + roomId, { headers: { Cookie: "house_session=" + f.peer.token } });
  expect(reply.status).toBe(403);
  expect(f.records).toContainEqual(expect.objectContaining({
    actor: f.peer.id, action: "house.snapshot", outcome: "FORBIDDEN", transport: "http", zoneId: roomId
  }));
});

test("board retry and changed-payload reuse remain distinguishable without logging message text", async () => {
  const f = await fixture(); await f.post("/api/house/command", f.create());
  const houseId = f.app.houseStore.me(f.owner.id).home!.id;
  const body = { id: randomUUID(), houseId, text: "PRIVATE_BOARD_MESSAGE_CANARY" };
  const first = await f.post("/api/board/chat", body), again = await f.post("/api/board/chat", body);
  expect(first.status).toBe(200); expect(again.body).toEqual(first.body);
  const reused = await f.post("/api/board/chat", { ...body, text: "PRIVATE_CHANGED_PAYLOAD_CANARY" });
  expect(reused.status).toBe(409); expect(reused.body.code).toBe("ID_REUSED");
  const accepted = f.records.filter(row => row.action === "board/chat" && row.outcome === "accepted");
  expect(accepted).toHaveLength(2);
  for (const row of accepted) expect(row).toMatchObject({ actor: f.owner.id, commandId: body.id,
    houseId, sequence: first.body.sequence, transport: "http" });
  expect(f.records).toContainEqual(expect.objectContaining({
    actor: f.owner.id, action: "board/chat", commandId: body.id, outcome: "ID_REUSED" }));
  expect(f.app.boardStore.snapshot(houseId).chat).toHaveLength(1);
  const serialized = JSON.stringify(f.records);
  for (const secret of ["PRIVATE_BOARD_MESSAGE_CANARY", "PRIVATE_CHANGED_PAYLOAD_CANARY",
    "Private chosen alias", f.owner.token, houseId + "?"]) expect(serialized).not.toContain(secret);
});

test("foreign board access is logged as a denial without disclosing the board", async () => {
  const f = await fixture(); await f.post("/api/house/command", f.create());
  const houseId = f.app.houseStore.me(f.owner.id).home!.id;
  const body = { id: randomUUID(), houseId, text: "PRIVATE_OUTSIDER_CANARY" };
  const response = await f.post("/api/board/chat", body, f.peer);
  expect(response.status).toBe(403);
  expect(f.app.boardStore.snapshot(houseId).chat).toHaveLength(0);
  expect(f.records).toContainEqual(expect.objectContaining({
    actor: f.peer.id, action: "board/chat", commandId: body.id, outcome: "FORBIDDEN" }));
  expect(JSON.stringify(f.records)).not.toContain(body.text);
});

test("a throwing default log sink cannot turn recovery-key issuance into a failed action", async () => {
  const f = await fixture(true);
  vi.spyOn(console, "log").mockImplementation(() => { throw new Error("Unavailable log sink"); });
  const response = await f.post("/api/house/recovery-key", {});
  expect(response.status).toBe(200);
  expect(typeof response.body.proof).toBe("string");
  expect(f.app.houseStore.recover(response.body.proof).id).toBe(f.owner.id);
});

test("a throwing default log sink cannot report failed recovery after sessions have changed", async () => {
  const f = await fixture(true), proof = f.app.houseStore.issueRecovery(f.owner.id);
  vi.spyOn(console, "log").mockImplementation(() => { throw new Error("Unavailable log sink"); });
  const response = await f.post("/api/house/recover", { proof }, f.peer);
  expect(response.status).toBe(200); expect(response.body.identity.id).toBe(f.owner.id);
});


test("socket bedroom receipts correlate to the house, not the bedroom stream ID", async () => {
  const f = await fixture(); await f.post("/api/house/command", f.create());
  const home = f.app.houseStore.me(f.owner.id).home!;
  const room = f.app.houseStore.snapshot(f.owner.id).residents.find(row => row.id === f.owner.id)!.bedroomId;
  const socket = io(f.origin, { auth: { worldVersion: HOUSE_WORLD_VERSION }, transports: ["websocket"], reconnection: false,
    extraHeaders: { Cookie: "house_session=" + f.owner.token, Origin: f.origin } });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
  const sub = await socket.timeout(3000).emitWithAck("house.subscribe", { zoneId: room, controllerToken: randomUUID() });
  expect(sub.ok).toBe(true); expect(sub.snapshot.controller).toBe(true);
  const command = { commandId: randomUUID(), houseId: home.id, type: "chat.send",
    payload: { zoneId: room, text: "PRIVATE_SOCKET_ROOM_CANARY" } };
  const receipt = await socket.timeout(3000).emitWithAck("house.command", {
    generation: sub.snapshot.generation, zoneId: room, command });
  expect(receipt.ok).toBe(true); expect(receipt.streamId).toBe("bedroom:" + room);
  expect(f.records).toContainEqual(expect.objectContaining({ actor: f.owner.id,
    action: "chat.send", outcome: "accepted", houseId: home.id, zoneId: room,
    commandId: command.commandId, sequence: receipt.sequence, transport: "socket" }));
  expect(JSON.stringify(f.records)).not.toContain(command.payload.text);
});

test("identity-only profile receipts omit an untrusted house association", async () => {
  const f = await fixture();
  const command = { commandId: randomUUID(), houseId: randomUUID(), expectedRevision: 0,
    type: "profile.set", payload: { name: "Local alias", colour: "sage" } };
  const response = await f.post("/api/house/command", command);
  expect(response.status).toBe(200); expect(response.body.streamId).toBe("identity:" + f.owner.id);
  const row = f.records.find(record => record.commandId === command.commandId)!;
  expect(row).toMatchObject({ actor: f.owner.id, action: "profile.set", outcome: "accepted", transport: "http" });
  expect(row).not.toHaveProperty("houseId");
});
