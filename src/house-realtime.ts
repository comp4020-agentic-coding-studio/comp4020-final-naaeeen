import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Server as HttpServer, IncomingMessage } from "node:http";
import { Server, type Socket } from "socket.io";
import { HouseError } from "./house-contract.ts";
import type { HouseCommand, HouseReceipt, HouseSnapshot, HouseGameControl, HouseExecution, PuzzleControl, LoungeControl, LiveSnapshot, Me, Player } from "./house-contract.ts";
import { PuzzlePresence } from "./house-puzzle-presence.ts";
import { HOUSE_WORLD_VERSION, createLayout, bedroomLayout, validPosition, slide } from "../public/house-geometry.js";
import { activityMetadata } from "./activity-log.ts";

export interface HouseAuthority {
  session(digest: string): { id: string } | undefined;
  me(id: string): Me;
  snapshot(id: string, zoneId?: string): HouseSnapshot;
  authorizeZone?(id: string, zoneId?: string): void;
  seatLayout?(id: string, zoneId?: string): ReturnType<typeof createLayout>;
  execute(id: string, command: HouseCommand, control?: HouseGameControl): HouseReceipt;
  executeWithEffects?(id: string, command: HouseCommand, control?: HouseGameControl): HouseExecution;
  maintainGames?(now?: number): boolean;
  gameLifecycle?(id: string, event: "disconnect" | "left_lounge" | "seat_lost"): boolean;
}
export interface AttachOptions { elapsedNow?: () => number; origin?: string; secureCookies?: boolean; log?: (record: Record<string, unknown>) => void }
interface Context { legacyReadonly: boolean; socket: Socket; id: string; digest: string; zoneId: string; accessGeneration: number; subscribed: boolean; pendingSnapshot: boolean; revoked: Record<string, unknown> | null; blockedAt: number; budgetElapsedAt: number; events: number; puzzleIntent: { sequence: number; hash: string; outcome: Record<string, unknown> } | null }
interface Lease { id: string; digest: string; houseId: string; token: string; socketId: string | null; generation: number; expiresAt: number; zoneId: string; x: number; z: number; heading: number; animation: "idle" | "walk" | "sit"; seatGeneration: number; seatId: string | null; availability: "quiet" | "chat"; availabilitySetAt: number; sequence: number; lastMoveElapsedAt: number; motionCredit: number }
const LEASE_MS = 30_000, MAX_FRAME_BYTES = 1024 * 1024, MAX_BYTES = 2 * 1024 * 1024, MAX_CONNECTIONS = 12;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const inputObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HouseError("INVALID_INPUT", "An action object is required.");
  return value as Record<string, unknown>;
};
const failure = (error: unknown) => error instanceof HouseError ? { ok: false, code: error.code, message: error.message } : { ok: false, code: "STORAGE_UNAVAILABLE", message: "The house is temporarily unavailable. Please retry." };

function allowedOrigin(request: IncomingMessage, options: AttachOptions): boolean {
  const origin = request.headers.origin;
  if (!origin) return false;
  if (options.origin) return origin === options.origin;
  if (options.secureCookies) return false;
  const host = request.headers.host;
  if (!host || !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)) return false;
  return origin === `http://${host}`;
}
function digestCookie(cookie = ""): string | undefined {
  const matches = cookie.split(";").map(item => item.trim()).filter(item => item.startsWith("house_session="));
  if (matches.length !== 1) return undefined;
  const token = matches[0]!.slice("house_session=".length);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? createHash("sha256").update(token).digest("hex") : undefined;
}
/** Private Engine.IO fields are checked narrowly against pinned Engine.IO 6.6.11. */
function outbound(socket: Socket, bytes: number): "ready" | "wait" | "overflow" {
  const connection = socket.conn;
  if (connection.readyState !== "open") return "overflow";
  const transport = connection.transport;
  const runtime = connection as unknown as { writeBuffer?: { type?: string; data?: unknown }[] };
  const websocket = transport as unknown as { socket?: { bufferedAmount?: number } };
  if (transport.name !== "websocket" || !Array.isArray(runtime.writeBuffer) || typeof websocket.socket?.bufferedAmount !== "number") return "overflow";
  let queued = 0;
  for (const packet of runtime.writeBuffer) {
    if (!packet.type || !["open", "close", "ping", "pong", "upgrade", "noop", "message"].includes(packet.type)) return "overflow";
    if (packet.data === undefined && packet.type !== "message") { queued += 32; continue; }
    if (typeof packet.data !== "string" && !Buffer.isBuffer(packet.data)) return "overflow";
    queued += Buffer.byteLength(packet.data) + 32;
  }
  if (bytes > MAX_FRAME_BYTES || runtime.writeBuffer.length >= 4 || websocket.socket.bufferedAmount + queued + bytes + 32 > MAX_BYTES) return "overflow";
  return transport.writable ? "ready" : "wait";
}

/** SQLite owns durable intent; bounded process memory owns live pose and leases. */
export function attachHouseRealtime(server: HttpServer, store: HouseAuthority, options: AttachOptions = {}) {
  const elapsedNow = options.elapsedNow ?? (() => performance.now());
  const io = new Server(server, { transports: ["websocket"], maxHttpBufferSize: 16 * 1024, perMessageDeflate: false, allowRequest: (request, done) => done(null, allowedOrigin(request, options)), serveClient: true, pingInterval: 10_000, pingTimeout: 10_000 });
  const serverEpoch = randomUUID();
  const contexts = new Map<string, Context>();
  const leases = new Map<string, Lease>();
  const pendingGameLifecycles = new Map<string, "disconnect" | "left_lounge" | "seat_lost">();
  const puzzlePresence = new PuzzlePresence();
  let nextGeneration = 0, nextAccessGeneration = 0, nextSeatGeneration = 0;
  let closed = false, motionDirty = false, sessionSweepAt = 0;
  const log = (id: string, action: string, outcome: string, metadata: Record<string, unknown> = {}) => { try { options.log?.({ ...metadata, at: Date.now(), actor: id, action, outcome }); } catch { /* Instruments must not change command success. */ } };
  function receiptMetadata(command: HouseCommand, receipt: HouseReceipt) {
    // A lounge stream names a house; a bedroom stream names a room. Commands
    // reaching a bedroom receipt have already passed the store's house check.
    const houseId = receipt.streamId.startsWith("lounge:") ? receipt.streamId.slice(7)
      : receipt.streamId.startsWith("bedroom:") ? command.houseId : undefined;
    return { ...activityMetadata(command), houseId, commandId: receipt.commandId, sequence: receipt.sequence };
  }
  function clearPuzzleConnection(socketId: string) { if (puzzlePresence.clearConnection(socketId)) queueRefresh(); }
  function release(lease: Lease) { if (lease.seatId) lease.seatGeneration = ++nextSeatGeneration; lease.seatId = null; lease.animation = "idle"; }
  function disconnect(context: Context, code: string) { log(context.id, "connection.close", code); context.socket.conn.close(true); }
  function requireSession(context: Context) {
    if (closed || store.session(context.digest)?.id !== context.id) {
      clearPuzzleConnection(context.socket.id);
      throw new HouseError("UNAUTHENTICATED", "Your session changed. Reload to continue.");
    }
  }
  function authorised(context: Context) { requireSession(context); return store.snapshot(context.id, context.zoneId); }
  function preflightZone(context: Context, zoneId: string): HouseSnapshot | undefined {
    requireSession(context);
    if (store.authorizeZone) { store.authorizeZone(context.id, zoneId); return undefined; }
    // Compatibility for existing authority adapters; production has the narrow preflight.
    return store.snapshot(context.id, zoneId);
  }
  function resetZone(lease: Lease, snapshot: HouseSnapshot) {
    if (lease.socketId) clearPuzzleConnection(lease.socketId);
    const departure = lease.zoneId === "lounge" && snapshot.zoneId !== "lounge" ? "left_lounge" : "seat_lost";
    if (lease.seatId || departure === "left_lounge") revokeActivity(lease, departure);
    release(lease); lease.zoneId = snapshot.zoneId;
    const layout = snapshot.room ? bedroomLayout(snapshot.room.placements) : createLayout(snapshot.house.capacity);
    const resident = snapshot.residents.find(member => member.id === lease.id);
    if (!resident) throw new HouseError("FORBIDDEN", "Your permanent bedroom is unavailable.");
    const arrival = { x: .65 * (resident.slot - (snapshot.house.capacity - 1) / 2), z: 3.3 };
    const spawn = snapshot.room ? (validPosition(layout, arrival) ? arrival : layout.spawn) : (layout.arrivals?.[resident.slot] ?? layout.spawn);
    lease.x = spawn.x; lease.z = spawn.z; lease.heading = 0; lease.sequence = 0; lease.lastMoveElapsedAt = elapsedNow(); lease.motionCredit = 0;
  }
  function controller(context: Context, generation: unknown): Lease {
    requireSession(context);
    if (context.legacyReadonly) throw new HouseError("NOT_CONTROLLER", "This older tab is read-only. Copy available drafts or export Pending, then reload to update.");
    preflightZone(context, context.zoneId);
    const lease = leases.get(context.id);
    if (!lease || lease.socketId !== context.socket.id) throw new HouseError("NOT_CONTROLLER", "This tab is observing. Take control to act.");
    if (generation !== lease.generation) throw new HouseError("STALE_GENERATION", "Control changed. Use the latest house state.");
    if (lease.zoneId !== context.zoneId) throw new HouseError("STALE_ZONE", "Return to the current controlled room.");
    return lease;
  }
  function flushGameLifecycles() {
    for (const [id, event] of pendingGameLifecycles) {
      if (store.gameLifecycle?.(id, event)) queueRefresh();
      pendingGameLifecycles.delete(id);
    }
  }
  function revokeActivity(lease: Lease, event: "disconnect" | "left_lounge" | "seat_lost") {
    if (lease.socketId) clearPuzzleConnection(lease.socketId);
    if (lease.zoneId !== "lounge") return;
    // A terminal voluntary departure must survive a racing network close.
    if (event !== "disconnect" || !pendingGameLifecycles.has(lease.id)) pendingGameLifecycles.set(lease.id, event);
    try { flushGameLifecycles(); } catch { log(lease.id, "game." + event, "STORAGE_UNAVAILABLE"); }
  }
  function activitySeat(lease: Lease | undefined, durable: HouseSnapshot) {
    if (!lease?.socketId || lease.houseId !== durable.house.id || lease.zoneId !== "lounge" || lease.animation !== "sit") return undefined;
    const seat = createLayout(durable.house.capacity).seats.find(candidate => candidate.id === lease.seatId && candidate.purpose === "game");
    return seat && seat.x === lease.x && seat.z === lease.z && seat.heading === lease.heading ? { seatId: seat.id, purpose: "game" as const } : undefined;
  }
  function gameControl(context: Context): HouseGameControl {
    const current=leases.get(context.id)!, durable = authorised(context);
    const controlledInLounge: string[]=[], controlledAtActivityTable: string[]=[];
    for(const lease of leases.values()) {
      const peer=lease.socketId ? contexts.get(lease.socketId) : undefined;
      if(lease.houseId===current.houseId && lease.zoneId==="lounge" && peer?.subscribed && peer.zoneId==="lounge" && store.session(peer.digest)?.id===lease.id && store.me(lease.id).home?.id===current.houseId) {
        controlledInLounge.push(lease.id); if (activitySeat(lease, durable)) controlledAtActivityTable.push(lease.id);
      }
    }
    if(context.zoneId!=="lounge") throw new HouseError("STALE_ZONE","Return to the lounge table.");
    return {isController:true,zoneId:"lounge",controlledInLounge,controlledAtActivityTable,activitySeat:activitySeat(current,durable),reconcileActivity:flushGameLifecycles,puzzle:puzzleControl(context,durable)};
  }
  function currentLoungeSeat(id: string): LoungeControl | null {
    const lease = leases.get(id), context = lease?.socketId ? contexts.get(lease.socketId) : undefined;
    if (!lease || !context?.subscribed || context.legacyReadonly || context.zoneId !== "lounge" || lease.zoneId !== "lounge") return null;
    try {
      preflightZone(context, "lounge");
      const home = store.me(id).home;
      if (!home || home.id !== lease.houseId) return null;
      const seat = lease.animation === "sit" ? createLayout(home.capacity).seats.find(candidate => candidate.id === lease.seatId && candidate.x === lease.x && candidate.z === lease.z && candidate.heading === lease.heading) : undefined;
      return { houseId: home.id, actorId: id, generation: lease.generation, accessGeneration: context.accessGeneration, seatGeneration: lease.seatGeneration, seatId: seat?.id ?? null, seatPurpose: seat && seat.purpose !== "bedroom" ? seat.purpose : null };
    } catch { return null; }
  }
  function puzzleControl(context: Context, durable: HouseSnapshot): PuzzleControl {
    const roundId = durable.puzzle?.current?.id ?? null;
    const roster = puzzlePresence.prune(durable.house.id, roundId, participant => {
      const peer = contexts.get(participant.socketId), lease = leases.get(participant.actorId);
      return participant.roundId === roundId && !durable.puzzle?.current?.completed &&
        durable.residents.some(resident => resident.id === participant.actorId) && !!peer?.subscribed &&
        peer.zoneId === "lounge" && peer.accessGeneration === participant.accessGeneration &&
        store.session(peer.digest)?.id === participant.actorId && lease?.socketId === participant.socketId &&
        lease.houseId === durable.house.id && lease.zoneId === "lounge" && lease.generation === participant.generation && !!activitySeat(lease, durable);
    });
    return { authority: { serverEpoch, accessGeneration: context.accessGeneration, generation: leases.get(context.id)?.generation ?? 0 },
      roundId, rosterRevision: roster.revision, memberIds: [...roster.participants.keys()], participationId: roster.participants.get(context.id)?.socketId === context.socket.id ? roster.participants.get(context.id)!.participationId : null };
  }
  function retainPuzzleHouses() {
    const houses = new Set<string>();
    for (const context of contexts.values()) {
      const lease = leases.get(context.id);
      if (context.subscribed && lease) houses.add(lease.houseId);
    }
    puzzlePresence.retainHouses(houses);
  }
  function execute(context: Context | undefined, id: string, command: HouseCommand): HouseReceipt {
    const activity = command.type.startsWith("game.") || command.type.startsWith("puzzle.");
    // Caller has validated current controller/session/zone. Build full activity
    // snapshots only after the store has ruled out an accepted exact retry.
    const control: HouseGameControl | undefined = activity && context ? { isController: true, zoneId: "lounge", controlledInLounge: [], prepareActivity: () => gameControl(context) } : undefined;
    if (store.executeWithEffects) {
      const outcome = store.executeWithEffects(id, command, control);
      // No database work, await, user hook or fallible authority check after COMMIT.
      puzzlePresence.committed(outcome.effect);
      return outcome.receipt;
    }
    return store.execute(id, command, control);
  }
  function switchToLounge(context: Context, code: string) {
    clearPuzzleConnection(context.socket.id);
    context.zoneId = "lounge"; context.accessGeneration = ++nextAccessGeneration;
    context.revoked = { serverEpoch, accessGeneration: context.accessGeneration, zoneId: "lounge", code };
    context.pendingSnapshot = true;
    const lease = leases.get(context.id);
    if (lease?.socketId === context.socket.id) {
      try { resetZone(lease, store.snapshot(context.id)); lease.generation = ++nextGeneration; } catch { release(lease); leases.delete(context.id); }
    }
  }
  function pruneLeases() {
    for (const [id, lease] of leases) {
      if (store.session(lease.digest)?.id !== id || store.me(id).home?.id !== lease.houseId || (!lease.socketId && lease.expiresAt <= Date.now())) {
        if (lease.socketId) clearPuzzleConnection(lease.socketId);
        // Preserve the controlling-disconnect fact before removing its lease.
        // Membership departure has already ended a game in the store transaction.
        if(lease.socketId && lease.zoneId==="lounge") {
          revokeActivity(lease, "disconnect");
        }
        release(lease); leases.delete(id); queueRefresh();
      }
    }
  }
  function project(context: Context): LiveSnapshot {
    let durable: HouseSnapshot;
    try { durable = authorised(context); }
    catch (error) {
      if (error instanceof HouseError && error.code === "FORBIDDEN") {
        switchToLounge(context, "FORBIDDEN");
        durable = authorised(context);
      } else throw error;
    }
    if (context.legacyReadonly) return { puzzleRoster: null, worldVersion: HOUSE_WORLD_VERSION, serverEpoch, accessGeneration: context.accessGeneration, controller: false, generation: 0, durable, players: [] };
    pruneLeases();
    const layout = durable.room ? bedroomLayout(durable.room.placements) : createLayout(durable.house.capacity);
    for (const lease of leases.values()) {
      if (lease.houseId !== durable.house.id || lease.zoneId !== durable.zoneId) continue;
      const seat = lease.seatId ? layout.seats.find(candidate => candidate.id === lease.seatId) : undefined;
      const invalid = lease.seatId ? !seat || seat.x !== lease.x || seat.z !== lease.z || seat.heading !== lease.heading || !validPosition(layout, seat.target) : !validPosition(layout, lease);
      if (invalid) { resetZone(lease, durable); lease.generation = ++nextGeneration; queueRefresh(); log(lease.id, "pose.reconciled", "room-changed"); }
    }
    const players: Player[] = durable.residents.map(resident => {
      const lease = leases.get(resident.id);
      // A controller must still belong to this house and have a current session.
      const controllingContext = lease?.socketId ? contexts.get(lease.socketId) : undefined;
      const connected = !!controllingContext && store.session(controllingContext.digest)?.id === resident.id && lease?.houseId === durable.house.id;
      const value: Player = { id: resident.id, name: resident.name, colour: resident.colour, connected, zoneId: lease?.houseId === durable.house.id ? lease.zoneId : "lounge", availability: lease?.houseId === durable.house.id ? lease.availability : "quiet", availabilitySetAt: lease?.houseId === durable.house.id ? lease.availabilitySetAt : 0, generation: lease?.generation ?? 0, seatGeneration: lease?.seatGeneration ?? 0 };
      const reserved = !connected && lease?.seatId && lease.houseId === durable.house.id && lease.expiresAt > Date.now();
      if ((connected || reserved) && lease && lease.zoneId === durable.zoneId) Object.assign(value, { x: lease.x, z: lease.z, heading: lease.heading, animation: lease.animation, seatId: lease.seatId, ...(reserved ? { seatReservedUntil: lease.expiresAt } : {}) });
      return value;
    });
    const lease = leases.get(context.id);
    if (durable.zoneId === "lounge") puzzleControl(context, durable);
    retainPuzzleHouses();
    return { puzzleRoster: durable.zoneId === "lounge" ? puzzlePresence.project(serverEpoch, durable.house.id, durable.puzzle?.current?.id ?? null, context.socket.id) : null, worldVersion: HOUSE_WORLD_VERSION, serverEpoch, accessGeneration: context.accessGeneration, controller: lease?.socketId === context.socket.id, generation: lease?.generation ?? 0, durable, players };
  }
  function queueRefresh() { if (closed) return; for (const context of contexts.values()) if (context.subscribed) context.pendingSnapshot = true; }
  function send(context: Context, event: string, value: unknown, volatile = false): boolean {
    requireSession(context);
    const bytes = Buffer.byteLength(JSON.stringify([event, value])) + 8;
    const status = outbound(context.socket, bytes);
    if (status === "overflow") { disconnect(context, "SLOW_READER"); return false; }
    if (status === "wait") {
      context.blockedAt ||= Date.now(); if (Date.now() - context.blockedAt > 1000) disconnect(context, "SLOW_READER");
      return false;
    }
    context.blockedAt = 0;
    if (volatile) context.socket.volatile.emit(event, value); else context.socket.emit(event, value);
    return true;
  }
  function tick() {
    if (closed) return;
    const wallNow = Date.now(), tickElapsedAt = elapsedNow();
    if (wallNow - sessionSweepAt >= 1000) {
      sessionSweepAt = wallNow;
      try {
        // Known revoked consent is removed before game maintenance can fail.
        for (const context of contexts.values()) if (store.session(context.digest)?.id !== context.id) {
          clearPuzzleConnection(context.socket.id); disconnect(context, "UNAUTHENTICATED");
        }
        pruneLeases();
        flushGameLifecycles();
        if(store.maintainGames?.(wallNow)) queueRefresh();
      } catch { /* An action/projection reports storage failure; the next sweep retries due housekeeping. */ }
    }
    for (const [id, lease] of leases) {
      if (!lease.socketId && lease.expiresAt <= wallNow) { release(lease); leases.delete(id); queueRefresh(); }
      if (lease.animation === "walk" && tickElapsedAt - lease.lastMoveElapsedAt > 250) { log(lease.id, "motion.stop", "idle"); lease.animation = "idle"; motionDirty = true; }
    }
    const dirty = motionDirty; motionDirty = false;
    for (const context of contexts.values()) {
      if (!context.subscribed || (!context.pendingSnapshot && !context.revoked && (!dirty || context.legacyReadonly))) continue;
      try {
        const snapshot = project(context); // Recheck membership/access before each delivery.
        if (context.revoked) { if (send(context, "house.revoked", context.revoked)) context.revoked = null; continue; }
        if (context.pendingSnapshot) { if (send(context, "house.snapshot", snapshot)) context.pendingSnapshot = false; }
        else if (dirty && !context.legacyReadonly) send(context, "house.motion", { worldVersion: HOUSE_WORLD_VERSION, serverEpoch, accessGeneration: snapshot.accessGeneration, generation: snapshot.generation, zoneId: snapshot.durable.zoneId, players: snapshot.players }, true);
      } catch (error) {
        if (failure(error).code === "STORAGE_UNAVAILABLE") {
          try {
            // An unavailable activity snapshot is not a permission revocation.
            // Retain control only after narrow current auth/admission succeeds;
            // deliver no cached private state and retry the projection later.
            preflightZone(context, context.zoneId);
            const home = store.me(context.id).home, lease = leases.get(context.id);
            if (!home || (lease && lease.houseId !== home.id)) throw new HouseError("FORBIDDEN", "Current house membership is required.");
            context.pendingSnapshot = true;
            continue;
          } catch (authorityError) { error = authorityError; }
        }
        context.subscribed = false;
        try { send(context, "house.revoked", { serverEpoch, accessGeneration: (context.accessGeneration = ++nextAccessGeneration), zoneId: "lounge", code: failure(error).code }); } catch { /* No authorised delivery after identity revocation. */ }
        disconnect(context, failure(error).code);
      }
    }
  }
  function cleanup(context: Context) {
    if (!contexts.delete(context.socket.id)) return;
    clearPuzzleConnection(context.socket.id);
    if (!closed) log(context.id, "connection.disconnect", "offline");
    const lease = leases.get(context.id);
    if (lease?.socketId === context.socket.id) {
      if(!closed && lease.zoneId==="lounge") {
        revokeActivity(lease, "disconnect");
      }
      lease.socketId = null; lease.expiresAt = Date.now() + LEASE_MS; lease.animation = lease.seatId ? "sit" : "idle"; }
    retainPuzzleHouses(); queueRefresh();
  }
  io.use((socket, next) => {
    try {
      const digest = digestCookie(socket.request.headers.cookie);
      const identity = digest ? store.session(digest) : undefined;
      if (!digest || !identity) throw new HouseError("UNAUTHENTICATED", "Open the house page to establish your identity.");
      const declaredVersion = Object.prototype.hasOwnProperty.call(socket.handshake.auth ?? {}, "worldVersion");
      const legacyReadonly = !declaredVersion;
      if (declaredVersion && socket.handshake.auth.worldVersion !== HOUSE_WORLD_VERSION) throw new HouseError("CLIENT_UPDATE_REQUIRED", "The house has changed. Download unsent drafts, then reload to update.");
      if (contexts.size >= MAX_CONNECTIONS) throw new HouseError("LOAD_LIMIT", "This server has twelve connections. Close an unused tab and retry.");
      if ([...contexts.values()].filter(context => context.id === identity.id).length >= 2) throw new HouseError("TAB_LIMIT", "Use one controlling tab and one observer.");
      const context: Context = { puzzleIntent: null, legacyReadonly, socket, id: identity.id, digest, zoneId: "lounge", accessGeneration: 0, subscribed: false, pendingSnapshot: false, revoked: null, blockedAt: 0, budgetElapsedAt: elapsedNow(), events: 0 };
      contexts.set(socket.id, context);
      socket.conn.once("close", () => cleanup(context));
      next();
    } catch (error) { const result = failure(error); const denial = new Error(result.message) as Error & { data: unknown }; denial.data = result; next(denial); }
  });
  io.on("connection", socket => {
    const context = contexts.get(socket.id)!;
    function handle(event: string, action: (body: Record<string, unknown>) => unknown) {
      socket.on(event, (raw: unknown, acknowledge: unknown) => {
        let result: unknown;
        try {
          requireSession(context);
          const eventElapsedAt = elapsedNow();
          if (eventElapsedAt - context.budgetElapsedAt >= 1000) { context.events = 0; context.budgetElapsedAt = eventElapsedAt; }
          if (++context.events > 30) throw new HouseError("RATE_LIMITED", "Please slow down your house actions.");
          const body = inputObject(raw); result = action(body);
        } catch (error) { result = failure(error); if (event !== "house.move") log(context.id, event, failure(error).code, { ...activityMetadata(event === "house.command" && raw && typeof raw === "object" ? (raw as Record<string, unknown>).command : undefined), transport: "socket" }); }
        if (typeof acknowledge === "function") {
          const status = outbound(socket, Buffer.byteLength(JSON.stringify(result)) + 32);
          if (status === "overflow") disconnect(context, "SLOW_READER"); else acknowledge(result);
        }
      });
    }
    function acquire(token: string, snapshot: HouseSnapshot, force = false): Lease {
      if (context.legacyReadonly) throw new HouseError("NOT_CONTROLLER", "Reload this older tab after copying or exporting its available drafts.");
      let lease = leases.get(context.id);
      if (!force && lease?.socketId && lease.socketId !== socket.id) return lease;
      if (!force && lease && !lease.socketId && lease.expiresAt > Date.now() && lease.token === token && lease.houseId === snapshot.house.id) {
        lease.socketId = socket.id; lease.expiresAt = Infinity;
        if (lease.zoneId !== snapshot.zoneId) resetZone(lease, snapshot);
        return lease;
      }
      if (!force && lease?.socketId === socket.id) return lease;
      if (lease) {
        revokeActivity(lease, lease.zoneId === "lounge" && snapshot.zoneId !== "lounge" ? "left_lounge" : "seat_lost");
        release(lease);
      }
      const generation = ++nextGeneration;
      lease = { id: context.id, digest: context.digest, houseId: snapshot.house.id, token, socketId: socket.id, generation, expiresAt: Infinity, zoneId: snapshot.zoneId, x: 0, z: 0, heading: 0, animation: "idle", seatGeneration: ++nextSeatGeneration, seatId: null, availability: "quiet", availabilitySetAt: Date.now(), sequence: 0, lastMoveElapsedAt: elapsedNow(), motionCredit: 0 };
      resetZone(lease, snapshot); leases.set(context.id, lease); return lease;
    }
    handle("house.subscribe", body => {
      if (Object.keys(body).length !== 2 || typeof body.zoneId !== "string" || (body.zoneId !== "lounge" && (body.zoneId.length !== 36 || !uuid.test(body.zoneId))) || typeof body.controllerToken !== "string" || body.controllerToken.length !== 36 || !uuid.test(body.controllerToken)) throw new HouseError("INVALID_INPUT", "Choose an available room and a current tab token.");
      const checked = preflightZone(context, body.zoneId);
      if (leases.get(context.id)?.socketId === socket.id) clearPuzzleConnection(socket.id);
      const snapshot = checked ?? store.snapshot(context.id, body.zoneId);
      const alreadySubscribed = context.subscribed;
      context.accessGeneration = ++nextAccessGeneration;
      context.zoneId = body.zoneId; context.subscribed = true; context.revoked = null;
      if (context.legacyReadonly) {
        log(context.id, "zone.subscribe", "recovery");
        return { ok: true, snapshot: project(context) };
      }
      const lease = acquire(body.controllerToken, snapshot);
      if (lease.socketId === socket.id) {
        if (alreadySubscribed) lease.generation = ++nextGeneration;
        if (lease.zoneId !== body.zoneId) resetZone(lease, snapshot);
        lease.sequence = 0; lease.lastMoveElapsedAt = elapsedNow(); lease.motionCredit = 0;
      }
      queueRefresh(); log(context.id, "zone.subscribe", "ok");
      return { ok: true, snapshot: project(context) };
    });
    handle("house.takeover", body => {
      if (context.legacyReadonly) throw new HouseError("CLIENT_UPDATE_REQUIRED", "This older tab is read-only. Copy available drafts or export Pending before reloading.");
      if (Object.keys(body).some(key => key !== "controllerToken") || (Object.hasOwn(body, "controllerToken") && (typeof body.controllerToken !== "string" || body.controllerToken.length !== 36 || !uuid.test(body.controllerToken)))) throw new HouseError("INVALID_INPUT", "Use a current tab control token.");
      if (!context.subscribed) throw new HouseError("NOT_SUBSCRIBED", "Enter the house first.");
      const checked = preflightZone(context, context.zoneId);
      const former = leases.get(context.id);
      if (former?.socketId) clearPuzzleConnection(former.socketId);
      const snapshot = checked ?? authorised(context);
      const token = typeof body.controllerToken === "string" && uuid.test(body.controllerToken) ? body.controllerToken : randomUUID();
      acquire(token, snapshot, true); queueRefresh(); log(context.id, "control.takeover", "ok");
      return { ok: true, snapshot: project(context) };
    });
    handle("house.move", body => {
      const lease = controller(context, body.generation);
      if (!Number.isSafeInteger(body.sequence) || (body.sequence as number) <= lease.sequence) throw new HouseError("STALE_INPUT", "Use a newer motion sequence.");
      if (![body.x, body.z, body.heading].every(value => typeof value === "number" && Number.isFinite(value)) || Math.abs(body.heading as number) > 1e6) throw new HouseError("INVALID_MOVE", "Use a finite house position.");
      const movementElapsedAt = elapsedNow(), dx = (body.x as number) - lease.x, dz = (body.z as number) - lease.z;
      const credit = Math.min(.64, lease.motionCredit + 3.2 * Math.max(0, movementElapsedAt - lease.lastMoveElapsedAt) / 1000);
      if (Math.hypot(dx, dz) > credit + .06 || lease.seatId) throw new HouseError("INVALID_MOVE", "Walk within the room at the allowed speed.");
      if (movementElapsedAt - lease.lastMoveElapsedAt < 80 && Math.hypot(dx, dz) > .001) throw new HouseError("RATE_LIMITED", "Movement updates are limited to ten per second.");
      const snapshot = authorised(context), layout = snapshot.room ? bedroomLayout(snapshot.room.placements) : createLayout(snapshot.house.capacity);
      const candidate = { x: body.x as number, z: body.z as number };
      const swept = slide(layout, { x: lease.x, z: lease.z }, dx, dz);
      if (!validPosition(layout, candidate) || Math.hypot(swept.x - candidate.x, swept.z - candidate.z) > .01) throw new HouseError("INVALID_MOVE", "Furniture or a wall blocks that path.");
      const animation = Math.hypot(dx, dz) > .001 ? "walk" : "idle";
      if (lease.animation !== animation) log(context.id, animation === "walk" ? "motion.start" : "motion.stop", animation === "walk" ? "walking" : "idle");
      lease.motionCredit = credit - Math.hypot(dx, dz);
      lease.x = candidate.x; lease.z = candidate.z; lease.heading = (body.heading as number) % (Math.PI * 2); lease.sequence = body.sequence as number; lease.lastMoveElapsedAt = movementElapsedAt; lease.animation = animation; motionDirty = true;
      return { ok: true, sequence: lease.sequence };
    });
    handle("house.availability", body => {
      const lease = controller(context, body.generation);
      if (body.value !== "quiet" && body.value !== "chat") throw new HouseError("INVALID_INPUT", "Choose Quiet or Can chat.");
      lease.availability = body.value; lease.availabilitySetAt = Date.now(); queueRefresh(); log(context.id, "availability.set", "ok"); return { ok: true };
    });
    handle("house.seat", body => {
      const lease = controller(context, body.generation), snapshot = authorised(context), layout = snapshot.room ? bedroomLayout(snapshot.room.placements) : createLayout(snapshot.house.capacity);
      pruneLeases();
      const seat = layout.seats.find(candidate => candidate.id === body.seatId);
      if (!seat) throw new HouseError("INVALID_INPUT", "Choose a seat in this room.");
      if (lease.seatId === seat.id && lease.x === seat.x && lease.z === seat.z && lease.heading === seat.heading) return { ok: true };
      if ([...leases.values()].some(other => other.id !== lease.id && other.houseId === lease.houseId && other.zoneId === lease.zoneId && other.seatId === seat.id && (other.socketId || other.expiresAt > Date.now()))) throw new HouseError("SEAT_TAKEN", "That seat is occupied.");
      if (Math.hypot(lease.x - seat.x, lease.z - seat.z) > 1.5) throw new HouseError("TOO_FAR", "Walk closer to this seat.");
      if (lease.seatId && lease.seatId !== seat.id) revokeActivity(lease, "seat_lost");
      release(lease); lease.seatGeneration = ++nextSeatGeneration; lease.seatId = seat.id; lease.x = seat.x; lease.z = seat.z; lease.heading = seat.heading; lease.animation = "sit"; queueRefresh(); log(context.id, "seat.claim", "ok"); return { ok: true };
    });
    handle("house.stand", body => {
      const lease = controller(context, body.generation);
      if (lease.seatId) {
        // Production reads only authorized geometry, so a due game write cannot
        // prevent physical escape. Compatibility adapters may supply a snapshot.
        const fallback = store.seatLayout ? undefined : authorised(context);
        const layout = store.seatLayout ? store.seatLayout(context.id, context.zoneId) : fallback!.room ? bedroomLayout(fallback!.room.placements) : createLayout(fallback!.house.capacity);
        const seat = layout.seats.find(candidate => candidate.id === lease.seatId);
        // Physical movement and transient consent clear even if SQLite housekeeping fails.
        release(lease); revokeActivity(lease, "seat_lost"); const anchor = seat?.target ?? layout.spawn;
        lease.x = anchor.x; lease.z = anchor.z; lease.lastMoveElapsedAt = elapsedNow();
      }
      queueRefresh(); log(context.id, "seat.stand", "ok"); return { ok: true };
    });
    handle("house.command", body => {
      const lease = controller(context, body.generation);
      if (body.zoneId !== context.zoneId || lease.zoneId !== body.zoneId) throw new HouseError("STALE_ZONE", "This draft belongs to a different room.");
      const command = inputObject(body.command) as unknown as HouseCommand;
      validateCommandZone(command, context.zoneId);
      const receipt = execute(context, context.id, command); queueRefresh(); log(context.id, command.type, "accepted", { ...receiptMetadata(command, receipt), transport: "socket" }); return receipt;
    });
    handle("house.puzzle.intent", body => {
      const fields = ["generation", "zoneId", "serverEpoch", "accessGeneration", "intentSequence", "requestId", "roundId", "mode"];
      if (Object.keys(body).length !== fields.length || fields.some(key => !Object.hasOwn(body, key)) ||
          typeof body.requestId !== "string" || body.requestId.length !== 36 || !uuid.test(body.requestId) || typeof body.roundId !== "string" || body.roundId.length !== 36 || !uuid.test(body.roundId) ||
          !Number.isSafeInteger(body.generation) || (body.generation as number) < 0 ||
          !Number.isSafeInteger(body.intentSequence) || (body.intentSequence as number) < 0 || !["join", "leave"].includes(body.mode as string) ||
          !Number.isSafeInteger(body.accessGeneration) || (body.accessGeneration as number) < 0 || typeof body.serverEpoch !== "string" || body.serverEpoch.length !== 36 || !uuid.test(body.serverEpoch)) throw new HouseError("INVALID_INPUT", "Use a complete picture participation intent.");
      const lease = controller(context, body.generation);
      if (body.zoneId !== "lounge" || context.zoneId !== "lounge" || lease.zoneId !== "lounge") throw new HouseError("STALE_ZONE", "Return to the lounge picture table.");
      if (body.serverEpoch !== serverEpoch || body.accessGeneration !== context.accessGeneration) throw new HouseError("STALE_GENERATION", "Control changed. Choose Join again explicitly.");
      const identity = { requestId: body.requestId, intentSequence: body.intentSequence };
      const hash = createHash("sha256").update(JSON.stringify(fields.map(key => body[key]))).digest("hex");
      if (context.puzzleIntent && (body.intentSequence as number) < context.puzzleIntent.sequence) return { ok: false, ...identity, code: "STALE_INTENT", message: "A newer participation choice already replaced this one." };
      if (context.puzzleIntent && body.intentSequence === context.puzzleIntent.sequence) return hash === context.puzzleIntent.hash ? context.puzzleIntent.outcome : { ok: false, ...identity, code: "INTENT_ID_REUSED", message: "Use a new intent sequence for a new choice." };
      let outcome: Record<string, unknown>;
      try {
        const durable = authorised(context), control = puzzleControl(context, durable), round = durable.puzzle?.current;
        if (!round) throw new HouseError("PUZZLE_UNAVAILABLE", "Start a picture before joining.");
        if (round.id !== body.roundId) throw new HouseError("PUZZLE_STALE_ROUND", "The picture changed. Review the current table.");
        if (body.mode === "leave") {
          const rosterRevision = puzzlePresence.leave(durable.house.id, round.id, context.id);
          outcome = { ok: true, ...identity, mode: "leave", roundId: round.id, participationId: null, rosterRevision };
        } else {
          if (!activitySeat(lease, durable)) throw new HouseError("ACTIVITY_SEAT_REQUIRED", "Sit at the activity table before choosing Join.");
          if (round.completed) throw new HouseError("PUZZLE_COMPLETE", "This picture is complete. A new picture needs a deliberate Start.");
          if (control.memberIds.includes(context.id)) throw new HouseError("ALREADY_JOINED", "You already joined this picture.");
          if (durable.game?.current?.players.includes(context.id)) throw new HouseError("ACTIVITY_ACTIVE", "Leave Four-in-a-row before joining the picture table.");
          if (control.memberIds.length >= 6) throw new HouseError("SPACE_FULL", "The picture table has six active participants.");
          const participant = puzzlePresence.join(durable.house.id, round.id, { actorId: context.id, socketId: socket.id, generation: lease.generation, accessGeneration: context.accessGeneration });
          outcome = { ok: true, ...identity, mode: "join", roundId: round.id, participationId: participant.participationId, rosterRevision: puzzlePresence.current(durable.house.id, round.id).revision };
        }
      } catch (error) {
        // Domain denials consume this deliberate intent; storage faults remain retryable.
        if (!(error instanceof HouseError) || !["PUZZLE_UNAVAILABLE", "PUZZLE_STALE_ROUND", "PUZZLE_COMPLETE", "ALREADY_JOINED", "ACTIVITY_ACTIVE", "SPACE_FULL", "ACTIVITY_SEAT_REQUIRED"].includes(error.code)) throw error;
        outcome = { ...failure(error), ...identity };
      }
      context.puzzleIntent = { sequence: body.intentSequence as number, hash, outcome };
      queueRefresh(); return outcome;
    });
  });
  function validateCommandZone(command: HouseCommand, zoneId: string) {
    if (typeof command.type !== "string" || !command.payload || typeof command.payload !== "object" || Array.isArray(command.payload)) throw new HouseError("INVALID_INPUT", "A valid command payload is required.");
    if((command.type.startsWith("game.") || command.type.startsWith("puzzle.")) && zoneId!=="lounge") throw new HouseError("STALE_ZONE","Return to the lounge table.");
    if (command.type === "chat.send" && command.payload.zoneId !== zoneId) throw new HouseError("STALE_ZONE", "Send this message only in its original room.");
    if ((["room.configure", "room.placements", "room.starter", "room.light"].includes(command.type)) && command.payload.roomId !== zoneId) throw new HouseError("STALE_ZONE", "This room edit belongs to a different room.");
  }
  const timer = setInterval(tick, 100); timer.unref();
  return {
    io,
    refresh: queueRefresh,
    revokeIdentity(id: string) {
      puzzlePresence.clearActor(id);
      const lease = leases.get(id);
      if(lease?.socketId && lease.zoneId==="lounge") {
        revokeActivity(lease!, "disconnect");
      }
      if (lease) release(lease); leases.delete(id);
      for (const context of contexts.values()) if (context.id === id) disconnect(context, "IDENTITY_REVOKED");
      queueRefresh();
    },
    executeHttp(id: string, rawCommand: unknown, generation?: number, zoneId?: string, controllerToken?: string): HouseReceipt {
      const command = inputObject(rawCommand) as unknown as HouseCommand;
      if (command.type !== "house.create" && command.type !== "house.join" && !(command.type === "profile.set" && !store.me(id).home)) {
        const lease = leases.get(id), context = lease?.socketId ? contexts.get(lease.socketId) : undefined;
        if (!context) throw new HouseError("NOT_CONTROLLER", "Enter the house in a controlling tab first.");
        controller(context, generation);
        if (controllerToken !== lease!.token) throw new HouseError("NOT_CONTROLLER", "This request does not hold the current tab control token.");
        if (zoneId !== context.zoneId) throw new HouseError("STALE_ZONE", "This draft belongs to a different room.");
        validateCommandZone(command, context.zoneId);
      }
      const activeLease=leases.get(id), activeContext=activeLease?.socketId ? contexts.get(activeLease.socketId) : undefined;
      const receipt = execute(activeContext, id, command); queueRefresh(); log(id, command.type, "accepted", { ...receiptMetadata(command, receipt), transport: "http" }); return receipt;
    },
    currentLoungeSeat,
    loungeHttpControl(id: string, generation: unknown, controllerToken: unknown): LoungeControl {
      const lease = leases.get(id), context = lease?.socketId ? contexts.get(lease.socketId) : undefined;
      if (!context) throw new HouseError("NOT_CONTROLLER", "Enter the house in a controlling tab first.");
      controller(context, generation);
      if (controllerToken !== lease!.token) throw new HouseError("NOT_CONTROLLER", "This request does not hold current tab control.");
      if (context.zoneId !== "lounge" || lease!.zoneId !== "lounge") throw new HouseError("STALE_ZONE", "Return to the lounge before joining a shared view.");
      const projection = currentLoungeSeat(id);
      if (!projection) throw new HouseError("NOT_CONTROLLER", "Use a connected controlling tab.");
      return projection;
    },
    authorizeRoomHttp(id: string, roomId: string, generation: unknown, controllerToken: unknown, expectedAccessGeneration?: unknown): void {
      const lease = leases.get(id), context = lease?.socketId ? contexts.get(lease.socketId) : undefined;
      if (!context) throw new HouseError("NOT_CONTROLLER", "Enter the house in a controlling tab first.");
      controller(context, generation);
      if (controllerToken !== lease!.token) throw new HouseError("NOT_CONTROLLER", "This request does not hold current tab control.");
      if (expectedAccessGeneration !== undefined && expectedAccessGeneration !== context.accessGeneration) throw new HouseError("STALE_GENERATION", "Room admission changed. Review the current room before saving.");
      if (roomId === "lounge" || context.zoneId !== roomId || lease!.zoneId !== roomId) throw new HouseError("STALE_ZONE", "Enter this bedroom before changing its selected reference.");
      preflightZone(context, roomId);
    },
    async close(): Promise<void> {
      if (closed) return; closed = true; clearInterval(timer);
      for (const context of contexts.values()) context.socket.conn.close(true);
      contexts.clear(); leases.clear(); puzzlePresence.clear();
      await new Promise<void>(resolve => io.close(() => resolve()));
    },
  };
}
