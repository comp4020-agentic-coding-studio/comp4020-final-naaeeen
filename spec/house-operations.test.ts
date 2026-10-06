import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { backup, DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { createService } from "../src/server.ts";
import { Store } from "../src/store.ts";
import { HouseStore } from "../src/house-store.ts";
import type { HouseCommand, HouseReceipt, HouseSnapshot, Me, Profile } from "../src/house-contract.ts";
import type { State } from "../src/store.ts";

type Service = ReturnType<typeof createService>;
const roots: string[] = [];
const services = new Set<Service>();
const stores: Array<Store | HouseStore> = [];
const children = new Set<ChildProcessWithoutNullStreams>();

function directory(label: string) {
  const path = mkdtempSync(join(tmpdir(), `house-operations-${label}-`));
  roots.push(path);
  return path;
}
async function start(dataDir: string) {
  const app = createService({ dataDir });
  services.add(app);
  await new Promise<void>((resolve, reject) => {
    app.server.once("error", reject);
    app.server.listen(0, "127.0.0.1", () => {
      app.server.off("error", reject);
      resolve();
    });
  });
  const base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
  return { app, base };
}
async function stop(app: Service) {
  await app.close();
  services.delete(app);
}
afterEach(async () => {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));
      child.kill("SIGKILL");
      await closed;
    }
  }
  children.clear();
  for (const app of services) await app.close();
  services.clear();
  for (const store of stores.splice(0)) store.close();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function command(type: string, payload: Record<string, unknown>, houseId?: string, expectedRevision?: number): HouseCommand {
  return { commandId: randomUUID(), type, payload, ...(houseId ? { houseId } : {}), ...(expectedRevision === undefined ? {} : { expectedRevision }) };
}
async function read<T>(base: string, path: string, cookie: string): Promise<T> {
  const response = await fetch(base + path, { headers: { Cookie: cookie } });
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toBeNull();
  return await response.json() as T;
}
function legacyRows(db: DatabaseSync) {
  return {
    version: db.prepare("PRAGMA user_version").get(),
    schema: db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name").all(),
    meta: db.prepare("SELECT * FROM meta ORDER BY key").all(),
    visitors: db.prepare("SELECT * FROM visitors ORDER BY id").all(),
    sessions: db.prepare("SELECT * FROM sessions ORDER BY token_digest").all(),
    rooms: db.prepare("SELECT * FROM rooms ORDER BY id").all(),
    parts: db.prepare("SELECT * FROM parts ORDER BY owner").all(),
    receipts: db.prepare("SELECT * FROM receipts ORDER BY command_id").all(),
  };
}
function openDatabaseFiles(dataDir: string) {
  // Native Linux file descriptors make a failed-startup connection leak visible
  // without mocking either SQLite constructor or inspecting private fields.
  return readdirSync("/proc/self/fd").flatMap((fd) => {
    try {
      const path = readlinkSync(join("/proc/self/fd", fd));
      return path.startsWith(dataDir + "/") ? [path.slice(dataDir.length + 1)] : [];
    } catch (error) {
      // The directory enumeration's own descriptor may already have closed.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }).sort();
}
function seedLegacy(store: Store) {
  const identity = store.ensureSession();
  const profile = { commandId: randomUUID(), type: "window.configure", targetId: identity.visitorId, expectedRevision: 0, payload: { name: "Crit8 neighbour", windowColour: "rose" } };
  store.execute(identity.visitorId, profile);
  const contribution = { commandId: randomUUID(), type: "contribution.put", targetId: identity.visitorId, expectedRevision: 0, payload: { colour: "#ffc47b", note: "An existing Crit8 lantern note" } };
  const receipt = store.execute(identity.visitorId, contribution);
  return { identity, contribution, receipt, state: store.state(identity.visitorId) };
}

interface RaceMessage {
  phase: "ready" | "attempting" | "result";
  pid: number;
  id: string;
  commandId: string;
  ok?: boolean;
  code?: string;
  receipt?: HouseReceipt;
  home?: Me["home"];
  profile?: Profile;
}
function joinProcess(path: string, code: string, name: string) {
  // The child imports and executes the real TypeScript store using the same
  // native Node executable as Vitest, with an independent SQLite connection.
  const source = `
    import { createInterface } from "node:readline";
    import { randomUUID } from "node:crypto";
    import { HouseStore } from ${JSON.stringify(new URL("../src/house-store.ts", import.meta.url).href)};
    const [path, code, name] = process.argv.slice(1);
    const store = new HouseStore(path);
    const actor = store.ensureSession();
    const commandId = randomUUID();
    const publish = (phase, fields = {}) => process.stdout.write(JSON.stringify({ phase, pid: process.pid, id: actor.id, commandId, ...fields }) + "\\n");
    const input = createInterface({ input: process.stdin });
    publish("ready");
    for await (const line of input) {
      if (line !== "go") continue;
      publish("attempting");
      try {
        const receipt = store.execute(actor.id, { commandId, type: "house.join", payload: { code, name, colour: "blue" } });
        publish("result", { ok: true, receipt, home: store.me(actor.id).home, profile: store.me(actor.id).identity });
      } catch (error) {
        publish("result", { ok: false, code: error.code, home: store.me(actor.id).home, profile: store.me(actor.id).identity });
      } finally { store.close(); input.close(); }
      break;
    }
  `;
  const child = spawn(process.execPath, ["--input-type=module", "--eval", source, path, code, name], { stdio: ["pipe", "pipe", "pipe"] });
  children.add(child);
  const messages = new Map<RaceMessage["phase"], RaceMessage>();
  const pending = new Map<RaceMessage["phase"], { resolve: (message: RaceMessage) => void; reject: (error: Error) => void }>();
  let stderr = "", failure: Error | undefined;
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => { stderr = (stderr + chunk).slice(-4000); });
  const lines = createInterface({ input: child.stdout });
  const fail = (error: Error) => { failure = error; for (const waiter of pending.values()) waiter.reject(error); pending.clear(); };
  lines.on("line", (line) => {
    try {
      const message = JSON.parse(line) as RaceMessage;
      messages.set(message.phase, message);
      pending.get(message.phase)?.resolve(message);
      pending.delete(message.phase);
    } catch { fail(new Error(`Join process emitted invalid JSON: ${line}`)); }
  });
  const completion = new Promise<void>((resolve, reject) => {
    child.once("error", (error) => { fail(error); reject(error); });
    child.once("close", (exitCode, signal) => {
      lines.close();
      if (exitCode !== 0 || !messages.has("result")) {
        const error = new Error(`Join process exited ${exitCode ?? signal} before completion: ${stderr}`);
        fail(error); reject(error);
      } else resolve();
    });
  });
  // Attach a handler immediately so an early OS-process error remains reportable
  // when the caller later awaits completion rather than becoming unhandled.
  void completion.catch(() => {});
  function wait(phase: RaceMessage["phase"]): Promise<RaceMessage> {
    const previous = messages.get(phase);
    if (previous) return Promise.resolve(previous);
    if (failure) return Promise.reject(failure);
    return new Promise<RaceMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(phase);
        reject(new Error(`Timed out waiting for join process ${phase}: ${stderr}`));
      }, 10000);
      pending.set(phase, {
        resolve: (message) => { clearTimeout(timeout); resolve(message); },
        reject: (error) => { clearTimeout(timeout); reject(error); },
      });
    });
  }
  return { child, wait, completion };
}

describe("actual service storage operations", () => {
  it("adds the house database without changing a populated Crit8 v1 database across startup and restart", async () => {
    const dataDir = directory("legacy");
    const legacyPath = join(dataDir, "neighbourhood.sqlite");
    // Store/domain remain the frozen Crit8 implementation; this is a real v1
    // database containing identity, room, public profile, lantern and receipts.
    const legacy = new Store(legacyPath); stores.push(legacy);
    const saved = seedLegacy(legacy);
    const before = legacyRows(legacy.db);
    legacy.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    legacy.close();
    const originalBytes = readFileSync(legacyPath);
    expect(existsSync(join(dataDir, "house.sqlite"))).toBe(false);

    const first = await start(dataDir);
    expect(existsSync(join(dataDir, "house.sqlite"))).toBe(true);
    expect(first.app.houseStore.db.prepare("PRAGMA user_version").get()).toEqual({ user_version: 1 });
    expect(legacyRows(first.app.store.db)).toEqual(before);
    expect(await read<State>(first.base, "/api/state", `night_session=${saved.identity.token}`)).toEqual(saved.state);
    const resident = first.app.houseStore.ensureSession();
    first.app.houseStore.execute(resident.id, command("house.create", { capacity: 2, name: "Separate house owner", colour: "sage" }));
    const houseBefore = first.app.houseStore.snapshot(resident.id);
    expect(first.app.houseStore.db.prepare("SELECT COUNT(*) AS count FROM identities").get()).toEqual({ count: 1 });
    expect(first.app.houseStore.me(resident.id).identity.id).not.toBe(saved.identity.visitorId);
    await stop(first.app);

    const restarted = await start(dataDir);
    expect(legacyRows(restarted.app.store.db)).toEqual(before);
    expect(readFileSync(legacyPath)).toEqual(originalBytes);
    expect(await read<State>(restarted.base, "/api/state", `night_session=${saved.identity.token}`)).toEqual(saved.state);
    expect(restarted.app.store.execute(saved.identity.visitorId, saved.contribution)).toEqual(saved.receipt);
    expect(restarted.app.houseStore.ensureSession(resident.token)).toMatchObject({ id: resident.id, created: false });
    expect(await read<HouseSnapshot>(restarted.base, "/api/house/snapshot", `house_session=${resident.token}`)).toEqual(houseBefore);
    expect(legacyRows(restarted.app.store.db)).toEqual(before);
  });

  it("restores both live WAL databases with sessions, chat, card receipts and bedroom state", async () => {
    const dataDir = directory("source"), restoredDir = directory("restore"), bareDir = directory("bare-copy");
    const source = await start(dataDir);
    for (const db of [source.app.store.db, source.app.houseStore.db]) db.exec("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA wal_autocheckpoint=0");
    const legacy = seedLegacy(source.app.store);
    const house = source.app.houseStore, owner = house.ensureSession(), friend = house.ensureSession();
    house.execute(owner.id, command("house.create", { capacity: 2, name: "Owner", colour: "sage" }));
    const home = house.me(owner.id).home!;
    house.execute(friend.id, command("house.join", { code: home.code, name: "Friend", colour: "blue" }));
    const roomId = house.snapshot(owner.id).residents.find((resident) => resident.id === owner.id)!.bedroomId;
    const placements = [{ id: randomUUID(), kind: "plant", x: -4, z: -2, rotation: 0, colour: "sage" }];
    house.execute(owner.id, command("room.placements", { roomId, placements }, home.id, 0));
    house.execute(owner.id, command("room.configure", { roomId, open: true, palette: "lavender" }, home.id, 1));
    const chatCommand = command("chat.send", { zoneId: "lounge", text: "A saved lounge conversation" }, home.id);
    const chatReceipt = house.execute(friend.id, chatCommand);
    house.execute(owner.id, command("chat.send", { zoneId: roomId, text: "An invited bedroom conversation" }, home.id));
    const cardCommand = command("card.save", { smallGoal: "Understand the proof", question: "Why does this step follow?", resourceUrl: "https://example.org/course", nextStep: "Rewrite the induction step", helpRequested: true }, home.id, 0);
    const cardReceipt = house.execute(owner.id, cardCommand);
    const loungeBefore = house.snapshot(owner.id), roomBefore = house.snapshot(friend.id, roomId);
    const legacyBefore = legacyRows(source.app.store.db);

    // A main-file copy cannot see the committed identities still in WAL. Prove
    // the fixture exercises WAL recovery before using SQLite's online backup.
    for (const [filename, table] of [["neighbourhood.sqlite", "visitors"], ["house.sqlite", "identities"]]) {
      const path = join(dataDir, filename!);
      expect(statSync(path + "-wal").size).toBeGreaterThan(32);
      const barePath = join(bareDir, filename!); copyFileSync(path, barePath);
      const bare = new DatabaseSync(barePath, { readOnly: true });
      try { expect(bare.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()).toEqual({ count: 0 }); }
      finally { bare.close(); }
    }
    expect(await backup(source.app.store.db, join(restoredDir, "neighbourhood.sqlite"), { rate: 1 })).toBeGreaterThan(0);
    expect(await backup(house.db, join(restoredDir, "house.sqlite"), { rate: 1 })).toBeGreaterThan(0);
    expect(source.app.store.ready()).toBe(true); expect(house.ready()).toBe(true);
    house.execute(owner.id, command("chat.send", { zoneId: "lounge", text: "Only after the backup" }, home.id));

    const restored = await start(restoredDir);
    expect(restored.app.store.db.prepare("PRAGMA integrity_check").get()).toEqual({ integrity_check: "ok" });
    expect(restored.app.houseStore.db.prepare("PRAGMA integrity_check").get()).toEqual({ integrity_check: "ok" });
    expect(restored.app.store.db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(restored.app.houseStore.db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(legacyRows(restored.app.store.db)).toEqual(legacyBefore);
    expect(await read<State>(restored.base, "/api/state", `night_session=${legacy.identity.token}`)).toEqual(legacy.state);
    for (const actor of [owner, friend]) {
      expect(await read<Me>(restored.base, "/api/house/me", `house_session=${actor.token}`)).toEqual(house.me(actor.id));
    }
    expect(await read<HouseSnapshot>(restored.base, "/api/house/snapshot", `house_session=${owner.token}`)).toEqual(loungeBefore);
    expect(await read<HouseSnapshot>(restored.base, `/api/house/snapshot?zone=${roomId}`, `house_session=${friend.token}`)).toEqual(roomBefore);
    expect(roomBefore.room).toMatchObject({ id: roomId, revision: 2, open: true, palette: "lavender", placements });
    expect(loungeBefore.cards[0]).toMatchObject({ authorId: owner.id, nextStep: "Rewrite the induction step", state: "active", revision: 1 });
    expect(restored.app.houseStore.execute(friend.id, chatCommand)).toEqual(chatReceipt);
    expect(restored.app.houseStore.execute(owner.id, cardCommand)).toEqual(cardReceipt);
    expect(restored.app.store.execute(legacy.identity.visitorId, legacy.contribution)).toEqual(legacy.receipt);
    expect(restored.app.houseStore.snapshot(owner.id)).toEqual(loungeBefore);
    expect(house.snapshot(owner.id).chat).toHaveLength(loungeBefore.chat.length + 1);
  });

  it.each(["neighbourhood.sqlite", "house.sqlite"])("rejects an unknown %s schema without reseeding its existing data", (filename) => {
    const dataDir = directory("unknown-schema"), path = join(dataDir, filename);
    const unknown = new DatabaseSync(path);
    unknown.exec("CREATE TABLE preserved (value TEXT NOT NULL); INSERT INTO preserved VALUES ('Existing future-schema data'); PRAGMA user_version=99");
    unknown.close();
    const descriptorsBefore = openDatabaseFiles(dataDir);
    expect(() => createService({ dataDir })).toThrowError(expect.objectContaining({ code: "STORAGE_UNAVAILABLE" }));
    expect(openDatabaseFiles(dataDir)).toEqual(descriptorsBefore);
    const verified = new DatabaseSync(path, { readOnly: true });
    try {
      expect(verified.prepare("PRAGMA user_version").get()).toEqual({ user_version: 99 });
      expect(verified.prepare("SELECT * FROM preserved").all()).toEqual([{ value: "Existing future-schema data" }]);
      expect(verified.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).toEqual([{ name: "preserved" }]);
    } finally { verified.close(); }
  });

  it("allows exactly one of two independent OS processes to claim the final permanent bedroom", async () => {
    const dataDir = directory("process-race"), path = join(dataDir, "house.sqlite");
    const store = new HouseStore(path); stores.push(store);
    const owner = store.ensureSession();
    store.execute(owner.id, command("house.create", { capacity: 2, name: "Owner", colour: "sage" }));
    const home = store.me(owner.id).home!;
    const racers = [joinProcess(path, home.code, "First claimant"), joinProcess(path, home.code, "Second claimant")];
    const ready = await Promise.all(racers.map((racer) => racer.wait("ready")));
    expect(new Set(ready.map((message) => message.pid)).size).toBe(2);
    expect(ready.every((message) => message.pid !== process.pid)).toBe(true);
    // Hold the parent write lock until both independent contenders pass the
    // stdin barrier and reach execute. Their markers precede SQLite entry, so
    // the assertions verify final allocation rather than overlapping lock waits.
    store.db.exec("BEGIN IMMEDIATE");
    try {
      for (const racer of racers) racer.child.stdin.write("go\n");
      await Promise.all(racers.map((racer) => racer.wait("attempting")));
    } finally { store.db.exec("COMMIT"); }
    const results = await Promise.all(racers.map((racer) => racer.wait("result")));
    for (const racer of racers) racer.child.stdin.end();
    await Promise.all(racers.map((racer) => racer.completion));
    const winners = results.filter((result) => result.ok), losers = results.filter((result) => !result.ok);
    expect(winners).toHaveLength(1); expect(losers).toHaveLength(1);
    const winner = winners[0]!, loser = losers[0]!;
    expect(winner.home).toEqual(home); expect(winner.receipt).toMatchObject({ ok: true, streamId: "lounge:" + home.id });
    expect(loser).toMatchObject({ code: "SPACE_FULL", home: null, profile: { name: "Study friend", colour: "amber", revision: 0 } });
    expect(store.snapshot(owner.id).residents.map((resident) => resident.id).sort()).toEqual([owner.id, winner.id].sort());
    expect(store.db.prepare("SELECT COUNT(*) AS count FROM bedrooms WHERE archived=0").get()).toEqual({ count: 2 });
    expect(store.db.prepare("SELECT COUNT(*) AS count FROM members WHERE house_id=? AND status='active'").get(home.id)).toEqual({ count: 2 });
    expect(store.db.prepare("SELECT response FROM receipts WHERE actor_id=? AND command_id=?").get(winner.id, winner.commandId)).toEqual({ response: JSON.stringify(winner.receipt) });
    expect(store.db.prepare("SELECT response FROM receipts WHERE actor_id=? AND command_id=?").get(loser.id, loser.commandId)).toBeUndefined();
    store.close();
    const restarted = new HouseStore(path); stores.push(restarted);
    expect(restarted.snapshot(owner.id).residents.map((resident) => resident.id).sort()).toEqual([owner.id, winner.id].sort());
    expect(restarted.me(loser.id).home).toBeNull();
  }, 15000);
});
