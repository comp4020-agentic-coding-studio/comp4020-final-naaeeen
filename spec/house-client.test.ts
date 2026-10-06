import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createSnapshotReducer, createCommandOutbox, createHouseClient } from "../public/house-client.js";

const snapshot = (accessGeneration = 1, sequence = 1, zoneId = "lounge", serverEpoch = "epoch-a", generation = 1) => ({ serverEpoch, accessGeneration, generation, controller: true, durable: { house: { id: "house-a" }, selfId: "person", streamId: zoneId, sequence, zoneId, residents: [], chat: [], cards: [], room: zoneId === "lounge" ? null : { id: zoneId } }, players: [] });
const memoryStorage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } }; };
afterEach(() => vi.unstubAllGlobals());
describe("house snapshot reducer", () => {
  test("rejects delayed room, stream, control and retired process snapshots", () => {
    const delivered: any[] = [];
    const reducer = createSnapshotReducer((value: any) => delivered.push(value));
    expect(reducer.accept(snapshot(1, 8))).toBe(true);
    expect(reducer.accept(snapshot(1, 7))).toBe(false);
    expect(reducer.accept(snapshot(1, 8, "lounge", "epoch-a", 0))).toBe(false);
    reducer.revoke({ serverEpoch: "epoch-a", accessGeneration: 2, zoneId: "lounge" });
    expect(delivered.at(-1)).toBeNull();
    expect(reducer.accept(snapshot(1, 9, "private"))).toBe(false);
    expect(reducer.accept(snapshot(2, 9))).toBe(true);
    expect(reducer.accept(snapshot(1, 1, "lounge", "epoch-b"))).toBe(true);
    expect(reducer.accept(snapshot(9, 99, "lounge", "epoch-a"))).toBe(false);
  });
  test("accepts motion only inside the current authorised zone/permission/control/process snapshot", () => {
    const delivered: any[] = []; const reducer = createSnapshotReducer(value => delivered.push(value));
    const motion = { serverEpoch:"epoch-a",accessGeneration:1,generation:1,zoneId:"lounge",players:[{id:"person",x:1,z:2}] };
    expect(reducer.motion(motion)).toBe(false); reducer.accept(snapshot());
    expect(reducer.motion({...motion,zoneId:"private"})).toBe(false);
    expect(reducer.motion({...motion,accessGeneration:0})).toBe(false);
    expect(reducer.motion({...motion,generation:0})).toBe(false);
    expect(reducer.motion({...motion,serverEpoch:"retired"})).toBe(false);
    expect(reducer.motion(motion)).toBe(true); expect(delivered.at(-1).players[0].x).toBe(1);
  });
  test("zone selection clears private content and excludes an outstanding old-zone response", () => {
    const delivered: any[] = []; const reducer = createSnapshotReducer((value: any) => delivered.push(value));
    reducer.selectZone("private");
    expect(reducer.accept(snapshot(2, 1, "private"))).toBe(true);
    reducer.selectZone("lounge");
    expect(delivered.at(-1)).toBeNull();
    expect(reducer.accept(snapshot(2, 8, "private"))).toBe(false);
    expect(reducer.accept(snapshot(3, 1))).toBe(true);
  });
});
describe("bounded durable outbox", () => {
  test("retries original UUID only for the original identity/zone before24hours", () => {
    const storage = memoryStorage(); const box = createCommandOutbox(storage);
    const command = { commandId: randomUUID(), type: "chat.send", payload: { zoneId: "private", text: "Draft" } };
    box.add(command, "person", "private", 1000);
    expect(box.eligible("person", "lounge", 2000)).toEqual([]);
    expect(box.eligible("other", "private", 2000)).toEqual([]);
    expect(box.eligible("person", "private", 2000)[0].command.commandId).toBe(command.commandId);
    expect(createCommandOutbox(storage).eligible("person", "private", 2000)).toHaveLength(1);
    expect(box.eligible("person", "private", 1000 + 24 * 60 * 60 * 1000 + 1)).toEqual([]);
  });
  test("never replays a pending lounge command into a different house", () => {
    const box = createCommandOutbox(memoryStorage());
    const command = { commandId: randomUUID(), houseId: "first-house", type: "card.put", payload: { smallGoal: "Original" } };
    box.add(command, "person", "lounge", 1000);
    expect(box.eligible("person", "lounge", 2000, "later-house")).toEqual([]);
    expect(box.eligible("person", "lounge", 2000, "first-house")[0].command.houseId).toBe("first-house");
  });
  test("rejects a reused UUID with different contents and rejects unbounded local queues", () => {
    const box = createCommandOutbox(memoryStorage()); const commandId = randomUUID();
    box.add({ commandId, type: "card.put", payload: { smallGoal: "First" } }, "person", "lounge", Date.now());
    expect(() => box.add({ commandId, type: "card.put", payload: { smallGoal: "Other" } }, "person", "lounge", Date.now())).toThrow();
    for (let n = 1; n < 16; n++) box.add({ commandId: randomUUID(), type: "card.put", payload: {} }, "person", "lounge", Date.now());
    expect(() => box.add({ commandId: randomUUID(), type: "card.put", payload: {} }, "person", "lounge", Date.now())).toThrow();
  });
});
describe("browser transport", () => {
  test("full reload rotates the tab token while reconnect in one client retains it", async () => {
    const tokens: string[] = [];
    vi.stubGlobal("sessionStorage", memoryStorage());
    vi.stubGlobal("io", () => {
      const listeners = new Map<string, Function>();
      const socket: any = { connected: false, on(event: string, handler: Function) { listeners.set(event, handler); return socket; }, connect() { socket.connected = true; listeners.get("connect")?.(); return socket; }, disconnect() { socket.connected = false; }, timeout() { return socket; }, emitWithAck(event: string, value: any) { if (event === "house.subscribe") tokens.push(value.controllerToken); return Promise.resolve({ ok: true, snapshot: snapshot() }); }, volatile: { emit() {} } };
      return socket;
    });
    const first = createHouseClient({ onSnapshot() {} });
    await first.connect(); await first.subscribe("lounge"); first.close();
    const reloaded = createHouseClient({ onSnapshot() {} }); await reloaded.connect(); reloaded.close();
    expect(tokens[0]).toBe(tokens[1]);
    expect(tokens[2]).not.toBe(tokens[0]);
  });
});

function mockTransport(initial = snapshot()) {
  let state = initial;
  let respond: (event: string, value: any) => Promise<any> = async () => ({ ok: true });
  const listeners = new Map<string, Function>(); const calls: {event:string,value:any}[] = [];
  const socket: any = {
    connected: false,
    on(event: string, handler: Function) { listeners.set(event, handler); return socket; },
    connect() { socket.connected = true; listeners.get("connect")?.(); return socket; },
    disconnect() { socket.connected = false; }, timeout() { return socket; },
    emitWithAck(event: string, value: any) { calls.push({event,value}); return event === "house.subscribe" ? Promise.resolve({ ok: true, snapshot: state }) : respond(event,value); },
    volatile: { emit(event: string,value: any) { calls.push({event,value}); } },
  };
  vi.stubGlobal("io", () => socket); vi.stubGlobal("sessionStorage", memoryStorage());
  return { socket, calls, emit: (event: string, value: any) => listeners.get(event)?.(value), state: (next: any) => { state = next; }, reply: (handler: typeof respond) => { respond = handler; } };
}
describe("client action boundaries", () => {
  test("freezes house and UUID through a pending save and retries only in its original house", async () => {
    const transport = mockTransport(); const errors: any[] = [];
    const client = createHouseClient({ onError: error => errors.push(error) }); await client.connect();
    transport.reply(async () => { throw new Error("connection lost"); });
    await expect(client.command({ type: "chat.send", payload: { zoneId: "lounge", text: "Original" } })).rejects.toMatchObject({ code: "PENDING" });
    const first = transport.calls.find(call => call.event === "house.command")!.value.command;
    expect(first.houseId).toBe("house-a");
    const other = snapshot(2); other.durable.house.id = "house-b";
    transport.emit("house.snapshot", other);
    expect(transport.calls.filter(call => call.event === "house.command")).toHaveLength(1);
    transport.reply(async () => ({ ok: true }));
    transport.emit("house.snapshot", snapshot(3));
    await vi.waitFor(() => expect(transport.calls.filter(call => call.event === "house.command")).toHaveLength(2));
    expect(transport.calls.filter(call => call.event === "house.command")[1]!.value.command.commandId).toBe(first.commandId);
    expect(errors[0].code).toBe("PENDING"); client.close();
  });
  test("a denied room entry obtains a fresh lounge snapshot and leaves controls usable", async () => {
    const transport=mockTransport(); const states:any[]=[]; const errors:any[]=[];
    const client=createHouseClient({onSnapshot:value=>states.push(value),onError:error=>errors.push(error)});await client.connect();
    const original=transport.socket.emitWithAck;
    transport.socket.emitWithAck=(event:string,value:any)=>event==='house.subscribe'&&value.zoneId==='closed-room'
      ? Promise.resolve({ok:false,code:'FORBIDDEN',message:'Door is closed.'}) : original(event,value);
    await expect(client.subscribe('closed-room')).rejects.toMatchObject({code:'FORBIDDEN'});
    expect(states.at(-1)?.durable.zoneId).toBe('lounge');
    expect(states.some(value=>value===null)).toBe(true);
    await expect(client.setAvailability('chat')).resolves.toMatchObject({ok:true});
    client.close();
  });
  test("sends current control actions, drops offline motion and clears content on revocation", async () => {
    const transport = mockTransport(); const states: any[] = []; const errors: any[] = [];
    const client = createHouseClient({ onSnapshot: value => states.push(value), onError: error => errors.push(error), onDisconnect: reason => errors.push(reason) }); await client.connect();
    client.move({x:0,z:2.85,heading:0}); await client.setAvailability("chat"); await client.claimSeat("seat-1"); await client.stand();
    expect(transport.calls.find(call => call.event === "house.move")!.value.sequence).toBe(1);
    expect(transport.calls.find(call => call.event === "house.availability")!.value.generation).toBe(1);
    transport.reply(async () => ({ ok:true, snapshot: snapshot(1,1,"lounge","epoch-a",2) })); await client.takeover();
    client.move({x:0,z:2.85,heading:0}); expect(transport.calls.filter(call => call.event === "house.move")[1]!.value.generation).toBe(2);
    transport.emit("house.revoked", {serverEpoch:"epoch-a",accessGeneration:3,code:"FORBIDDEN"}); expect(states.at(-1)).toBeNull();
    client.move({x:0,z:2.85,heading:0}); expect(transport.calls.filter(call => call.event === "house.move")).toHaveLength(2);
    await expect(client.stand()).rejects.toMatchObject({code:"NOT_CONTROLLER"});
    transport.emit("disconnect","transport close"); expect(errors).toContain("transport close"); client.close();
    await expect(client.connect()).rejects.toMatchObject({code:"CLOSED"});
  });
  test("uses HTTP for the lobby and rejects a confirmed durable conflict", async () => {
    vi.stubGlobal("sessionStorage",memoryStorage()); const requests: any[] = [];
    vi.stubGlobal("fetch",async (url:string,options:any) => { requests.push({url,options}); return {ok:true,json:async () => url.endsWith('/me') ? {identity:{id:'person'},home:null} : {ok:true,commandId:JSON.parse(options.body).commandId} }; });
    const lobby=createHouseClient(); const saved=await lobby.command({type:'profile.set',payload:{name:'Ada',colour:'sage'}});
    expect(saved.ok).toBe(true); expect(requests[1].url).toBe('/api/house/command'); expect(JSON.parse(requests[1].options.body).commandId).toMatch(/^[a-f0-9-]{36}$/); lobby.close();
    const transport=mockTransport(); const client=createHouseClient(); await client.connect();
    transport.reply(async () => ({ok:false,code:'REVISION_CONFLICT',message:'The card changed.'}));
    await expect(client.command({type:'card.put',payload:{smallGoal:'Keep draft'}})).rejects.toMatchObject({code:'REVISION_CONFLICT'});
    client.close();
  });
});
