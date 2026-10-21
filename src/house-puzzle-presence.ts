import { randomUUID } from "node:crypto";
import type { PuzzleCommittedEffect, PuzzleRoster } from "./house-contract.ts";

export interface PuzzleParticipant { actorId: string; socketId: string; generation: number; accessGeneration: number; roundId: string; participationId: string }
interface Roster { roundId: string | null; revision: number; participants: Map<string, PuzzleParticipant> }
// Process-global allocation prevents a pruned/recreated house from reusing consent.
let nextRosterRevision = 0;
const revision = () => ++nextRosterRevision;
/** Only bounded connection facts live here; never a database or deferred callback. */
export class PuzzlePresence {
  private readonly houses = new Map<string, Roster>();
  current(houseId: string, roundId: string | null): Roster {
    let roster = this.houses.get(houseId);
    if (!roster) { roster = { roundId, revision: revision(), participants: new Map() }; this.houses.set(houseId, roster); }
    else if (roster.roundId !== roundId) { roster.roundId = roundId; roster.participants.clear(); roster.revision = revision(); }
    return roster;
  }
  prune(houseId: string, roundId: string | null, valid: (participant: PuzzleParticipant) => boolean): Roster {
    const roster = this.current(houseId, roundId);
    for (const [actor, participant] of roster.participants) if (!valid(participant)) { roster.participants.delete(actor); roster.revision = revision(); }
    return roster;
  }
  join(houseId: string, roundId: string, participant: Omit<PuzzleParticipant, "roundId" | "participationId">): PuzzleParticipant {
    const roster = this.current(houseId, roundId);
    const value = { ...participant, roundId, participationId: randomUUID() };
    roster.participants.set(value.actorId, value); roster.revision = revision(); return value;
  }
  leave(houseId: string, roundId: string, actorId: string): number {
    const roster = this.current(houseId, roundId);
    roster.participants.delete(actorId);
    // Even a pre-Join Leave changes current intent and invalidates reset consent.
    return roster.revision = revision();
  }
  clearConnection(socketId: string): boolean {
    let changed = false;
    for (const roster of this.houses.values()) for (const [actor, participant] of roster.participants) {
      if (participant.socketId === socketId) { roster.participants.delete(actor); roster.revision = revision(); changed = true; }
    }
    return changed;
  }
  clearActor(actorId: string): void {
    for (const roster of this.houses.values()) if (roster.participants.delete(actorId)) roster.revision = revision();
  }
  /** Called immediately after commit. Uses committed facts and memory only. */
  committed(effect: PuzzleCommittedEffect | null): void {
    if (!effect) return;
    const roster = this.current(effect.houseId, effect.roundId);
    if (effect.completed && roster.participants.size) { roster.participants.clear(); roster.revision = revision(); }
  }
  project(serverEpoch: string, houseId: string, roundId: string | null, socketId: string): PuzzleRoster {
    const roster = this.current(houseId, roundId);
    const self = [...roster.participants.values()].find(value => value.socketId === socketId);
    return { serverEpoch, houseId, roundId, revision: roster.revision, memberIds: [...roster.participants.keys()].sort(), selfParticipationId: self?.participationId ?? null };
  }
  retainHouses(houseIds: ReadonlySet<string>): void { for (const houseId of this.houses.keys()) if (!houseIds.has(houseId)) this.houses.delete(houseId); }
  clear(): void { this.houses.clear(); }
}
