import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HouseStore } from "../src/house-store.ts";
import type { HouseCommand } from "../src/house-contract.ts";

const cleanups: (() => void)[] = [];
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn()); });
function setup(capacity = 6) {
  const root = mkdtempSync(join(tmpdir(), "house-rooms-")), path = join(root, "house.sqlite");
  let store = new HouseStore(path);
  cleanups.push(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
  const ids = Array.from({length: capacity}, () => store.ensureSession().id);
  const create = { commandId: randomUUID(), type: "house.create", payload: {capacity, name: "Owner", colour: "rose"} };
  const creation = store.execute(ids[0]!, create), home = store.me(ids[0]!).home!;
  const joins = ids.slice(1).map((id, n) => {
    const command = {commandId: randomUUID(), type: "house.join", payload: {code: home.code, name: "Friend " + n, colour: "blue"}};
    return {id, command, receipt: store.execute(id, command)};
  });
  const command = (type: string, payload: Record<string, unknown>, expectedRevision?: number): HouseCommand =>
    ({commandId: randomUUID(), type, houseId: home.id, payload, ...(expectedRevision === undefined ? {} : {expectedRevision})});
  const room = (id = ids[0]!) => store.snapshot(id, store.snapshot(id).residents.find(r => r.id === id)!.bedroomId).room! as any;
  return {get store() {return store;}, ids, home, create, creation, joins, command, room,
    restart() {store.close(); store = new HouseStore(path);} };
}
const fails = (code: string) => expect.objectContaining({code});

describe("furnished room authority", () => {
  it("allocates six distinct stable presets once with durable UUID placements, including duplicate create/join", () => {
    const f = setup(), rooms = f.ids.map(id => f.room(id));
    expect(new Set(rooms.map(r => r.originPresetId)).size).toBe(6);
    expect(rooms.every(r => r.originPresetVersion === 1 && r.placements.length >= 5 && r.placements.length <= 8)).toBe(true);
    const ids = rooms.flatMap(r => r.placements.map((p: any) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => /^[0-9a-f-]{36}$/.test(id))).toBe(true);
    expect(f.store.execute(f.ids[0]!, f.create)).toEqual(f.creation);
    for (const join of f.joins) expect(f.store.execute(join.id, join.command)).toEqual(join.receipt);
    f.restart(); expect(f.ids.map(id => f.room(id))).toEqual(rooms);
  });

  it("atomically applies a starter and light while preserving the open door and command receipts", () => {
    const f = setup(2), id = f.ids[0]!, initial = f.room(), roomId = initial.id;
    f.store.execute(id, f.command("room.configure", {roomId, open: true, palette: "rose"}, 0));
    const starter = f.command("room.starter", {roomId, presetId: f.room(f.ids[1]!).originPresetId}, 1);
    const receipt = f.store.execute(id, starter), saved = f.room();
    expect(saved).toMatchObject({open: true, revision: 2, originPresetVersion: 1});
    expect(saved.originPresetId).not.toBe(initial.originPresetId);
    expect(saved.placements).not.toEqual(initial.placements);
    expect(f.store.execute(id, starter)).toEqual(receipt); expect(f.room()).toEqual(saved);
    const light = f.command("room.light", {roomId, light: "dim"}, 2);
    const lightReceipt = f.store.execute(id, light);
    expect(f.room()).toEqual({...saved, light: "dim", revision: 3});
    expect(f.store.execute(id, light)).toEqual(lightReceipt);
    f.restart(); expect(f.room()).toEqual({...saved, light: "dim", revision: 3});
    expect((f.store.exportOwn(id) as any).room).toEqual(f.room());
    const archiveRoom = f.room();
    f.store.execute(id, f.command("house.transfer", {memberId: f.ids[1]}));
    f.store.execute(id, f.command("house.leave", {}));
    expect((f.store.exportOwn(id) as any).archives[0].room).toEqual({...archiveRoom, open: false, revision: 4});
    expect(() => f.store.execute(id, light)).toThrowError(fails("FORBIDDEN"));
  });

  it("rejects stale, cross-owner, foreign-house and invalid new commands without changing room or cursor", () => {
    const f = setup(2), id = f.ids[0]!, r = f.room();
    const before = f.store.snapshot(id, r.id);
    for (const [type, extra] of [["room.starter", {presetId: f.room(f.ids[1]!).originPresetId}], ["room.light", {light: "cosy"}]] as const) {
      expect(() => f.store.execute(f.ids[1]!, f.command(type, {roomId: r.id, ...extra}, 0))).toThrowError(fails("FORBIDDEN"));
      expect(() => f.store.execute(id, f.command(type, {roomId: r.id, ...extra}, 3))).toThrowError(fails("REVISION_CONFLICT"));
      expect(() => f.store.execute(id, {...f.command(type, {roomId: r.id, ...extra}, 0), houseId: randomUUID()})).toThrowError(fails("FORBIDDEN"));
      expect(() => f.store.execute(id, f.command(type, {roomId: r.id, ...extra, unexpected: true}, 0))).toThrowError(fails("INVALID_INPUT"));
    }
    expect(() => f.store.execute(id, f.command("room.starter", {roomId: r.id, presetId: "missing"}, 0))).toThrowError(fails("INVALID_INPUT"));
    expect(() => f.store.execute(id, f.command("room.light", {roomId: r.id, light: "bright"}, 0))).toThrowError(fails("INVALID_INPUT"));
    expect(f.store.snapshot(id, r.id)).toEqual(before);
  });

  it.each(["room.starter", "room.light"])("rolls back %s state/cursor when the receipt insert fails and safely retries", type => {
    const f=setup(2), id=f.ids[0]!, roomId=f.room().id;
    const command=f.command(type,{roomId,...(type==="room.starter"?{presetId:"peach-nook"}:{light:"dim"})},0);
    const before=f.store.snapshot(id,roomId);
    f.store.db.exec("CREATE TRIGGER fail_room_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT,'injected room receipt failure'); END;");
    expect(()=>f.store.execute(id,command)).toThrowError(fails("STORAGE_UNAVAILABLE"));
    expect(f.store.snapshot(id,roomId)).toEqual(before);
    expect(f.store.db.prepare("SELECT command_id FROM receipts WHERE command_id=?").get(command.commandId)).toBeUndefined();
    f.store.db.exec("DROP TRIGGER fail_room_receipt");
    const receipt=f.store.execute(id,command), saved=f.store.snapshot(id,roomId);
    expect(saved.room!.revision).toBe(1);expect(saved.sequence).toBe(before.sequence+1);
    expect(f.store.execute(id,command)).toEqual(receipt);expect(f.store.snapshot(id,roomId)).toEqual(saved);
  });

  it("keeps origin and lighting through old payloads and rejects command ID reuse", () => {
    const f = setup(2), id = f.ids[0]!, initial = f.room(), roomId = initial.id;
    const light = f.command("room.light", {roomId, light: "cosy"}, 0);
    f.store.execute(id, light);
    expect(() => f.store.execute(id, {...light, payload: {roomId, light: "dim"}})).toThrowError(fails("COMMAND_ID_REUSED"));
    f.store.execute(id, f.command("room.placements", {roomId, placements: []}, 1));
    f.store.execute(id, f.command("room.configure", {roomId, open: false, palette: "peach"}, 2));
    expect(f.room()).toMatchObject({light: "cosy", originPresetId: initial.originPresetId, originPresetVersion: 1, placements: [], palette: "peach", revision: 3});
  });

  it("projects only the current identity's active work with the lounge cursor through create-close-new from a bedroom", () => {
    const f = setup(2), [a,b] = f.ids, r = f.room(), bedroomSequence = f.store.snapshot(a!, r.id).sequence;
    const ownWork = () => (f.store.snapshot(a!, r.id) as any).ownWork;
    expect(ownWork()).toEqual({streamId: "lounge:" + f.home.id, sequence: f.store.snapshot(a!).sequence, card: null});
    const save = (id: string, goal: string) => f.store.execute(id, f.command("card.save", {smallGoal: goal, helpRequested: false}, 0));
    const other = save(b!, "Other work"); expect(ownWork().card).toBeNull();
    const first = save(a!, "First work");
    expect(ownWork()).toMatchObject({sequence: first.sequence, card: {id: first.result!.cardId, authorId: a, smallGoal: "First work"}});
    f.store.execute(a!, f.command("card.close", {cardId: first.result!.cardId}, 1));
    expect(ownWork().card).toBeNull();
    const second = save(a!, "Next work");
    expect(ownWork()).toMatchObject({sequence: second.sequence, card: {id: second.result!.cardId, smallGoal: "Next work"}});
    expect(ownWork().card.id).not.toBe(other.result!.cardId);
    expect(f.store.snapshot(a!, r.id)).toMatchObject({sequence: bedroomSequence, cards: []});
    f.restart(); expect(ownWork().card.id).toBe(second.result!.cardId);
  });
});
