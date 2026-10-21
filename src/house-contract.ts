import type { GameTable } from "../public/house-game-rules.js";
import type { PuzzleTable } from "../public/house-puzzle-rules.js";
export type { PuzzleTable, PuzzleRound, PuzzlePlacement, PuzzlePieceId } from "../public/house-puzzle-rules.js";
/** Shared house interfaces. Identity is always resolved from the server cookie. */
export type Colour = "amber" | "sage" | "rose" | "blue" | "lavender" | "peach";
export interface HouseIdentity { id: string; token: string; digest: string; created: boolean }
export interface Profile { id: string; name: string; colour: Colour; revision: number }
export interface Home { id: string; capacity: number; ownerId: string; code: string }
export interface Resident extends Profile { slot: number; bedroomId: string; open: boolean }
export interface Placement { id: string; kind: string; x: number; z: number; rotation: number; colour: Colour }
export type RoomLight = "standard" | "cosy" | "dim";
export interface Bedroom { id: string; ownerId: string; revision: number; open: boolean; palette: Colour; placements: Placement[]; light: RoomLight; originPresetId: string | null; originPresetVersion: number | null }
export interface Card { id: string; authorId: string; smallGoal: string; question: string; resourceUrl: string; nextStep: string; helpRequested: boolean; state: "active" | "closed" | "ownerLeft"; revision: number }
export interface Chat { id: string; authorId: string; name: string; text: string; at: number; sequence: number }
export interface OwnWork { streamId: string; sequence: number; card: Card | null }
export interface PuzzleAuthority { readonly serverEpoch: string; readonly accessGeneration: number; readonly generation: number }
/** Trusted connection facts, captured synchronously before a store transaction. */
export interface PuzzleControl { readonly authority: PuzzleAuthority; readonly rosterRevision: number; readonly memberIds: readonly string[]; readonly participationId: string | null; readonly roundId: string | null }
export interface HouseGameControl { readonly isController: true; readonly zoneId: "lounge"; readonly controlledInLounge: readonly string[]; readonly puzzle?: PuzzleControl }
export interface PuzzleRoster { serverEpoch: string; houseId: string; roundId: string | null; revision: number; memberIds: string[]; selfParticipationId: string | null }
export type PuzzleCommittedEffect = { houseId: string; roundId: string; completed: boolean };
export interface HouseExecution { receipt: HouseReceipt; effect: PuzzleCommittedEffect | null }
export interface HouseVoice { url: string | null; revision: number }
export interface HouseSnapshot { puzzle: PuzzleTable | null; voice: HouseVoice; game: GameTable | null; schemaVersion: 2; selfId: string; house: Home; residents: Resident[]; streamId: string; sequence: number; zoneId: string; room: Bedroom | null; cards: Card[]; chat: Chat[]; ownWork: OwnWork }
export interface Me { identity: Profile; home: Home | null; archiveCount: number }
export interface HouseCommand { commandId: string; type: string; houseId?: string; expectedRevision?: number; payload: Record<string, unknown> }
export interface HouseReceipt { ok: true; commandId: string; streamId: string; sequence: number; entityRevision: number; result?: Record<string, unknown> }
export interface Player { id: string; name: string; colour: Colour; connected: boolean; zoneId: string; x?: number; z?: number; heading?: number; animation?: "idle" | "walk" | "sit"; seatId?: string | null; availability: "quiet" | "chat"; availabilitySetAt: number; generation: number }
export interface LiveSnapshot { puzzleRoster: PuzzleRoster | null; worldVersion: string; serverEpoch: string; accessGeneration: number; controller: boolean; generation: number; durable: HouseSnapshot; players: Player[] }
export class HouseError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = "HouseError"; this.code = code; }
}
