import { createHash, randomUUID } from "node:crypto";
import type { Server as HttpServer, IncomingMessage } from "node:http";
import { Server, type Socket } from "socket.io";
import { HouseError } from "./house-contract.ts";
import type { HouseCommand, HouseReceipt, HouseSnapshot, LiveSnapshot, Me, Player } from "./house-contract.ts";
import { createLayout, bedroomLayout, validPosition, slide } from "../public/house-geometry.js";

export interface HouseAuthority {
  session(digest: string): { id: string } | undefined;
  me(id: string): Me;
  snapshot(id: string, zoneId?: string): HouseSnapshot;
  execute(id: string, command: HouseCommand): HouseReceipt;
}
interface Options { origin?: string; secureCookies?: boolean; log?: (record: Record<string, unknown>) => void }
interface Context { socket: Socket; id: string; digest: string; zoneId: string; accessGeneration: number; subscribed: boolean; pendingSnapshot: boolean; revoked: Record<string, unknown> | null; blockedAt: number; budgetAt: number; events: number }
interface Lease { id: string; digest: string; houseId: string; token: string; socketId: string | null; generation: number; expiresAt: number; zoneId: string; x: number; z: number; heading: number; animation: "idle" | "walk" | "sit"; seatId: string | null; availability: "quiet" | "chat"; availabilitySetAt: number; sequence: number; lastMoveAt: number; motionCredit: number }
const LEASE_MS = 30_000, MAX_BYTES = 512 * 1024, MAX_CONNECTIONS = 12;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const inputObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HouseError("INVALID_INPUT", "An action object is required.");
  return value as Record<string, unknown>;
};
const failure = (error: unknown) => error instanceof HouseError ? { ok: false, code: error.code, message: error.message } : { ok: false, code: "STORAGE_UNAVAILABLE", message: "The house is temporarily unavailable. Please retry." };

function allowedOrigin(request: IncomingMessage, options: Options): boolean {
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
  const runtime = connection as unknown as { writeBuffer?: { data?: unknown }[] };
  const websocket = transport as unknown as { socket?: { bufferedAmount?: number } };
  if (transport.name !== "websocket" || !Array.isArray(runtime.writeBuffer) || typeof websocket.socket?.bufferedAmount !== "number") return "overflow";
  let queued = 0;
  for (const packet of runtime.writeBuffer) {
    if (typeof packet.data !== "string" && !Buffer.isBuffer(packet.data)) return "overflow";
    queued += Buffer.byteLength(packet.data) + 32;
  }
  if (runtime.writeBuffer.length >= 4 || websocket.socket.bufferedAmount + queued + bytes + 32 > MAX_BYTES) return "overflow";
  return transport.writable ? "ready" : "wait";
}

/** SQLite owns durable intent; bounded process memory owns live pose and leases. */
export function attachHouseRealtime(server: HttpServer, store: HouseAuthority, options: Options = {}) {
  const io = new Server(server, { transports: ["websocket"], maxHttpBufferSize: 16 * 1024, perMessageDeflate: false, allowRequest: (request, done) => done(null, allowedOrigin(request, options)), serveClient: true, pingInterval: 10_000, pingTimeout: 10_000 });
  const serverEpoch = randomUUID();
  const contexts = new Map<string, Context>();
  const leases = new Map<string, Lease>();
  let nextGeneration = 0, nextAccessGeneration = 0;
  let closed = false, motionDirty = false, sessionSweepAt = 0;
  const log = (id: string, action: string, outcome: string) => { try { options.log?.({ at: Date.now(), actor: id, action, outcome }); } catch { /* Instruments must not change command success. */ } };
  function release(lease: Lease) { lease.seatId = null; lease.animation = "idle"; }
  function disconnect(context: Context, code: string) { log(context.id, "connection.close", code); context.socket.conn.close(true); }
  function requireSession(context: Context) {
    if (closed || store.session(context.digest)?.id !== context.id) throw new HouseError("UNAUTHENTICATED", "Your session changed. Reload to continue.");
  }
  function authorised(context: Context) { requireSession(context); return store.snapshot(context.id, context.zoneId); }
  function resetZone(lease: Lease, snapshot: HouseSnapshot) {
    release(lease); lease.zoneId = snapshot.zoneId;
    const layout = snapshot.room ? bedroomLayout(snapshot.room.placements) : createLayout(snapshot.house.capacity);
    const resident = snapshot.residents.find(member => member.id === lease.id);
    if (!resident) throw new HouseError("FORBIDDEN", "Your permanent bedroom is unavailable.");
    const arrival = { x: .65 * (resident.slot - (snapshot.house.capacity - 1) / 2), z: 3.3 };
    const spawn = validPosition(layout, arrival) ? arrival : layout.spawn;
    lease.x = spawn.x; lease.z = spawn.z; lease.heading = 0; lease.sequence = 0; lease.lastMoveAt = Date.now(); lease.motionCredit = 0;
  }
  function controller(context: Context, generation: unknown): Lease {
    authorised(context);
    const lease = leases.get(context.id);
    if (!lease || lease.socketId !== context.socket.id) throw new HouseError("NOT_CONTROLLER", "This tab is observing. Take control to act.");
    if (generation !== lease.generation) throw new HouseError("STALE_GENERATION", "Control changed. Use the latest house state.");
    if (lease.zoneId !== context.zoneId) throw new HouseError("STALE_ZONE", "Return to the current controlled room.");
    return lease;
  }
  function switchToLounge(context: Context, code: string) {
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
      const value: Player = { id: resident.id, name: resident.name, colour: resident.colour, connected, zoneId: lease?.houseId === durable.house.id ? lease.zoneId : "lounge", availability: lease?.houseId === durable.house.id ? lease.availability : "quiet", availabilitySetAt: lease?.houseId === durable.house.id ? lease.availabilitySetAt : 0, generation: lease?.generation ?? 0 };
      if (connected && lease && lease.zoneId === durable.zoneId) Object.assign(value, { x: lease.x, z: lease.z, heading: lease.heading, animation: lease.animation, seatId: lease.seatId });
      return value;
    });
    const lease = leases.get(context.id);
    return { serverEpoch, accessGeneration: context.accessGeneration, controller: lease?.socketId === context.socket.id, generation: lease?.generation ?? 0, durable, players };
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
    const now = Date.now();
    if (now - sessionSweepAt >= 1000) {
      sessionSweepAt = now;
      try {
        pruneLeases();
        for (const context of contexts.values()) if (store.session(context.digest)?.id !== context.id) disconnect(context, "UNAUTHENTICATED");
      } catch { /* An action/projection reports storage failure; sweeps never write durable state. */ }
    }
    for (const [id, lease] of leases) {
      if (!lease.socketId && lease.expiresAt <= now) { release(lease); leases.delete(id); queueRefresh(); }
      if (lease.animation === "walk" && now - lease.lastMoveAt > 250) { log(lease.id, "motion.stop", "idle"); lease.animation = "idle"; motionDirty = true; }
    }
    const dirty = motionDirty; motionDirty = false;
    for (const context of contexts.values()) {
      if (!context.subscribed || (!context.pendingSnapshot && !context.revoked && !dirty)) continue;
      try {
        const snapshot = project(context); // Recheck membership/access before each delivery.
        if (context.revoked) { if (send(context, "house.revoked", context.revoked)) context.revoked = null; continue; }
        if (context.pendingSnapshot) { if (send(context, "house.snapshot", snapshot)) context.pendingSnapshot = false; }
        else if (dirty) send(context, "house.motion", { serverEpoch, accessGeneration: snapshot.accessGeneration, generation: snapshot.generation, zoneId: snapshot.durable.zoneId, players: snapshot.players }, true);
      } catch (error) {
        context.subscribed = false;
        try { send(context, "house.revoked", { serverEpoch, accessGeneration: (context.accessGeneration = ++nextAccessGeneration), zoneId: "lounge", code: failure(error).code }); } catch { /* No authorised delivery after identity revocation. */ }
        disconnect(context, failure(error).code);
      }
    }
  }
  function cleanup(context: Context) {
    if (!contexts.delete(context.socket.id)) return;
    if (!closed) log(context.id, "connection.disconnect", "offline");
    const lease = leases.get(context.id);
    if (lease?.socketId === context.socket.id) { lease.socketId = null; lease.expiresAt = Date.now() + LEASE_MS; lease.animation = lease.seatId ? "sit" : "idle"; }
    queueRefresh();
  }
  io.use((socket, next) => {
    try {
      const digest = digestCookie(socket.request.headers.cookie);
      const identity = digest ? store.session(digest) : undefined;
      if (!digest || !identity) throw new HouseError("UNAUTHENTICATED", "Open the house page to establish your identity.");
      if (contexts.size >= MAX_CONNECTIONS) throw new HouseError("LOAD_LIMIT", "This server has twelve connections. Close an unused tab and retry.");
      if ([...contexts.values()].filter(context => context.id === identity.id).length >= 2) throw new HouseError("TAB_LIMIT", "Use one controlling tab and one observer.");
      const context: Context = { socket, id: identity.id, digest, zoneId: "lounge", accessGeneration: 0, subscribed: false, pendingSnapshot: false, revoked: null, blockedAt: 0, budgetAt: Date.now(), events: 0 };
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
          if (Date.now() - context.budgetAt >= 1000) { context.events = 0; context.budgetAt = Date.now(); }
          if (++context.events > 30) throw new HouseError("RATE_LIMITED", "Please slow down your house actions.");
          const body = inputObject(raw); result = action(body);
        } catch (error) { result = failure(error); if (event !== "house.move") log(context.id, event, failure(error).code); }
        if (typeof acknowledge === "function") {
          const status = outbound(socket, Buffer.byteLength(JSON.stringify(result)) + 32);
          if (status === "overflow") disconnect(context, "SLOW_READER"); else acknowledge(result);
        }
      });
    }
    function acquire(token: string, snapshot: HouseSnapshot, force = false): Lease {
      let lease = leases.get(context.id);
      if (!force && lease?.socketId && lease.socketId !== socket.id) return lease;
      if (!force && lease && !lease.socketId && lease.expiresAt > Date.now() && lease.token === token && lease.houseId === snapshot.house.id) {
        lease.socketId = socket.id; lease.expiresAt = Infinity;
        if (lease.zoneId !== snapshot.zoneId) resetZone(lease, snapshot);
        return lease;
      }
      if (!force && lease?.socketId === socket.id) return lease;
      if (lease) release(lease);
      const generation = ++nextGeneration;
      lease = { id: context.id, digest: context.digest, houseId: snapshot.house.id, token, socketId: socket.id, generation, expiresAt: Infinity, zoneId: snapshot.zoneId, x: 0, z: 0, heading: 0, animation: "idle", seatId: null, availability: "quiet", availabilitySetAt: Date.now(), sequence: 0, lastMoveAt: Date.now(), motionCredit: 0 };
      resetZone(lease, snapshot); leases.set(context.id, lease); return lease;
    }
    handle("house.subscribe", body => {
      if (typeof body.zoneId !== "string" || (body.zoneId !== "lounge" && !uuid.test(body.zoneId)) || typeof body.controllerToken !== "string" || !uuid.test(body.controllerToken)) throw new HouseError("INVALID_INPUT", "Choose an available room and a current tab token.");
      const snapshot = store.snapshot(context.id, body.zoneId);
      const alreadySubscribed = context.subscribed;
      context.accessGeneration = ++nextAccessGeneration;
      context.zoneId = body.zoneId; context.subscribed = true; context.revoked = null;
      const lease = acquire(body.controllerToken, snapshot);
      if (lease.socketId === socket.id) {
        if (alreadySubscribed) lease.generation = ++nextGeneration;
        if (lease.zoneId !== body.zoneId) resetZone(lease, snapshot);
        lease.sequence = 0; lease.lastMoveAt = Date.now(); lease.motionCredit = 0;
      }
      queueRefresh(); log(context.id, "zone.subscribe", "ok");
      return { ok: true, snapshot: project(context) };
    });
    handle("house.takeover", body => {
      const snapshot = authorised(context);
      if (!context.subscribed) throw new HouseError("NOT_SUBSCRIBED", "Enter the house first.");
      const token = typeof body.controllerToken === "string" && uuid.test(body.controllerToken) ? body.controllerToken : randomUUID();
      acquire(token, snapshot, true); queueRefresh(); log(context.id, "control.takeover", "ok");
      return { ok: true, snapshot: project(context) };
    });
    handle("house.move", body => {
      const lease = controller(context, body.generation);
      if (!Number.isSafeInteger(body.sequence) || (body.sequence as number) <= lease.sequence) throw new HouseError("STALE_INPUT", "Use a newer motion sequence.");
      if (![body.x, body.z, body.heading].every(value => typeof value === "number" && Number.isFinite(value)) || Math.abs(body.heading as number) > 1e6) throw new HouseError("INVALID_MOVE", "Use a finite house position.");
      const now = Date.now(), dx = (body.x as number) - lease.x, dz = (body.z as number) - lease.z;
      const credit = Math.min(.64, lease.motionCredit + 3.2 * Math.max(0, now - lease.lastMoveAt) / 1000);
      if (Math.hypot(dx, dz) > credit + .06 || lease.seatId) throw new HouseError("INVALID_MOVE", "Walk within the room at the allowed speed.");
      if (now - lease.lastMoveAt < 80 && Math.hypot(dx, dz) > .001) throw new HouseError("RATE_LIMITED", "Movement updates are limited to ten per second.");
      const snapshot = authorised(context), layout = snapshot.room ? bedroomLayout(snapshot.room.placements) : createLayout(snapshot.house.capacity);
      const candidate = { x: body.x as number, z: body.z as number };
      const swept = slide(layout, { x: lease.x, z: lease.z }, dx, dz);
      if (!validPosition(layout, candidate) || Math.hypot(swept.x - candidate.x, swept.z - candidate.z) > .01) throw new HouseError("INVALID_MOVE", "Furniture or a wall blocks that path.");
      if (lease.animation !== "walk" && Math.hypot(dx, dz) > .001) log(context.id, "motion.start", "walking");
      lease.motionCredit = credit - Math.hypot(dx, dz);
      lease.x = candidate.x; lease.z = candidate.z; lease.heading = (body.heading as number) % (Math.PI * 2); lease.sequence = body.sequence as number; lease.lastMoveAt = now; lease.animation = Math.hypot(dx, dz) > .001 ? "walk" : "idle"; motionDirty = true;
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
      if ([...leases.values()].some(other => other.id !== lease.id && other.houseId === lease.houseId && other.zoneId === lease.zoneId && other.seatId === seat.id && (other.socketId || other.expiresAt > Date.now()))) throw new HouseError("SEAT_TAKEN", "That seat is occupied.");
      if (Math.hypot(lease.x - seat.x, lease.z - seat.z) > 1.5) throw new HouseError("TOO_FAR", "Walk closer to this seat.");
      release(lease); lease.seatId = seat.id; lease.x = seat.x; lease.z = seat.z; lease.heading = seat.heading; lease.animation = "sit"; queueRefresh(); log(context.id, "seat.claim", "ok"); return { ok: true };
    });
    handle("house.stand", body => {
      const lease = controller(context, body.generation), snapshot = authorised(context);
      if (lease.seatId) {
        const layout = snapshot.room ? bedroomLayout(snapshot.room.placements) : createLayout(snapshot.house.capacity);
        const seat = layout.seats.find(candidate => candidate.id === lease.seatId);
        release(lease); const anchor = seat?.target ?? layout.spawn;
        lease.x = anchor.x; lease.z = anchor.z; lease.lastMoveAt = Date.now();
      }
      queueRefresh(); log(context.id, "seat.stand", "ok"); return { ok: true };
    });
    handle("house.command", body => {
      const lease = controller(context, body.generation);
      if (body.zoneId !== context.zoneId || lease.zoneId !== body.zoneId) throw new HouseError("STALE_ZONE", "This draft belongs to a different room.");
      const command = inputObject(body.command) as unknown as HouseCommand;
      validateCommandZone(command, context.zoneId);
      const receipt = store.execute(context.id, command); queueRefresh(); log(context.id, command.type, "saved"); return receipt;
    });
  });
  function validateCommandZone(command: HouseCommand, zoneId: string) {
    if (typeof command.type !== "string" || !command.payload || typeof command.payload !== "object" || Array.isArray(command.payload)) throw new HouseError("INVALID_INPUT", "A valid command payload is required.");
    if (command.type === "chat.send" && command.payload.zoneId !== zoneId) throw new HouseError("STALE_ZONE", "Send this message only in its original room.");
    if ((command.type === "room.configure" || command.type === "room.placements") && command.payload.roomId !== zoneId) throw new HouseError("STALE_ZONE", "This room edit belongs to a different room.");
  }
  const timer = setInterval(tick, 100); timer.unref();
  return {
    refresh: queueRefresh,
    revokeIdentity(id: string) {
      const lease = leases.get(id); if (lease) release(lease); leases.delete(id);
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
      const receipt = store.execute(id, command); queueRefresh(); log(id, command.type, "saved"); return receipt;
    },
    async close(): Promise<void> {
      if (closed) return; closed = true; clearInterval(timer);
      for (const context of contexts.values()) context.socket.conn.close(true);
      contexts.clear(); leases.clear();
      await new Promise<void>(resolve => io.close(() => resolve()));
    },
  };
}
