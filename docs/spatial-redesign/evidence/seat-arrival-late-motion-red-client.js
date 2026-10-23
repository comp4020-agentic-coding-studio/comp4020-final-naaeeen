import { HOUSE_WORLD_VERSION } from './house-version.js';

const OUTBOX_KEY = 'house.commandOutbox.v2';
const TAB_KEY = 'house.controllerToken.v2';
const DAY = 24 * 60 * 60 * 1000;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;
const clone = value => JSON.parse(JSON.stringify(value));
const lobbyTypes = new Set(['house.create', 'house.join', 'profile.set']);
const puzzleTypes = new Set(['puzzle.start', 'puzzle.place']);
const flightsByStorage = new WeakMap();
const boundedId = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const capturedAuthority = value => plainObject(value) && boundedId(value.serverEpoch) && nonnegative(value.accessGeneration) && nonnegative(value.generation);
const capturedRoster = value => plainObject(value) && boundedId(value.serverEpoch) && nonnegative(value.revision);
// Ordering proof only: never project or reconstruct a roster from this normalized key.
const rosterMemberKey = roster => JSON.stringify([...roster.memberIds].sort());
const sameRoster = (left, right) => left.roundId === right.roundId && left.selfParticipationId === right.selfParticipationId
  && left.memberIds.length === right.memberIds.length && left.memberIds.every(id => right.memberIds.includes(id));
const domainProblem = Symbol('house problem');
const problem = (code, message) => Object.assign(new Error(message), { code, [domainProblem]: true });
const safeStorage = () => { try { return globalThis.sessionStorage; } catch { return undefined; } };

/** @param {(snapshot:any|null)=>void} [onSnapshot] */
export function createSnapshotReducer(onSnapshot = () => {}) {
  let current = null, epoch = null, accessGeneration = -1, generation = -1, desiredZone = 'lounge';
  let identityId = null, houseId = null, ownWork = null, voice = null, roomStreamId = null, roomSequence = -1;
  // Roster revisions are independent of durable stream cursors and survive hidden UI.
  let rosterHigh = null, rosterCache = null;
  const retired = new Set();
  return {
    // Clear displayed private content, retaining only same-identity/house ordering in memory.
    selectZone(zoneId) { desiredZone = zoneId; current = null; onSnapshot(null); },
    clear() { current = null; onSnapshot(null); },
    clearPrivate(forgetRosterOrdering = false) {
      ownWork = null; voice = null; rosterCache = null;
      if (forgetRosterOrdering) rosterHigh = null;
      current = null; onSnapshot(null);
    },
    revoke(message) {
      if (!message || typeof message.serverEpoch !== 'string' || !Number.isSafeInteger(message.accessGeneration)) return false;
      if (retired.has(message.serverEpoch) || (epoch === message.serverEpoch && message.accessGeneration < accessGeneration)) return false;
      if (epoch !== message.serverEpoch) {
        if (epoch) retired.add(epoch);
        identityId = null; houseId = null; generation = -1;
      }
      if (['UNAUTHENTICATED', 'IDENTITY_REVOKED'].includes(message.code)) rosterHigh = null;
      epoch = message.serverEpoch; accessGeneration = message.accessGeneration; ownWork = null; voice = null; rosterCache = null; roomStreamId = null; roomSequence = -1;
      desiredZone = 'lounge'; current = null; onSnapshot(null); return true;
    },
    motion(incoming) {
      if (!current || !incoming || incoming.serverEpoch !== epoch || incoming.accessGeneration !== accessGeneration || incoming.generation !== current.generation || incoming.zoneId !== desiredZone || !Array.isArray(incoming.players) || incoming.players.length > 6) return false;
      current = { ...current, players: incoming.players }; onSnapshot(current); return true;
    },
    accept(incoming) {
      if (!incoming || typeof incoming.serverEpoch !== 'string' || !Number.isSafeInteger(incoming.accessGeneration) || !Number.isSafeInteger(incoming.generation) || !incoming.durable || !Number.isSafeInteger(incoming.durable.sequence) || incoming.durable.zoneId !== desiredZone || !boundedId(incoming.durable.selfId) || !boundedId(incoming.durable.house?.id) || !Array.isArray(incoming.players) || incoming.players.length > 6 || retired.has(incoming.serverEpoch)) return false;
      const durable = incoming.durable, projection = durable.ownWork;
      const roster = incoming.puzzleRoster;
      if (durable.zoneId !== 'lounge' && (roster != null || durable.puzzle != null)) return false;
      if (roster != null && (!plainObject(roster) || roster.serverEpoch !== incoming.serverEpoch || roster.houseId !== durable.house.id
        || roster.roundId !== (durable.puzzle?.current?.id ?? null) || !Number.isSafeInteger(roster.revision) || roster.revision < 0
        || !Array.isArray(roster.memberIds) || roster.memberIds.length > 6 || roster.memberIds.some(id => !boundedId(id))
        || new Set(roster.memberIds).size !== roster.memberIds.length
        || (roster.selfParticipationId !== null && (typeof roster.selfParticipationId !== 'string' || !uuid.test(roster.selfParticipationId)
          || !roster.memberIds.includes(durable.selfId) || !incoming.controller))
        || (roster.roundId === null && (roster.memberIds.length > 0 || roster.selfParticipationId !== null)))) return false;
      const incomingVoice = durable.voice;
      if (incomingVoice !== undefined && (!plainObject(incomingVoice) || !Number.isSafeInteger(incomingVoice.revision) || incomingVoice.revision < 0
        || (incomingVoice.url !== null && (typeof incomingVoice.url !== 'string' || incomingVoice.url.length > 512)))) return false;
      // The server contract requires ownWork. Missing legacy fixtures remain room-only;
      // never reconstruct private work from the shared cards list.
      if (projection !== undefined && (!plainObject(projection) || projection.streamId !== 'lounge:' + durable.house.id
        || !Number.isSafeInteger(projection.sequence) || projection.sequence < 0
        || (projection.card !== null && (!plainObject(projection.card) || !boundedId(projection.card.id)
          || projection.card.authorId !== durable.selfId || projection.card.state !== 'active')))) return false;
      if (epoch === incoming.serverEpoch) {
        if (incoming.accessGeneration < accessGeneration) return false;
        if (incoming.accessGeneration === accessGeneration) {
          // Authority survives current=null during zone selection and reconnection.
          if (incoming.generation < generation || (identityId !== null && (identityId !== durable.selfId || houseId !== durable.house.id))) return false;
          if (durable.streamId === roomStreamId && durable.sequence < roomSequence) return false;
        }
      }
      const changedScope = epoch !== incoming.serverEpoch || identityId !== durable.selfId || houseId !== durable.house.id;
      let nextHigh = changedScope ? null : rosterHigh;
      if (roster != null && nextHigh) {
        if (roster.revision < nextHigh.revision) return false;
        if (roster.revision === nextHigh.revision) {
          const sameMembers = roster.roundId === nextHigh.roundId && rosterMemberKey(roster) === nextHigh.memberKey;
          const sameParticipation = rosterCache ? sameRoster(roster, rosterCache)
            : roster.selfParticipationId === null && !nextHigh.hadSelfParticipation;
          if (!sameMembers || !sameParticipation) return false;
        }
      }
      if (roster != null) nextHigh = { revision: roster.revision, roundId: roster.roundId,
        memberKey: rosterMemberKey(roster), hadSelfParticipation: roster.selfParticipationId !== null };
      let nextWork = changedScope ? null : ownWork;
      let nextVoice = changedScope ? null : voice;
      if (incomingVoice !== undefined && (!nextVoice || incomingVoice.revision > nextVoice.revision)) nextVoice = clone(incomingVoice);
      if (projection !== undefined && (!nextWork || projection.sequence > nextWork.sequence)) nextWork = clone(projection);
      // Commit authority/cache only after every envelope and projection guard passed.
      if (epoch && epoch !== incoming.serverEpoch) retired.add(epoch);
      epoch = incoming.serverEpoch; accessGeneration = incoming.accessGeneration; generation = incoming.generation;
      identityId = durable.selfId; houseId = durable.house.id; ownWork = nextWork; voice = nextVoice;
      rosterHigh = nextHigh; rosterCache = roster != null ? clone(roster) : null;
      roomStreamId = durable.streamId; roomSequence = durable.sequence;
      current = ownWork || voice ? { ...incoming, durable: { ...durable, ...(ownWork ? { ownWork: clone(ownWork) } : {}), ...(voice ? { voice: clone(voice) } : {}) } } : incoming;
      if (roster != null) current = { ...current, puzzleRoster: clone(rosterCache) };
      onSnapshot(current); return true;
    },
  };
}

/** @typedef {{commandId:string,type:string,houseId?:string,expectedRevision?:number,payload:Record<string,any>}} PendingCommand */
/** @typedef {{command:PendingCommand,identityId:string,zoneId:string,houseId?:string,createdAt:number,recoveryHeld?:boolean}} OutboxEntry */
/** @typedef {{commandId:string,type:string,createdAt:number,houseId:string|null,zoneId:string,state:'pending'|'expired',label:string,command:PendingCommand,canRetry:boolean,recoveryHeld:boolean}} PendingRow */
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
      && command.type !== 'house.puzzle.intent' && (!command.type.startsWith('puzzle.') || puzzleTypes.has(command.type))
      && plainObject(command.payload) && (command.houseId === undefined || boundedId(command.houseId))
      && (!puzzleTypes.has(command.type) || boundedId(command.houseId))
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
      const seen = new Set(), puzzleCounts = new Map();
      if (!Array.isArray(parsed) || parsed.length > 16 || parsed.some(entry => {
        if (!plainObject(entry) || !validCommand(entry.command) || !boundedId(entry.identityId) || !boundedId(entry.zoneId)
          || entry.houseId !== entry.command.houseId || (puzzleTypes.has(entry.command.type) && entry.zoneId !== 'lounge') || (entry.command.type === 'chat.send' && entry.command.payload.zoneId !== entry.zoneId) || !Number.isSafeInteger(entry.createdAt) || entry.createdAt < 0
          || (entry.recoveryHeld !== undefined && entry.recoveryHeld !== true) || seen.has(entry.command.commandId)) return true;
        seen.add(entry.command.commandId);
        if (puzzleTypes.has(entry.command.type)) {
          const scope = JSON.stringify([entry.identityId, entry.houseId]), count = (puzzleCounts.get(scope) ?? 0) + 1;
          if (count > 2) return true; puzzleCounts.set(scope, count);
        }
        return false;
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
      if (!validCommand(copy) || !boundedId(identityId) || !boundedId(zoneId) || (puzzleTypes.has(copy.type) && zoneId !== 'lounge') || !Number.isSafeInteger(createdAt) || createdAt < 0) throw problem('INVALID_INPUT', 'This command needs a valid UUID and bounded payload.');
      const existing = entries.find(entry => entry.command.commandId === copy.commandId);
      if (existing) {
        if (existing.identityId !== identityId || existing.zoneId !== zoneId || JSON.stringify(existing.command) !== JSON.stringify(copy)) throw problem('COMMAND_ID_REUSED', 'This UUID already belongs to another draft.');
        return clone(existing);
      }
      if (copy.type.startsWith('game.') && entries.filter(entry => entry.identityId === identityId && entry.houseId === copy.houseId && entry.command.type.startsWith('game.')).length >= 2) {
        throw problem('GAME_PENDING_LIMIT', 'Resolve a pending game action before adding another. Your study drafts are still available.');
      }
      if (puzzleTypes.has(copy.type) && entries.filter(entry => entry.identityId === identityId && entry.houseId === copy.houseId && puzzleTypes.has(entry.command.type)).length >= 2) {
        throw problem('PUZZLE_PENDING_LIMIT', 'Resolve a pending picture action before adding another. Your study drafts are still available.');
      }
      const entry = { command: copy, identityId, zoneId, houseId: copy.houseId, createdAt };
      if (entries.length >= 16 || bytes([...entries, entry]) > 32 * 1024) throw problem('OUTBOX_FULL', 'Inspect and resolve a pending draft before adding another.');
      write([...entries, entry]); return clone(entry);
    },
    hold(commandId) {
      read();const entry=entries.find(value=>value.command.commandId===commandId);
      if(!entry)throw problem('PENDING_NOT_FOUND','This original draft is no longer pending.');
      if(entry.recoveryHeld)return clone(entry);
      const next=entries.map(value=>value===entry?{...value,recoveryHeld:true}:value);
      if(bytes(next)>32*1024)throw problem('OUTBOX_FULL','This tab cannot preserve the recovery hold. The original draft was kept; free space before navigating.');
      write(next);return clone(next.find(value=>value.command.commandId===commandId));
    },
    all() { read(); return clone(entries); },
    eligible(identityId, zoneId, now = Date.now(), houseId = '') {
      read();
      return clone(entries.filter(entry => !entry.recoveryHeld && entry.identityId === identityId && entry.zoneId === zoneId && (!entry.houseId || entry.houseId === houseId) && now >= entry.createdAt && now - entry.createdAt <= DAY));
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

/** @param {{onSnapshot?:(snapshot:any|null)=>void,onDisconnect?:(reason:string)=>void,onError?:(error:any)=>void,onUpdateRequired?:(error:any)=>void,onPuzzleIntent?:(pending:any|null)=>void,storage?:OutboxStorage,fetchMe?:()=>Promise<any>,expectedIdentityId?:string}} [callbacks] */
export function createHouseClient({ onSnapshot = () => {}, onDisconnect = () => {}, onError = () => {}, onUpdateRequired = () => {}, onPuzzleIntent = () => {}, storage = safeStorage(), fetchMe = fetchHouseIdentity, expectedIdentityId } = {}) {
  const outbox = createCommandOutbox(storage);
  // Rotate on construction/full reload. Reconnects reuse only this in-memory token.
  const controllerToken = globalThis.crypto.randomUUID();
  try { storage?.setItem(TAB_KEY, controllerToken); } catch { /* In-memory reconnect remains possible. */ }
  let latestLive = null, selectedZone = 'lounge', socket = null, closed = false, sequence = 0, flushing = false, connectWait = null, requestGeneration = 0;
  // One storage can have a lobby inspector and a live client. Their sends share a guard.
  if (storage && !flightsByStorage.has(storage)) flightsByStorage.set(storage, new Map());
  const inFlight = storage ? flightsByStorage.get(storage) : new Map();
  const inspected = new Set();
  let motionFlight = null, motionGeneration = 0, motionAuthority = null, updateRequired = null;
  let seatClaim = null, seatHead = 0;
  let puzzlePending = null, puzzleSequence = 0, connectionGeneration = 0, revokedWithoutHead = false;
  const puzzleScope = snapshot => snapshot ? JSON.stringify([snapshot.serverEpoch, snapshot.accessGeneration, snapshot.generation, snapshot.controller,
    snapshot.durable.house.id, snapshot.durable.selfId, snapshot.durable.zoneId, snapshot.durable.puzzle?.current?.id ?? null]) : null;
  function pendingPuzzleIntent() {
    if (!puzzlePending) return null;
    return { ...puzzlePending.body, state: puzzlePending.state, canRetry: puzzlePending.state === 'pending' && !puzzlePending.flight
      && !closed && !updateRequired && socket?.connected === true && puzzlePending.connection === connectionGeneration && puzzlePending.scope === puzzleScope(latestLive) };
  }
  function clearPuzzleIntent() { if (puzzlePending) { puzzlePending = null; onPuzzleIntent(null); } }
  const motionScope = snapshot => snapshot ? JSON.stringify([snapshot.serverEpoch, snapshot.accessGeneration, snapshot.generation, snapshot.controller,
    snapshot.durable.house.id, snapshot.durable.selfId, snapshot.durable.streamId, snapshot.durable.zoneId,
    snapshot.players.find(player => player.id === snapshot.durable.selfId)?.seatId ?? null]) : null;
  // Physical chair ownership has its own handoff. UI panel intent can be canceled
  // while the already-sent claim still changes the server's lease.
  const seatScope = snapshot => snapshot ? JSON.stringify([snapshot.serverEpoch, snapshot.accessGeneration, snapshot.generation, snapshot.controller,
    snapshot.durable.house.id, snapshot.durable.selfId, snapshot.durable.streamId, snapshot.durable.zoneId]) : null;
  const seatPendingProblem = () => problem('PENDING', 'Your chair request is uncertain. Open Options, choose Return to title, then Continue saved home to recover.');
  function reconcileSeatClaim(snapshot) {
    const claim = seatClaim;
    if (!claim) return;
    if (claim.connection !== connectionGeneration || claim.scope !== seatScope(snapshot)) { seatClaim = null; return; }
    const player = snapshot.players.find(value => value.id === snapshot.durable.selfId);
    if (!player?.connected) return;
    const advanced = nonnegative(player.seatGeneration) && nonnegative(claim.seatGeneration)
      && player.seatGeneration > claim.seatGeneration;
    // The old standing generation cannot settle a claim. After its ACK, an
    // advanced generation proves either seating or a later release (for example
    // a room edit removing that chair). Explicit Stand also has a head barrier.
    if (claim.standHeadAfter !== null && seatHead > claim.standHeadAfter && !player.seatId
      || claim.ack && advanced) seatClaim = null;
  }
  const reducer = createSnapshotReducer(snapshot => {
    seatHead++; reconcileSeatClaim(snapshot);
    if (puzzleScope(snapshot) !== puzzleScope(latestLive)) clearPuzzleIntent();
    if (motionScope(snapshot) !== motionScope(latestLive)) { motionGeneration++; motionFlight = null; motionAuthority = null; }
    latestLive = snapshot;
    const player = snapshot?.players.find(player => player.id === snapshot.durable.selfId);
    if (Number.isFinite(player?.x) && Number.isFinite(player?.z)) motionAuthority = { x: player.x, z: player.z };
    onSnapshot(snapshot);
  });
  const report = error => { onError(error); return error; };
  function requireCompatible() { if (updateRequired) throw updateRequired; }
  function suspendForUpdate(receivedVersion) {
    if (updateRequired) return updateRequired;
    updateRequired = problem('CLIENT_UPDATE_REQUIRED', 'The house has changed. Download any unsent drafts, then reload to update.');
    updateRequired.expectedVersion = HOUSE_WORLD_VERSION;
    updateRequired.receivedVersion = typeof receivedVersion === 'string' ? receivedVersion.slice(0, 80) : null;
    requestGeneration++; motionGeneration++; motionFlight = null;
    // Notify before clearing the display so the UI can copy available unsent drafts.
    onUpdateRequired(updateRequired);
    reducer.clearPrivate(true); socket?.disconnect();
    const waiting = connectWait; connectWait = null; waiting?.reject(updateRequired);
    report(updateRequired); return updateRequired;
  }
  function acceptLive(incoming) {
    if (updateRequired || closed) return false;
    if (incoming?.worldVersion !== HOUSE_WORLD_VERSION) { suspendForUpdate(incoming?.worldVersion); return false; }
    const accepted = reducer.accept(incoming);
    if (accepted) revokedWithoutHead = false;
    return accepted;
  }
  const hasCompatibleHead = () => !updateRequired && latestLive?.worldVersion === HOUSE_WORLD_VERSION;
  function settle(reply) {
    if (!reply || reply.ok !== true) throw problem(reply?.code ?? 'UNAVAILABLE', reply?.message ?? 'The house did not acknowledge this action.');
    return reply;
  }
  async function ask(event, body) {
    requireCompatible();
    if (!socket?.connected) throw problem('PENDING', 'Connection unavailable. This action is not saved.');
    try { const reply = await socket.timeout(5000).emitWithAck(event, body); if (reply?.code === 'CLIENT_UPDATE_REQUIRED') throw suspendForUpdate(null); return settle(reply); }
    catch (error) { if (error?.[domainProblem]) throw error; throw problem('PENDING', 'Acknowledgement timed out. This action is pending.'); }
  }
  async function subscribe(zoneId = selectedZone) {
    requireCompatible();
    if (closed) throw problem('CLOSED', 'This house connection is closed.');
    const request = ++requestGeneration;
    selectedZone = zoneId; sequence = 0; reducer.selectZone(zoneId);
    try {
      const reply = await ask('house.subscribe', { zoneId, controllerToken });
      if (request !== requestGeneration || closed) throw problem('STALE_ZONE', 'A newer room request replaced this one.');
      if (!acceptLive(reply.snapshot)) throw updateRequired ?? problem('STALE_ZONE', 'The house has not confirmed this room yet.');
      void flush(); return { ...reply, snapshot: clone(latestLive) };
    } catch (error) {
      if (!closed && !updateRequired && request === requestGeneration) {
        const fallbackRequest = ++requestGeneration;
        selectedZone = 'lounge'; sequence = 0; reducer.selectZone('lounge');
        if (zoneId !== 'lounge' && socket?.connected && ['FORBIDDEN', 'INVALID_INPUT'].includes(error.code)) {
          try {
            const fresh = await ask('house.subscribe', { zoneId: 'lounge', controllerToken });
            if (!closed && fallbackRequest === requestGeneration && acceptLive(fresh.snapshot)) void flush();
          } catch { /* A denied fallback stays cleared until a later authorised subscription. */ }
        }
      }
      report(error); throw error;
    }
  }
  function makeSocket() {
    if (typeof globalThis.io !== 'function') throw problem('TRANSPORT_UNAVAILABLE', 'The house connection script did not load.');
    socket = globalThis.io({ auth: { worldVersion: HOUSE_WORLD_VERSION }, autoConnect: false, transports: ['websocket'], reconnection: true, reconnectionDelay: 500, reconnectionDelayMax: 3000 });
    socket.on('connect', () => {
      connectionGeneration++; puzzleSequence = 0; clearPuzzleIntent();
      const waiting = connectWait; connectWait = null;
      subscribe(selectedZone).then(value => waiting?.resolve(value)).catch(error => waiting?.reject(error));
    });
    socket.on('house.snapshot', snapshot => { if (closed) return; if (acceptLive(snapshot)) void flush(); });
    socket.on('house.motion', motion => { if (closed || updateRequired) return; if (motion?.worldVersion !== HOUSE_WORLD_VERSION) { suspendForUpdate(motion?.worldVersion); return; } if (hasCompatibleHead()) reducer.motion(motion); });
    socket.on('house.revoked', message => {
      if (closed || !reducer.revoke(message)) return;
      revokedWithoutHead = true;
      requestGeneration++; selectedZone = 'lounge'; sequence = 0;
      report(problem(message.code ?? 'FORBIDDEN', 'Room access changed. Private room content was cleared.'));
    });
    socket.on('disconnect', reason => {
      if (closed) return; requestGeneration++;
      // Membership loss uses revoked -> disconnect. A normal room fallback sends a fresh head.
      if (revokedWithoutHead) reducer.clearPrivate(true); else reducer.clear();
      revokedWithoutHead = false; onDisconnect(reason);
    });
    socket.on('connect_error', error => {
      if (closed) return;
      // Socket.IO namespace middleware carries domain failures in Error.data.
      const failure = typeof error?.data?.code === 'string'
        ? problem(error.data.code, typeof error.message === 'string' ? error.message : 'The house connection could not start.')
        : error;
      if (failure?.code === 'CLIENT_UPDATE_REQUIRED') { suspendForUpdate(null); return; }
      if (['UNAUTHENTICATED', 'IDENTITY_REVOKED'].includes(failure?.code)) reducer.clearPrivate(true);
      report(failure); const waiting = connectWait; connectWait = null; waiting?.reject(failure);
    });
  }
  function connect() {
    if (updateRequired) return Promise.reject(updateRequired);
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
    requireCompatible();
    const request = requestGeneration; assertActive(request); assertIdentity(entry.identityId);
    if (inFlight.has(entry.command.commandId)) {
      const reply = await inFlight.get(entry.command.commandId); assertActive(request); return reply;
    }
    const stored = outbox.all().find(value => value.command.commandId === entry.command.commandId);
    if (!stored) throw problem('PENDING_NOT_FOUND', 'This draft was discarded before it was sent.');
    if (JSON.stringify(stored) !== JSON.stringify(entry)) throw problem('COMMAND_ID_REUSED', 'This UUID already belongs to another draft.');
    const work = (async () => {
      let reply;
      if (hasCompatibleHead() && latestLive?.controller && socket?.connected) {
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
      if (error.code && !['PENDING', 'STORAGE_UNAVAILABLE', 'NOT_CONTROLLER', 'STALE_ZONE', 'CLOSED', 'IDENTITY_CHANGED', 'CLIENT_UPDATE_REQUIRED', 'ACTIVITY_SEAT_REQUIRED'].includes(error.code)) {
        try { outbox.remove(entry.command.commandId); } catch (cleanupError) { report(cleanupError); }
      }
      throw error;
    }
    finally { inFlight.delete(entry.command.commandId); }
  }
  async function command(intent) {
    requireCompatible();
    const request = requestGeneration; assertActive(request);
    let next;
    try { next = clone({ ...intent, commandId: intent.commandId ?? globalThis.crypto.randomUUID() }); }
    catch { throw report(problem('INVALID_INPUT', 'This command needs a valid UUID and bounded payload.')); }
    if (!lobbyTypes.has(next.type) && !next.houseId) {
      if (!latestLive?.durable.house?.id) throw report(problem('NOT_CONTROLLER', 'Enter the original house before creating this draft.'));
      next.houseId = latestLive.durable.house.id;
    }
    if (puzzleTypes.has(next.type)) {
      const original = outbox.all().find(entry => entry.command.commandId === next.commandId)?.command;
      if (!plainObject(next.payload)) throw report(problem('INVALID_INPUT', 'This picture action needs its original context.'));
      if (next.type === 'puzzle.start') {
        if (next.payload.confirmUnfinished === true && (!capturedAuthority(next.payload.authority) || !capturedRoster(next.payload.expectedRoster)
          || typeof next.payload.expectedRoundId !== 'string' || !uuid.test(next.payload.expectedRoundId) || !nonnegative(next.expectedRevision))) {
          throw report(problem('INVALID_INPUT', 'Confirm the unfinished picture using its original table, round and participant context.'));
        }
        if (next.payload.authority === undefined || next.payload.expectedRoster === undefined) {
          if (!original && latestLive?.durable.puzzle?.current && !latestLive.durable.puzzle.current.completed) throw report(problem('INVALID_INPUT', 'Confirm the unfinished picture before starting a replacement.'));
          if (!original && (!hasCompatibleHead() || !latestLive?.controller || latestLive.durable.zoneId !== 'lounge' || !latestLive.puzzleRoster)) throw report(problem('NOT_CONTROLLER', 'Open the current picture table before starting a picture.'));
          next.payload.authority ??= clone(original?.payload.authority ?? { serverEpoch: latestLive.serverEpoch, accessGeneration: latestLive.accessGeneration, generation: latestLive.generation });
          next.payload.expectedRoster ??= clone(original?.payload.expectedRoster ?? { serverEpoch: latestLive.puzzleRoster.serverEpoch, revision: latestLive.puzzleRoster.revision });
        }
      } else if (next.payload.participationId === undefined) {
        const participationId = original?.payload.participationId ?? latestLive?.puzzleRoster?.selfParticipationId;
        if (!participationId || (!original && (latestLive?.durable.zoneId !== 'lounge' || latestLive?.puzzleRoster?.roundId !== next.payload.roundId))) throw report(problem('PUZZLE_NOT_JOINED', 'Join this picture before placing a piece.'));
        next.payload.participationId = participationId;
      }
    }
    let identityId = latestLive?.durable.selfId;
    if (!identityId) {
      const context = await identityContext(); assertActive(request); identityId = context.identityId;
    }
    assertActive(request); assertIdentity(identityId);
    const zoneId = next.type === 'chat.send' ? next.payload?.zoneId : selectedZone;
    const entry = outbox.add(next, identityId, zoneId);
    if(entry.recoveryHeld)throw report(problem('INSPECTION_REQUIRED','This original draft is held for recovery. Choose Retry in Pending drafts.'));
    if (Date.now() - entry.createdAt > DAY) throw report(problem('INSPECTION_REQUIRED', 'Inspect this expired draft and choose Retry in the pending-actions panel.'));
    try { const reply = await sendEntry(entry); assertActive(request); return reply; } catch (error) { report(error); throw error; }
  }
  function automaticSeatEligible(entry) {
    if(entry.command.type==='game.leave'||!(/^(game|puzzle)\./.test(entry.command.type)))return true;
    return Boolean(latestLive?.durable.zoneId==='lounge'&&latestLive.players.some(player=>player.id===latestLive.durable.selfId&&player.connected&&player.zoneId==='lounge'&&/^game-seat-[1-6]$/.test(player.seatId)));
  }
  async function flush() {
    if (flushing || closed || !hasCompatibleHead() || !latestLive?.controller || !socket?.connected) return;
    flushing = true;
    try {
      const queuedIds = outbox.eligible(latestLive.durable.selfId, latestLive.durable.zoneId, Date.now(), latestLive.durable.house.id).map(entry => entry.command.commandId);
      for (const commandId of queuedIds) {
        if (closed || !hasCompatibleHead() || !latestLive?.controller || !socket?.connected) break;
        // A previous ACK can take seconds; discard, expiry and scope may have changed.
        const entry = outbox.eligible(latestLive.durable.selfId, latestLive.durable.zoneId, Date.now(), latestLive.durable.house.id).find(value => value.command.commandId === commandId);
        if (!entry || !automaticSeatEligible(entry)) continue;
        try { await sendEntry(entry); } catch (error) { report(error); if (['PENDING', 'STORAGE_UNAVAILABLE', 'STALE_ZONE', 'NOT_CONTROLLER', 'CLIENT_UPDATE_REQUIRED'].includes(error.code)) break; }
      }
    } catch (error) { report(error); }
    finally { flushing = false; }
  }
  function sendPuzzleIntent(pending) {
    if (pending.flight) return pending.flight;
    const current = () => puzzlePending === pending && pending.connection === connectionGeneration && pending.scope === puzzleScope(latestLive)
      && !closed && !updateRequired && socket?.connected;
    pending.state = 'sending'; onPuzzleIntent(pendingPuzzleIntent());
    const work = (async () => {
      try {
        let reply;
        try { reply = await socket.timeout(5000).emitWithAck('house.puzzle.intent', pending.body); }
        catch { throw problem('PENDING', 'Participation acknowledgement timed out. Retry this same request or choose Leave.'); }
        if (reply?.code === 'CLIENT_UPDATE_REQUIRED') throw suspendForUpdate(null);
        if (!current()) throw updateRequired ?? problem('STALE_INTENT', 'A newer action or house connection replaced this participation request.');
        const body = pending.body;
        if ((reply?.requestId !== undefined && reply.requestId !== body.requestId)
          || (reply?.intentSequence !== undefined && reply.intentSequence !== body.intentSequence)) throw problem('PENDING', 'Participation acknowledgement could not be matched. Retry this same request.');
        settle(reply);
        if (reply.requestId !== body.requestId || reply.intentSequence !== body.intentSequence || reply.mode !== body.mode || reply.roundId !== body.roundId
          || !Number.isSafeInteger(reply.rosterRevision) || reply.rosterRevision < 0
          || (body.mode === 'leave' ? reply.participationId !== null : typeof reply.participationId !== 'string' || !uuid.test(reply.participationId))) {
          throw problem('PENDING', 'Participation acknowledgement could not be matched. Retry this same request.');
        }
        // Historical ACKs resolve only their request. Accepted snapshots own participation.
        clearPuzzleIntent(); return reply;
      } catch (error) {
        if (!current()) throw updateRequired ?? problem('STALE_INTENT', 'A newer action or house connection replaced this participation request.');
        if (error.code === 'PENDING') pending.state = 'pending'; else clearPuzzleIntent();
        report(error); throw error;
      } finally {
        pending.flight = null;
        if (puzzlePending === pending) onPuzzleIntent(pendingPuzzleIntent());
      }
    })();
    pending.flight = work; return work;
  }
  async function puzzleIntent(mode, roundId) {
    requireCompatible();
    if (closed) throw report(problem('CLOSED', 'This house connection is closed.'));
    if (!socket?.connected) throw report(problem('PENDING', 'Connection unavailable. Participation was not sent.'));
    if (!hasCompatibleHead() || !latestLive?.controller || latestLive.durable.zoneId !== 'lounge') throw report(problem('NOT_CONTROLLER', 'Take control in the lounge before joining or leaving the picture table.'));
    assertIdentity(latestLive.durable.selfId);
    if (!['join', 'leave'].includes(mode) || typeof roundId !== 'string' || !uuid.test(roundId) || puzzleSequence >= Number.MAX_SAFE_INTEGER) throw report(problem('INVALID_INPUT', 'Choose Join or Leave for the current picture.'));
    const body = Object.freeze({ generation: latestLive.generation, zoneId: 'lounge', serverEpoch: latestLive.serverEpoch,
      accessGeneration: latestLive.accessGeneration, intentSequence: ++puzzleSequence, requestId: globalThis.crypto.randomUUID(), roundId, mode });
    puzzlePending = { body, scope: puzzleScope(latestLive), connection: connectionGeneration, state: 'sending', flight: null };
    return sendPuzzleIntent(puzzlePending);
  }
  async function retryPuzzleIntent() {
    requireCompatible();
    const pending = puzzlePending;
    if (!pending) throw report(problem('PENDING_NOT_FOUND', 'There is no pending participation request. Choose Join or Leave deliberately.'));
    if (pending.scope !== puzzleScope(latestLive) || pending.connection !== connectionGeneration || !socket?.connected || closed) {
      clearPuzzleIntent(); throw report(problem('STALE_INTENT', 'The original participation authority changed. Choose Join or Leave again.'));
    }
    return sendPuzzleIntent(pending);
  }
  function controlled(event, body = {}, transformError = error => error) {
    if (updateRequired) return Promise.reject(updateRequired);
    if (!hasCompatibleHead() || !latestLive?.controller) return Promise.reject(report(problem('NOT_CONTROLLER', 'Take control in this tab first.')));
    return ask(event, { generation: latestLive.generation, ...body }).catch(error => { const failure = transformError(error); report(failure); throw failure; });
  }
  function claimSeat(seatId) {
    // Do not latch a request that cannot be emitted. Keep the existing authority
    // and connection errors, including compatibility recovery, unchanged.
    if (updateRequired || !hasCompatibleHead() || !latestLive?.controller || !socket?.connected) return controlled('house.seat', { seatId });
    if (seatClaim) return Promise.reject(report(seatPendingProblem()));
    const player = latestLive.players.find(value => value.id === latestLive.durable.selfId);
    const claim = { scope: seatScope(latestLive), connection: connectionGeneration,
      seatGeneration: player?.seatGeneration, ack: false, standHeadAfter: null };
    seatClaim = claim; // Set before emission; even an immediate RAF cannot overtake it.
    return controlled('house.seat', { seatId }, error => {
      if (seatClaim !== claim) return error;
      if (error.code === 'PENDING') return seatPendingProblem();
      seatClaim = null; return error;
    }).then(reply => {
      if (seatClaim === claim) { claim.ack = true; reconcileSeatClaim(latestLive); }
      return reply;
    });
  }
  function stand() {
    const claim = seatClaim;
    return controlled('house.stand', {}, error => seatClaim === claim && claim && error.code === 'PENDING' ? seatPendingProblem() : error).then(reply => {
      if (claim && seatClaim === claim) claim.standHeadAfter = seatHead;
      return reply;
    });
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
    if (updateRequired) return updateRequired;
    if (closed) return problem('CLOSED', 'This house connection is closed.');
    if (hasCompatibleHead() && latestLive?.controller && socket?.connected) {
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
      entries: own.map(entry => ({ commandId: entry.command.commandId, type: entry.command.type, label: entry.command.type === 'puzzle.start' ? 'Start picture' : entry.command.type === 'puzzle.place' ? 'Place picture piece' : entry.command.type, createdAt: entry.createdAt,
        houseId: entry.houseId ?? null, zoneId: entry.zoneId, state: now - entry.createdAt > DAY ? 'expired' : 'pending',
        command: entry.command, recoveryHeld:entry.recoveryHeld===true, canRetry: now >= entry.createdAt && !inFlight.has(entry.command.commandId) && retryScope(entry, identityId) === null })),
      otherIdentityCount: all.length - own.length, total: all.length,
    };
  }
  async function ownPending(commandId) {
    const { identityId, request } = await identityContext(); assertActive(request);
    const entry = outbox.all().find(value => value.identityId === identityId && value.command.commandId === commandId);
    if (!entry) throw problem('PENDING_NOT_FOUND', 'This identity has no pending draft with that command ID.');
    return { identityId, entry, request };
  }
  async function holdPending(commandId) {
    try {
      const {entry,request}=await ownPending(commandId);assertActive(request);
      if(inFlight.has(commandId))throw problem('PENDING_IN_FLIGHT','This action is already awaiting a reply. Wait before moving its recovery context.');
      const held=outbox.hold(entry.command.commandId);assertActive(request);return {commandId:held.command.commandId,recoveryHeld:true};
    }catch(error){report(error);throw error;}
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
    connect, subscribe, command, getPending, holdPending, retryPending, discardPending, discardOtherIdentities, exportPending,
    getRoomHttpAuthority() {
      if (closed || !hasCompatibleHead() || !latestLive?.controller || !socket?.connected) throw problem('NOT_CONTROLLER', 'Take control in the current room first.');
      const self = latestLive.players.find(player => player.id === latestLive.durable.selfId);
      return { generation: latestLive.generation, accessGeneration: latestLive.accessGeneration, controllerToken, zoneId: latestLive.durable.zoneId, seatId: self?.seatId ?? null, seatGeneration: self?.seatGeneration };
    },
    puzzleIntent, retryPuzzleIntent, pendingPuzzleIntent,
    move(position) {
      if (closed || !hasCompatibleHead() || !latestLive?.controller || !socket?.connected || motionFlight || seatClaim
        || latestLive.players.find(player => player.id === latestLive.durable.selfId)?.seatId) return false;
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
    claimSeat, stand,
    async takeover() {
      requireCompatible(); const reply = await ask('house.takeover', { controllerToken }); sequence = 0;
      if (!acceptLive(reply.snapshot)) throw updateRequired ?? problem('STALE_ZONE', 'The house has not confirmed control yet.');
      return reply;
    },
    close() {
      if (closed) return; closed = true; requestGeneration++;
      connectWait?.reject(problem('CLOSED', 'The house connection closed.')); connectWait = null;
      socket?.disconnect(); reducer.clearPrivate(true);
    },
  };
}


/** Inspect/recover local drafts in the lobby without constructing a socket.
 * @param {{storage?:OutboxStorage,fetchMe?:()=>Promise<any>,onError?:(error:any)=>void,expectedIdentityId?:string}} [options]
 */
export function createPendingInspector(options = {}) {
  const client = createHouseClient(options);
  return { getPending: client.getPending, holdPending:client.holdPending, retryPending: client.retryPending, discardPending: client.discardPending,
    discardOtherIdentities: client.discardOtherIdentities, exportPending: client.exportPending, command: client.command,
    close: client.close };
}
