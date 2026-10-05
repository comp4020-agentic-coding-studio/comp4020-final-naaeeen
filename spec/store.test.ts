import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { Store } from "../src/store.ts";

const roots: string[] = [];
const stores: Store[] = [];
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "night-store-"));
  roots.push(directory);
  const path = join(directory, "test.sqlite");
  const store = new Store(path);
  stores.push(store);
  return { path, store };
}
afterEach(() => { for (const s of stores.splice(0)) s.close(); for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true }); });

function configure(visitorId: string, name = "First light") {
  return { commandId: randomUUID(), type: "window.configure", targetId: visitorId, expectedRevision: 0, payload: { name, windowColour: "rose" } };
}

describe("real SQLite ownership and retry contract", () => {
  it("creates a private initial projection and persists the opaque session across restart", () => {
    const { path, store } = fixture();
    const identity = store.ensureSession();
    const initial = store.state(identity.visitorId);
    expect(initial.sequence).toBe(0);
    expect(initial.visitor.published).toBe(false);
    expect(initial.neighbours).toEqual([]);
    expect(initial.lantern.parts).toEqual([]);
    expect(initial.room.furniture).toHaveLength(6);
    expect(identity.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(store.db.prepare("SELECT token_digest FROM sessions").get()).not.toEqual({ token_digest: identity.token });
    store.close();
    const next = new Store(path); stores.push(next);
    const restored = next.ensureSession(identity.token);
    expect(restored.visitorId).toBe(identity.visitorId);
    expect(next.state(restored.visitorId)).toEqual(initial);
  });
  it("atomically stores a command receipt, returns the original replay and rejects changed-ID payloads", () => {
    const { path, store } = fixture();
    const identity = store.ensureSession();
    const command = configure(identity.visitorId);
    const first = store.execute(identity.visitorId, command);
    expect(first).toMatchObject({ ok: true, entityRevision: 1, sequence: 1, changed: true });
    expect(store.execute(identity.visitorId, command)).toEqual(first);
    expect(() => store.execute(identity.visitorId, { ...command, payload: { ...command.payload, name: "Another light" } })).toThrowError(expect.objectContaining({ code: "COMMAND_ID_REUSED" }));
    expect(store.state(identity.visitorId).sequence).toBe(1);
    store.close();
    const next = new Store(path); stores.push(next);
    expect(next.execute(identity.visitorId, command)).toEqual(first);
  });
  it("rejects another visitor's target and stale revisions without changing persistent state", () => {
    const { store } = fixture();
    const first = store.ensureSession(); const second = store.ensureSession();
    expect(() => store.execute(second.visitorId, configure(first.visitorId))).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
    store.execute(first.visitorId, configure(first.visitorId));
    const snapshot = store.state(first.visitorId);
    expect(() => store.execute(first.visitorId, configure(first.visitorId, "Stale"))).toThrowError(expect.objectContaining({ code: "REVISION_CONFLICT" }));
    expect(store.state(first.visitorId)).toEqual(snapshot);
    expect(store.db.prepare("SELECT COUNT(*) AS count FROM receipts").get()).toEqual({ count: 1 });
  });
  it("canonicalises key order without repeating effects and rejects forged actor fields", () => {
    const { store } = fixture(); const identity = store.ensureSession();
    const command = configure(identity.visitorId);
    const receipt = store.execute(identity.visitorId, command);
    expect(store.execute(identity.visitorId, { payload: { windowColour: "rose", name: "First light" }, expectedRevision: 0, targetId: identity.visitorId, type: command.type, commandId: command.commandId })).toEqual(receipt);
    expect(() => store.execute(identity.visitorId, { ...configure(identity.visitorId), actor: identity.visitorId })).toThrowError(expect.objectContaining({ code: "INVALID_INPUT" }));
    expect(store.state(identity.visitorId).sequence).toBe(1);
  });
  it("rolls back an applied edit when its receipt cannot be saved, then allows a safe retry", () => {
    const { store } = fixture(); const identity = store.ensureSession(); const initial = store.state(identity.visitorId);
    store.db.exec("CREATE TRIGGER fail_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT, 'simulated storage failure'); END;");
    const command = configure(identity.visitorId);
    expect(() => store.execute(identity.visitorId, command)).toThrowError(expect.objectContaining({ code: "STORAGE_UNAVAILABLE" }));
    expect(store.state(identity.visitorId)).toEqual(initial);
    expect(store.db.prepare("SELECT COUNT(*) AS count FROM receipts").get()).toEqual({ count: 0 });
    store.db.exec("DROP TRIGGER fail_receipt");
    expect(store.execute(identity.visitorId, command)).toMatchObject({ sequence: 1, entityRevision: 1 });
  });
  it("expires a session without resolving a new token to its former owner's room", () => {
    const { store } = fixture(); const owner = store.ensureSession();
    store.db.prepare("UPDATE sessions SET expires_at=0 WHERE token_digest=?").run(owner.digest);
    expect(store.session(owner.digest)).toBeUndefined();
    const replacement = store.ensureSession(owner.token);
    expect(replacement.visitorId).not.toBe(owner.visitorId);
    expect(replacement.token).not.toBe(owner.token);
    expect(store.state(replacement.visitorId).visitor.published).toBe(false);
  });
  it("rejects a collision without changing the room or global sequence", () => {
    const { store } = fixture(); const owner = store.ensureSession(); const initial = store.state(owner.visitorId);
    const chair = initial.room.furniture.find((item) => item.asset === "chair")!;
    expect(() => store.execute(owner.visitorId, { commandId: randomUUID(), type: "placement.move", targetId: chair.id, expectedRevision: 0, payload: { x: 0, z: 0 } })).toThrowError();
    expect(store.state(owner.visitorId)).toEqual(initial);
  });
  it("keeps a withdrawn contribution's revision and excludes its note from public projections", () => {
    const { store } = fixture(); const owner = store.ensureSession(); const observer = store.ensureSession();
    const put = { commandId: randomUUID(), type: "contribution.put", targetId: owner.visitorId, expectedRevision: 0, payload: { colour: "#ffc47b", note: "A safe arrival" } };
    store.execute(owner.visitorId, put);
    expect(store.state(observer.visitorId).lantern.parts[0]?.note).toBe("A safe arrival");
    store.execute(owner.visitorId, { commandId: randomUUID(), type: "contribution.withdraw", targetId: owner.visitorId, expectedRevision: 1, payload: {} });
    expect(store.state(owner.visitorId).lantern).toEqual({ parts: [], ownRevision: 2 });
    expect(store.state(observer.visitorId).lantern.parts).toEqual([]);
    store.execute(owner.visitorId, { ...put, commandId: randomUUID(), expectedRevision: 2 });
    expect(store.state(owner.visitorId).lantern.parts[0]?.revision).toBe(3);
  });
  it("bounds shared projections while retaining an older author's own trace", () => {
    const { store } = fixture(); const identities = Array.from({length: 10}, () => store.ensureSession());
    for (const [index, identity] of identities.entries()) {
      store.execute(identity.visitorId, configure(identity.visitorId, `Window ${index}`));
      store.execute(identity.visitorId, { commandId: randomUUID(), type: "contribution.put", targetId: identity.visitorId, expectedRevision: 0, payload: { colour: "#ffc47b", note: `Pane ${index}` } });
    }
    const oldest = store.state(identities[0]!.visitorId);
    const newest = store.state(identities[9]!.visitorId);
    expect(oldest.neighbours).toHaveLength(9);
    expect(oldest.neighbours.some((v) => v.id === identities[0]!.visitorId)).toBe(true);
    expect(oldest.lantern.parts).toHaveLength(9);
    expect(newest.neighbours).toHaveLength(8);
    expect(newest.lantern.parts).toHaveLength(8);
  });
});
