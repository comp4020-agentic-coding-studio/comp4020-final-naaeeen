const OUTBOX_KEY = 'house.commandOutbox.v2';
const TAB_KEY = 'house.controllerToken.v2';
const DAY = 24 * 60 * 60 * 1000;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;
const problem = (code, message) => Object.assign(new Error(message), { code });
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

/** A sessionStorage outbox is a bounded pending draft, never a saved acknowledgement.
 * @param {{getItem:(key:string)=>string|null,setItem:(key:string,value:string)=>void}|undefined} storage
 */
export function createCommandOutbox(storage) {
  let entries = [];
  try {
    const raw = storage?.getItem(OUTBOX_KEY);
    if (raw && raw.length <= 32 * 1024) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length <= 16) entries = parsed.filter(entry => entry && uuid.test(entry.command?.commandId) && typeof entry.identityId === 'string' && typeof entry.zoneId === 'string' && Number.isFinite(entry.createdAt));
    }
  } catch { /* A corrupted old draft does not become a new command. */ }
  function save() { try { storage?.setItem(OUTBOX_KEY, JSON.stringify(entries)); } catch { /* Memory remains bounded when storage is unavailable. */ } }
  return {
    add(command, identityId, zoneId, createdAt = Date.now()) {
      if (!command || !uuid.test(command.commandId) || typeof command.type !== 'string' || !command.payload || bytes(command) > 8 * 1024) throw problem('INVALID_INPUT', 'This command needs a valid UUID and bounded payload.');
      const copy = JSON.parse(JSON.stringify(command));
      const existing = entries.find(entry => entry.command.commandId === command.commandId);
      if (existing) {
        if (existing.identityId !== identityId || existing.zoneId !== zoneId || JSON.stringify(existing.command) !== JSON.stringify(copy)) throw problem('COMMAND_ID_REUSED', 'This UUID already belongs to another draft.');
        return existing;
      }
      const entry = { command: copy, identityId, zoneId, houseId: copy.houseId, createdAt };
      if (entries.length >= 16 || bytes([...entries, entry]) > 32 * 1024) throw problem('OUTBOX_FULL', 'Resolve a pending draft before adding another.');
      entries.push(entry); save(); return entry;
    },
    eligible(identityId, zoneId, now = Date.now(), houseId = '') { return entries.filter(entry => entry.identityId === identityId && entry.zoneId === zoneId && (!entry.houseId || entry.houseId === houseId) && now >= entry.createdAt && now - entry.createdAt <= DAY).map(entry => JSON.parse(JSON.stringify(entry))); },
    remove(commandId) { entries = entries.filter(entry => entry.command.commandId !== commandId); save(); },
  };
}

/** @param {{onSnapshot?:(snapshot:any|null)=>void,onDisconnect?:(reason:string)=>void,onError?:(error:any)=>void}} [callbacks] */
export function createHouseClient({ onSnapshot = () => {}, onDisconnect = () => {}, onError = () => {} } = {}) {
  const storage = safeStorage(), outbox = createCommandOutbox(storage);
  // Rotate on construction/full reload. Reconnects reuse only this in-memory token.
  const controllerToken = globalThis.crypto.randomUUID();
  try { storage?.setItem(TAB_KEY, controllerToken); } catch { /* In-memory reconnect remains possible. */ }
  let latestLive = null, selectedZone = 'lounge', socket = null, closed = false, sequence = 0, flushing = false, connectWait = null, requestGeneration = 0;
  const inFlight = new Map();
  const reducer = createSnapshotReducer(snapshot => { latestLive = snapshot; onSnapshot(snapshot); });
  const report = error => { onError(error); return error; };
  function settle(reply) {
    if (!reply || reply.ok !== true) throw problem(reply?.code ?? 'UNAVAILABLE', reply?.message ?? 'The house did not acknowledge this action.');
    return reply;
  }
  async function ask(event, body) {
    if (!socket?.connected) throw problem('PENDING', 'Connection unavailable. This action is not saved.');
    try { return settle(await socket.timeout(5000).emitWithAck(event, body)); }
    catch (error) { if (error.code) throw error; throw problem('PENDING', 'Acknowledgement timed out. This action is pending.'); }
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
    socket.on('connect_error', error => { report(error); const waiting = connectWait; connectWait = null; waiting?.reject(error); });
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
  async function sendEntry(entry) {
    if (inFlight.has(entry.command.commandId)) return inFlight.get(entry.command.commandId);
    const work = (async () => {
      let reply;
      if (latestLive?.controller && socket?.connected) {
        if (entry.identityId !== latestLive.durable.selfId || entry.zoneId !== latestLive.durable.zoneId || (entry.houseId && entry.houseId !== latestLive.durable.house.id)) throw problem('STALE_ZONE', 'This pending draft belongs to another identity or room.');
        reply = await ask('house.command', { generation: latestLive.generation, zoneId: entry.zoneId, command: entry.command });
      } else {
        if (latestLive || !['house.create', 'house.join', 'profile.set'].includes(entry.command.type)) throw problem('NOT_CONTROLLER', 'Take control in this room before saving.');
        try {
          const response = await fetch('/api/house/command', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry.command), signal: AbortSignal.timeout(5000) });
          reply = settle(await response.json());
        } catch (error) { if (error.code) throw error; throw problem('PENDING', 'The save acknowledgement is pending. Retry the same draft.'); }
      }
      outbox.remove(entry.command.commandId); return reply;
    })();
    inFlight.set(entry.command.commandId, work);
    try { return await work; }
    catch (error) { if (error.code && !['PENDING', 'STORAGE_UNAVAILABLE', 'NOT_CONTROLLER', 'STALE_ZONE'].includes(error.code)) outbox.remove(entry.command.commandId); throw error; }
    finally { inFlight.delete(entry.command.commandId); }
  }
  async function command(intent) {
    const next = { ...intent, commandId: intent.commandId ?? globalThis.crypto.randomUUID() };
    if (!['house.create', 'house.join', 'profile.set'].includes(next.type) && !next.houseId) {
      if (!latestLive?.durable.house?.id) throw report(problem('NOT_CONTROLLER', 'Enter the original house before creating this draft.'));
      next.houseId = latestLive.durable.house.id;
    }
    let identityId = latestLive?.durable.selfId;
    if (!identityId) {
      const response = await fetch('/api/house/me', { credentials: 'same-origin', signal: AbortSignal.timeout(5000) });
      const me = await response.json(); identityId = me.identity?.id ?? me.me?.identity?.id;
      if (!response.ok || !identityId) throw report(problem('UNAUTHENTICATED', 'Establish your house identity before saving.'));
    }
    const zoneId = next.type === 'chat.send' ? next.payload.zoneId : selectedZone;
    const entry = outbox.add(next, identityId, zoneId);
    try { return await sendEntry(entry); } catch (error) { report(error); throw error; }
  }
  async function flush() {
    if (flushing || closed || !latestLive?.controller || !socket?.connected) return;
    flushing = true;
    try {
      for (const entry of outbox.eligible(latestLive.durable.selfId, latestLive.durable.zoneId, Date.now(), latestLive.durable.house.id)) {
        try { await sendEntry(entry); } catch (error) { report(error); if (['PENDING', 'STORAGE_UNAVAILABLE', 'STALE_ZONE', 'NOT_CONTROLLER'].includes(error.code)) break; }
      }
    } finally { flushing = false; }
  }
  function controlled(event, body = {}) {
    if (!latestLive?.controller) return Promise.reject(report(problem('NOT_CONTROLLER', 'Take control in this tab first.')));
    return ask(event, { generation: latestLive.generation, ...body }).catch(error => { report(error); throw error; });
  }
  return {
    connect, subscribe, command,
    move(position) {
      if (closed || !latestLive?.controller || !socket?.connected) return;
      socket.volatile.emit('house.move', { generation: latestLive.generation, sequence: ++sequence, x: position.x, z: position.z, heading: position.heading });
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
