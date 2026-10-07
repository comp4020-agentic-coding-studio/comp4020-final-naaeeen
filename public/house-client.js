const OUTBOX_KEY = 'house.commandOutbox.v2';
const TAB_KEY = 'house.controllerToken.v2';
const DAY = 24 * 60 * 60 * 1000;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;
const clone = value => JSON.parse(JSON.stringify(value));
const lobbyTypes = new Set(['house.create', 'house.join', 'profile.set']);
const flightsByStorage = new WeakMap();
const boundedId = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const domainProblem = Symbol('house problem');
const problem = (code, message) => Object.assign(new Error(message), { code, [domainProblem]: true });
const safeStorage = () => { try { return globalThis.sessionStorage; } catch { return undefined; } };

/** @param {(snapshot:any|null)=>void} [onSnapshot] */
export function createSnapshotReducer(onSnapshot = () => {}) {
  let current = null, epoch = null, accessGeneration = -1, desiredZone = 'lounge';
  const retired = new Set();
  return {
    selectZone(zoneId) { desiredZone = zoneId; current = null; onSnapshot(null); },
    clear() { current = null; onSnapshot(null); },
    revoke(message) {
      if (!message || typeof message.serverEpoch !== 'string' || !Number.isSafeInteger(message.accessGeneration)) return false;
      if (retired.has(message.serverEpoch) || (epoch === message.serverEpoch && message.accessGeneration < accessGeneration)) return false;
      if (epoch && epoch !== message.serverEpoch) retired.add(epoch);
      epoch = message.serverEpoch; accessGeneration = message.accessGeneration;
      desiredZone = 'lounge'; current = null; onSnapshot(null); return true;
    },
    motion(incoming) {
      if (!current || !incoming || incoming.serverEpoch !== epoch || incoming.accessGeneration !== accessGeneration || incoming.generation !== current.generation || incoming.zoneId !== desiredZone || !Array.isArray(incoming.players) || incoming.players.length > 6) return false;
      current = { ...current, players: incoming.players }; onSnapshot(current); return true;
    },
    accept(incoming) {
      if (!incoming || typeof incoming.serverEpoch !== 'string' || !Number.isSafeInteger(incoming.accessGeneration) || !Number.isSafeInteger(incoming.generation) || !incoming.durable || !Number.isSafeInteger(incoming.durable.sequence) || incoming.durable.zoneId !== desiredZone || !Array.isArray(incoming.players) || incoming.players.length > 6 || retired.has(incoming.serverEpoch)) return false;
      if (epoch === incoming.serverEpoch) {
        if (incoming.accessGeneration < accessGeneration) return false;
        if (current && incoming.accessGeneration === accessGeneration && (incoming.generation < current.generation || (incoming.durable.streamId === current.durable.streamId && incoming.durable.sequence < current.durable.sequence))) return false;
      } else { if (epoch) retired.add(epoch); accessGeneration = -1; }
      epoch = incoming.serverEpoch; accessGeneration = incoming.accessGeneration; current = incoming; onSnapshot(incoming); return true;
    },
  };
}

/** @typedef {{commandId:string,type:string,houseId?:string,expectedRevision?:number,payload:Record<string,any>}} PendingCommand */
/** @typedef {{command:PendingCommand,identityId:string,zoneId:string,houseId?:string,createdAt:number}} OutboxEntry */
/** @typedef {{commandId:string,type:string,createdAt:number,houseId:string|null,zoneId:string,state:'pending'|'expired',command:PendingCommand,canRetry:boolean}} PendingRow */
/** @typedef {{getItem:(key:string)=>string|null,setItem:(key:string,value:string)=>void}} OutboxStorage */
/** A sessionStorage outbox is a bounded pending draft, never a saved acknowledgement.
 * Corrupt storage is retained and reported, rather than replaced with a fresh queue.
 * @param {OutboxStorage|undefined} storage
 */
export function createCommandOutbox(storage) {
  /** @type {OutboxEntry[]} */
  let entries = [];
  function validCommand(command) {
    return plainObject(command) && typeof command.commandId === 'string' && uuid.test(command.commandId)
      && typeof command.type === 'string' && command.type.length > 0 && command.type.length <= 64
      && plainObject(command.payload) && (command.houseId === undefined || boundedId(command.houseId))
      && bytes(command) <= 12 * 1024;
  }
  function read() {
    if (!storage) throw problem('STORAGE_UNAVAILABLE', 'This tab cannot preserve pending drafts. Enable session storage before saving.');
    let raw;
    try { raw = storage.getItem(OUTBOX_KEY); }
    catch { throw problem('STORAGE_UNAVAILABLE', 'Pending drafts cannot be read from this tab.'); }
    if (raw === null) { entries = []; return; }
    try {
      if (new TextEncoder().encode(raw).length > 32 * 1024) throw new Error('oversized');
      const parsed = JSON.parse(raw);
      const seen = new Set();
      if (!Array.isArray(parsed) || parsed.length > 16 || parsed.some(entry => {
        if (!plainObject(entry) || !validCommand(entry.command) || !boundedId(entry.identityId) || !boundedId(entry.zoneId)
          || entry.houseId !== entry.command.houseId || (entry.command.type === 'chat.send' && entry.command.payload.zoneId !== entry.zoneId) || !Number.isSafeInteger(entry.createdAt) || entry.createdAt < 0
          || seen.has(entry.command.commandId)) return true;
        seen.add(entry.command.commandId); return false;
      })) throw new Error('invalid');
      entries = parsed;
    } catch { throw problem('OUTBOX_CORRUPT', 'Stored pending drafts are invalid or exceed this tab’s limits. They were kept unchanged.'); }
  }
  function write(next) {
    try { storage?.setItem(OUTBOX_KEY, JSON.stringify(next)); }
    catch { throw problem('STORAGE_UNAVAILABLE', 'Pending drafts could not be updated in this tab. Existing local drafts were kept.'); }
    entries = next;
  }
  return {
    add(command, identityId, zoneId, createdAt = Date.now()) {
      read();
      let copy;
      try { copy = clone(command); }
      catch { throw problem('INVALID_INPUT', 'This command needs a valid UUID and bounded payload.'); }
      if (!validCommand(copy) || !boundedId(identityId) || !boundedId(zoneId) || !Number.isSafeInteger(createdAt) || createdAt < 0) throw problem('INVALID_INPUT', 'This command needs a valid UUID and bounded payload.');
      const existing = entries.find(entry => entry.command.commandId === copy.commandId);
      if (existing) {
        if (existing.identityId !== identityId || existing.zoneId !== zoneId || JSON.stringify(existing.command) !== JSON.stringify(copy)) throw problem('COMMAND_ID_REUSED', 'This UUID already belongs to another draft.');
        return clone(existing);
      }
      const entry = { command: copy, identityId, zoneId, houseId: copy.houseId, createdAt };
      if (entries.length >= 16 || bytes([...entries, entry]) > 32 * 1024) throw problem('OUTBOX_FULL', 'Inspect and resolve a pending draft before adding another.');
      write([...entries, entry]); return clone(entry);
    },
    all() { read(); return clone(entries); },
    eligible(identityId, zoneId, now = Date.now(), houseId = '') {
      read();
      return clone(entries.filter(entry => entry.identityId === identityId && entry.zoneId === zoneId && (!entry.houseId || entry.houseId === houseId) && now >= entry.createdAt && now - entry.createdAt <= DAY));
    },
    remove(commandId) { read(); write(entries.filter(entry => entry.command.commandId !== commandId)); },
    removeOtherIdentities(identityId) { read(); write(entries.filter(entry => entry.identityId === identityId)); },
  };
}

async function fetchHouseIdentity() {
  const response = await fetch('/api/house/me', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(5000) });
  const me = await response.json();
  if (!response.ok) throw problem(me.code ?? 'UNAUTHENTICATED', me.message ?? 'Establish your house identity before inspecting drafts.');
  return me;
}

/** @param {{onSnapshot?:(snapshot:any|null)=>void,onDisconnect?:(reason:string)=>void,onError?:(error:any)=>void,storage?:OutboxStorage,fetchMe?:()=>Promise<any>,expectedIdentityId?:string}} [callbacks] */
export function createHouseClient({ onSnapshot = () => {}, onDisconnect = () => {}, onError = () => {}, storage = safeStorage(), fetchMe = fetchHouseIdentity, expectedIdentityId } = {}) {
  const outbox = createCommandOutbox(storage);
  // Rotate on construction/full reload. Reconnects reuse only this in-memory token.
  const controllerToken = globalThis.crypto.randomUUID();
  try { storage?.setItem(TAB_KEY, controllerToken); } catch { /* In-memory reconnect remains possible. */ }
  let latestLive = null, selectedZone = 'lounge', socket = null, closed = false, sequence = 0, flushing = false, connectWait = null, requestGeneration = 0;
  // One storage can have a lobby inspector and a live client. Their sends share a guard.
  if (storage && !flightsByStorage.has(storage)) flightsByStorage.set(storage, new Map());
  const inFlight = storage ? flightsByStorage.get(storage) : new Map();
  const inspected = new Set();
  let motionFlight = null, motionGeneration = 0, motionAuthority = null;
  const motionScope = snapshot => snapshot ? JSON.stringify([snapshot.serverEpoch, snapshot.accessGeneration, snapshot.generation, snapshot.controller,
    snapshot.durable.house.id, snapshot.durable.selfId, snapshot.durable.streamId, snapshot.durable.zoneId,
    snapshot.players.find(player => player.id === snapshot.durable.selfId)?.seatId ?? null]) : null;
  const reducer = createSnapshotReducer(snapshot => {
    if (motionScope(snapshot) !== motionScope(latestLive)) { motionGeneration++; motionFlight = null; motionAuthority = null; }
    latestLive = snapshot;
    const player = snapshot?.players.find(player => player.id === snapshot.durable.selfId);
    if (Number.isFinite(player?.x) && Number.isFinite(player?.z)) motionAuthority = { x: player.x, z: player.z };
    onSnapshot(snapshot);
  });
  const report = error => { onError(error); return error; };
  function settle(reply) {
    if (!reply || reply.ok !== true) throw problem(reply?.code ?? 'UNAVAILABLE', reply?.message ?? 'The house did not acknowledge this action.');
    return reply;
  }
  async function ask(event, body) {
    if (!socket?.connected) throw problem('PENDING', 'Connection unavailable. This action is not saved.');
    try { return settle(await socket.timeout(5000).emitWithAck(event, body)); }
    catch (error) { if (error?.[domainProblem]) throw error; throw problem('PENDING', 'Acknowledgement timed out. This action is pending.'); }
  }
  async function subscribe(zoneId = selectedZone) {
    if (closed) throw problem('CLOSED', 'This house connection is closed.');
    const request = ++requestGeneration;
    selectedZone = zoneId; sequence = 0; reducer.selectZone(zoneId);
    try {
      const reply = await ask('house.subscribe', { zoneId, controllerToken });
      if (request !== requestGeneration || closed) throw problem('STALE_ZONE', 'A newer room request replaced this one.');
      reducer.accept(reply.snapshot); void flush(); return reply;
    } catch (error) {
      if (!closed && request === requestGeneration) {
        const fallbackRequest = ++requestGeneration;
        selectedZone = 'lounge'; sequence = 0; reducer.selectZone('lounge');
        if (zoneId !== 'lounge' && socket?.connected && ['FORBIDDEN', 'INVALID_INPUT'].includes(error.code)) {
          try {
            const fresh = await ask('house.subscribe', { zoneId: 'lounge', controllerToken });
            if (!closed && fallbackRequest === requestGeneration) { reducer.accept(fresh.snapshot); void flush(); }
          } catch { /* A denied fallback stays cleared until a later authorised subscription. */ }
        }
      }
      report(error); throw error;
    }
  }
  function makeSocket() {
    if (typeof globalThis.io !== 'function') throw problem('TRANSPORT_UNAVAILABLE', 'The house connection script did not load.');
    socket = globalThis.io({ autoConnect: false, transports: ['websocket'], reconnection: true, reconnectionDelay: 500, reconnectionDelayMax: 3000 });
    socket.on('connect', () => {
      const waiting = connectWait; connectWait = null;
      subscribe(selectedZone).then(value => waiting?.resolve(value)).catch(error => waiting?.reject(error));
    });
    socket.on('house.snapshot', snapshot => { if (closed) return; if (reducer.accept(snapshot)) void flush(); });
    socket.on('house.motion', motion => { if (!closed) reducer.motion(motion); });
    socket.on('house.revoked', message => {
      if (closed || !reducer.revoke(message)) return;
      requestGeneration++; selectedZone = 'lounge'; sequence = 0;
      report(problem(message.code ?? 'FORBIDDEN', 'Room access changed. Private room content was cleared.'));
    });
    socket.on('disconnect', reason => { if (closed) return; requestGeneration++; reducer.clear(); onDisconnect(reason); });
    socket.on('connect_error', error => {
      if (closed) return;
      // Socket.IO namespace middleware carries domain failures in Error.data.
      const failure = typeof error?.data?.code === 'string'
        ? problem(error.data.code, typeof error.message === 'string' ? error.message : 'The house connection could not start.')
        : error;
      report(failure); const waiting = connectWait; connectWait = null; waiting?.reject(failure);
    });
  }
  function connect() {
    if (closed) return Promise.reject(problem('CLOSED', 'This house connection is closed.'));
    if (!socket) makeSocket();
    if (socket.connected) return subscribe(selectedZone);
    if (connectWait) return connectWait.promise;
    let resolve, reject;
    const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
    connectWait = { promise, resolve, reject }; socket.connect(); return promise;
  }
  function assertActive(request) {
    if (closed) throw problem('CLOSED', 'This house connection is closed.');
    if (request !== requestGeneration) throw problem('STALE_ZONE', 'A newer house request replaced this pending operation.');
  }
  function assertIdentity(identityId) {
    if (expectedIdentityId !== undefined && identityId !== expectedIdentityId) throw problem('IDENTITY_CHANGED', 'Your house identity changed. Restore the original identity before using this draft.');
  }
  async function sendEntry(entry) {
    const request = requestGeneration; assertActive(request); assertIdentity(entry.identityId);
    if (inFlight.has(entry.command.commandId)) {
      const reply = await inFlight.get(entry.command.commandId); assertActive(request); return reply;
    }
    const stored = outbox.all().find(value => value.command.commandId === entry.command.commandId);
    if (!stored) throw problem('PENDING_NOT_FOUND', 'This draft was discarded before it was sent.');
    if (JSON.stringify(stored) !== JSON.stringify(entry)) throw problem('COMMAND_ID_REUSED', 'This UUID already belongs to another draft.');
    const work = (async () => {
      let reply;
      if (latestLive?.controller && socket?.connected) {
        if (entry.identityId !== latestLive.durable.selfId || entry.zoneId !== latestLive.durable.zoneId || (entry.houseId && entry.houseId !== latestLive.durable.house.id)) throw problem('STALE_ZONE', 'This pending draft belongs to another identity or room.');
        reply = await ask('house.command', { generation: latestLive.generation, zoneId: entry.zoneId, command: entry.command });
      } else {
        if (latestLive || entry.houseId || entry.zoneId !== 'lounge' || !lobbyTypes.has(entry.command.type)) throw problem('NOT_CONTROLLER', 'Take control in this room before saving.');
        try {
          const response = await fetch('/api/house/command', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'X-House-Identity': entry.identityId }, body: JSON.stringify(entry.command), signal: AbortSignal.timeout(5000) });
          assertActive(request);
          const result = await response.json(); assertActive(request);
          reply = settle(result);
        } catch (error) { if (error?.[domainProblem]) throw error; throw problem('PENDING', 'The save acknowledgement is pending. Retry the same draft.'); }
      }
      assertActive(request);
      try { outbox.remove(entry.command.commandId); }
      catch { report(problem('STORAGE_UNAVAILABLE', 'The action was saved, but its local pending copy could not be cleared. Inspect and discard that copy when storage is available.')); }
      return reply;
    })();
    inFlight.set(entry.command.commandId, work);
    try { return await work; }
    catch (error) {
      if (error.code && !['PENDING', 'STORAGE_UNAVAILABLE', 'NOT_CONTROLLER', 'STALE_ZONE', 'CLOSED', 'IDENTITY_CHANGED'].includes(error.code)) {
        try { outbox.remove(entry.command.commandId); } catch (cleanupError) { report(cleanupError); }
      }
      throw error;
    }
    finally { inFlight.delete(entry.command.commandId); }
  }
  async function command(intent) {
    const request = requestGeneration; assertActive(request);
    let next;
    try { next = clone({ ...intent, commandId: intent.commandId ?? globalThis.crypto.randomUUID() }); }
    catch { throw report(problem('INVALID_INPUT', 'This command needs a valid UUID and bounded payload.')); }
    if (!lobbyTypes.has(next.type) && !next.houseId) {
      if (!latestLive?.durable.house?.id) throw report(problem('NOT_CONTROLLER', 'Enter the original house before creating this draft.'));
      next.houseId = latestLive.durable.house.id;
    }
    let identityId = latestLive?.durable.selfId;
    if (!identityId) {
      const context = await identityContext(); assertActive(request); identityId = context.identityId;
    }
    assertActive(request); assertIdentity(identityId);
    const zoneId = next.type === 'chat.send' ? next.payload?.zoneId : selectedZone;
    const entry = outbox.add(next, identityId, zoneId);
    if (Date.now() - entry.createdAt > DAY) throw report(problem('INSPECTION_REQUIRED', 'Inspect this expired draft and choose Retry in the pending-actions panel.'));
    try { const reply = await sendEntry(entry); assertActive(request); return reply; } catch (error) { report(error); throw error; }
  }
  async function flush() {
    if (flushing || closed || !latestLive?.controller || !socket?.connected) return;
    flushing = true;
    try {
      const queuedIds = outbox.eligible(latestLive.durable.selfId, latestLive.durable.zoneId, Date.now(), latestLive.durable.house.id).map(entry => entry.command.commandId);
      for (const commandId of queuedIds) {
        if (closed || !latestLive?.controller || !socket?.connected) break;
        // A previous ACK can take seconds; discard, expiry and scope may have changed.
        const entry = outbox.eligible(latestLive.durable.selfId, latestLive.durable.zoneId, Date.now(), latestLive.durable.house.id).find(value => value.command.commandId === commandId);
        if (!entry) continue;
        try { await sendEntry(entry); } catch (error) { report(error); if (['PENDING', 'STORAGE_UNAVAILABLE', 'STALE_ZONE', 'NOT_CONTROLLER'].includes(error.code)) break; }
      }
    } catch (error) { report(error); }
    finally { flushing = false; }
  }
  function controlled(event, body = {}) {
    if (!latestLive?.controller) return Promise.reject(report(problem('NOT_CONTROLLER', 'Take control in this tab first.')));
    return ask(event, { generation: latestLive.generation, ...body }).catch(error => { report(error); throw error; });
  }
  async function identityContext() {
    const request = requestGeneration; assertActive(request);
    const me = await fetchMe(); assertActive(request);
    const identityId = me.identity?.id ?? me.me?.identity?.id;
    if (!boundedId(identityId)) throw problem('UNAUTHENTICATED', 'Establish your house identity before inspecting drafts.');
    assertIdentity(identityId);
    return { identityId, request };
  }
  function retryScope(entry, identityId) {
    if (closed) return problem('CLOSED', 'This house connection is closed.');
    if (latestLive?.controller && socket?.connected) {
      if (identityId !== latestLive.durable.selfId || entry.zoneId !== latestLive.durable.zoneId || (entry.houseId && entry.houseId !== latestLive.durable.house.id)) return problem('STALE_ZONE', 'Return to the original house and room before retrying this draft.');
      return null;
    }
    if (!latestLive && !entry.houseId && entry.zoneId === 'lounge' && lobbyTypes.has(entry.command.type)) return null;
    return problem('NOT_CONTROLLER', 'Take control in the original house and room before retrying this draft.');
  }
  /** @returns {Promise<{entries:PendingRow[],otherIdentityCount:number,total:number}>} */
  async function getPending() {
    const { identityId, request } = await identityContext(); assertActive(request);
    const all = outbox.all(), now = Date.now();
    const own = all.filter(entry => entry.identityId === identityId);
    inspected.clear();
    for (const entry of own) inspected.add(identityId + ':' + entry.command.commandId);
    return {
      entries: own.map(entry => ({ commandId: entry.command.commandId, type: entry.command.type, createdAt: entry.createdAt,
        houseId: entry.houseId ?? null, zoneId: entry.zoneId, state: now - entry.createdAt > DAY ? 'expired' : 'pending',
        command: entry.command, canRetry: now >= entry.createdAt && !inFlight.has(entry.command.commandId) && retryScope(entry, identityId) === null })),
      otherIdentityCount: all.length - own.length, total: all.length,
    };
  }
  async function ownPending(commandId) {
    const { identityId, request } = await identityContext(); assertActive(request);
    const entry = outbox.all().find(value => value.identityId === identityId && value.command.commandId === commandId);
    if (!entry) throw problem('PENDING_NOT_FOUND', 'This identity has no pending draft with that command ID.');
    return { identityId, entry, request };
  }
  async function retryPending(commandId) {
    try {
      const { identityId, entry, request } = await ownPending(commandId); assertActive(request);
      if (Date.now() - entry.createdAt > DAY && !inspected.has(identityId + ':' + commandId)) throw problem('INSPECTION_REQUIRED', 'Inspect the original expired draft before choosing to retry it.');
      if (Date.now() < entry.createdAt) throw problem('INVALID_INPUT', 'This draft has a future timestamp. Check the tab’s clock before retrying.');
      const error = retryScope(entry, identityId); if (error) throw error;
      const reply = await sendEntry(entry); assertActive(request); return reply;
    } catch (error) { report(error); throw error; }
  }
  async function discardPending(commandId) {
    const { entry, request } = await ownPending(commandId); assertActive(request);
    if (inFlight.has(entry.command.commandId)) throw problem('PENDING_IN_FLIGHT', 'Wait for this draft’s acknowledgement before discarding it.');
    outbox.remove(entry.command.commandId);
  }
  async function discardOtherIdentities() {
    const { identityId, request } = await identityContext(); assertActive(request);
    if (outbox.all().some(entry => entry.identityId !== identityId && inFlight.has(entry.command.commandId))) throw problem('PENDING_IN_FLIGHT', 'Wait for an outstanding acknowledgement before discarding other identities’ drafts.');
    outbox.removeOtherIdentities(identityId);
  }
  async function exportPending() {
    const request = requestGeneration; assertActive(request);
    const pending = await getPending(); assertActive(request); return pending.entries;
  }
  return {
    connect, subscribe, command, getPending, retryPending, discardPending, discardOtherIdentities, exportPending,
    move(position) {
      if (closed || !latestLive?.controller || !socket?.connected || motionFlight) return false;
      const request = requestGeneration, lifecycle = motionGeneration, scope = motionScope(latestLive);
      const body = { generation: latestLive.generation, sequence: ++sequence, x: position.x, z: position.z, heading: position.heading };
      const current = () => !closed && socket?.connected && request === requestGeneration && lifecycle === motionGeneration && scope === motionScope(latestLive);
      // One transient flight, no replay queue. A dropped packet or ACK must settle.
      const flight = socket.timeout(1000).volatile.emitWithAck('house.move', body).then(reply => {
        if (!current()) return { ok: false, stale: true };
        if (reply?.ok !== true || reply.sequence !== body.sequence) return { ok: false, code: reply?.code ?? 'INVALID_ACK', position: motionAuthority && { ...motionAuthority } };
        motionAuthority = { x: body.x, z: body.z };
        return { ok: true, position: { ...motionAuthority } };
      }, () => current() ? { ok: false, code: 'PENDING', position: motionAuthority && { ...motionAuthority } } : { ok: false, stale: true });
      motionFlight = flight;
      return flight.finally(() => { if (motionFlight === flight) motionFlight = null; });
    },
    setAvailability: value => controlled('house.availability', { value }),
    claimSeat: seatId => controlled('house.seat', { seatId }),
    stand: () => controlled('house.stand'),
    async takeover() {
      const reply = await ask('house.takeover', { controllerToken }); sequence = 0; reducer.accept(reply.snapshot); return reply;
    },
    close() {
      if (closed) return; closed = true; requestGeneration++;
      connectWait?.reject(problem('CLOSED', 'The house connection closed.')); connectWait = null;
      socket?.disconnect(); reducer.clear();
    },
  };
}


/** Inspect/recover local drafts in the lobby without constructing a socket.
 * @param {{storage?:OutboxStorage,fetchMe?:()=>Promise<any>,onError?:(error:any)=>void,expectedIdentityId?:string}} [options]
 */
export function createPendingInspector(options = {}) {
  const client = createHouseClient(options);
  return { getPending: client.getPending, retryPending: client.retryPending, discardPending: client.discardPending,
    discardOtherIdentities: client.discardOtherIdentities, exportPending: client.exportPending, command: client.command,
    close: client.close };
}
