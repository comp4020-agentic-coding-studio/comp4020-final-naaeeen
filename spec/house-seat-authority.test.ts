import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { io, type Socket } from "socket.io-client";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createService } from "../src/server.ts";
import { HOUSE_WORLD_VERSION, createLayout, findRoute } from "../public/house-geometry.js";
import { PUZZLE_PIECES } from "../public/house-puzzle-content.js";
import type { HouseCommand, LiveSnapshot } from "../src/house-contract.ts";
const cleanup: (() => unknown | Promise<unknown>)[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const fn of cleanup.splice(0).reverse()) await fn(); });
const ask = (socket: Socket, event: string, body: unknown = {}) => socket.timeout(2000).emitWithAck(event, body);
async function fixture() {
 const directory = mkdtempSync(join(tmpdir(), "seat-authority-")); cleanup.push(() => rmSync(directory, { recursive: true, force: true }));
 const app = createService({ dataDir: directory, secureCookies: false, activityLog: () => {} }); cleanup.push(() => app.close());
 const store = app.houseStore, people = Array.from({ length: 6 }, () => store.ensureSession());
 store.execute(people[0]!.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 6, name: "Ada", colour: "sage" } });
 const home = store.me(people[0]!.id).home!;
 for (const person of people.slice(1)) store.execute(person.id, { commandId: randomUUID(), type: "house.join", payload: { code: home.code, name: "Friend", colour: "rose" } });
 await new Promise<void>(resolve => app.server.listen(0, "127.0.0.1", resolve)); const base = "http://127.0.0.1:" + (app.server.address() as { port: number }).port;
 let now = Date.now(); const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
 const layout = createLayout(6);
 async function connect(n = 0, token = randomUUID()) {
  const socket = io(base, { auth: { worldVersion: HOUSE_WORLD_VERSION }, transports: ["websocket"], reconnection: false, extraHeaders: { Origin: base, Cookie: "house_session=" + people[n]!.token } });
  cleanup.push(() => socket.disconnect()); await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
  const response = await ask(socket, "house.subscribe", { zoneId: "lounge", controllerToken: token });
  const state = response.snapshot as LiveSnapshot, self = state.players.find(player => player.id === people[n]!.id)!;
  const client = { socket, token, n, state, pos: { x: self.x!, z: self.z! }, motion: 0, intent: 0 };
  socket.on("house.snapshot", snapshot => { client.state = snapshot; }); return client;
 }
 type Client = Awaited<ReturnType<typeof connect>>;
 const command = (type: string, payload: Record<string, unknown>, expectedRevision?: number): HouseCommand => ({ commandId: randomUUID(), type, houseId: home.id, payload, ...(expectedRevision === undefined ? {} : { expectedRevision }) });
 const submit = async (client: Client, cmd: HouseCommand, ingress: "socket" | "http" = "socket") => {
  if (ingress === "socket") return ask(client.socket, "house.command", { generation: client.state.generation, zoneId: client.state.durable.zoneId, command: cmd });
  const response = await fetch(base + "/api/house/command", { method: "POST", headers: { Cookie: "house_session=" + people[client.n]!.token, Origin: base, "Content-Type": "application/json", "X-House-Identity": people[client.n]!.id, "X-House-Generation": String(client.state.generation), "X-House-Zone": client.state.durable.zoneId, "X-House-Controller-Token": client.token }, body: JSON.stringify(cmd) }); return response.json();
 };
 async function sit(client: Client, seatId = "game-seat-" + (client.n + 1)) {
  const seat = layout.seats.find(candidate => candidate.id === seatId)!;
  const route = findRoute(layout, client.pos, seat.target); expect(route).not.toBeNull();
  for (const point of route!.slice(1)) { now += 80; expect(await ask(client.socket, "house.move", { generation: client.state.generation, sequence: ++client.motion, ...point, heading: 0 })).toMatchObject({ ok: true }); }
  client.pos = { x: seat.x, z: seat.z }; expect(await ask(client.socket, "house.seat", { generation: client.state.generation, seatId })).toMatchObject({ ok: true });
 }
 async function stand(client: Client) { const self = client.state.players.find(player => player.id === people[client.n]!.id)!; const seat = layout.seats.find(candidate => candidate.id === self.seatId); const response = await ask(client.socket, "house.stand", { generation: client.state.generation }); if (seat) client.pos = { ...seat.target }; return response; }
 const table = () => store.snapshot(people[0]!.id).puzzle!;
 const intentBody = (client: Client, mode: "join" | "leave") => ({ generation: client.state.generation, zoneId: "lounge", serverEpoch: client.state.serverEpoch, accessGeneration: client.state.accessGeneration, intentSequence: ++client.intent, requestId: randomUUID(), roundId: table().current!.id, mode });
 const intent = (client: Client, mode: "join" | "leave") => ask(client.socket, "house.puzzle.intent", intentBody(client, mode));
 const startCommand = (client: Client) => command("puzzle.start", { expectedRoundId: table().current?.id ?? null, illustrationId: "rainy-nook", illustrationVersion: 1, confirmUnfinished: false, authority: { serverEpoch: client.state.serverEpoch, accessGeneration: client.state.accessGeneration, generation: client.state.generation }, expectedRoster: { serverEpoch: client.state.serverEpoch, revision: client.state.puzzleRoster!.revision } }, table().revision);
 const place = (participationId: string, piece = 0) => command("puzzle.place", { roundId: table().current!.id, participationId, pieceId: PUZZLE_PIECES[piece]!.id, destination: piece });
 return { app, directory, store, people, home, connect, command, submit, sit, stand, table, intent, intentBody, startCommand, place, advance: (ms: number) => { now += ms; }, clock };
}
describe("seat-bound activity authority on both real ingress paths", () => {
 test.each(["socket", "http"] as const)("%s denies standing effects, permits real chair effects, and replays exact accepted receipts after Stand", async ingress => {
  const f = await fixture(), a = await f.connect();
  const join = f.command("game.join", { roundId: null }, 0);
  expect(await f.submit(a, join, ingress)).toMatchObject({ ok: false, code: "ACTIVITY_SEAT_REQUIRED" });
  expect(await f.submit(a, f.startCommand(a), ingress)).toMatchObject({ ok: false, code: "ACTIVITY_SEAT_REQUIRED" });
  await f.sit(a); const accepted = await f.submit(a, join, ingress); expect(accepted.ok).toBe(true);
  await vi.waitFor(() => expect(a.state.players.find(p => p.id === f.people[0]!.id)?.seatId).toBe("game-seat-1"));
  expect(await f.stand(a)).toMatchObject({ ok: true });
  expect(await f.submit(a, join, ingress)).toEqual(accepted);
  expect(await f.submit(a, f.command("game.join", { roundId: null }, f.store.snapshot(f.people[0]!.id).game!.revision), ingress)).toMatchObject({ ok: false, code: "ACTIVITY_SEAT_REQUIRED" });
  expect(await f.submit(a, f.command("game.leave", { roundId: accepted.result.roundId }), ingress)).toMatchObject({ ok: true });
 });
 test.each(["socket", "http"] as const)("%s clears picture consent on Stand, keeps historical intent/placement replay inert and requires a fresh seated Join", async ingress => {
  const f = await fixture(), a = await f.connect(); await f.sit(a); expect((await f.submit(a, f.startCommand(a), ingress)).ok).toBe(true);
  const join = f.intentBody(a, "join"), joined = await ask(a.socket, "house.puzzle.intent", join); expect(joined.ok).toBe(true);
  const placement = f.place(joined.participationId), receipt = await f.submit(a, placement, ingress); expect(receipt.ok).toBe(true);
  await vi.waitFor(() => expect(a.state.players.find(p => p.id === f.people[0]!.id)?.seatId).toBe("game-seat-1")); await f.stand(a);
  await vi.waitFor(() => expect(a.state.puzzleRoster!.memberIds).toEqual([]));
  expect(await ask(a.socket, "house.puzzle.intent", join)).toEqual(joined); expect(a.state.puzzleRoster!.memberIds).toEqual([]);
  expect(await f.submit(a, placement, ingress)).toEqual(receipt);
  expect(await f.submit(a, f.place(joined.participationId, 1), ingress)).toMatchObject({ code: "ACTIVITY_SEAT_REQUIRED" });
  expect(await f.intent(a, "join")).toMatchObject({ code: "ACTIVITY_SEAT_REQUIRED" }); expect(await f.intent(a, "leave")).toMatchObject({ ok: true });
  await f.sit(a); const fresh = await f.intent(a, "join"); expect(fresh.ok).toBe(true); expect(fresh.participationId).not.toBe(joined.participationId);
 });
 test.each(["socket", "http"] as const)("%s rejects every new game action while standing, including forged client seat facts", async ingress => {
  const f = await fixture(), a = await f.connect();
  for (const type of ["game.join", "game.ready", "game.move", "game.resume", "puzzle.start", "puzzle.place"]) expect(await f.submit(a, f.command(type, { roundId: randomUUID(), activitySeat: { seatId: "game-seat-1", purpose: "game" } }), ingress)).toMatchObject({ code: "ACTIVITY_SEAT_REQUIRED" });
  await f.sit(a,"seat-1"); expect(await f.submit(a,f.command("game.join",{roundId:null},0),ingress)).toMatchObject({code:"ACTIVITY_SEAT_REQUIRED"});
 });
 test("six physical chairs support six explicit contributors and reserved seats expire honestly", async () => {
  const f=await fixture(),clients:Awaited<ReturnType<typeof f.connect>>[]=[];for(let n=0;n<6;n++){const client=await f.connect(n);await f.sit(client);clients.push(client);}
  expect((await f.submit(clients[0]!,f.startCommand(clients[0]!))).ok).toBe(true);
  for(const [n,client] of clients.entries()){const joined=await f.intent(client,"join");expect(joined.ok).toBe(true);expect((await f.submit(client,f.place(joined.participationId,n),n%2?"http":"socket")).ok).toBe(true);}
  expect(new Set(f.table().current!.placements.map(p=>p.actorId)).size).toBe(6);
  clients[0]!.socket.disconnect();await vi.waitFor(()=>{const reserved=clients[1]!.state.players.find(p=>p.id===f.people[0]!.id)!;expect(reserved.connected).toBe(false);expect(reserved.seatId).toBe("game-seat-1");expect(reserved.seatReservedUntil).toBeGreaterThan(Date.now());});
  f.advance(30_001);await vi.waitFor(()=>expect(clients[1]!.state.players.find(p=>p.id===f.people[0]!.id)?.seatId).toBeUndefined());
 });
 test("zone exit and geometry reconciliation clear picture consent without deleting progress",async()=>{
  const f=await fixture(),a=await f.connect();await f.sit(a,"game-seat-2");await f.submit(a,f.startCommand(a));const joined=await f.intent(a,"join");await f.submit(a,f.place(joined.participationId));
  // Synthetic geometry reset changes the authoritative database input, so both
  // projection and maintenance-independent escape geometry observe the same layout.
  f.store.db.prepare("UPDATE houses SET capacity=5 WHERE id=?").run(f.home.id);
  expect(f.store.seatLayout(f.people[0]!.id).seats.filter(s=>s.purpose==='game')).toHaveLength(5);
  expect(await f.submit(a,f.command("profile.set",{name:"Ada",colour:"sage"},f.store.me(f.people[0]!.id).identity.revision))).toMatchObject({ok:true});await vi.waitFor(()=>{expect(a.state.players.find(p=>p.id===f.people[0]!.id)?.seatId).toBeNull();expect(a.state.puzzleRoster!.memberIds).toEqual([]);});
  f.store.db.prepare("UPDATE houses SET capacity=6 WHERE id=?").run(f.home.id);
  const room=f.store.snapshot(f.people[0]!.id).residents.find(r=>r.id===f.people[0]!.id)!.bedroomId;
  a.state=(await ask(a.socket,"house.subscribe",{zoneId:room,controllerToken:a.token})).snapshot;expect(a.state.puzzleRoster).toBeNull();expect(f.table().current!.placements).toHaveLength(1);
 });
 test("disconnect reserves a visible chair without consent, and takeover revokes resumed consent", async () => {
  const f = await fixture(), a = await f.connect(), observer = await f.connect(1); await f.sit(a); await f.submit(a, f.startCommand(a)); await f.intent(a, "join");
  a.socket.disconnect(); await vi.waitFor(() => { const player = observer.state.players.find(p => p.id === f.people[0]!.id)!; expect(player.connected).toBe(false); expect(player.seatId).toBe("game-seat-1"); expect((player as any).seatReservedUntil).toBeGreaterThan(Date.now()); expect(observer.state.puzzleRoster!.memberIds).toEqual([]); });
  const returned = await f.connect(0, a.token); expect(returned.state.players.find(p => p.id === f.people[0]!.id)?.seatId).toBe("game-seat-1"); expect(returned.state.puzzleRoster!.memberIds).toEqual([]); await f.intent(returned, "join");
  const replacement = await f.connect(0); replacement.state = (await ask(replacement.socket, "house.takeover", { controllerToken: replacement.token })).snapshot;
  expect(replacement.state.puzzleRoster!.memberIds).toEqual([]); expect(replacement.state.players.find(p => p.id === f.people[0]!.id)?.seatId).toBeNull();
 });
 test("Stand cannot be trapped by unavailable durable housekeeping and fresh commands reconcile before effect", async () => {
  const f = await fixture(), a = await f.connect(); await f.sit(a); await f.submit(a, f.startCommand(a)); const joined=await f.intent(a, "join");
  const historical=f.place(joined.participationId,1);const receipt=await f.submit(a,historical);expect(receipt.ok).toBe(true);
  const failure = vi.spyOn(f.store, "gameLifecycle").mockImplementation(() => { throw new Error("injected storage failure"); });
  expect(await f.stand(a)).toMatchObject({ ok: true }); await vi.waitFor(() => expect(a.state.puzzleRoster!.memberIds).toEqual([]));
  expect(await f.submit(a,historical)).toEqual(receipt);
  expect(await f.submit(a, f.startCommand(a))).toMatchObject({ code: "STORAGE_UNAVAILABLE" }); failure.mockRestore();
  expect(await f.submit(a, f.startCommand(a))).toMatchObject({ code: "ACTIVITY_SEAT_REQUIRED" });
 });
});

 test.each(["socket","http"] as const)("review: %s Stand and accepted replay bypass failing unrelated maintenance",async ingress=>{
  const f=await fixture(),a=await f.connect();await f.sit(a);const started=await f.submit(a,f.startCommand(a));expect(started.ok).toBe(true);const joined=await f.intent(a,"join"),cmd=f.place(joined.participationId),receipt=await f.submit(a,cmd);expect(receipt.ok).toBe(true);
  const fault=vi.spyOn(f.store,"maintainGames").mockImplementation(()=>{throw new Error("unrelated maintenance unavailable");});
  // Cross a real projection tick: a housekeeping failure must not revoke an otherwise valid controller.
  await new Promise(resolve=>setTimeout(resolve,120));
  const stand=await f.stand(a),replayed=await f.submit(a,cmd,ingress);fault.mockRestore();expect(stand).toMatchObject({ok:true});expect(replayed).toEqual(receipt);
  await vi.waitFor(()=>{const self=a.state.players.find(p=>p.id===f.people[0]!.id)!;expect(self.seatId).toBeNull();expect(self.seatGeneration).toBeGreaterThan(0);expect(a.state.puzzleRoster!.memberIds).toEqual([]);});
 });
 test.each(["socket","http"] as const)("review: %s exact receipt survives an actually due game SQL write failure",async ingress=>{
  const f=await fixture(),a=await f.connect();await f.sit(a);const cmd=f.command("game.join",{roundId:null},0),receipt=await f.submit(a,cmd);expect(receipt.ok).toBe(true);
  const row=f.store.db.prepare("SELECT state FROM game_tables WHERE house_id=?").get(f.home.id) as {state:string};const state=JSON.parse(row.state);state.current.waitingDeadlineAt=Date.now()-1;
  f.store.db.prepare("UPDATE game_tables SET state=?,next_due_at=? WHERE house_id=?").run(JSON.stringify(state),state.current.waitingDeadlineAt,f.home.id);
  f.store.db.exec("CREATE TRIGGER block_due_game BEFORE UPDATE ON game_tables BEGIN SELECT RAISE(ABORT,'injected due game failure'); END");
  const replayed=await f.submit(a,cmd,ingress);expect(replayed).toEqual(receipt);
  expect(await f.submit(a,f.command("game.join",{roundId:receipt.result.roundId},1),ingress)).toMatchObject({code:"STORAGE_UNAVAILABLE"});
  expect((f.store.db.prepare("SELECT state FROM game_tables WHERE house_id=?").get(f.home.id) as {state:string}).state).toBe(JSON.stringify(state));
 });

 test("review: snapshot housekeeping failure cannot preserve a revoked house controller",async()=>{
  const f=await fixture(),a=await f.connect();await f.sit(a);
  vi.spyOn(f.store,"maintainGames").mockImplementation(()=>{throw new Error("unrelated maintenance unavailable");});
  f.store.db.prepare("UPDATE members SET status='removed' WHERE house_id=? AND identity_id=?").run(f.home.id,f.people[0]!.id);
  await vi.waitFor(()=>expect(a.socket.connected).toBe(false));
 });

 test.each(["socket","http"] as const)("writer reservation: %s current reads, Stand and exact receipt remain available while new effects are blocked",async ingress=>{
  const f=await fixture(),a=await f.connect();await f.sit(a);const cmd=f.command("game.join",{roundId:null},0),receipt=await f.submit(a,cmd);expect(receipt.ok).toBe(true);
  const removed=f.people[1]!.id;f.store.db.prepare("UPDATE members SET status='removed' WHERE house_id=? AND identity_id=?").run(f.home.id,removed);
  const writer=new DatabaseSync(join(f.directory,"house.sqlite"));f.store.db.exec("PRAGMA busy_timeout=5");writer.exec("BEGIN IMMEDIATE");
  let zone:unknown,geometry:unknown,stand:unknown,replay:unknown,fresh:unknown,removedZone:unknown,removedReceipt:unknown,unknownIdentity:unknown;
  try {
   // Calibrate: WAL readers can see committed data under another writer's reservation.
   expect(f.store.db.prepare("SELECT id FROM houses WHERE id=?").get(f.home.id)).toEqual({id:f.home.id});
   await new Promise(resolve=>setTimeout(resolve,120));expect(a.socket.connected).toBe(true);
   try{f.store.authorizeZone(f.people[0]!.id);zone=true;}catch(error){zone=(error as any).code;}
   try{geometry=f.store.seatLayout(f.people[0]!.id).seats.filter(s=>s.purpose==='game').length;}catch(error){geometry=(error as any).code;}
   stand=await f.stand(a);replay=await f.submit(a,cmd,ingress);
   try{f.store.execute(f.people[0]!.id,f.command("profile.set",{name:"Ada",colour:"sage"},1));fresh=true;}catch(error){fresh=(error as any).code;}
   try{f.store.authorizeZone(removed);removedZone=true;}catch(error){removedZone=(error as any).code;}
   try{f.store.execute(removed,cmd,{isController:true,zoneId:"lounge",controlledInLounge:[]});removedReceipt=true;}catch(error){removedReceipt=(error as any).code;}
   try{f.store.authorizeZone(randomUUID());unknownIdentity=true;}catch(error){unknownIdentity=(error as any).code;}
  }finally{writer.exec("ROLLBACK");writer.close();}
  expect(zone).toBe(true);expect(geometry).toBe(6);expect(stand).toMatchObject({ok:true});expect(replay).toEqual(receipt);expect(fresh).toBe("STORAGE_UNAVAILABLE");expect(removedZone).toBe("FORBIDDEN");expect(removedReceipt).toBe("FORBIDDEN");expect(unknownIdentity).toBe("FORBIDDEN");
 });
