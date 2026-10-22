import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { HOUSE_WORLD_VERSION } from "../public/house-version.js";
import { createCommandOutbox, createHouseClient, createSnapshotReducer } from "../public/house-client.js";

const HOUSE = randomUUID(), PERSON = randomUUID(), OTHER = randomUUID(), ROUND = randomUUID(), NEXT_ROUND = randomUUID(), PARTICIPATION = randomUUID();
const KEY = "house.commandOutbox.v2", DAY = 86_400_000;
const memoryStorage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } }; };
function head({ access = 1, generation = 1, sequence = 1, epoch = "epoch-a", house = HOUSE, self = PERSON, round = ROUND, revision = 1, participation = null, members = [], zone = "lounge", controller = true, seated = false }: any = {}): any {
  return { worldVersion: HOUSE_WORLD_VERSION, serverEpoch: epoch, accessGeneration: access, generation, controller,
    durable: { house: { id: house }, selfId: self, streamId: zone + ":" + house, sequence, zoneId: zone, residents: [], cards: [], chat: [], room: zone === "lounge" ? null : { id: zone },
      puzzle: zone === "lounge" ? { revision: 1, current: round ? { id: round, ruleset: 1, illustrationId: "rainy-nook", illustrationVersion: 1, illustrationDigest: "digest", placements: [], completed: false } : null } : null },
    puzzleRoster: zone === "lounge" ? { serverEpoch: epoch, houseId: house, roundId: round, revision, memberIds: members, selfParticipationId: participation } : null, players: seated ? [{ id: self, connected: true, zoneId: zone, seatId: "game-seat-1", seatGeneration: 1 }] : [] };
}
function transport(initial = head()) {
  let state = initial, respond: (event: string, body: any) => Promise<any> = async (_event, body) => ({ ok: true, requestId: body.requestId, intentSequence: body.intentSequence, mode: body.mode, roundId: body.roundId, participationId: body.mode === "join" ? PARTICIPATION : null, rosterRevision: 2 });
  const listeners = new Map<string, Function>(), calls: { event: string; body: any }[] = [];
  const socket: any = { connected: false, on(event: string, listener: Function) { listeners.set(event, listener); return socket; },
    connect() { socket.connected = true; listeners.get("connect")?.(); return socket; }, disconnect() { socket.connected = false; }, timeout() { return socket; },
    emitWithAck(event: string, body: any) { calls.push({ event, body: structuredClone(body) }); return event === "house.subscribe" || event === "house.takeover" ? Promise.resolve({ ok: true, snapshot: state }) : respond(event, body); }, get volatile() { return socket; } };
  vi.stubGlobal("io", () => socket);
  return { socket, calls, state(value: any) { state = value; }, reply(value: typeof respond) { respond = value; }, emit(event: string, value: any) { listeners.get(event)?.(value); }, intents() { return calls.filter(call => call.event === "house.puzzle.intent"); }, commands() { return calls.filter(call => call.event === "house.command"); } };
}
const fetchPerson = async () => ({ identity: { id: PERSON } });
const place = (extra: any = {}) => ({ commandId: randomUUID(), houseId: HOUSE, type: "puzzle.place", payload: { roundId: ROUND, participationId: PARTICIPATION, pieceId: "ivy-bell", destination: 0, ...extra } });
const start = (extra: any = {}) => ({ commandId: randomUUID(), houseId: HOUSE, type: "puzzle.start", expectedRevision: 1, payload: { expectedRoundId: ROUND, illustrationId: "rainy-nook", illustrationVersion: 1, confirmUnfinished: false, ...extra } });
afterEach(() => vi.unstubAllGlobals());

describe("picture roster ordering in the full snapshot reducer", () => {
  test("accepts newer roster at equal durable sequence and rejects a backwards roster before poisoning authority", () => {
    const states: any[] = [], reducer = createSnapshotReducer(value => states.push(value));
    expect(reducer.accept(head({ revision: 8, participation: PARTICIPATION, members: [PERSON] }))).toBe(true);
    expect(reducer.accept(head({ revision: 9 }))).toBe(true); expect(states.at(-1).puzzleRoster.selfParticipationId).toBeNull();
    expect(reducer.accept(head({ sequence: 2, revision: 8, participation: PARTICIPATION, members: [PERSON] }))).toBe(false);
    expect(reducer.accept(head({ sequence: 2, revision: 10 }))).toBe(true);
  });
  test.each(["clear", "zone"])("retains independent roster high-water after %s display clearing", mode => {
    const states: any[] = [], reducer = createSnapshotReducer(value => states.push(value)); reducer.accept(head({ revision: 8 }));
    if (mode === "clear") reducer.clear(); else { reducer.selectZone("private"); reducer.accept(head({ access: 2, zone: "private" })); reducer.selectZone("lounge"); }
    expect(states.at(-1)).toBeNull();
    expect(reducer.accept(head({ access: mode === "zone" ? 3 : 1, sequence: 2, revision: 7, participation: PARTICIPATION, members: [PERSON] }))).toBe(false);
    expect(states.at(-1)).toBeNull();
    expect(reducer.accept(head({ access: mode === "zone" ? 3 : 1, sequence: 2, revision: 9 }))).toBe(true);
  });
  test("orders round replacement with the same house-wide roster revision watermark", () => {
    const reducer = createSnapshotReducer(); reducer.accept(head({ revision: 8 }));
    expect(reducer.accept(head({ round: NEXT_ROUND, revision: 7, sequence: 2 }))).toBe(false);
    expect(reducer.accept(head({ round: NEXT_ROUND, revision: 9, sequence: 2 }))).toBe(true);
    expect(reducer.accept(head({ round: ROUND, revision: 8, sequence: 2 }))).toBe(false);
  });
  test.each(["round", "epoch", "house", "duplicate", "foreign-self", "negative", "equal-changed"])("rejects malformed or contradictory %s roster without advancing access", field => {
    const reducer = createSnapshotReducer(); reducer.accept(head({ revision: 4 })); const incoming = head({ access: 9, revision: 99 });
    if (field === "round") incoming.puzzleRoster.roundId = NEXT_ROUND;
    if (field === "epoch") incoming.puzzleRoster.serverEpoch = "wrong";
    if (field === "house") incoming.puzzleRoster.houseId = OTHER;
    if (field === "duplicate") incoming.puzzleRoster.memberIds = [PERSON, PERSON];
    if (field === "foreign-self") incoming.puzzleRoster.selfParticipationId = PARTICIPATION;
    if (field === "negative") incoming.puzzleRoster.revision = -1;
    if (field === "equal-changed") { incoming.puzzleRoster.revision = 4; incoming.puzzleRoster.memberIds = [OTHER]; }
    expect(reducer.accept(incoming)).toBe(false); expect(reducer.accept(head({ sequence: 2, revision: 5 }))).toBe(true);
  });
  test("rejects private roster injection and motion cannot restore participation", () => {
    const states: any[] = [], reducer = createSnapshotReducer(value => states.push(value)); reducer.accept(head({ revision: 5 }));
    const hostile = head({ revision: 99, participation: PARTICIPATION, members: [PERSON] });
    reducer.motion({ ...hostile, zoneId: "lounge", players: [] }); expect(states.at(-1).puzzleRoster.selfParticipationId).toBeNull();
    reducer.selectZone("private"); const privateHead = head({ access: 2, zone: "private" }); privateHead.puzzleRoster = hostile.puzzleRoster;
    expect(reducer.accept(privateHead)).toBe(false); expect(states.at(-1)).toBeNull();
  });
  test("rejects old access and retired epoch while permitting authorized identity scope reset", () => {
    const states: any[] = [], reducer = createSnapshotReducer(value => states.push(value)); reducer.accept(head({ access: 2, revision: 9 }));
    expect(reducer.accept(head({ access: 1, revision: 100 }))).toBe(false);
    expect(reducer.accept(head({ access: 3, self: OTHER, revision: 1 }))).toBe(true);
    expect(states.at(-1).puzzleRoster.revision).toBe(1);
    expect(reducer.accept(head({ epoch: "epoch-b", revision: 0 }))).toBe(true);
    expect(reducer.accept(head({ access: 99, epoch: "epoch-a", revision: 999 }))).toBe(false);
  });
  test("membership revocation clears cached private content and does not recover it from an omitted roster", () => {
    const states: any[] = [], reducer = createSnapshotReducer(value => states.push(value)); reducer.accept(head({ revision: 8, participation: PARTICIPATION, members: [PERSON] }));
    reducer.revoke({ serverEpoch: "epoch-a", accessGeneration: 2 }); expect(states.at(-1)).toBeNull();
    const legacy = head({ access: 2, sequence: 2 }); delete legacy.puzzleRoster;
    expect(reducer.accept(legacy)).toBe(true); expect(states.at(-1).puzzleRoster ?? null).toBeNull();
    expect(reducer.accept(head({ access: 2, sequence: 3, revision: 7, participation: PARTICIPATION, members: [PERSON] }))).toBe(false);
  });
});

describe("direct picture participation intent", () => {
  test("retries an uncertain original request exactly, with cloned notifications and no durable queue", async () => {
    const wire = transport(), storage = memoryStorage(), states: any[] = [], views: any[] = [];
    const client = createHouseClient({ storage, onPuzzleIntent: value => states.push(value), onSnapshot: value => views.push(value) }); await client.connect();
    wire.reply(async () => { throw new Error("lost ACK"); });
    await expect(client.puzzleIntent("join", ROUND)).rejects.toMatchObject({ code: "PENDING" }); const first = wire.intents()[0]!.body;
    expect(client.pendingPuzzleIntent()).toMatchObject({ ...first, state: "pending", canRetry: true });
    const inspected = client.pendingPuzzleIntent()!; inspected.roundId = NEXT_ROUND; states.at(-1).roundId = NEXT_ROUND;
    wire.reply(async (_event, body) => ({ ok: true, requestId: body.requestId, intentSequence: body.intentSequence, mode: body.mode, roundId: body.roundId, participationId: PARTICIPATION, rosterRevision: 2 }));
    await expect(client.retryPuzzleIntent()).resolves.toMatchObject({ ok: true, participationId: PARTICIPATION });
    expect(wire.intents()[1]!.body).toEqual(first); expect(client.pendingPuzzleIntent()).toBeNull(); expect(createCommandOutbox(storage).all()).toEqual([]);
    expect(views.at(-1).puzzleRoster.selfParticipationId).toBeNull(); client.close();
  });
  test("newer Leave supersedes unresolved Join and a late Join ACK cannot replace it or the roster", async () => {
    const wire = transport(), client = createHouseClient({ storage: memoryStorage() }); await client.connect();
    let resolveJoin!: (value: any) => void; wire.reply(async (_event, body) => body.mode === "join" ? new Promise(resolve => { resolveJoin = resolve; }) : ({ ok: true, ...body, participationId: null, rosterRevision: 3 }));
    const join = client.puzzleIntent("join", ROUND); const rejected = expect(join).rejects.toMatchObject({ code: "STALE_INTENT" });
    await client.puzzleIntent("leave", ROUND); expect(wire.intents().map(call => call.body.intentSequence)).toEqual([1, 2]);
    resolveJoin({ ok: true, ...wire.intents()[0]!.body, participationId: PARTICIPATION, rosterRevision: 2 }); await rejected;
    expect(client.pendingPuzzleIntent()).toBeNull(); await expect(client.retryPuzzleIntent()).rejects.toMatchObject({ code: "PENDING_NOT_FOUND" }); client.close();
  });
  test.each(["access", "generation", "observer"])("%s change clears retry but retains connection sequence", async change => {
    const wire = transport(), client = createHouseClient({ storage: memoryStorage() }); await client.connect(); wire.reply(async () => { throw new Error("timeout"); });
    await expect(client.puzzleIntent("join", ROUND)).rejects.toMatchObject({ code: "PENDING" });
    wire.emit("house.snapshot", head({ access: change === "access" ? 2 : 1, generation: change === "generation" ? 2 : 1, controller: change !== "observer", revision: 2 }));
    expect(client.pendingPuzzleIntent()).toBeNull(); await expect(client.retryPuzzleIntent()).rejects.toMatchObject({ code: "PENDING_NOT_FOUND" });
    if (change === "observer") wire.emit("house.snapshot", head({ access: 2, generation: 2, revision: 3 }));
    await expect(client.puzzleIntent("leave", ROUND)).rejects.toMatchObject({ code: "PENDING" }); expect(wire.intents()[1]!.body.intentSequence).toBe(2); client.close();
  });
  test("explicit same-zone subscription and takeover invalidate retry without resetting sequence", async () => {
    const wire = transport(), client = createHouseClient({ storage: memoryStorage() }); await client.connect(); wire.reply(async () => { throw new Error("timeout"); });
    await expect(client.puzzleIntent("join", ROUND)).rejects.toMatchObject({ code: "PENDING" });
    wire.state(head({ access: 2, revision: 2 })); await client.subscribe("lounge"); expect(client.pendingPuzzleIntent()).toBeNull();
    await expect(client.puzzleIntent("join", ROUND)).rejects.toMatchObject({ code: "PENDING" }); wire.state(head({ access: 3, generation: 2, revision: 3 })); await client.takeover();
    expect(client.pendingPuzzleIntent()).toBeNull(); await expect(client.puzzleIntent("leave", ROUND)).rejects.toMatchObject({ code: "PENDING" }); expect(wire.intents().map(call => call.body.intentSequence)).toEqual([1, 2, 3]); client.close();
  });
  test("disconnect/reconnect never replays Join, resets only the new connection counter, and cannot queue offline", async () => {
    const wire = transport(), client = createHouseClient({ storage: memoryStorage() }); await client.connect(); wire.reply(async () => { throw new Error("timeout"); });
    await expect(client.puzzleIntent("join", ROUND)).rejects.toMatchObject({ code: "PENDING" }); wire.socket.connected = false; wire.emit("disconnect", "lost");
    expect(client.pendingPuzzleIntent()).toBeNull(); await expect(client.puzzleIntent("leave", ROUND)).rejects.toMatchObject({ code: "PENDING" }); expect(wire.intents()).toHaveLength(1);
    wire.state(head({ access: 2, revision: 2 })); await client.connect(); expect(wire.intents()).toHaveLength(1);
    await expect(client.puzzleIntent("join", ROUND)).rejects.toMatchObject({ code: "PENDING" }); expect(wire.intents()[1]!.body.intentSequence).toBe(1); client.close();
  });
  test("concurrent retries share a flight; deterministic denial settles and requires a new action", async () => {
    const wire = transport(), client = createHouseClient({ storage: memoryStorage() }); await client.connect(); wire.reply(async () => { throw new Error("timeout"); });
    await expect(client.puzzleIntent("join", ROUND)).rejects.toMatchObject({ code: "PENDING" }); let finish!: (reply: any) => void;
    wire.reply(() => new Promise(resolve => { finish = resolve; })); const first = client.retryPuzzleIntent(), second = client.retryPuzzleIntent(); expect(wire.intents()).toHaveLength(2); expect(client.pendingPuzzleIntent()?.canRetry).toBe(false);
    finish({ ok: false, requestId: wire.intents()[1]!.body.requestId, intentSequence: 1, code: "ACTIVITY_ACTIVE", message: "Leave the other activity." });
    await expect(first).rejects.toMatchObject({ code: "ACTIVITY_ACTIVE" }); await expect(second).rejects.toMatchObject({ code: "ACTIVITY_ACTIVE" }); expect(client.pendingPuzzleIntent()).toBeNull();
    await expect(client.retryPuzzleIntent()).rejects.toMatchObject({ code: "PENDING_NOT_FOUND" }); wire.reply(async () => ({ ok: false, code: "ALREADY_JOINED", message: "Already joined." }));
    await expect(client.puzzleIntent("join", ROUND)).rejects.toMatchObject({ code: "ALREADY_JOINED" }); expect(wire.intents()[2]!.body.intentSequence).toBe(2); client.close();
  });
  test("a mismatched success ACK remains uncertain and never adopts its participation", async () => {
    const wire = transport(), client = createHouseClient({ storage: memoryStorage() }); await client.connect();
    wire.reply(async (_event, body) => ({ ok: true, ...body, requestId: randomUUID(), participationId: PARTICIPATION, rosterRevision: 2 }));
    await expect(client.puzzleIntent("join", ROUND)).rejects.toMatchObject({ code: "PENDING" }); expect(client.pendingPuzzleIntent()?.canRetry).toBe(true); client.close();
  });
  test("direct intent works without durable storage, but updates and revocation clear it", async () => {
    const wire = transport(), client = createHouseClient({ storage: undefined }); await client.connect(); wire.reply(async () => { throw new Error("timeout"); });
    await expect(client.puzzleIntent("join", ROUND)).rejects.toMatchObject({ code: "PENDING" }); wire.emit("house.revoked", { serverEpoch: "epoch-a", accessGeneration: 2 }); expect(client.pendingPuzzleIntent()).toBeNull();
    wire.emit("house.snapshot", head({ access: 2, revision: 2 })); await expect(client.puzzleIntent("join", ROUND)).rejects.toMatchObject({ code: "PENDING" });
    wire.emit("house.snapshot", { ...head({ access: 3, revision: 3 }), worldVersion: "old-client-rejected" }); expect(client.pendingPuzzleIntent()).toBeNull();
    await expect(client.puzzleIntent("leave", ROUND)).rejects.toMatchObject({ code: "CLIENT_UPDATE_REQUIRED" }); client.close();
  });
});

describe("durable picture command capture and recovery", () => {
  test("puzzle pending cap is per identity/house, separate from game drafts and within16/32KiB", () => {
    const storage = memoryStorage(), outbox = createCommandOutbox(storage); outbox.add(place(), PERSON, "lounge"); outbox.add(place(), PERSON, "lounge");
    expect(() => outbox.add(place(), PERSON, "lounge")).toThrowError(expect.objectContaining({ code: "PUZZLE_PENDING_LIMIT" }));
    expect(() => outbox.add({ ...place(), type: "game.move" }, PERSON, "lounge")).not.toThrow();
    expect(() => outbox.add(place(), OTHER, "lounge")).not.toThrow(); expect(() => outbox.add({ ...place(), houseId: OTHER }, PERSON, "lounge")).not.toThrow();
    for (let i = outbox.all().length; i < 16; i++) outbox.add({ commandId: randomUUID(), type: "card.save", payload: {} }, PERSON, "lounge");
    expect(() => outbox.add(place(), OTHER, "lounge")).toThrowError(expect.objectContaining({ code: "OUTBOX_FULL" }));
  });
  test.each(["puzzle.join", "puzzle.leave", "house.puzzle.intent", "puzzle.future"])("%s cannot become a durable draft or restored outbox", type => {
    const storage = memoryStorage(), outbox = createCommandOutbox(storage), command = { ...place(), type };
    expect(() => outbox.add(command, PERSON, "lounge")).toThrowError(expect.objectContaining({ code: "INVALID_INPUT" }));
    const raw = JSON.stringify([{ command, identityId: PERSON, houseId: HOUSE, zoneId: "lounge", createdAt: Date.now() }]); storage.setItem(KEY, raw);
    expect(() => outbox.all()).toThrowError(expect.objectContaining({ code: "OUTBOX_CORRUPT" })); expect(storage.getItem(KEY)).toBe(raw);
  });
  test("captures non-destructive Start authority and roster once, then reuses original defaults for the same pending UUID", async () => {
    const wire = transport(head({ round: null, revision: 4, seated: true })), storage = memoryStorage(), client = createHouseClient({ storage, fetchMe: fetchPerson }); await client.connect();
    wire.reply(async () => { throw new Error("timeout"); }); const command = start({ expectedRoundId: null });
    await expect(client.command(command)).rejects.toMatchObject({ code: "PENDING" }); const original = wire.commands()[0]!.body.command;
    expect(original.payload).toMatchObject({ authority: { serverEpoch: "epoch-a", accessGeneration: 1, generation: 1 }, expectedRoster: { serverEpoch: "epoch-a", revision: 4 } });
    wire.emit("house.snapshot", head({ access: 2, round: null, revision: 5, seated: true })); await vi.waitFor(() => expect(wire.commands()).toHaveLength(2));
    await expect(client.command(command)).rejects.toMatchObject({ code: "PENDING" }); expect(wire.commands().every(call => JSON.stringify(call.body.command) === JSON.stringify(original))).toBe(true); client.close();
  });
  test("missing unfinished-reset confirmation context is rejected before queueing; supplied stale context remains exact", async () => {
    const wire = transport(), storage = memoryStorage(), client = createHouseClient({ storage, fetchMe: fetchPerson }); await client.connect();
    await expect(client.command(start({ confirmUnfinished: true }))).rejects.toMatchObject({ code: "INVALID_INPUT" }); expect(createCommandOutbox(storage).all()).toEqual([]); expect(wire.commands()).toHaveLength(0);
    wire.reply(async () => { throw new Error("timeout"); }); const captured = start({ confirmUnfinished: true, authority: { serverEpoch: "epoch-a", accessGeneration: 0, generation: 0 }, expectedRoster: { serverEpoch: "epoch-a", revision: 0 } });
    await expect(client.command(captured)).rejects.toMatchObject({ code: "PENDING" }); expect(wire.commands()[0]!.body.command).toEqual(captured); client.close();
  });
  test("captures initial participation and preserves round/UUID/body through a later Join and historical receipt", async () => {
    const views: any[] = [], wire = transport(head({ participation: PARTICIPATION, members: [PERSON], seated: true })), storage = memoryStorage(), client = createHouseClient({ storage, fetchMe: fetchPerson, onSnapshot: value => views.push(value) }); await client.connect();
    wire.reply(async () => { throw new Error("timeout"); }); const command: any = place(); delete command.payload.participationId;
    await expect(client.command(command)).rejects.toMatchObject({ code: "PENDING" }); const original = wire.commands()[0]!.body.command; expect(original.payload.participationId).toBe(PARTICIPATION);
    wire.reply(async () => ({ ok: true, result: { roundId: ROUND, puzzleRevision: 2, pieceId: "ivy-bell", destination: 0, completed: false } }));
    wire.emit("house.snapshot", head({ access: 2, round: NEXT_ROUND, revision: 3, seated: true })); await vi.waitFor(() => expect(wire.commands()).toHaveLength(2));
    expect(wire.commands()[1]!.body.command).toEqual(original); await vi.waitFor(() => expect(createCommandOutbox(storage).all()).toEqual([])); expect(views.at(-1).puzzleRoster.selfParticipationId).toBeNull(); client.close();
  });
  test("expired puzzle draft inspection has readable type, immutable capture and explicit manual retry", async () => {
    const wire = transport(), storage = memoryStorage(), original = place(); createCommandOutbox(storage).add(original, PERSON, "lounge", Date.now() - DAY - 1);
    const client = createHouseClient({ storage, fetchMe: fetchPerson }); await client.connect(); expect(wire.commands()).toHaveLength(0);
    await expect(client.retryPending(original.commandId)).rejects.toMatchObject({ code: "INSPECTION_REQUIRED" });
    const row = (await client.getPending()).entries[0]!; expect(row).toMatchObject({ type: "puzzle.place", label: "Place picture piece", state: "expired", canRetry: true }); row.command.payload.participationId = OTHER;
    wire.reply(async () => ({ ok: true })); await client.retryPending(original.commandId); expect(wire.commands()[0]!.body.command).toEqual(original); client.close();
  });
  test("missing durable storage never emits a placement and a missing participation is not guessed", async () => {
    const wire = transport(), saved = memoryStorage(), unavailable = { getItem: saved.getItem, setItem() { throw new Error("denied"); } };
    const client = createHouseClient({ storage: unavailable, fetchMe: fetchPerson }); await client.connect();
    await expect(client.command(place())).rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" }); expect(wire.commands()).toHaveLength(0);
    const bare: any = place(); delete bare.payload.participationId; await expect(client.command(bare)).rejects.toMatchObject({ code: "PUZZLE_NOT_JOINED" }); client.close();
  });
});

describe("picture client boundary refinements", () => {
  test("equal roster revision compares member content semantically rather than object or member order", () => {
    const reducer = createSnapshotReducer(); reducer.accept(head({ revision: 4, members: [PERSON, OTHER], participation: PARTICIPATION }));
    const reordered = head({ revision: 4, members: [OTHER, PERSON], participation: PARTICIPATION });
    reordered.puzzleRoster = { memberIds: reordered.puzzleRoster.memberIds, revision: 4, roundId: ROUND, houseId: HOUSE, serverEpoch: "epoch-a", selfParticipationId: PARTICIPATION };
    expect(reducer.accept(reordered)).toBe(true);
  });
  test("direct intent checks the expected identity before emission", async () => {
    const wire = transport(head({ self: OTHER })), client = createHouseClient({ storage: memoryStorage(), expectedIdentityId: PERSON }); await client.connect();
    await expect(client.puzzleIntent("join", ROUND)).rejects.toMatchObject({ code: "IDENTITY_CHANGED" }); expect(wire.intents()).toHaveLength(0); client.close();
  });
  test.each([
    { authority: {}, expectedRoster: {} },
    { authority: { serverEpoch: "epoch-a", accessGeneration: -1, generation: 1 }, expectedRoster: { serverEpoch: "epoch-a", revision: 1 } },
    { authority: { serverEpoch: "epoch-a", accessGeneration: 1, generation: 1 }, expectedRoster: { serverEpoch: "epoch-a", revision: -1 } },
  ])("malformed unfinished-reset confirmation context is rejected before queueing: %j", async context => {
    const wire = transport(), storage = memoryStorage(), client = createHouseClient({ storage }); await client.connect();
    await expect(client.command(start({ confirmUnfinished: true, ...context }))).rejects.toMatchObject({ code: "INVALID_INPUT" }); expect(wire.commands()).toHaveLength(0); expect(createCommandOutbox(storage).all()).toEqual([]); client.close();
  });
  test("convenience Start capture does not turn an unfinished table into current reset consent", async () => {
    const wire = transport(), storage = memoryStorage(), client = createHouseClient({ storage }); await client.connect();
    await expect(client.command(start())).rejects.toMatchObject({ code: "INVALID_INPUT" }); expect(wire.commands()).toHaveLength(0); expect(createCommandOutbox(storage).all()).toEqual([]); client.close();
  });
  test("restored puzzle caps and lounge/house scope are validated without overwriting raw storage", () => {
    const valid = { command: place(), identityId: PERSON, houseId: HOUSE, zoneId: "lounge", createdAt: Date.now() };
    const missingHouse: any = structuredClone(valid); delete missingHouse.command.houseId; delete missingHouse.houseId;
    const cases = [[valid, { ...valid, command: place() }, { ...valid, command: place() }], [{ ...valid, zoneId: "private" }], [missingHouse]];
    for (const entries of cases) { const storage = memoryStorage(), raw = JSON.stringify(entries); storage.setItem(KEY, raw); expect(() => createCommandOutbox(storage).all()).toThrowError(expect.objectContaining({ code: "OUTBOX_CORRUPT" })); expect(storage.getItem(KEY)).toBe(raw); }
  });
  test("puzzle drafts still obey the shared32KiB UTF-8 limit", () => {
    const outbox = createCommandOutbox(memoryStorage()); outbox.add(place({ note: "界".repeat(3400) }), PERSON, "lounge"); outbox.add(place({ note: "界".repeat(3400) }), PERSON, "lounge");
    expect(() => outbox.add({ commandId: randomUUID(), type: "card.save", payload: { text: "x".repeat(11500) } }, PERSON, "lounge")).toThrowError(expect.objectContaining({ code: "OUTBOX_FULL" })); expect(outbox.all()).toHaveLength(2);
  });
});

describe("authorized picture-roster recovery after private-room revocation", () => {
  function privateRevocation(roster: any = {}) {
    const states: any[] = [], reducer = createSnapshotReducer(value => states.push(value));
    expect(reducer.accept(head({ revision: 8, ...roster }))).toBe(true);
    reducer.selectZone("private"); expect(reducer.accept(head({ access: 2, generation: 2, zone: "private" }))).toBe(true);
    expect(reducer.revoke({ serverEpoch: "epoch-a", accessGeneration: 3 })).toBe(true); expect(states.at(-1)).toBeNull();
    return { reducer, states };
  }
  test.each([{ members: [] }, { members: [OTHER] }])("fresh authorized unchanged roster %j restores the lounge after bedroom access revocation", ({ members }) => {
    const { reducer, states } = privateRevocation({ members });
    expect(reducer.accept(head({ access: 3, generation: 3, revision: 8, members }))).toBe(true);
    expect(states.at(-1)).toMatchObject({ durable: { zoneId: "lounge" }, puzzleRoster: { revision: 8, memberIds: members, selfParticipationId: null } });
  });
  test("stale authority and a genuinely older roster cannot recover the revoked display", () => {
    const { reducer, states } = privateRevocation();
    expect(reducer.accept(head({ access: 2, generation: 2, revision: 8 }))).toBe(false);
    expect(reducer.accept(head({ access: 3, generation: 1, revision: 8 }))).toBe(false);
    expect(reducer.accept(head({ access: 3, generation: 3, revision: 7 }))).toBe(false); expect(states.at(-1)).toBeNull();
    expect(reducer.accept(head({ access: 3, generation: 3, revision: 9 }))).toBe(true);
  });
  test("contradictory same-revision peer membership and round remain rejected after raw roster clearing", () => {
    const { reducer, states } = privateRevocation({ members: [OTHER] });
    expect(reducer.accept(head({ access: 3, generation: 3, revision: 8, members: [] }))).toBe(false);
    expect(reducer.accept(head({ access: 3, generation: 3, revision: 8, members: [OTHER, PERSON] }))).toBe(false);
    expect(reducer.accept(head({ access: 3, generation: 3, revision: 8, round: NEXT_ROUND, members: [OTHER] }))).toBe(false); expect(states.at(-1)).toBeNull();
  });
  test("revocation never restores a prior participation UUID from an equal-revision head", () => {
    const { reducer, states } = privateRevocation({ members: [PERSON], participation: PARTICIPATION });
    expect(reducer.accept(head({ access: 3, generation: 3, revision: 8, members: [PERSON], participation: PARTICIPATION }))).toBe(false); expect(states.at(-1)).toBeNull();
    expect(reducer.accept(head({ access: 3, generation: 3, revision: 9 }))).toBe(true); expect(states.at(-1).puzzleRoster.selfParticipationId).toBeNull();
  });
});

describe("terminal private-roster ordering disposal", () => {
  test("confirmed session loss clears old membership comparison state while retaining stale-authority rejection", () => {
    const states: any[] = [], reducer = createSnapshotReducer(value => states.push(value)); reducer.accept(head({ revision: 8, members: [OTHER] }));
    expect(reducer.revoke({ serverEpoch: "epoch-a", accessGeneration: 2, code: "UNAUTHENTICATED" })).toBe(true); expect(states.at(-1)).toBeNull();
    expect(reducer.accept(head({ access: 1, sequence: 2, revision: 99 }))).toBe(false);
    expect(reducer.accept(head({ access: 3, sequence: 2, revision: 8, members: [] }))).toBe(true); expect(states.at(-1).puzzleRoster.selfParticipationId).toBeNull();
  });
  test("revocation followed by disconnect disposes membership metadata before a fresh authenticated connection", async () => {
    const wire = transport(head({ revision: 8, members: [OTHER] })), views: any[] = [], client = createHouseClient({ storage: memoryStorage(), onSnapshot: value => views.push(value) }); await client.connect();
    wire.emit("house.revoked", { serverEpoch: "epoch-a", accessGeneration: 2, code: "FORBIDDEN" }); wire.socket.connected = false; wire.emit("disconnect", "transport close"); expect(views.at(-1)).toBeNull();
    wire.state(head({ access: 3, generation: 2, revision: 8, members: [] })); await expect(client.connect()).resolves.toMatchObject({ ok: true }); expect(views.at(-1).puzzleRoster.memberIds).toEqual([]); client.close();
  });
});


test("recent standing picture drafts skip automatic replay while manual historical receipt preserves original round and body", async () => {
  const views: any[] = [], wire = transport(head({ round: NEXT_ROUND })), storage = memoryStorage(), original = place();
  createCommandOutbox(storage).add(original, PERSON, "lounge");
  wire.reply(async () => ({ ok: true, result: { roundId: ROUND, puzzleRevision: 2, pieceId: "ivy-bell", destination: 0, completed: false } }));
  const client = createHouseClient({ storage, fetchMe: fetchPerson, onSnapshot: value => views.push(value) }); await client.connect();
  wire.emit("house.snapshot", head({ access: 2, round: NEXT_ROUND, revision: 3 }));
  for (let n = 0; n < 20; n++) await Promise.resolve();
  expect(wire.commands()).toHaveLength(0); expect(createCommandOutbox(storage).all()[0]!.command).toEqual(original);
  expect((await client.getPending()).entries[0]).toMatchObject({ commandId: original.commandId, canRetry: true });
  await client.retryPending(original.commandId); expect(wire.commands()).toHaveLength(1); expect(wire.commands()[0]!.body.command).toEqual(original);
  expect(views.at(-1).durable.puzzle.current.id).toBe(NEXT_ROUND); expect(views.at(-1).puzzleRoster.selfParticipationId).toBeNull();
  expect(createCommandOutbox(storage).all()).toEqual([]); client.close();
});
