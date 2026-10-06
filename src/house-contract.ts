/** Shared house interfaces. Identity is always resolved from the server cookie. */
export type Colour = "amber" | "sage" | "rose" | "blue" | "lavender" | "peach";
export interface HouseIdentity { id: string; token: string; digest: string; created: boolean }
export interface Profile { id: string; name: string; colour: Colour; revision: number }
export interface Home { id: string; capacity: number; ownerId: string; code: string }
export interface Resident extends Profile { slot: number; bedroomId: string; open: boolean }
export interface Placement { id: string; kind: string; x: number; z: number; rotation: number; colour: Colour }
export interface Bedroom { id: string; ownerId: string; revision: number; open: boolean; palette: Colour; placements: Placement[] }
export interface Card { id: string; authorId: string; smallGoal: string; question: string; resourceUrl: string; nextStep: string; helpRequested: boolean; state: "active" | "closed" | "ownerLeft"; revision: number }
export interface Chat { id: string; authorId: string; name: string; text: string; at: number; sequence: number }
export interface HouseSnapshot { schemaVersion: 2; selfId: string; house: Home; residents: Resident[]; streamId: string; sequence: number; zoneId: string; room: Bedroom | null; cards: Card[]; chat: Chat[] }
export interface Me { identity: Profile; home: Home | null; archiveCount: number }
export interface HouseCommand { commandId: string; type: string; houseId?: string; expectedRevision?: number; payload: Record<string, unknown> }
export interface HouseReceipt { ok: true; commandId: string; streamId: string; sequence: number; entityRevision: number; result?: Record<string, unknown> }
export interface Player { id: string; name: string; colour: Colour; connected: boolean; zoneId: string; x?: number; z?: number; heading?: number; animation?: "idle" | "walk" | "sit"; seatId?: string | null; availability: "quiet" | "chat"; availabilitySetAt: number; generation: number }
export interface LiveSnapshot { serverEpoch: string; accessGeneration: number; controller: boolean; generation: number; durable: HouseSnapshot; players: Player[] }
export class HouseError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = "HouseError"; this.code = code; }
}
