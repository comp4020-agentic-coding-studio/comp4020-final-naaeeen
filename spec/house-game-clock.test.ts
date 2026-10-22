import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { applyGameEvent, advanceGameTime } from "../public/house-game-rules.js";
import { HouseStore } from "../src/house-store.ts";
import type { HouseCommand, HouseGameControl } from "../src/house-contract.ts";

const stores: HouseStore[] = [];
afterEach(() => { for (const store of stores.splice(0)) store.close(); vi.restoreAllMocks(); });
function fixture() {
  const initial = Date.now(), clock = vi.spyOn(Date, "now").mockReturnValue(initial);
  const store = new HouseStore(":memory:"); stores.push(store);
  const people = [store.ensureSession(), store.ensureSession()];
  store.execute(people[0]!.id, { commandId: randomUUID(), type: "house.create", payload: { name: "A", colour: "sage", capacity: 2 } });
  const house = store.me(people[0]!.id).home!;
  store.execute(people[1]!.id, { commandId: randomUUID(), type: "house.join", payload: { name: "B", colour: "rose", code: house.code } });
  const control: HouseGameControl = { isController: true, zoneId: "lounge", activitySeat: { seatId: "game-seat-1", purpose: "game" }, controlledAtActivityTable: people.map(person => person.id), controlledInLounge: people.map(person => person.id) };
  const game = () => store.snapshot(people[0]!.id).game!;
  const act = (who: number, type: string, payload: Record<string, unknown>, expectedRevision?: number) => store.execute(people[who]!.id, { commandId: randomUUID(), type, houseId: house.id, payload, ...(expectedRevision === undefined ? {} : { expectedRevision }) } satisfies HouseCommand, control);
  act(0, "game.join", { roundId: null }, 0); const roundId = game().current!.roundId;
  act(1, "game.join", { roundId }, game().revision); const rosterRevision = game().rosterRevision;
  act(0, "game.ready", { roundId, rosterRevision }); act(1, "game.ready", { roundId, rosterRevision });
  return { store, people, house, initial, clock, game, act, roundId };
}

describe("game persistence across wall-clock rollback", () => {
  test("legal moves keep saved timestamps ordered and the next snapshot readable", () => {
    const f = fixture(); f.clock.mockReturnValue(f.initial - 1000);
    expect(f.act(0, "game.move", { roundId: f.roundId, column: 0 }, 4).ok).toBe(true);
    const first = f.game(); expect(first.current!.lastMoveAt).toBeGreaterThanOrEqual(first.current!.startedAt!);
    f.clock.mockReturnValue(f.initial - 2000); f.act(1, "game.move", { roundId: f.roundId, column: 1 }, first.revision);
    expect(f.game().current!.lastMoveAt).toBeGreaterThanOrEqual(first.current!.lastMoveAt!);
    expect(() => f.store.maintainGames()).not.toThrow();
  });
  test.each(["leave", "left_lounge", "member_removed"])("%s remains readable when wall time precedes the round start", reason => {
    const f = fixture(); f.clock.mockReturnValue(f.initial - 1000);
    if (reason === "leave") f.act(0, "game.leave", { roundId: f.roundId });
    else if (reason === "left_lounge") f.store.gameLifecycle(f.people[0]!.id, "left_lounge");
    else f.store.execute(f.people[0]!.id, { commandId: randomUUID(), type: "house.remove", houseId: f.house.id, payload: { memberId: f.people[1]!.id } });
    const result = f.game().latestResult!; expect(result.endedAt).toBeGreaterThanOrEqual(result.startedAt);
    expect(f.game().current).toBeNull();expect(result.reason).toBe(reason === "leave" ? "player_left" : reason);
  });
  test("repeated backward-clock restarts preserve the earliest recovery deadline and expire at it", () => {
    const f = fixture();
    const first = applyGameEvent(f.game(), { type: "restart" }, f.initial - 120000).state;
    expect(first.current!.recoveryDeadlineAt!).toBeGreaterThanOrEqual(first.current!.lastMoveAt!);
    const next = applyGameEvent(first, { type: "restart" }, f.initial - 180000).state;
    expect(next.current!.recoveryDeadlineAt).toBe(first.current!.recoveryDeadlineAt);
    expect(advanceGameTime(next, next.current!.recoveryDeadlineAt! - 1).changed).toBe(false);
    const expired = advanceGameTime(next, next.current!.recoveryDeadlineAt!);
    expect(expired.state.current).toBeNull();expect(expired.state.latestResult!.reason).toBe("recovery_expired");
    expect(expired.state.latestResult!.endedAt).toBeGreaterThanOrEqual(expired.state.latestResult!.startedAt);
  });
  test("a backward-clock disconnect does not put recovery before the last move", () => {
    const f = fixture(); f.clock.mockReturnValue(f.initial - 120000);
    f.store.gameLifecycle(f.people[0]!.id, "disconnect");
    const paused = f.game().current!;expect(paused.status).toBe("paused");
    expect(paused.recoveryDeadlineAt!).toBeGreaterThanOrEqual(paused.lastMoveAt!);
    f.act(0, "game.resume", { roundId: f.roundId, resumeRevision: paused.resumeRevision });
    f.act(1, "game.resume", { roundId: f.roundId, resumeRevision: paused.resumeRevision });
    expect(f.game().current!.status).toBe("active");
  });
});
