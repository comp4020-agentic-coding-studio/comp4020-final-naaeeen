import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { io, type Socket } from "socket.io-client";
import { afterEach, describe, expect, test, vi } from "vitest";
import { attachHouseRealtime } from "../src/house-realtime.ts";
import { HouseError } from "../src/house-contract.ts";
import { createLayout, bedroomLayout, validPosition, findRoute } from "../public/house-geometry.js";
import type { HouseSnapshot, LiveSnapshot, Me, HouseCommand, Placement } from "../src/house-contract.ts";

class Authority {
  tokens = new Map<string, string>();
  open = true;
  capacity = 6;
  placements: Placement[] = [];
  houseId = randomUUID();
  bedroomId = randomUUID();
  bedroomIds = [this.bedroomId, ...Array.from({ length: 5 }, () => randomUUID())];
  ids: string[] = Array.from({ length: 6 }, () => randomUUID());
  names = ["Ada", "Lin", "Sam", "Jo", "Bo", "Ren"];
  absent = new Set<string>();
  constructor() { this.ids.forEach((id, n) => this.tokens.set(createHash("sha256").update("a".repeat(42) + n).digest("hex"), id)); }
  session(digest: string) { const id = this.tokens.get(digest); return id ? { id } : undefined; }
  me(id: string): Me { return { identity: { id, name: this.names[this.ids.indexOf(id)]!, colour: "sage", revision: 1 }, home: this.absent.has(id) ? null : { id: this.houseId, capacity: this.capacity, ownerId: this.ids[0]!, code: "ABCD1234" }, archiveCount: 0 }; }
  snapshot(id: string, zoneId = "lounge"): HouseSnapshot {
    if (this.absent.has(id) || (zoneId !== "lounge" && (!this.open && id !== this.ids[0] || zoneId !== this.bedroomId))) throw new HouseError("FORBIDDEN", "This zone is unavailable.");
    return { schemaVersion: 2, selfId: id, house: this.me(id).home!, residents: this.ids.slice(0, this.capacity).filter(x => !this.absent.has(x)).map(member => ({ id: member, name: this.names[this.ids.indexOf(member)]!, colour: "sage", revision: 1, slot: this.ids.indexOf(member), bedroomId: this.bedroomIds[this.ids.indexOf(member)]!, open: this.open })), streamId: this.houseId + ":" + zoneId, sequence: 1, zoneId, room: zoneId === "lounge" ? null : { id: this.bedroomId, ownerId: this.ids[0]!, revision: 1, open: this.open, palette: "sage", placements: this.placements }, cards: [], chat: [] };
  }
  execute(_id: string, command: HouseCommand) { return { ok: true as const, commandId: command.commandId, streamId: this.houseId, sequence: 1, entityRevision: 1 }; }
}
const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
async function setup(options = {}) {
  const store = new Authority();
  const server = createServer((_req, res) => res.end("fixture"));
  const realtime = attachHouseRealtime(server, store, options);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}`;
  cleanups.push(() => realtime.close());
  async function client(n = 0, origin = url, cookie = "a".repeat(42) + n) {
    const socket = io(url, { transports: ["websocket"], reconnection: false, extraHeaders: { Origin: origin, Cookie: `house_session=${cookie}` } });
    cleanups.push(async () => { socket.disconnect(); });
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
    return socket;
  }
  return { store, realtime, url, client };
}
const ask = (socket: Socket, event: string, body: unknown = {}) => socket.timeout(1500).emitWithAck(event, body);
const subscribe = (socket: Socket, token: string = randomUUID(), zoneId = "lounge") => ask(socket, "house.subscribe", { zoneId, controllerToken: token });
const nextSnapshot = (socket: Socket, predicate = (_state: any) => true) => new Promise<any>((resolve, reject) => {
  const timer = setTimeout(() => { socket.off("house.snapshot", receive); reject(new Error("Snapshot not delivered")); }, 2000);
  function receive(state: any) { if (!predicate(state)) return; clearTimeout(timer); socket.off("house.snapshot", receive); resolve(state); }
  socket.on("house.snapshot", receive);
});

const motionSequences = new WeakMap<Socket, number>();
async function walkTo(socket: Socket, state: LiveSnapshot, layout: ReturnType<typeof createLayout>, target: { x: number; z: number }, clock: { mockReturnValue: (now: number) => unknown }) {
  const player = state.players.find(person => person.id === state.durable.selfId)!;
  const route = findRoute(layout, { x: player.x!, z: player.z! }, target);
  expect(route, "The actual arrival must have a clear route to the requested interaction").not.toBeNull();
  if (!route) throw new Error("No valid interaction route");
  let now = Date.now(), sequence = motionSequences.get(socket) ?? 0;
  for (const point of route.slice(1)) {
    clock.mockReturnValue(now += 250);
    expect((await ask(socket, "house.move", { generation: state.generation, sequence: ++sequence, ...point, heading: 0 })).ok).toBe(true);
  }
  motionSequences.set(socket, sequence);
}

describe("house realtime authority", () => {
  test.each([2, 3, 4, 5, 6])("spaces permanent residents safely in both arrival bands at capacity %i", async capacity => {
    const f = await setup(); f.store.capacity = capacity;
    const sockets: Socket[] = [], tokens: string[] = [];
    let latest: any;
    for (let slot = 0; slot < capacity; slot++) { const socket = await f.client(slot); sockets.push(socket); const token = randomUUID(); tokens.push(token); latest = (await subscribe(socket, token)).snapshot; }
    function verify(state: any) {
      const layout = state.durable.room ? bedroomLayout(state.durable.room.placements) : createLayout(capacity);
      const occupants = state.players.filter((player: any) => player.connected && player.zoneId === state.durable.zoneId);
      expect(occupants).toHaveLength(capacity);
      for (const player of occupants) { expect(validPosition(layout, player)).toBe(true); expect(player.z).toBe(3.3); }
      for (let a = 0; a < occupants.length; a++) for (let b = a + 1; b < occupants.length; b++) expect(Math.hypot(occupants[a].x - occupants[b].x, occupants[a].z - occupants[b].z)).toBeGreaterThanOrEqual(.6);
    }
    verify(latest);
    for (let slot = 0; slot < capacity; slot++) latest = (await subscribe(sockets[slot]!, tokens[slot]!, f.store.bedroomId)).snapshot;
    verify(latest);
  });
  test("authenticates cookie and exact Origin without creating a session", async () => {
    const f = await setup();
    await expect(f.client(0, "https://foreign.invalid")).rejects.toThrow();
    await expect(f.client(0, f.url, "missing")).rejects.toThrow();
    const socket = await f.client();
    const reply = await subscribe(socket);
    expect(reply.ok).toBe(true);
    expect(reply.snapshot.durable.selfId).toBe(f.store.ids[0]);
    expect(reply.snapshot.players.map((p: any) => p.name)).toContain("Ada");
  });
  test("keeps one controller and observer, rejects old input after explicit takeover", async () => {
    const f = await setup();
    const a = await f.client(); const first = await subscribe(a);
    const b = await f.client(); const observed = await subscribe(b);
    expect(observed.snapshot.controller).toBe(false);
    expect((await ask(b, "house.availability", { generation: first.snapshot.generation, value: "chat" })).code).toBe("NOT_CONTROLLER");
    const taken = await ask(b, "house.takeover", {});
    expect(taken.snapshot.generation).toBeGreaterThan(first.snapshot.generation);
    expect((await ask(a, "house.availability", { generation: first.snapshot.generation, value: "chat" })).code).toBe("NOT_CONTROLLER");
    expect((await ask(b, "house.availability", { generation: taken.snapshot.generation, value: "chat" })).ok).toBe(true);
    await expect(f.client()).rejects.toThrow();
  });
  test("filters bedroom poses and clears revoked room before a fresh lounge snapshot", async () => {
    const f = await setup(); const owner = await f.client(); await subscribe(owner);
    const guest = await f.client(1); await subscribe(guest);
    const privateReply = await subscribe(owner, randomUUID(), f.store.bedroomId);
    const lounge = await subscribe(guest);
    const ownerElsewhere = lounge.snapshot.players.find((p: any) => p.id === f.store.ids[0]);
    expect(ownerElsewhere.zoneId).toBe(f.store.bedroomId);
    expect(ownerElsewhere).not.toHaveProperty("x");
    const visit = await subscribe(guest, randomUUID(), f.store.bedroomId);
    expect(visit.snapshot.durable.room.id).toBe(f.store.bedroomId);
    const events: string[] = [];
    guest.once("house.revoked", () => events.push("revoked"));
    const fresh = nextSnapshot(guest, state => state.accessGeneration > visit.snapshot.accessGeneration);
    f.store.open = false; f.realtime.refresh();
    const state = await fresh; events.push("snapshot");
    expect(events).toEqual(["revoked", "snapshot"]);
    expect(state.durable.zoneId).toBe("lounge");
    expect(state.durable.room).toBeNull();
    expect(state.generation).toBeGreaterThan(visit.snapshot.generation);
    expect((await ask(guest, "house.move", {generation:visit.snapshot.generation,sequence:99,x:0,z:2.85,heading:0})).code).toBe("STALE_GENERATION");
    expect(privateReply.ok).toBe(true);
  });
  test("enforces finite movement, bounded speed, sequence and generations", async () => {
    const f = await setup(); const socket = await f.client(); const reply = await subscribe(socket);
    const generation = reply.snapshot.generation;
    const pose = reply.snapshot.players.find((p: any) => p.id === f.store.ids[0]);
    expect((await ask(socket, "house.move", { generation, sequence: 1, x: Infinity, z: 0, heading: 0 })).ok).toBe(false);
    expect((await ask(socket, "house.move", { generation, sequence: 2, x: pose.x + 3, z: pose.z, heading: 0 })).code).toBe("INVALID_MOVE");
    expect((await ask(socket, "house.move", { generation: generation - 1, sequence: 3, x: pose.x, z: pose.z, heading: 0 })).code).toBe("STALE_GENERATION");
    expect((await ask(socket, "house.move", { generation, sequence: 4, x: pose.x, z: pose.z, heading: 0 })).ok).toBe(true);
    expect((await ask(socket, "house.move", { generation, sequence: 4, x: pose.x, z: pose.z, heading: 0 })).code).toBe("STALE_INPUT");
  });
  test("speed tolerance is one bounded burst rather than extra distance on every packet", async () => {
    const f = await setup(); const base = Date.now(); const clock = vi.spyOn(Date, "now").mockReturnValue(base);
    const socket = await f.client(); const reply = await subscribe(socket); const pose = reply.snapshot.players.find((player: any) => player.id === f.store.ids[0]); clock.mockReturnValue(base + 100);
    expect((await ask(socket, "house.move", { generation: reply.snapshot.generation, sequence: 1, x: pose.x + .37, z: pose.z, heading: 0 })).ok).toBe(true);
    clock.mockReturnValue(base + 200);
    expect((await ask(socket, "house.move", { generation: reply.snapshot.generation, sequence: 2, x: pose.x + .74, z: pose.z, heading: 0 })).code).toBe("INVALID_MOVE");
  });
  test("logs an immediate walk-to-idle transition once without stationary frame spam", async () => {
    const records: Record<string, unknown>[] = [];
    const f = await setup({ log: (record: Record<string, unknown>) => records.push(record) });
    const base = Date.now(); const clock = vi.spyOn(Date, "now").mockReturnValue(base);
    const socket = await f.client(); const reply = await subscribe(socket);
    const arrival = reply.snapshot.players.find((player: any) => player.id === f.store.ids[0]);
    const position = { x: arrival.x + .1, z: arrival.z, heading: 0 };
    clock.mockReturnValue(base + 100);
    expect((await ask(socket, "house.move", { generation: reply.snapshot.generation, sequence: 1, ...position })).ok).toBe(true);
    clock.mockReturnValue(base + 200);
    expect((await ask(socket, "house.move", { generation: reply.snapshot.generation, sequence: 2, ...position })).ok).toBe(true);
    for (let sequence = 3; sequence <= 6; sequence++) {
      clock.mockReturnValue(base + sequence * 100);
      expect((await ask(socket, "house.move", { generation: reply.snapshot.generation, sequence, ...position })).ok).toBe(true);
    }
    const motion = records.filter(record => String(record.action).startsWith("motion."));
    expect(motion.map(record => record.action)).toEqual(["motion.start", "motion.stop"]);
    expect(motion[1]).toEqual({ at: base + 200, actor: f.store.ids[0], action: "motion.stop", outcome: "idle" });
    for (const record of motion) expect(Object.keys(record).sort()).toEqual(["action", "actor", "at", "outcome"]);
  });
  test("logs one timer stop after movement input ends and no duplicate on a later idle frame", async () => {
    const records: Record<string, unknown>[] = [];
    const f = await setup({ log: (record: Record<string, unknown>) => records.push(record) });
    const base = Date.now(); const clock = vi.spyOn(Date, "now").mockReturnValue(base);
    const socket = await f.client(); const reply = await subscribe(socket);
    const arrival = reply.snapshot.players.find((player: any) => player.id === f.store.ids[0]);
    const position = { x: arrival.x + .1, z: arrival.z, heading: 0 };
    clock.mockReturnValue(base + 100);
    expect((await ask(socket, "house.move", { generation: reply.snapshot.generation, sequence: 1, ...position })).ok).toBe(true);
    clock.mockReturnValue(base + 351);
    await vi.waitFor(() => expect(records.filter(record => record.action === "motion.stop")).toHaveLength(1));
    clock.mockReturnValue(base + 600);
    expect((await ask(socket, "house.move", { generation: reply.snapshot.generation, sequence: 2, ...position })).ok).toBe(true);
    expect(records.filter(record => String(record.action).startsWith("motion.")).map(record => record.action)).toEqual(["motion.start", "motion.stop"]);
    expect(records.find(record => record.action === "motion.stop")?.at).toBe(base + 351);
  });
  test("same-tab reconnect retains choice but a new controller lease defaults quiet", async () => {
    const f = await setup(); const token = randomUUID(); const a = await f.client(); const first = await subscribe(a, token);
    await ask(a, "house.availability", { generation: first.snapshot.generation, value: "chat" });
    a.disconnect();
    const b = await f.client(); const same = await subscribe(b, token);
    expect(same.snapshot.players.find((p: any) => p.id === f.store.ids[0]).availability).toBe("chat");
    expect(same.snapshot.generation).toBe(first.snapshot.generation);
    b.disconnect();
    const c = await f.client(); const fresh = await subscribe(c, randomUUID());
    expect(fresh.snapshot.players.find((p: any) => p.id === f.store.ids[0]).availability).toBe("quiet");
    expect(fresh.snapshot.generation).toBeGreaterThan(first.snapshot.generation);
  });
  test("delivers the bounded Unicode chat/card state without a permanent size disconnect", async () => {
    const f = await setup(); const snapshot = f.store.snapshot.bind(f.store);
    vi.spyOn(f.store, "snapshot").mockImplementation((id, zoneId) => ({ ...snapshot(id, zoneId),
      chat: Array.from({ length: 100 }, (_, n) => ({ id: randomUUID(), authorId: f.store.ids[0]!, name: "Ada", text: "漢".repeat(280), at: Date.now(), sequence: n })),
      cards: Array.from({ length: 18 }, (_, n) => ({ id: randomUUID(), authorId: f.store.ids[n % 6]!, smallGoal: "漢".repeat(160), question: "漢".repeat(400), nextStep: "漢".repeat(400), resourceUrl: "https://example.test/" + "a".repeat(2000), helpRequested: false, state: "closed" as const, revision: 1 })),
    }));
    const socket = await f.client(); const result = await subscribe(socket);
    expect(result.ok).toBe(true); expect(result.snapshot.durable.chat).toHaveLength(100);
    expect(Buffer.byteLength(JSON.stringify(result.snapshot))).toBeGreaterThan(64 * 1024);
    expect(Buffer.byteLength(JSON.stringify(result.snapshot))).toBeLessThan(512 * 1024);
  });
  test("room switches invalidate old movement and reconnect advances the access barrier", async () => {
    const f = await setup(); const token = randomUUID(); const a = await f.client(); const first = await subscribe(a, token);
    const privateState = await subscribe(a, token, f.store.bedroomId);
    expect(privateState.snapshot.generation).toBeGreaterThan(first.snapshot.generation);
    expect((await ask(a, "house.move", { generation: first.snapshot.generation, sequence: 99, x: 0, z: 3, heading: 0 })).code).toBe("STALE_GENERATION");
    a.disconnect(); const b = await f.client(); const joined = await subscribe(b, token, f.store.bedroomId);
    expect(joined.snapshot.accessGeneration).toBeGreaterThan(privateState.snapshot.accessGeneration);
    const pose = joined.snapshot.players.find((player: any) => player.id === f.store.ids[0]);
    expect((await ask(b, "house.move", { generation: joined.snapshot.generation, sequence: 1, x: pose.x, z: pose.z, heading: 0 })).ok).toBe(true);
  });
  test("a saved furniture change reconciles both owner and visitor standing poses", async () => {
    const f = await setup(); const base=Date.now(); const clock=vi.spyOn(Date,"now").mockReturnValue(base);
    const socket=await f.client(); const first=await subscribe(socket,randomUUID(),f.store.bedroomId);
    const guest=await f.client(1);const guestState=await subscribe(guest,randomUUID(),f.store.bedroomId);
    const ownerArrival = first.snapshot.players.find((player: any) => player.id === f.store.ids[0]);
    const visitorArrival = guestState.snapshot.players.find((player: any) => player.id === f.store.ids[1]);
    await walkTo(socket, first.snapshot, bedroomLayout(f.store.placements), { x: 2, z: 2 }, clock);
    await walkTo(guest, guestState.snapshot, bedroomLayout(f.store.placements), { x: 2, z: 2 }, clock);
    const refreshed=nextSnapshot(socket,state=>state.generation>first.snapshot.generation);
    f.store.placements=[{id:randomUUID(),kind:"plant",x:2,z:2,rotation:0,colour:"sage"}];f.realtime.refresh();
    const state=await refreshed; const player=state.players.find((p:any)=>p.id===f.store.ids[0]);
    expect(player.x).toBe(ownerArrival.x);expect(player.z).toBe(ownerArrival.z);expect(player.seatId).toBeNull();
    const visitor=state.players.find((p:any)=>p.id===f.store.ids[1]);expect(visitor.x).toBe(visitorArrival.x);expect(visitor.z).toBe(visitorArrival.z);expect(visitor.generation).toBeGreaterThan(guestState.snapshot.generation);
  });
  test("moving an occupied bedroom chair releases its visitor lease and resets the pose", async () => {
    const f=await setup(); const chairId=randomUUID(); f.store.placements=[{id:chairId,kind:"chair",x:2,z:1,rotation:0,colour:"sage"}];
    const base=Date.now();const clock=vi.spyOn(Date,"now").mockReturnValue(base);const guest=await f.client(1);const first=await subscribe(guest,randomUUID(),f.store.bedroomId);
    const arrival = first.snapshot.players.find((player: any) => player.id === f.store.ids[1]);
    await walkTo(guest, first.snapshot, bedroomLayout(f.store.placements), { x: 2, z: 2 }, clock);
    expect((await ask(guest,"house.seat",{generation:first.snapshot.generation,seatId:chairId})).ok).toBe(true);
    const refreshed=nextSnapshot(guest,state=>state.generation>first.snapshot.generation);f.store.placements[0]!.x=2.5;f.realtime.refresh();
    const state=await refreshed;const player=state.players.find((p:any)=>p.id===f.store.ids[1]);expect(player.x).toBe(arrival.x);expect(player.z).toBe(arrival.z);expect(player.seatId).toBeNull();
  });
  test("seats are atomic and released by stand, takeover and expired reconnect lease", async () => {
    const f = await setup(); const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now()); const a = await f.client(); const first = await subscribe(a);
    const b = await f.client(1); const second = await subscribe(b);
    const layout = createLayout(f.store.capacity), target = layout.seats.find(seat => seat.id === "seat-1")!.target;
    await walkTo(a, first.snapshot, layout, target, clock); await walkTo(b, second.snapshot, layout, target, clock);
    const claim = { generation: first.snapshot.generation, seatId: "seat-1" };
    expect((await ask(a, "house.seat", claim)).ok).toBe(true);
    expect((await ask(b, "house.seat", { generation: second.snapshot.generation, seatId: "seat-1" })).code).toBe("SEAT_TAKEN");
    expect((await ask(a, "house.move", { generation: first.snapshot.generation, sequence: (motionSequences.get(a) ?? 0) + 1, x: layout.seats[0]!.x, z: layout.seats[0]!.z, heading: 0 })).code).toBe("INVALID_MOVE");
    expect((await ask(a, "house.stand", { generation: first.snapshot.generation })).ok).toBe(true);
    expect((await ask(b, "house.seat", { generation: second.snapshot.generation, seatId: "seat-1" })).ok).toBe(true);
    const observer = await f.client(1); await subscribe(observer);
    await ask(observer, "house.takeover", {});
    expect((await ask(a, "house.seat", claim)).ok).toBe(true);
    const start = Date.now(); a.disconnect(); clock.mockReturnValue(start + 30_001);
    const renewed = await f.client(); const renewedState = await subscribe(renewed);
    expect(renewedState.snapshot.players.find((p: any) => p.id === f.store.ids[0]).seatId).toBeNull();
    expect(renewedState.snapshot.generation).toBeGreaterThan(first.snapshot.generation);
  });
  test("limits the whole server to twelve real connections", async () => {
    const f = await setup();
    for (let person = 0; person < 6; person++) { await f.client(person); await f.client(person); }
    await expect(f.client()).rejects.toMatchObject({ data: { code: "LOAD_LIMIT" } });
  });
  test("HTTP durable writes require the live controller generation and original zone", async () => {
    const f = await setup(); const token = randomUUID(); const socket = await f.client(); const first = await subscribe(socket, token);
    const command = { commandId: randomUUID(), type: "chat.send", houseId: f.store.houseId, payload: { zoneId: "lounge", text: "Hello" } };
    expect(() => f.realtime.executeHttp(f.store.ids[0]!, command)).toThrow("Control changed");
    expect(() => f.realtime.executeHttp(f.store.ids[0]!, command, first.snapshot.generation, "private", token)).toThrow("different room");
    expect(f.realtime.executeHttp(f.store.ids[0]!, command, first.snapshot.generation, "lounge", token).ok).toBe(true);
    const observer = await f.client(); await subscribe(observer); const takeover = await ask(observer, "house.takeover", {});
    expect(() => f.realtime.executeHttp(f.store.ids[0]!, command, first.snapshot.generation, "lounge", token)).toThrow("Control changed");
    expect((await ask(observer, "house.command", { generation: takeover.snapshot.generation, zoneId: "lounge", command: { ...command, payload: { zoneId: "private", text: "Keep draft private" } } })).code).toBe("STALE_ZONE");
  });
  test("an expired session cannot keep a seat while its old socket remains open", async () => {
    const f=await setup();const clock=vi.spyOn(Date,"now").mockReturnValue(Date.now());const a=await f.client();const first=await subscribe(a);
    const layout=createLayout(f.store.capacity),target=layout.seats.find(seat=>seat.id==="seat-1")!.target;
    await walkTo(a,first.snapshot,layout,target,clock);
    expect((await ask(a,"house.seat",{generation:first.snapshot.generation,seatId:"seat-1"})).ok).toBe(true);
    f.store.tokens.delete(createHash("sha256").update("a".repeat(42)+"0").digest("hex"));
    const b=await f.client(1);const second=await subscribe(b);
    await walkTo(b,second.snapshot,layout,target,clock);
    expect((await ask(b,"house.seat",{generation:second.snapshot.generation,seatId:"seat-1"})).ok).toBe(true);
  });
  test("invalidated sessions are rejected on later actions and delivery", async () => {
    const f = await setup(); const socket = await f.client(); const state = await subscribe(socket);
    f.store.tokens.clear();
    const result = await ask(socket, "house.availability", { generation: state.snapshot.generation, value: "chat" });
    expect(result.code).toBe("UNAUTHENTICATED");
    f.realtime.refresh();
    expect(f.store.tokens.size).toBe(0);
  });
});
