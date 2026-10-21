import { getPuzzleIllustration } from './house-puzzle-content.js';

/** @typedef {import('./house-puzzle-content.js').PuzzlePieceId} PuzzlePieceId */
/** @typedef {{pieceId: PuzzlePieceId, destination: number, actorId: string}} PuzzlePlacement */
/** @typedef {{id: string, ruleset: 1, illustrationId: 'rainy-nook', illustrationVersion: 1, illustrationDigest: string, placements: PuzzlePlacement[], completed: boolean}} PuzzleRound */
/** @typedef {{revision: number, current: PuzzleRound | null}} PuzzleTable */
/** @typedef {{ok: boolean, code: string, changed: boolean, state: PuzzleTable}} PuzzleTransition */

/** @returns {PuzzleTable} */
export function emptyPuzzleTable() { return { revision: 0, current: null }; }
/** @param {PuzzleTable} state @param {string} code @param {boolean} [ok] @returns {PuzzleTransition} */
function result(state, code, ok = false) { return { ok, code, changed: false, state }; }

/** Adapter supplies a fresh server UUID and performs authority/replacement checks.
 * @param {PuzzleTable} state @param {string} roundId @param {unknown} illustrationId @param {unknown} illustrationVersion
 * @returns {PuzzleTransition}
 */
export function startPuzzle(state, roundId, illustrationId, illustrationVersion) {
  const art = getPuzzleIllustration(illustrationId, illustrationVersion);
  if (!art) return result(state, 'INVALID_INPUT');
  if (!Number.isSafeInteger(state.revision + 1)) return result(state, 'STORAGE_UNAVAILABLE');
  return { ok: true, code: 'started', changed: true, state: { revision: state.revision + 1,
    current: { id: roundId, ruleset: 1, illustrationId: art.id, illustrationVersion: art.version,
      illustrationDigest: art.digest, placements: [], completed: false } } };
}

/** Independent correct pieces compose without a global revision precondition.
 * @param {PuzzleTable} state @param {{roundId: string, pieceId: unknown, destination: unknown}} action @param {string} actorId
 * @returns {PuzzleTransition}
 */
export function placePuzzlePiece(state, action, actorId) {
  const round = state.current;
  if (!round || round.id !== action.roundId) return result(state, 'PUZZLE_STALE_ROUND');
  if (round.completed) return result(state, 'PUZZLE_COMPLETE');
  const art = getPuzzleIllustration(round.illustrationId, round.illustrationVersion);
  const piece = art?.pieces.find(piece => piece.id === action.pieceId);
  if (!piece || !Number.isInteger(action.destination) || action.destination < 0 || action.destination >= 24) return result(state, 'INVALID_INPUT');
  if (round.placements.some(placement => placement.pieceId === piece.id)) return result(state, 'PUZZLE_PIECE_TAKEN');
  if (piece.destination !== action.destination) return result(state, 'PUZZLE_WRONG_PLACE');
  if (!Number.isSafeInteger(state.revision + 1)) return result(state, 'STORAGE_UNAVAILABLE');
  const placements = [...round.placements, { pieceId: piece.id, destination: piece.destination, actorId }].sort((a, b) => a.destination - b.destination);
  return { ok: true, code: 'placed', changed: true, state: { revision: state.revision + 1,
    current: { ...round, placements, completed: placements.length === 24 } } };
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === fields.length && fields.every(key => Object.hasOwn(value, key));
/** Strictly validate restored content identity, correct unique placements and bounds.
 * @param {unknown} value @returns {value is PuzzleTable}
 */
export function validPuzzleTable(value) {
  if (!object(value, ['revision', 'current']) || !Number.isSafeInteger(value.revision) || value.revision < 0) return false;
  const round = value.current;
  if (round === null) return value.revision === 0;
  if (!object(round, ['id', 'ruleset', 'illustrationId', 'illustrationVersion', 'illustrationDigest', 'placements', 'completed']) ||
      typeof round.id !== 'string' || round.id.length !== 36 || !uuid.test(round.id) || round.ruleset !== 1 || typeof round.completed !== 'boolean') return false;
  const art = getPuzzleIllustration(round.illustrationId, round.illustrationVersion);
  if (!art || round.illustrationDigest !== art.digest || !Array.isArray(round.placements) || round.placements.length > 24 ||
      value.revision < round.placements.length + 1 || round.completed !== (round.placements.length === 24)) return false;
  let previous = -1;
  for (const placement of round.placements) {
    if (!object(placement, ['pieceId', 'destination', 'actorId']) || typeof placement.actorId !== 'string' || placement.actorId.length !== 36 || !uuid.test(placement.actorId)) return false;
    const piece = art.pieces.find(piece => piece.id === placement.pieceId);
    if (!piece || placement.destination !== piece.destination || piece.destination <= previous) return false;
    previous = piece.destination;
  }
  return true;
}
