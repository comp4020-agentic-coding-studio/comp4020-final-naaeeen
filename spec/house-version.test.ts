import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test } from "vitest";
import { io, type Socket } from "socket.io-client";
import { HouseStore } from "../src/house-store.ts";
import { attachHouseRealtime } from "../src/house-realtime.ts";
import { HOUSE_WORLD_VERSION } from "../public/house-version.js";

const cleanups: (() => Promise<unknown> | unknown)[] = [];
afterEach(async () => { for (const clean of cleanups.splice(0).reverse()) await clean(); });
const ask = (socket: Socket, event: string, body: unknown = {}) => socket.timeout(1800).emitWithAck(event, body);
async function fixture() {
  const store = new HouseStore(":memory:"); cleanups.push(() => store.close());
  const owner = store.ensureSession(), peer = store.ensureSession();
  const create = store.execute(owner.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 2, name: "Owner", colour: "sage" } });
  const home = store.me(owner.id).home!;
  store.execute(peer.id, { commandId: randomUUID(), type: "house.join", payload: { code: home.code, name: "Peer", colour: "rose" } });
  const server = createServer((_request, response) => response.end("fixture"));
  const realtime = attachHouseRealtime(server, store); cleanups.push(() => realtime.close());
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  async function client(person = owner, version: unknown = HOUSE_WORLD_VERSION, omit = false) {
    const socket = io(base, { auth: omit ? {} : { worldVersion: version }, transports: ["websocket"], reconnection: false, forceNew: true, extraHeaders: { Origin: base, Cookie: `house_session=${person.token}` } });
    cleanups.push(() => socket.disconnect());
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); }); return socket;
  }
  const subscribe = (socket: Socket, zoneId = "lounge", token = randomUUID()) => ask(socket, "house.subscribe", { zoneId, controllerToken: token });
  return { store, realtime, owner, peer, home, create, client, subscribe };
}

describe("loaded-world compatibility authority", () => {
  test("grants current control and gives a legacy read no poses or effects on that control", async () => {
    const f = await fixture(); const current = await f.client(); const first = (await f.subscribe(current)).snapshot;
    expect(first.worldVersion).toBe(HOUSE_WORLD_VERSION); expect(first.controller).toBe(true);
    const legacy = await f.client(f.owner, undefined, true); const recovered = (await f.subscribe(legacy)).snapshot;
    expect(recovered).toMatchObject({ controller: false, generation: 0, players: [], worldVersion: HOUSE_WORLD_VERSION });
    const watcher = await f.client(f.peer); const after = (await f.subscribe(watcher)).snapshot;
    expect(after.players.find((person: any) => person.id === f.owner.id)).toEqual(first.players.find((person: any) => person.id === f.owner.id));
    expect((await ask(current, "house.availability", { generation: first.generation, value: "chat" })).ok).toBe(true);
  });
  test.each(["old", "", null, 123, {}, [HOUSE_WORLD_VERSION]])("rejects a declared unsupported value before allocating a context: %j", async version => {
    const f = await fixture();
    for (let n = 0; n < 3; n++) await expect(f.client(f.owner, version)).rejects.toMatchObject({ data: { code: "CLIENT_UPDATE_REQUIRED" } });
    const current = await f.client(); expect((await f.subscribe(current)).snapshot.controller).toBe(true);
  });
  test("legacy controlled actions retain their old NOT_CONTROLLER error contract", async () => {
    const f = await fixture(); const legacy = await f.client(f.owner, undefined, true); const head = (await f.subscribe(legacy)).snapshot;
    const actions = [
      ["house.move", { generation: 0, sequence: 1, x: 0, z: 0, heading: 0 }],
      ["house.seat", { generation: 0, seatId: "seat-1" }], ["house.stand", { generation: 0 }],
      ["house.availability", { generation: 0, value: "chat" }],
      ["house.command", { generation: 0, zoneId: "lounge", command: { commandId: randomUUID(), type: "card.save", houseId: f.home.id, payload: { smallGoal: "Must not save", helpRequested: false } } }],
    ] as const;
    for (const [event, body] of actions) expect(await ask(legacy, event, body)).toMatchObject({ ok: false, code: "NOT_CONTROLLER" });
    expect(await ask(legacy, "house.takeover", {})).toMatchObject({ ok: false, code: "CLIENT_UPDATE_REQUIRED" });
    expect(f.store.snapshot(f.owner.id).cards).toHaveLength(0); expect(head.players).toEqual([]);
    expect(() => f.realtime.executeHttp(f.owner.id, { commandId: randomUUID(), type: "card.save", houseId: f.home.id, payload: { smallGoal: "HTTP", helpRequested: false } }, 0, "lounge", randomUUID())).toThrow(/control/i);
  });
  test("a legacy private subscription remains permission checked and is revoked when the owner closes the door", async () => {
    const f = await fixture(); const room = f.store.snapshot(f.owner.id).residents.find(person => person.id === f.owner.id)!.bedroomId;
    f.store.execute(f.owner.id, { commandId: randomUUID(), type: "room.configure", houseId: f.home.id, expectedRevision: 0, payload: { roomId: room, open: true, palette: "sage" } });
    const legacy = await f.client(f.peer, undefined, true); expect((await f.subscribe(legacy, room)).snapshot.durable.zoneId).toBe(room);
    const revoked = new Promise<any>(resolve => legacy.once("house.revoked", resolve));
    f.store.execute(f.owner.id, { commandId: randomUUID(), type: "room.configure", houseId: f.home.id, expectedRevision: 1, payload: { roomId: room, open: false, palette: "sage" } }); f.realtime.refresh();
    expect(await revoked).toMatchObject({ code: "FORBIDDEN", zoneId: "lounge" });
    expect(await f.subscribe(legacy, room)).toMatchObject({ ok: false, code: "FORBIDDEN" });
    const recovery = (await f.subscribe(legacy)).snapshot; expect(recovery.players).toEqual([]); expect(recovery.controller).toBe(false);
  });
});
