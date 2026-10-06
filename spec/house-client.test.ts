import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createSnapshotReducer, createCommandOutbox, createHouseClient, createPendingInspector } from "../public/house-client.js";

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


const OUTBOX_STORAGE_KEY = "house.commandOutbox.v2";
const expiredAt = () => Date.now() - 24 * 60 * 60 * 1000 - 1000;
const restoredEntry = (overrides: any = {}) => {
  const command = { commandId: randomUUID(), type: "chat.send", houseId: "house-a", payload: { zoneId: "lounge", text: "Original draft" } };
  return { command, identityId: "person", zoneId: "lounge", houseId: "house-a", createdAt: expiredAt(), ...overrides };
};
const fetchPerson = async () => ({ identity: { id: "person" }, home: null });

describe("outbox inspection and explicit recovery", () => {
  test("reconstructs sixteen expired drafts, exposes originals and frees quota only after explicit discard", async () => {
    const storage = memoryStorage(); const entries = Array.from({ length: 16 }, () => restoredEntry());
    storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(entries));
    const inspector = createPendingInspector({ storage, fetchMe: fetchPerson });
    const pending = await inspector.getPending();
    expect(pending.total).toBe(16); expect(pending.otherIdentityCount).toBe(0);
    expect(pending.entries).toHaveLength(16);
    expect(pending.entries[0]).toMatchObject({ commandId: entries[0]!.command.commandId, type: "chat.send", state: "expired", canRetry: false, houseId: "house-a", zoneId: "lounge", command: entries[0]!.command });
    expect(createCommandOutbox(storage).eligible("person", "lounge", Date.now(), "house-a")).toEqual([]);
    const fresh = { commandId: randomUUID(), type: "card.put", payload: {} };
    expect(() => createCommandOutbox(storage).add(fresh, "person", "lounge")).toThrowError(expect.objectContaining({ code: "OUTBOX_FULL" }));
    await inspector.discardPending(entries[0]!.command.commandId);
    createCommandOutbox(storage).add(fresh, "person", "lounge");
    expect((await inspector.getPending()).total).toBe(16);
    const exported = await inspector.exportPending();
    expect(exported).toHaveLength(16); expect(exported.some(row => row.commandId === entries[0]!.command.commandId)).toBe(false);
  });
  test("redacts foreign identities and requires identity restoration to inspect their payload", async () => {
    const storage = memoryStorage(); const own = restoredEntry(); const foreign = restoredEntry({ identityId: "other", command: { commandId: randomUUID(), type: "chat.send", houseId: "house-a", payload: { zoneId: "lounge", text: "Foreign private text" } } });
    storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([own, foreign]));
    let identityId = "person";
    const inspector = createPendingInspector({ storage, fetchMe: async () => ({ identity: { id: identityId }, home: null }) });
    expect(await inspector.getPending()).toMatchObject({ total: 2, otherIdentityCount: 1, entries: [{ commandId: own.command.commandId }] });
    expect(JSON.stringify(await inspector.getPending())).not.toContain("Foreign private text");
    expect(JSON.stringify(await inspector.exportPending())).not.toContain("Foreign private text");
    await expect(inspector.discardPending(foreign.command.commandId)).rejects.toMatchObject({ code: "PENDING_NOT_FOUND" });
    await expect(inspector.retryPending(foreign.command.commandId)).rejects.toMatchObject({ code: "PENDING_NOT_FOUND" });
    identityId = "other";
    expect((await inspector.getPending()).entries[0]!.command.payload.text).toBe("Foreign private text");
    identityId = "person";
    await inspector.discardOtherIdentities();
    expect(await inspector.getPending()).toMatchObject({ total: 1, otherIdentityCount: 0 });
  });
  test("does not automatically resend expired entries and manually retries an inspected original only in its authorized scope", async () => {
    const transport = mockTransport(); const storage = memoryStorage(); const entry = restoredEntry({ zoneId: "private", command: { commandId: randomUUID(), type: "chat.send", houseId: "house-a", payload: { zoneId: "private", text: "Original private draft" } } });
    storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([entry]));
    const client = createHouseClient({ storage, fetchMe: fetchPerson }); await client.connect();
    expect(transport.calls.filter(call => call.event === "house.command")).toHaveLength(0);
    await expect(client.retryPending(entry.command.commandId)).rejects.toMatchObject({ code: "INSPECTION_REQUIRED" });
    const row = (await client.getPending()).entries[0]!; expect(row.canRetry).toBe(false);
    row.command.payload.text = "Edited inspection copy";
    await expect(client.retryPending(entry.command.commandId)).rejects.toMatchObject({ code: "STALE_ZONE" });
    transport.state(snapshot(2, 1, "private")); await client.subscribe("private");
    expect((await client.getPending()).entries[0]!.canRetry).toBe(true);
    await client.retryPending(entry.command.commandId);
    const sent = transport.calls.find(call => call.event === "house.command")!.value;
    expect(sent.command).toEqual(entry.command); expect(sent.zoneId).toBe("private");
    expect((await client.getPending()).total).toBe(0); client.close();
  });
  test("checks current identity and controller and shares one in-flight retry without discard racing the acknowledgement", async () => {
    const transport = mockTransport(); const storage = memoryStorage(); const entry = restoredEntry();
    storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([entry])); let identityId = "person";
    const client = createHouseClient({ storage, fetchMe: async () => ({ identity: { id: identityId } }) }); await client.connect(); await client.getPending();
    const observer = snapshot(2); observer.controller = false; transport.emit("house.snapshot", observer);
    await expect(client.retryPending(entry.command.commandId)).rejects.toMatchObject({ code: "NOT_CONTROLLER" });
    transport.emit("house.snapshot", snapshot(3));
    identityId = "other";
    await expect(client.retryPending(entry.command.commandId)).rejects.toMatchObject({ code: "PENDING_NOT_FOUND" });
    identityId = "person";
    let complete!: (reply: any) => void;
    transport.reply(() => new Promise(resolve => { complete = resolve; }));
    const first = client.retryPending(entry.command.commandId), second = client.retryPending(entry.command.commandId);
    await vi.waitFor(() => expect(transport.calls.filter(call => call.event === "house.command")).toHaveLength(1));
    expect((await client.getPending()).entries[0]!.canRetry).toBe(false);
    await expect(client.discardPending(entry.command.commandId)).rejects.toMatchObject({ code: "PENDING_IN_FLIGHT" });
    complete({ ok: true }); await Promise.all([first, second]);
    expect((await client.getPending()).total).toBe(0); client.close();
  });
  test("inspects and retries an uncertain lobby command through HTTP without creating a socket", async () => {
    const storage = memoryStorage(); const command = { commandId: randomUUID(), type: "house.create", payload: { name: "Home" } };
    createCommandOutbox(storage).add(command, "person", "lounge", expiredAt());
    const posted: any[] = []; vi.stubGlobal("io", () => { throw new Error("Unexpected socket construction"); });
    vi.stubGlobal("fetch", async (url: string, options: any) => { posted.push({ url, options }); return { ok: true, json: async () => ({ ok: true }) }; });
    const inspector = createPendingInspector({ storage, fetchMe: fetchPerson });
    expect((await inspector.getPending()).entries[0]!.canRetry).toBe(true);
    await inspector.retryPending(command.commandId);
    expect(JSON.parse(posted[0]!.options.body)).toEqual(command);
    expect((await inspector.getPending()).total).toBe(0);
  });
  test("rejects corrupted, duplicate, over-count and UTF-8 oversized restoration without overwriting raw storage", () => {
    const fixtures = ["{broken", JSON.stringify(Array.from({ length: 17 }, () => restoredEntry())), JSON.stringify([restoredEntry({ zoneId: null })]), JSON.stringify([restoredEntry({ houseId: "different-house" })])];
    const repeated = restoredEntry(); fixtures.push(JSON.stringify([repeated, repeated]));
    const large = JSON.stringify(Array.from({ length: 6 }, () => restoredEntry({ command: { commandId: randomUUID(), type: "chat.send", houseId: "house-a", payload: { zoneId: "lounge", text: "界".repeat(2200) } } })));
    expect(large.length).toBeLessThan(32 * 1024); expect(new TextEncoder().encode(large).length).toBeGreaterThan(32 * 1024); fixtures.push(large);
    for (const raw of fixtures) {
      const storage = memoryStorage(); storage.setItem(OUTBOX_STORAGE_KEY, raw); const box = createCommandOutbox(storage);
      expect(() => box.add({ commandId: randomUUID(), type: "profile.set", payload: {} }, "person", "lounge")).toThrowError(expect.objectContaining({ code: "OUTBOX_CORRUPT" }));
      expect(storage.getItem(OUTBOX_STORAGE_KEY)).toBe(raw);
    }
  });
  test("freezes original payload and observes writes from other outbox instances", () => {
    const storage = memoryStorage(); const first = createCommandOutbox(storage), second = createCommandOutbox(storage);
    const command = { commandId: randomUUID(), type: "chat.send", houseId: "house-a", payload: { text: "Original", zoneId: "lounge" } };
    const added = first.add(command, "person", "lounge"); command.payload.text = "Caller edit"; added.command.payload.text = "Returned edit";
    expect(second.eligible("person", "lounge", Date.now(), "house-a")[0]!.command.payload.text).toBe("Original");
    second.remove(command.commandId);
    expect(first.eligible("person", "lounge", Date.now(), "house-a")).toEqual([]);
  });
  test("does not bypass expired inspection by resubmitting the original command through the ordinary save API", async () => {
    const transport = mockTransport(); const storage = memoryStorage(); const entry = restoredEntry();
    storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([entry]));
    const client = createHouseClient({ storage, fetchMe: fetchPerson }); await client.connect();
    await expect(client.command(entry.command)).rejects.toMatchObject({ code: "INSPECTION_REQUIRED" });
    expect(transport.calls.filter(call => call.event === "house.command")).toHaveLength(0); client.close();
  });
  test("never sends a new lobby intent when storage cannot preserve it", async () => {
    const saved = memoryStorage(); const storage = { getItem: saved.getItem, setItem() { throw new Error("quota unavailable"); } };
    const sent: string[] = []; vi.stubGlobal("fetch", async (url: string) => { sent.push(url); return { ok: true, json: async () => ({ ok: true }) }; });
    const inspector = createPendingInspector({ storage, fetchMe: fetchPerson });
    await expect(inspector.command({ commandId: randomUUID(), type: "house.create", payload: { name: "Original" } })).rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" });
    expect(sent).toEqual([]); expect(saved.getItem(OUTBOX_STORAGE_KEY)).toBeNull();
  });
  test("retains a saved receipt when local acknowledgement cleanup fails and permits explicit discard afterward", async () => {
    const saved = memoryStorage(); let rejectWrites = false;
    const storage = { getItem: saved.getItem, setItem(key: string, value: string) { if (rejectWrites && key === OUTBOX_STORAGE_KEY) throw new Error("storage temporarily unavailable"); saved.setItem(key, value); } };
    const errors: any[] = [];
    vi.stubGlobal("fetch", async () => { rejectWrites = true; return { ok: true, json: async () => ({ ok: true, sequence: 3 }) }; });
    const inspector = createPendingInspector({ storage, fetchMe: fetchPerson, onError: error => errors.push(error) });
    await expect(inspector.command({ commandId: randomUUID(), type: "profile.set", payload: { name: "Ada" } })).resolves.toMatchObject({ ok: true, sequence: 3 });
    expect(errors[0]).toMatchObject({ code: "STORAGE_UNAVAILABLE" });
    const pending = await inspector.getPending(); expect(pending.total).toBe(1);
    rejectWrites = false; await inspector.discardPending(pending.entries[0]!.commandId);
    expect((await inspector.getPending()).total).toBe(0);
  });
  test("rejects restored chat metadata that contradicts the original payload zone", () => {
    const storage = memoryStorage(); const raw = JSON.stringify([restoredEntry({ zoneId: "private" })]); storage.setItem(OUTBOX_STORAGE_KEY, raw);
    expect(() => createCommandOutbox(storage).all()).toThrowError(expect.objectContaining({ code: "OUTBOX_CORRUPT" }));
    expect(storage.getItem(OUTBOX_STORAGE_KEY)).toBe(raw);
  });
  test("never sends a queued copy after the user discarded it while an earlier acknowledgement was outstanding", async () => {
    const transport = mockTransport(); const storage = memoryStorage();
    const first = restoredEntry({ createdAt: Date.now() }), second = restoredEntry({ createdAt: Date.now() });
    storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([first, second]));
    let finish!: (reply: any) => void;
    transport.reply((_event, value) => value.command.commandId === first.command.commandId ? new Promise(resolve => { finish = resolve; }) : Promise.resolve({ ok: true }));
    const client = createHouseClient({ storage, fetchMe: fetchPerson }); await client.connect();
    await client.discardPending(second.command.commandId); finish({ ok: true });
    await vi.waitFor(async () => expect((await client.getPending()).total).toBe(0));
    expect(transport.calls.filter(call => call.event === "house.command").map(call => call.value.command.commandId)).toEqual([first.command.commandId]); client.close();
  });
  test("does not automatically send a copied queue entry after its 24-hour window expires", async () => {
    const transport = mockTransport(); const storage = memoryStorage(); const initialTime = Date.now();
    const first = restoredEntry({ createdAt: initialTime - 24 * 60 * 60 * 1000 + 100 }), second = restoredEntry({ createdAt: initialTime - 24 * 60 * 60 * 1000 + 100 });
    storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([first, second]));
    let finish!: (reply: any) => void;
    transport.reply((_event, value) => value.command.commandId === first.command.commandId ? new Promise(resolve => { finish = resolve; }) : Promise.resolve({ ok: true }));
    const client = createHouseClient({ storage, fetchMe: fetchPerson }); await client.connect();
    const date = vi.spyOn(Date, "now").mockReturnValue(initialTime + 1000); finish({ ok: true });
    try {
      await vi.waitFor(async () => expect((await client.getPending()).total).toBe(1));
      expect(transport.calls.filter(call => call.event === "house.command")).toHaveLength(1);
      expect((await client.getPending()).entries[0]!.state).toBe("expired");
    } finally { date.mockRestore(); client.close(); }
  });
  test("rejects a new lobby save if sessionStorage itself cannot be accessed", async () => {
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, get() { throw new Error("storage denied"); } });
    const sent: string[] = []; vi.stubGlobal("fetch", async (url: string) => { sent.push(url); throw new Error("acknowledgement lost"); });
    try {
      const inspector = createPendingInspector({ fetchMe: fetchPerson });
      await expect(inspector.command({ commandId: randomUUID(), type: "house.create", payload: { name: "Home" } })).rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" });
      expect(sent).toEqual([]);
    } finally { delete (globalThis as any).sessionStorage; }
  });
  test("keeps the captured UUID after native HTTP timeout or abort rather than treating numeric DOMException codes as server rejections", async () => {
    for (const name of ["TimeoutError", "AbortError"]) {
      const storage = memoryStorage(); const command = { commandId: randomUUID(), type: "house.create", payload: { name: "Home" } };
      vi.stubGlobal("fetch", async () => { throw new DOMException("Transport deadline", name); });
      const inspector = createPendingInspector({ storage, fetchMe: fetchPerson });
      await expect(inspector.command(command)).rejects.toMatchObject({ code: "PENDING" });
      expect((await inspector.getPending()).entries[0]!.command).toEqual(command);
    }
  });
  test("shares the in-flight discard guard between a lobby inspector and live client using the same storage", async () => {
    const transport = mockTransport(); const storage = memoryStorage(); const entry = restoredEntry();
    storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([entry]));
    const client = createHouseClient({ storage, fetchMe: fetchPerson }); await client.connect(); await client.getPending();
    let finish!: (reply: any) => void; transport.reply(() => new Promise(resolve => { finish = resolve; }));
    const request = client.retryPending(entry.command.commandId);
    await vi.waitFor(() => expect(transport.calls.filter(call => call.event === "house.command")).toHaveLength(1));
    let identityId = "person"; const inspector = createPendingInspector({ storage, fetchMe: async () => ({ identity: { id: identityId } }) });
    await expect(inspector.discardPending(entry.command.commandId)).rejects.toMatchObject({ code: "PENDING_IN_FLIGHT" });
    identityId = "other";
    await expect(inspector.discardOtherIdentities()).rejects.toMatchObject({ code: "PENDING_IN_FLIGHT" });
    expect(await inspector.getPending()).toMatchObject({ total: 1, entries: [], otherIdentityCount: 1 });
    finish({ ok: true }); await request;
    expect((await inspector.getPending()).total).toBe(0); client.close(); inspector.close();
  });
  test("clears control before a reconnect acknowledgement so stale motion cannot be sent", async () => {
    const transport = mockTransport(); const client = createHouseClient(); await client.connect();
    let finish!: (reply: any) => void;
    transport.socket.emitWithAck = () => new Promise(resolve => { finish = resolve; });
    transport.emit("connect", undefined);
    client.move({ x: 1, z: 1, heading: 0 });
    expect(transport.calls.filter(call => call.event === "house.move")).toHaveLength(0);
    finish({ ok: true, snapshot: snapshot(2) }); await vi.waitFor(() => { client.move({ x: 1, z: 1, heading: 0 }); expect(transport.calls.filter(call => call.event === "house.move")).toHaveLength(1); }); client.close();
  });
});


describe("identity epochs around awaited lobby work", () => {
  test("does not POST an old intent after close while its identity lookup was outstanding", async () => {
    const storage = memoryStorage(); const posted: any[] = [];
    let finish!: (value: any) => void;
    vi.stubGlobal("fetch", async (_url: string, options: any) => { posted.push(options); return { ok: true, json: async () => ({ ok: true }) }; });
    const inspector = createPendingInspector({ storage, expectedIdentityId: "person", fetchMe: () => new Promise(resolve => { finish = resolve; }) });
    const command = { commandId: randomUUID(), type: "house.create", payload: { name: "Original" } };
    const work = inspector.command(command); inspector.close(); finish({ identity: { id: "person" } });
    await expect(work).rejects.toMatchObject({ code: "CLOSED" });
    expect(posted).toEqual([]); expect(storage.getItem(OUTBOX_STORAGE_KEY)).toBeNull();
  });
  test("uses the original actor precondition after a delayed old /me response and retains its UUID on identity rejection", async () => {
    const storage = memoryStorage(); const command = { commandId: randomUUID(), type: "house.create", payload: { name: "Original" } };
    let finish!: (value: any) => void; let cookieActor = "person"; const posted: any[] = [];
    vi.stubGlobal("fetch", async (_url: string, options: any) => {
      posted.push(options);
      const intended = options.headers["X-House-Identity"];
      return { ok: intended === cookieActor, json: async () => intended === cookieActor ? { ok: true } : { ok: false, code: "IDENTITY_CHANGED", message: "Current identity changed." } };
    });
    const inspector = createPendingInspector({ storage, expectedIdentityId: "person", fetchMe: () => new Promise(resolve => { finish = resolve; }) });
    const work = inspector.command(command); cookieActor = "other"; finish({ identity: { id: "person" } });
    await expect(work).rejects.toMatchObject({ code: "IDENTITY_CHANGED" });
    expect(posted[0]!.headers["X-House-Identity"]).toBe("person");
    expect(createCommandOutbox(storage).all()[0]!.command).toEqual(command);
    expect(createCommandOutbox(storage).all()[0]!.identityId).toBe("person");
  });
  test("rejects a fetched identity that differs from the inspector's captured actor without revealing or discarding its drafts", async () => {
    const storage = memoryStorage(); const entry = restoredEntry(); storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([entry]));
    const inspector = createPendingInspector({ storage, expectedIdentityId: "person", fetchMe: async () => ({ identity: { id: "other" } }) });
    await expect(inspector.getPending()).rejects.toMatchObject({ code: "IDENTITY_CHANGED" });
    await expect(inspector.discardOtherIdentities()).rejects.toMatchObject({ code: "IDENTITY_CHANGED" });
    expect(createCommandOutbox(storage).all()).toEqual([entry]);
  });
  test("does not reveal a delayed identity-scoped inspection or mutate a discard after closure", async () => {
    const storage = memoryStorage(); const entry = restoredEntry(); storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([entry]));
    const finishers: ((value: any) => void)[] = [];
    const inspector = createPendingInspector({ storage, expectedIdentityId: "person", fetchMe: () => new Promise(resolve => { finishers.push(resolve); }) });
    const inspection = inspector.getPending(), exported = inspector.exportPending(), discard = inspector.discardPending(entry.command.commandId);
    inspector.close(); for (const finish of finishers) finish({ identity: { id: "person" } });
    await expect(inspection).rejects.toMatchObject({ code: "CLOSED" });
    await expect(exported).rejects.toMatchObject({ code: "CLOSED" });
    await expect(discard).rejects.toMatchObject({ code: "CLOSED" });
    expect(createCommandOutbox(storage).all()).toEqual([entry]);
  });
  test("keeps a captured UUID when close occurs after POST before a late successful acknowledgement", async () => {
    const storage = memoryStorage(); let finish!: (reply: any) => void;
    vi.stubGlobal("fetch", () => new Promise(resolve => { finish = resolve; }));
    const inspector = createPendingInspector({ storage, expectedIdentityId: "person", fetchMe: fetchPerson });
    const command = { commandId: randomUUID(), type: "house.create", payload: { name: "Original" } };
    const work = inspector.command(command);
    await vi.waitFor(() => expect(finish).toBeTypeOf("function")); inspector.close();
    finish({ ok: true, json: async () => ({ ok: true }) });
    await expect(work).rejects.toMatchObject({ code: "CLOSED" });
    expect(createCommandOutbox(storage).all()[0]!.command).toEqual(command);
  });
  test("retains a rejected original lobby retry under the same captured actor header", async () => {
    const storage = memoryStorage(); const command = { commandId: randomUUID(), type: "house.join", payload: { code: "ORIGINAL" } };
    createCommandOutbox(storage).add(command, "person", "lounge", expiredAt());
    const posted: any[] = [];
    vi.stubGlobal("fetch", async (_url: string, options: any) => { posted.push(options); return { ok: false, json: async () => ({ ok: false, code: "IDENTITY_CHANGED", message: "Identity changed." }) }; });
    const inspector = createPendingInspector({ storage, expectedIdentityId: "person", fetchMe: fetchPerson }); await inspector.getPending();
    await expect(inspector.retryPending(command.commandId)).rejects.toMatchObject({ code: "IDENTITY_CHANGED" });
    expect(posted[0]!.headers["X-House-Identity"]).toBe("person");
    expect(JSON.parse(posted[0]!.body)).toEqual(command); expect(createCommandOutbox(storage).all()[0]!.command).toEqual(command);
  });
  test("invalidates an awaited inspection when a newer room subscription changes the request generation", async () => {
    const transport = mockTransport(); const storage = memoryStorage(); const entry = restoredEntry(); storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([entry]));
    let finish!: (value: any) => void;
    const client = createHouseClient({ storage, expectedIdentityId: "person", fetchMe: () => new Promise(resolve => { finish = resolve; }) }); await client.connect();
    const inspection = client.getPending(); await client.subscribe("lounge"); finish({ identity: { id: "person" } });
    await expect(inspection).rejects.toMatchObject({ code: "STALE_ZONE" });
    expect(createCommandOutbox(storage).all()).toEqual([entry]); client.close();
  });

});


describe("Socket.IO namespace admission failures", () => {
  test("reports middleware data codes and the original message without retrying an inactive namespace", async () => {
    for (const code of ["UNAUTHENTICATED", "LOAD_LIMIT", "TAB_LIMIT"]) {
      const listeners = new Map<string, Function>(); const errors: any[] = []; let connects = 0;
      const socket: any = { connected: false, on(event: string, callback: Function) { listeners.set(event, callback); return socket; }, connect() { connects++; return socket; }, disconnect() {}, volatile: { emit() {} } };
      vi.stubGlobal("io", () => socket); vi.stubGlobal("sessionStorage", memoryStorage());
      const client = createHouseClient({ onError: error => errors.push(error) }); const pending = client.connect();
      const message = code === "UNAUTHENTICATED" ? "Open the house page to establish your identity." : code === "LOAD_LIMIT" ? "This server has twelve connections. Close an unused tab and retry." : "Use one controlling tab and one observer.";
      listeners.get("connect_error")!(Object.assign(new Error(message), { data: { ok: false, code, message } }));
      await expect(pending).rejects.toMatchObject({ code, message });
      expect(errors).toHaveLength(1); expect(errors[0]).toMatchObject({ code, message });
      expect(["FORBIDDEN", "NO_HOUSE", "UNAUTHENTICATED"].includes(errors[0].code)).toBe(code === "UNAUTHENTICATED");
      expect(connects).toBe(1); client.close();
    }
  });
});
