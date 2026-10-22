export const GAME_ROWS: 6;
export const GAME_COLUMNS: 7;
export const WAITING_MS: 90000;
export const READY_MS: 60000;
export const RECOVERY_MS: 90000;
export const INACTIVITY_MS: 300000;
export const MAX_GAME_ID_LENGTH: 80;
export type GameSlot = 0 | 1;
export type GameCell = GameSlot | null;
export interface GameReady { readonly rosterRevision: number; readonly expiresAt: number }
export interface GameMove { readonly row: number; readonly column: number; readonly slot: GameSlot }
export interface GameRound {
  readonly roundId: string;
  readonly status: "waiting" | "active" | "paused";
  readonly players: readonly [string | null, string | null];
  readonly ready: readonly [GameReady | null, GameReady | null];
  readonly cells: readonly GameCell[];
  readonly turn: GameSlot;
  readonly lastMove: GameMove | null;
  readonly waitingDeadlineAt: number;
  readonly startedAt: number | null;
  readonly lastMoveAt: number | null;
  readonly recoveryDeadlineAt: number | null;
  readonly resumeRevision: number;
  readonly resume: readonly [boolean, boolean];
}
export type GameEndReason = "win" | "draw" | "player_left" | "left_lounge" | "member_removed" | "seat_lost" | "recovery_expired" | "inactive";
export interface GameResult {
  readonly roundId: string;
  readonly players: readonly [string, string];
  readonly cells: readonly GameCell[];
  readonly lastMove: GameMove | null;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly reason: GameEndReason;
  readonly winner: GameSlot | null;
}
export interface GameTable {
  readonly revision: number;
  readonly rosterRevision: number;
  readonly current: GameRound | null;
  readonly latestResult: GameResult | null;
}
/** Trusted server-derived facts, never a client identity or authentication claim. */
export interface GameAuthority {
  readonly actorId: string;
  readonly isMember: boolean;
  readonly isController: boolean;
  readonly inLounge: boolean;
  readonly controlledInLounge: readonly string[];
}
/** Round creation IDs are supplied and validated by the adapter, never by rules. */
export type GameAction =
  | { readonly type: "join"; readonly roundId: string; readonly expectedRevision: number }
  | { readonly type: "leave"; readonly roundId: string }
  | { readonly type: "ready"; readonly roundId: string; readonly rosterRevision: number }
  | { readonly type: "move"; readonly roundId: string; readonly expectedRevision: number; readonly column: number }
  | { readonly type: "resume"; readonly roundId: string; readonly resumeRevision: number };
/** Adapter-only, generation-filtered/deduplicated events; observers cannot emit these. */
export type GameEvent =
  | { readonly type: "disconnect"; readonly actorId: string }
  | { readonly type: "depart"; readonly actorId: string; readonly reason: "left_lounge" | "member_removed" | "seat_lost" }
  | { readonly type: "restart" };
export interface GameTransition {
  readonly ok: boolean;
  readonly code: string;
  readonly changed: boolean;
  readonly state: GameTable;
}
export function emptyGameTable(): GameTable;
/** Persist cleanup independently before attempting an action/event. Rejections do no cleanup. */
export function advanceGameTime(state: GameTable, now: number): GameTransition;
export function applyGameAction(state: GameTable, action: GameAction, authority: GameAuthority, now: number): GameTransition;
export function applyGameEvent(state: GameTable, event: GameEvent, now: number): GameTransition;
export function projectGame(state: GameTable): GameTable;
