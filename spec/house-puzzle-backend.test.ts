import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, test } from "vitest";
import { HouseStore } from "../src/house-store.ts";
import { PUZZLE_PIECES } from "../public/house-puzzle-content.js";
import type { HouseCommand } from "../src/house-contract.ts";
const cleanup: (() => void)[] = [];
afterEach(() => { for (const fn of cleanup.splice(0).reverse()) fn(); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "house-picture-")), path = join(root, "house.sqlite");
  cleanup.push(() => rmSync(root, { recursive: true, force: true }));
  const store = new HouseStore(path); cleanup.push(() => store.close());
  const people = Array.from({ length: 6 }, () => store.ensureSession());
  store.execute(people[0]!.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 6, name: "Ada", colour: "sage" } });
  const home = store.me(people[0]!.id).home!;
  for (const person of people.slice(1)) store.execute(person.id, { commandId: randomUUID(), type: "house.join", payload: { code: home.code, name: "Friend", colour: "rose" } });
  const command = (type: string, payload: Record<string, unknown>, expectedRevision?: number): HouseCommand => ({ commandId: randomUUID(), type, houseId: home.id, payload, ...(expectedRevision === undefined ? {} : { expectedRevision }) });
  const authority = { serverEpoch: randomUUID(), accessGeneration: 1, generation: 1 };
  const control = { isController: true as const, zoneId: "lounge" as const, controlledInLounge: people.map(p => p.id), puzzle: { authority, rosterRevision: 1, roundId: null as string | null, memberIds: [] as string[], participationId: null as string | null } };
  const start = () => command("puzzle.start", { expectedRoundId: null, illustrationId: "rainy-nook", illustrationVersion: 1, confirmUnfinished: false, authority, expectedRoster: { serverEpoch: authority.serverEpoch, revision: 1 } }, 0);
  return { root, path, store, people, home, command, authority, control, start };
}
const code = (code: string) => expect.objectContaining({ code });
function joined(f: ReturnType<typeof fixture>, actor = 0) {
  const roundId = f.store.snapshot(f.people[0]!.id).puzzle!.current!.id, participationId = randomUUID();
  return { ...f.control, puzzle: { ...f.control.puzzle, roundId, participationId, memberIds: [f.people[actor]!.id] } };
}
function placement(f: ReturnType<typeof fixture>, control: ReturnType<typeof joined>, piece = 0, destination = piece) {
  return f.command("puzzle.place", { roundId: control.puzzle.roundId, participationId: control.puzzle.participationId, pieceId: PUZZLE_PIECES[piece]!.id, destination });
}
describe("durable picture-table foundation", () => {
  test("explicitly starts a bounded saved round without enrolling anyone and hides it in bedrooms", () => {
    const f = fixture(), command = f.start();
    const receipt = f.store.execute(f.people[0]!.id, command, f.control);
    expect(receipt.ok).toBe(true);
    expect(receipt.result).toMatchObject({ roundId: expect.any(String), puzzleRevision: 1 });
    const snapshot = f.store.snapshot(f.people[0]!.id);
    expect(snapshot.puzzle).toMatchObject({ revision: 1, current: { ruleset: 1, illustrationId: "rainy-nook", illustrationVersion: 1, placements: [], completed: false } });
    expect(Buffer.byteLength(JSON.stringify(snapshot.puzzle))).toBeLessThan(8192);
    expect(f.store.snapshot(f.people[0]!.id, snapshot.residents[0]!.bedroomId).puzzle).toBeNull();
    expect(f.store.execute(f.people[0]!.id, command, f.control)).toEqual(receipt);
    expect(f.store.db.prepare("SELECT COUNT(*) AS n FROM puzzle_tables").get()).toEqual({ n: 1 });
    expect(Buffer.byteLength(JSON.stringify(receipt))).toBeLessThanOrEqual(512);
  });
  test("allocates no puzzle row on joining; v4 migration preserves existing rows and receipts", () => {
    const f = fixture(), original = f.command("chat.send", { zoneId: "lounge", text: "saved before migration" }), receipt = f.store.execute(f.people[0]!.id, original);
    expect(f.store.db.prepare("SELECT COUNT(*) AS n FROM puzzle_tables").get()).toEqual({ n: 0 });
    const before = f.store.snapshot(f.people[0]!.id); f.store.close();
    const db = new DatabaseSync(f.path); db.exec("DROP TABLE puzzle_tables; PRAGMA user_version=4"); db.close();
    const migrated = new HouseStore(f.path); cleanup.push(() => migrated.close());
    expect(migrated.db.prepare("PRAGMA user_version").get()).toEqual({ user_version: 5 });
    expect(migrated.snapshot(f.people[0]!.id).residents).toEqual(before.residents);
    expect(migrated.snapshot(f.people[0]!.id).puzzle).toEqual({ revision: 0, current: null });
    expect(migrated.execute(f.people[0]!.id, original)).toEqual(receipt);
  });
  test("different pieces compose; same piece and wrong destination have no effect or receipt", () => {
    const f = fixture(); f.store.execute(f.people[0]!.id, f.start(), f.control);
    const a = joined(f), b = joined(f, 1);
    const first = f.store.execute(f.people[0]!.id, placement(f, a), a);
    f.store.execute(f.people[1]!.id, placement(f, b, 1), b);
    const before = f.store.snapshot(f.people[0]!.id), rows = f.store.db.prepare("SELECT COUNT(*) AS n FROM receipts").get();
    expect(() => f.store.execute(f.people[1]!.id, placement(f, b), b)).toThrowError(code("PUZZLE_PIECE_TAKEN"));
    expect(() => f.store.execute(f.people[1]!.id, placement(f, b, 2, 3), b)).toThrowError(code("PUZZLE_WRONG_PLACE"));
    expect(f.store.snapshot(f.people[0]!.id)).toEqual(before);
    expect(f.store.db.prepare("SELECT COUNT(*) AS n FROM receipts").get()).toEqual(rows);
    expect(first.result).toMatchObject({ puzzleRevision: 2, completed: false });
  });
  test("old consent cannot place, expectedRevision is forbidden and original receipts survive departure", () => {
    const f = fixture(); f.store.execute(f.people[0]!.id, f.start(), f.control); const a = joined(f), old = placement(f, a);
    const receipt = f.store.execute(f.people[0]!.id, old, a);
    const changed = { ...a, puzzle: { ...a.puzzle, participationId: randomUUID() } };
    expect(() => f.store.execute(f.people[0]!.id, placement(f, a, 1), changed)).toThrowError(code("PUZZLE_NOT_JOINED"));
    expect(() => f.store.execute(f.people[0]!.id, { ...placement(f, a, 1), expectedRevision: 2 }, a)).toThrowError(code("INVALID_INPUT"));
    expect(f.store.executeWithEffects(f.people[0]!.id, old, changed)).toEqual({ receipt, effect: null });
    expect(() => f.store.execute(f.people[0]!.id, { ...old, payload: { ...old.payload, destination: 1 } }, a)).toThrowError(code("COMMAND_ID_REUSED"));
    expect(() => f.store.execute(f.people[0]!.id, old)).toThrowError(code("NOT_CONTROLLER"));
  });
  test("replacement binds owner, original authority, table and roster ABA; old Start has no new effects", () => {
    const f = fixture(), original = f.start(), started = f.store.executeWithEffects(f.people[0]!.id, original, f.control), a = joined(f);
    const reset = f.command("puzzle.start", { ...original.payload, expectedRoundId: a.puzzle.roundId, confirmUnfinished: true }, 1);
    expect(() => f.store.execute(f.people[1]!.id, reset, a)).toThrowError(code("FORBIDDEN"));
    expect(() => f.store.execute(f.people[0]!.id, reset, { ...a, puzzle: { ...a.puzzle, rosterRevision: 3 } })).toThrowError(code("PUZZLE_RESET_CHANGED"));
    expect(() => f.store.execute(f.people[0]!.id, reset, { ...a, puzzle: { ...a.puzzle, memberIds: [f.people[1]!.id] } })).toThrowError(code("PUZZLE_RESET_CHANGED"));
    expect(() => f.store.execute(f.people[0]!.id, reset, { ...a, puzzle: { ...a.puzzle, authority: { ...f.authority, generation: 2 } } })).toThrowError(code("STALE_GENERATION"));
    const next = f.store.executeWithEffects(f.people[0]!.id, reset, a); expect(next.effect!.roundId).not.toBe(a.puzzle.roundId);
    expect(f.store.executeWithEffects(f.people[0]!.id, original, a)).toEqual({ receipt: started.receipt, effect: null });
    expect(f.store.snapshot(f.people[0]!.id).puzzle!.current!.id).toBe(next.effect!.roundId);
  });
  test("state and receipt roll back together; final placement releases consent only on first commit", () => {
    const f = fixture(); f.store.execute(f.people[0]!.id, f.start(), f.control); const a = joined(f), first = placement(f, a);
    f.store.db.exec("CREATE TRIGGER deny_picture_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT,'fixture'); END");
    expect(() => f.store.execute(f.people[0]!.id, first, a)).toThrowError(code("STORAGE_UNAVAILABLE"));
    expect(f.store.snapshot(f.people[0]!.id).puzzle!.current!.placements).toEqual([]);
    f.store.db.exec("DROP TRIGGER deny_picture_receipt");
    for (let n = 0; n < 23; n++) expect(f.store.executeWithEffects(f.people[n % 6]!.id, placement(f, a, n), { ...a, puzzle: { ...a.puzzle, memberIds: f.people.map(p => p.id) } }).effect).toBeNull();
    const final = placement(f, a, 23), outcome = f.store.executeWithEffects(f.people[0]!.id, final, a);
    expect(outcome.effect).toMatchObject({ completed: true });
    expect(f.store.snapshot(f.people[0]!.id).puzzle!.current!.placements).toHaveLength(24);
    expect(new Set(f.store.snapshot(f.people[0]!.id).puzzle!.current!.placements.map(p => p.actorId)).size).toBe(6);
    expect(Buffer.byteLength(JSON.stringify(outcome.receipt))).toBeLessThanOrEqual(512);
    expect(f.store.executeWithEffects(f.people[0]!.id, final, a)).toEqual({ receipt: outcome.receipt, effect: null });
    f.store.close(); const restarted = new HouseStore(f.path); cleanup.push(() => restarted.close());
    expect(restarted.snapshot(f.people[0]!.id).puzzle!.current!.completed).toBe(true);
    expect(restarted.executeWithEffects(f.people[0]!.id, final, a)).toEqual({ receipt: outcome.receipt, effect: null });
  });
  test.each(["digest", "mapping", "actor", "extra", "revision", "completed", "duplicate"])("rejects corrupt saved %s before it reaches a projection", variant => {
    const f = fixture(); f.store.execute(f.people[0]!.id, f.start(), f.control); const a = joined(f); f.store.execute(f.people[0]!.id, placement(f, a), a);
    const bad: any = structuredClone(f.store.snapshot(f.people[0]!.id).puzzle!);
    if (variant === "digest") bad.current.illustrationDigest = "0".repeat(64);
    if (variant === "mapping") bad.current.placements[0].destination = 1;
    if (variant === "actor") bad.current.placements[0].actorId = "arbitrary";
    if (variant === "extra") bad.current.secret = "unsupported";
    if (variant === "revision") bad.revision = 0;
    if (variant === "completed") bad.current.completed = true;
    if (variant === "duplicate") bad.current.placements.push(bad.current.placements[0]);
    f.store.db.prepare("UPDATE puzzle_tables SET state=?").run(JSON.stringify(bad));
    expect(() => f.store.snapshot(f.people[0]!.id)).toThrowError(code("STORAGE_UNAVAILABLE"));
  });
});