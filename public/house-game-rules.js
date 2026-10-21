/**
 * Pure, immutable Four-in-a-row transitions. State, identities, round IDs and
 * server time are supplied by the adapter. No DOM, transport, storage or receipts.
 *
 * Call and persist advanceGameTime BEFORE each action/event in an independently
 * committed maintenance step. A rejected action returns the original state;
 * the adapter must not roll expired-state cleanup back with a rejected command.
 */
export const GAME_ROWS = 6;
export const GAME_COLUMNS = 7;
export const WAITING_MS = 90_000;
export const READY_MS = 60_000;
export const RECOVERY_MS = 90_000;
export const INACTIVITY_MS = 300_000;
export const MAX_GAME_ID_LENGTH = 80;

export function emptyGameTable() {
  return { revision: 0, rosterRevision: 0, current: null, latestResult: null };
}

const validId = value => typeof value === 'string' && value.length > 0 && value.length <= MAX_GAME_ID_LENGTH;
const response = (state, code, changed = false, ok = true) => ({ ok, code, changed, state });
const reject = (state, code) => response(state, code, false, false);
const clone = state => structuredClone(state);
function checkTime(now) {
  if (!Number.isSafeInteger(now) || now < 0 || now > Number.MAX_SAFE_INTEGER - INACTIVITY_MS) {
    throw new RangeError('Server time must be a non-negative safe millisecond timestamp.');
  }
}
// A wall-clock correction cannot make a saved move/end precede its round.
// Infer a time floor from durable fields; no extra state or periodic writes.
function roundTime(round, now) {
  if (!round) return now;
  return Math.max(now, round.waitingDeadlineAt - WAITING_MS, round.startedAt ?? 0, round.lastMoveAt ?? 0,
    round.recoveryDeadlineAt === null ? 0 : round.recoveryDeadlineAt - RECOVERY_MS,
    ...round.ready.map(ready => ready ? ready.expiresAt - READY_MS : 0));
}
function idleDeadline(round) { return round.lastMoveAt + INACTIVITY_MS; }
function maintenanceDue(round, now) {
  if (!round) return false;
  if (round.status === 'waiting') {
    return now >= round.waitingDeadlineAt || round.ready.some(ready => ready && now >= ready.expiresAt);
  }
  return now >= idleDeadline(round) || (round.status === 'paused' && now >= round.recoveryDeadlineAt);
}
function initialRound(roundId, now) {
  return {
    roundId, status: 'waiting', players: [null, null], ready: [null, null],
    cells: Array(GAME_ROWS * GAME_COLUMNS).fill(null), turn: 0, lastMove: null,
    waitingDeadlineAt: now + WAITING_MS, startedAt: null, lastMoveAt: null,
    recoveryDeadlineAt: null, resumeRevision: 0, resume: [false, false],
  };
}
function rosterChanged(state) {
  state.rosterRevision++;
  state.current.ready = [null, null];
}
function removeWaitingPlayer(state, slot) {
  state.current.players[slot] = null;
  rosterChanged(state);
  if (state.current.players.every(player => player === null)) state.current = null;
}
function finish(state, reason, now, winner = null) {
  const round = state.current;
  state.latestResult = {
    roundId: round.roundId, players: round.players.slice(), cells: round.cells.slice(),
    lastMove: round.lastMove && { ...round.lastMove }, startedAt: round.startedAt,
    endedAt: now, reason, winner,
  };
  state.current = null;
  state.rosterRevision++;
}
function bothControlled(round, authority) {
  return round.players.every(player => player !== null && authority.controlledInLounge.includes(player));
}
function hasFour(cells, row, column, slot) {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    let length = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign, c = column + dc * sign;
      while (r >= 0 && r < GAME_ROWS && c >= 0 && c < GAME_COLUMNS && cells[r * GAME_COLUMNS + c] === slot) {
        length++; r += dr * sign; c += dc * sign;
      }
    }
    if (length >= 4) return true;
  }
  return false;
}

/** Cleanup is explicit and idempotent. No write is needed while no deadline is due. */
export function advanceGameTime(state, now) {
  checkTime(now);
  now = roundTime(state.current, now);
  const round = state.current;
  if (!maintenanceDue(round, now)) return response(state, 'unchanged');
  const next = clone(state);
  next.revision++;
  if (round.status === 'waiting') {
    if (now >= round.waitingDeadlineAt) {
      next.current = null;
      next.rosterRevision++;
    } else {
      next.current.ready = round.ready.map(ready => ready && now >= ready.expiresAt ? null : ready);
    }
  } else {
    const recoveryFirst = round.status === 'paused' && round.recoveryDeadlineAt < idleDeadline(round);
    finish(next, recoveryFirst ? 'recovery_expired' : 'inactive', now);
  }
  return response(next, 'advanced', true);
}

/**
 * The authority object contains trusted server-derived facts, not client claims.
 * Join serializes slots; Ready serializes the roster; Move serializes position.
 * Leave identifies this actor and round only, so a racing move cannot trap them.
 */
export function applyGameAction(state, action, authority, now) {
  checkTime(now);
  now = roundTime(state.current, now);
  if (!authority || authority.isMember !== true) return reject(state, 'member_required');
  if (authority.isController !== true) return reject(state, 'controller_required');
  if (authority.inLounge !== true) return reject(state, 'lounge_required');
  if (!validId(authority.actorId)) return reject(state, 'invalid_actor');
  if (!action || !['join', 'leave', 'ready', 'move', 'resume'].includes(action.type)) return reject(state, 'invalid_action');
  if (!validId(action.roundId)) return reject(state, 'invalid_round');
  if (maintenanceDue(state.current, now)) return reject(state, 'maintenance_required');
  const round = state.current;
  if (round && round.roundId !== action.roundId) return reject(state, 'wrong_round');
  if (!round && action.type !== 'join') return reject(state, 'wrong_round');

  if (action.type === 'join') {
    if (action.expectedRevision !== state.revision) return reject(state, 'stale_revision');
    if (round && round.status !== 'waiting') return reject(state, 'not_waiting');
    // The adapter must never recycle ANY round ID; this only catches the retained result.
    if (!round && state.latestResult?.roundId === action.roundId) return reject(state, 'wrong_round');
    if (round?.players.includes(authority.actorId)) return reject(state, 'already_joined');
    const slot = round ? round.players.indexOf(null) : 0;
    if (slot === -1) return reject(state, 'table_full');
    const next = clone(state);
    next.current ??= initialRound(action.roundId, now);
    next.current.players[slot] = authority.actorId;
    rosterChanged(next); next.revision++;
    return response(next, 'joined', true);
  }

  const slot = round.players.indexOf(authority.actorId);
  if (slot === -1) return reject(state, 'not_seated');
  if (action.type === 'leave') {
    const next = clone(state);
    if (round.status === 'waiting') removeWaitingPlayer(next, slot);
    else finish(next, 'player_left', now);
    next.revision++;
    return response(next, 'left', true);
  }
  if (action.type === 'ready') {
    if (round.status !== 'waiting') return reject(state, 'not_waiting');
    if (action.rosterRevision !== state.rosterRevision) return reject(state, 'stale_roster');
    if (round.players.some(player => player === null)) return reject(state, 'opponent_required');
    if (round.ready[slot]) return response(state, 'already_ready');
    const other = 1 - slot;
    if (round.ready[other] && !bothControlled(round, authority)) return reject(state, 'players_unavailable');
    const next = clone(state);
    next.current.ready[slot] = { rosterRevision: state.rosterRevision, expiresAt: Math.min(now + READY_MS, round.waitingDeadlineAt) };
    if (next.current.ready.every(Boolean)) {
      next.current.status = 'active';
      next.current.startedAt = now; next.current.lastMoveAt = now;
      next.current.ready = [null, null];
    }
    next.revision++;
    return response(next, next.current.status === 'active' ? 'started' : 'ready', true);
  }
  if (action.type === 'resume') {
    if (round.status !== 'paused') return reject(state, 'not_paused');
    if (action.resumeRevision !== round.resumeRevision) return reject(state, 'stale_resume');
    if (round.resume[slot]) return response(state, 'already_resumed');
    if (round.resume[1 - slot] && !bothControlled(round, authority)) return reject(state, 'players_unavailable');
    const next = clone(state);
    next.current.resume[slot] = true;
    if (next.current.resume.every(Boolean)) {
      next.current.status = 'active'; next.current.recoveryDeadlineAt = null;
      next.current.resume = [false, false];
    }
    next.revision++;
    return response(next, next.current.status === 'active' ? 'resumed' : 'resume_ready', true);
  }

  if (round.status !== 'active') return reject(state, 'not_active');
  if (action.expectedRevision !== state.revision) return reject(state, 'stale_revision');
  if (round.turn !== slot) return reject(state, 'not_your_turn');
  if (!Number.isInteger(action.column) || action.column < 0 || action.column >= GAME_COLUMNS) return reject(state, 'invalid_column');
  let row = GAME_ROWS - 1;
  while (row >= 0 && round.cells[row * GAME_COLUMNS + action.column] !== null) row--;
  if (row < 0) return reject(state, 'column_full');
  const next = clone(state), current = next.current;
  current.cells[row * GAME_COLUMNS + action.column] = slot;
  current.lastMove = { row, column: action.column, slot };
  current.lastMoveAt = now;
  next.revision++;
  if (hasFour(current.cells, row, action.column, slot)) finish(next, 'win', now, slot);
  else if (current.cells.every(cell => cell !== null)) finish(next, 'draw', now);
  else current.turn = 1 - slot;
  return response(next, next.current ? 'moved' : next.latestResult.reason, true);
}

/**
 * Adapter-only events, generation-filtered/deduplicated by the realtime authority.
 * Every genuine controlling disconnect invalidates prior recovery consent.
 * Repetition cannot extend deadlines, but must not masquerade as client commands.
 */
export function applyGameEvent(state, event, now) {
  checkTime(now);
  now = roundTime(state.current, now);
  if (!event || !['disconnect', 'depart', 'restart'].includes(event.type)) return reject(state, 'invalid_event');
  if (event.type === 'depart' && !['left_lounge', 'member_removed'].includes(event.reason)) return reject(state, 'invalid_event');
  if (maintenanceDue(state.current, now)) return reject(state, 'maintenance_required');
  const round = state.current;
  if (!round) return response(state, 'unchanged');
  const slot = event.type === 'restart' ? -1 : round.players.indexOf(event.actorId);
  if (event.type !== 'restart' && slot === -1) return response(state, 'unchanged');
  const next = clone(state);
  if (round.status === 'waiting') {
    if (event.type === 'restart') rosterChanged(next);
    else removeWaitingPlayer(next, slot);
  } else if (event.type === 'depart') {
    finish(next, event.reason, now);
  } else {
    next.current.status = 'paused';
    next.current.recoveryDeadlineAt = Math.min(round.recoveryDeadlineAt ?? Infinity, now + RECOVERY_MS);
    next.current.resumeRevision++;
    next.current.resume = [false, false];
  }
  next.revision++;
  return response(next, event.type === 'restart' ? 'restart_required' : event.type, true);
}

/** Public bounded data only; IDs and validated state are bounded at the adapter. */
export function projectGame(state) { return clone(state); }
