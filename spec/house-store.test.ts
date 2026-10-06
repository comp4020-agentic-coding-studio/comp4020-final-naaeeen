import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HouseStore } from "../src/house-store.ts";
import type { HouseCommand, Placement } from "../src/house-contract.ts";

const randomHook = vi.hoisted(() => ({ bytes: [] as Uint8Array[] }));
vi.mock("node:crypto", async () => {
  const actual = await vi.importActual<typeof import("node:crypto")>("node:crypto");
  return { ...actual, randomBytes: (size: number) => {
    const injected = randomHook.bytes.shift();
    if (injected) {
      if (injected.length !== size) throw new Error("Incorrect test RNG length");
      return Buffer.from(injected);
    }
    return actual.randomBytes(size);
  } };
});

const roots: string[] = [];
const stores: HouseStore[] = [];
let activeTestHouseId: string | undefined;
function fixture() {
  activeTestHouseId = undefined;
  const root = mkdtempSync(join(tmpdir(), "house-store-")); roots.push(root);
  const path = join(root, "house.sqlite"); const store = new HouseStore(path); stores.push(store);
  return { root, path, store };
}
function reopen(path: string) { const store = new HouseStore(path); stores.push(store); return store; }
afterEach(() => { randomHook.bytes = []; vi.restoreAllMocks(); stores.splice(0).forEach(s => s.close()); roots.splice(0).forEach(r => rmSync(r, { recursive: true, force: true })); });
function command(type: string, payload: Record<string, unknown> = {}, expectedRevision?: number, houseId = activeTestHouseId): HouseCommand {
  return { commandId: randomUUID(), type, payload, ...(!["house.create", "house.join", "profile.set"].includes(type) ? { houseId } : {}), ...(expectedRevision === undefined ? {} : { expectedRevision }) };
}
function pair(capacity = 2) {
  const f = fixture(); const a = f.store.ensureSession(); const b = f.store.ensureSession();
  f.store.execute(a.id, command("house.create", { capacity, name: "Alice", colour: "sage" }));
  const home = f.store.me(a.id).home!; activeTestHouseId = home.id;
  f.store.execute(b.id, command("house.join", { code: home.code, name: "Bob", colour: "blue" }));
  return { ...f, a, b, home };
}
function error(code: string) { return expect.objectContaining({ code }); }
function card(smallGoal: string) { return { smallGoal, question: "Why?", resourceUrl: "", nextStep: "", helpRequested: true }; }

describe("durable house authority", () => {
  it("preserves opaque identity, permanent full-house membership and legacy bytes across restart", () => {
    const { store, path, root } = fixture(); const legacy = join(root, "neighbourhood.sqlite");
    writeFileSync(legacy, "frozen legacy bytes");
    const a = store.ensureSession(); const b = store.ensureSession();
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    store.execute(a.id, command("house.create", { capacity: 2, name: "Alice", colour: "sage" }));
    const home = store.me(a.id).home!; activeTestHouseId = home.id;
    expect(home.code.replace("-", "")).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    store.execute(b.id, command("house.join", { code: home.code, name: "Bob", colour: "rose" }));
    const before = store.snapshot(a.id); store.close(); const next = reopen(path);
    expect(next.ensureSession(a.token)).toMatchObject({ id: a.id, created: false });
    expect(next.session(a.digest)).toEqual({ id: a.id });
    expect(next.snapshot(a.id)).toEqual(before);
    expect(next.me(a.id).home).toEqual(home);
    const c = next.ensureSession();
    expect(() => next.execute(c.id, command("house.join", { code: home.code, name: "Extra", colour: "amber" }))).toThrowError(error("SPACE_FULL"));
    expect(readFileSync(legacy, "utf8")).toBe("frozen legacy bytes");
    expect(next.db.prepare("SELECT token_digest FROM sessions WHERE identity_id=?").get(a.id)).not.toEqual({ token_digest: a.token });
  });

  it("serialises two separate connections racing for the final permanent slot", () => {
    const { store, path } = fixture(); const owner = store.ensureSession();
    store.execute(owner.id, command("house.create", { capacity: 2, name: "Owner", colour: "amber" }));
    activeTestHouseId = store.me(owner.id).home!.id;
    const second = reopen(path), a = second.ensureSession(), b = store.ensureSession(), code = store.me(owner.id).home!.code;
    second.execute(a.id, command("house.join", { code, name: "A", colour: "blue" }));
    expect(() => store.execute(b.id, command("house.join", { code, name: "B", colour: "rose" }))).toThrowError(error("SPACE_FULL"));
    expect(store.snapshot(owner.id).residents.map(r => r.id)).toEqual(expect.arrayContaining([owner.id, a.id]));
    expect(store.snapshot(owner.id).residents).toHaveLength(2);
    expect(store.me(b.id).home).toBeNull();
  });

  it("keeps per-actor receipts canonical, durable and atomic with the resulting sequence", () => {
    const { store, path, a, b } = pair(); const cmd = command("chat.send", { zoneId: "lounge", text: "<script>plain text</script>" });
    const receipt = store.execute(a.id, cmd); const before = store.snapshot(a.id);
    expect(store.execute(a.id, { payload: { text: cmd.payload.text, zoneId: "lounge" }, type: cmd.type, commandId: cmd.commandId, houseId: cmd.houseId })).toEqual(receipt);
    expect(() => store.execute(a.id, { ...cmd, payload: { ...cmd.payload, text: "changed" } })).toThrowError(error("COMMAND_ID_REUSED"));
    store.execute(b.id, { ...cmd, payload: { zoneId: "lounge", text: "Bob uses independent UUID namespace" } });
    expect(store.snapshot(a.id).chat).toHaveLength(2);
    store.close(); const next = reopen(path);
    expect(next.execute(a.id, cmd)).toEqual(receipt);
    expect(before.chat[0]?.text).toBe("<script>plain text</script>");
    const initial = next.snapshot(a.id); const failed = command("profile.set", { name: "Changed", colour: "peach" }, next.me(a.id).identity.revision);
    next.db.exec("CREATE TRIGGER fail_house_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT, 'simulated disk failure'); END;");
    expect(() => next.execute(a.id, failed)).toThrowError(error("STORAGE_UNAVAILABLE"));
    expect(next.snapshot(a.id)).toEqual(initial);
    next.db.exec("DROP TRIGGER fail_house_receipt");
    expect(next.execute(a.id, failed).sequence).toBe(initial.sequence + 1);
  });

  it("protects closed rooms, private stream cursors, stale revisions and private receipt replay", () => {
    const { store, a, b } = pair(); const roomId = store.snapshot(a.id).residents.find(r => r.id === a.id)!.bedroomId;
    expect(() => store.snapshot(b.id, roomId)).toThrowError(error("FORBIDDEN"));
    const lounge = store.snapshot(a.id);
    const privateCmd = command("chat.send", { zoneId: roomId, text: "private" });
    const privateReceipt = store.execute(a.id, privateCmd);
    expect(privateReceipt.streamId).toBe("bedroom:" + roomId);
    expect(store.snapshot(a.id).sequence).toBe(lounge.sequence);
    const opened = store.execute(a.id, command("room.configure", { roomId, open: true, palette: "rose" }, 0));
    expect(store.snapshot(b.id, roomId).chat[0]?.text).toBe("private");
    const visitorCmd = command("chat.send", { zoneId: roomId, text: "visitor" });
    store.execute(b.id, visitorCmd);
    const initial = store.snapshot(a.id, roomId);
    expect(() => store.execute(b.id, command("room.configure", { roomId, open: false, palette: "blue" }, opened.entityRevision))).toThrowError(error("FORBIDDEN"));
    expect(() => store.execute(a.id, command("room.configure", { roomId, open: false, palette: "blue" }, 0))).toThrowError(error("REVISION_CONFLICT"));
    expect(store.snapshot(a.id, roomId)).toEqual(initial);
    store.execute(a.id, command("room.configure", { roomId, open: false, palette: "rose" }, 1));
    expect(() => store.snapshot(b.id, roomId)).toThrowError(error("FORBIDDEN"));
    expect(() => store.execute(b.id, visitorCmd)).toThrowError(error("FORBIDDEN"));
    expect(store.snapshot(a.id).room).toBeNull();
    expect(JSON.stringify(store.snapshot(a.id))).not.toContain("private");
  });

  it("rotates recovery proof, revokes old sessions and restores an existing member without a slot", () => {
    const { store, path, a } = pair(); const proof = store.issueRecovery(a.id);
    const replacement = store.issueRecovery(a.id);
    expect(() => store.recover(proof)).toThrowError(error("FORBIDDEN"));
    store.close(); const next = reopen(path); const restored = next.recover(replacement);
    expect(restored.id).toBe(a.id); expect(restored.token).not.toBe(a.token);
    expect(next.session(a.digest)).toBeUndefined(); expect(next.session(restored.digest)).toEqual({ id: a.id });
    expect(next.snapshot(restored.id).residents).toHaveLength(2);
    expect(() => next.recover(replacement)).toThrowError(error("FORBIDDEN"));
    expect(next.ensureSession(a.token).id).not.toBe(a.id);
    next.db.prepare("UPDATE sessions SET expires_at=0 WHERE token_digest=?").run(restored.digest);
    expect(next.session(restored.digest)).toBeUndefined();
  });

  it("requires owner transfer before leaving and privately archives original room and card", () => {
    const { store, a, b } = pair(); const roomId = store.snapshot(a.id).residents.find(r => r.id === a.id)!.bedroomId;
    store.execute(a.id, command("card.save", card("Understand vectors"), 0));
    const active = store.snapshot(a.id).cards.find(c => c.authorId === a.id)!;
    store.execute(a.id, command("card.save", { ...card("Understand vectors"), cardId: active.id, nextStep: "Draw two arrows" }, 1));
    expect(store.snapshot(a.id).cards.find(c => c.id === active.id)?.state).toBe("active");
    expect(() => store.execute(a.id, command("house.leave"))).toThrowError(error("FORBIDDEN"));
    store.execute(a.id, command("house.transfer", { memberId: b.id }));
    store.execute(a.id, command("house.leave"));
    expect(store.me(a.id).home).toBeNull(); expect(store.me(a.id).archiveCount).toBe(1);
    expect(() => store.snapshot(a.id)).toThrowError(error("FORBIDDEN"));
    expect(() => store.snapshot(b.id, roomId)).toThrowError(error("FORBIDDEN"));
    expect(store.snapshot(b.id).cards.find(c => c.id === active.id)).toMatchObject({ state: "ownerLeft", nextStep: "Draw two arrows" });
    const own = store.exportOwn(a.id) as any;
    expect(own.archives[0].room.ownerId).toBe(a.id);
    expect(own.archives[0].cards[0].nextStep).toBe("Draw two arrows");
    expect(JSON.stringify(store.exportOwn(b.id))).not.toContain("Draw two arrows");
    const oldHome = store.me(b.id).home!;
    store.execute(a.id, command("house.join", { code: oldHome.code, name: "Returning", colour: "sage" }));
    expect(store.snapshot(a.id).residents.find(r => r.id === a.id)!.bedroomId).not.toBe(roomId);
  });

  it("atomically removes members, rotates codes, guards reinstatement and archives the last house", () => {
    const { store, a, b, home } = pair();
    const oldRoom = store.snapshot(b.id).residents.find(r => r.id === b.id)!.bedroomId;
    store.execute(a.id, command("house.remove", { memberId: b.id }));
    const newCode = store.me(a.id).home!.code; expect(newCode).not.toBe(home.code);
    expect(() => store.execute(b.id, command("house.join", { code: newCode, name: "Bob", colour: "blue" }))).toThrowError(error("FORBIDDEN"));
    const fresh = store.ensureSession();
    expect(() => store.execute(fresh.id, command("house.join", { code: home.code, name: "Old code", colour: "rose" }))).toThrowError(error("FORBIDDEN"));
    store.execute(a.id, command("house.reinstate", { memberId: b.id }));
    store.execute(b.id, command("house.join", { code: newCode, name: "Bob", colour: "blue" }));
    expect(store.snapshot(b.id).residents.find(r => r.id === b.id)!.bedroomId).not.toBe(oldRoom);
    store.execute(b.id, command("house.leave"));
    store.execute(a.id, command("house.leave"));
    expect(store.me(a.id)).toMatchObject({ home: null, archiveCount: 1 });
    expect(() => store.execute(fresh.id, command("house.join", { code: newCode, name: "Old home", colour: "rose" }))).toThrowError(error("FORBIDDEN"));
    store.execute(a.id, command("house.create", { capacity: 6, name: "New owner", colour: "amber" }));
    expect(store.me(a.id).home!.id).not.toBe(home.id);
  });

  it("bounds chat and inactive cards while preserving active author steps and export separation", () => {
    const { store, a, b } = pair();
    for (let i = 0; i < 105; i++) store.execute(a.id, command("chat.send", { zoneId: "lounge", text: "message " + i }));
    const chat = store.snapshot(a.id).chat; expect(chat).toHaveLength(100); expect(chat[0]?.text).toBe("message 5"); expect(chat[99]?.text).toBe("message 104");
    store.execute(b.id, command("card.save", { ...card("Bob retained"), nextStep: "Never evict this" }, 0));
    for (let i = 0; i < 14; i++) {
      const saved = store.execute(a.id, command("card.save", card("Goal " + i), 0));
      const id = saved.result!.cardId!;
      store.execute(a.id, command("card.close", { cardId: id }, 1));
    }
    const cards = store.snapshot(a.id).cards;
    expect(cards.filter(c => c.state === "closed")).toHaveLength(12);
    expect(cards.find(c => c.authorId === b.id)).toMatchObject({ state: "active", nextStep: "Never evict this" });
    expect(cards.some(c => c.smallGoal === "Goal 0" || c.smallGoal === "Goal 1")).toBe(false);
    expect(JSON.stringify(store.exportOwn(a.id))).not.toContain("Never evict this");
    const bCard = cards.find(c => c.authorId === b.id)!;
    expect(() => store.execute(a.id, command("card.save", { ...card("stolen"), cardId: bCard.id }, 1))).toThrowError(error("FORBIDDEN"));
    expect(() => store.execute(b.id, command("card.save", { ...card("stale"), cardId: bCard.id }, 0))).toThrowError(error("REVISION_CONFLICT"));
    expect(() => store.execute(a.id, command("card.save", { ...card("URL"), resourceUrl: "javascript:alert(1)" }, 0))).toThrowError(error("INVALID_INPUT"));
  });

  it("validates bounded room edits and rejects forged actors, unknown fields and malformed revisions", () => {
    const { store, a, b } = pair(); const roomId = store.snapshot(a.id).residents.find(r => r.id === a.id)!.bedroomId;
    const placements: Placement[] = [{ id: randomUUID(), kind: "plant", x: -4, z: -2, rotation: 0, colour: "sage" }];
    store.execute(a.id, command("room.placements", { roomId, placements }, 0));
    expect(store.snapshot(a.id, roomId).room!.placements).toEqual(placements);
    expect(() => store.execute(b.id, command("room.placements", { roomId, placements }, 1))).toThrowError(error("FORBIDDEN"));
    expect(() => store.execute(a.id, command("room.placements", { roomId, placements: [...placements, { ...placements[0], id: randomUUID() }] }, 1))).toThrowError(error("INVALID_INPUT"));
    expect(() => store.execute(a.id, command("room.placements", { roomId, placements: [{ ...placements[0], x: 0, z: 3 }] }, 1))).toThrowError(error("INVALID_INPUT"));
    expect(() => store.execute(a.id, { ...command("chat.send", { zoneId: "lounge", text: "forged" }), actorId: b.id })).toThrowError(error("INVALID_INPUT"));
    expect(() => store.execute(a.id, command("chat.send", { zoneId: "lounge", text: "extra", actorId: b.id }))).toThrowError(error("INVALID_INPUT"));
    expect(() => store.execute(a.id, command("room.configure", { roomId, open: false, palette: "sage" }, 1.5))).toThrowError(error("INVALID_INPUT"));
    expect(() => store.execute(a.id, command("house.create", { capacity: 7, name: "Invalid", colour: "sage" }))).toThrowError(error("INVALID_INPUT"));
    expect(() => store.execute(a.id, command("profile.set", { name: "", colour: "sage" }, 0))).toThrowError(error("INVALID_INPUT"));
  });
  it("keeps another active home and independent card edits intact under conflicts", () => {
    const { store, a, b } = pair(); const outsider = store.ensureSession();
    store.execute(outsider.id, command("house.create", { capacity: 2, name: "Other", colour: "amber" }));
    const before = store.snapshot(a.id), other = store.snapshot(outsider.id);
    expect(() => store.execute(a.id, command("house.join", { code: other.house.code, name: "Alice", colour: "sage" }))).toThrowError(error("ALREADY_MEMBER"));
    expect(() => store.execute(a.id, command("house.create", { capacity: 2, name: "Alice", colour: "sage" }))).toThrowError(error("ALREADY_MEMBER"));
    expect(store.snapshot(a.id)).toEqual(before);
    const roomId = before.residents.find(r => r.id === a.id)!.bedroomId;
    store.execute(a.id, command("room.configure", { roomId, open: true, palette: "sage" }, 0));
    expect(() => store.snapshot(outsider.id, roomId)).toThrowError(error("FORBIDDEN"));
    const savedA = store.execute(a.id, command("card.save", card("Alice question"), 0));
    const savedB = store.execute(b.id, command("card.save", card("Bob question"), 0));
    store.execute(a.id, command("card.save", { ...card("Alice revised"), cardId: savedA.result!.cardId, nextStep: "Inspect example" }, 1));
    store.execute(b.id, command("card.save", { ...card("Bob revised"), cardId: savedB.result!.cardId, nextStep: "Try proof" }, 1));
    expect(store.snapshot(a.id).cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ authorId: a.id, revision: 2, nextStep: "Inspect example", state: "active" }),
      expect.objectContaining({ authorId: b.id, revision: 2, nextStep: "Try proof", state: "active" }),
    ]));
    const after = store.snapshot(a.id);
    expect(() => store.execute(b.id, command("card.save", { ...card("Stale"), cardId: savedB.result!.cardId }, 1))).toThrowError(error("REVISION_CONFLICT"));
    expect(store.snapshot(a.id)).toEqual(after);
  });

  it("bounds plain Unicode input, safe resource links and inactive author writes", () => {
    const { store, a, b } = pair();
    const exact = "\u{1f642}".repeat(280);
    store.execute(a.id, command("chat.send", { zoneId: "lounge", text: exact }));
    expect(store.snapshot(a.id).chat[0]!.text).toBe(exact);
    for (const invalid of ["\u{1f642}".repeat(281), "", " \u0000bad"]) expect(() => store.execute(a.id, command("chat.send", { zoneId: "lounge", text: invalid }))).toThrowError(error("INVALID_INPUT"));
    for (const link of ["not a url", "ftp://example.com", "https://user:password@example.com"]) {
      expect(() => store.execute(a.id, command("card.save", { ...card("Resource"), resourceUrl: link }, 0))).toThrowError(error("INVALID_INPUT"));
    }
    const saved = store.execute(a.id, command("card.save", { ...card("Safe resource"), resourceUrl: "https://example.com/question" }, 0));
    const cardId = saved.result!.cardId;
    expect(() => store.execute(b.id, command("card.close", { cardId }, 1))).toThrowError(error("FORBIDDEN"));
    store.execute(a.id, command("card.close", { cardId }, 1));
    expect(() => store.execute(a.id, command("card.save", { ...card("Reopen"), cardId }, 2))).toThrowError(error("FORBIDDEN"));
    expect(() => store.execute(a.id, command("card.close", { cardId }, 2))).toThrowError(error("FORBIDDEN"));
    for (const invalid of [null, [], {}, { ...command("chat.send"), commandId: "invalid" }, { ...command("chat.send"), type: "unknown" }, { ...command("chat.send"), expectedRevision: -1 }]) {
      expect(() => store.execute(a.id, invalid)).toThrowError(error("INVALID_INPUT"));
    }
    expect(() => store.execute(a.id, command("chat.send", { zoneId: "lounge", text: undefined }))).toThrowError(error("INVALID_INPUT"));
    expect(() => store.execute(a.id, command("room.configure", { roomId: "bad", open: true, palette: "sage" }, 0))).toThrowError(error("INVALID_INPUT"));
  });

  it("exposes readiness, rejects unknown identities and safely fails closed databases", () => {
    const { store } = fixture(); const a = store.ensureSession();
    expect(store.ready()).toBe(true); expect(store.me(a.id)).toMatchObject({ home: null, archiveCount: 0 });
    const ownRevision = store.me(a.id).identity.revision;
    store.execute(a.id, command("profile.set", { name: "Before joining", colour: "peach" }, ownRevision));
    expect(store.me(a.id).identity).toMatchObject({ name: "Before joining", colour: "peach", revision: 1 });
    expect(() => store.me(randomUUID())).toThrowError(error("FORBIDDEN"));
    expect(() => store.exportOwn(randomUUID())).toThrowError(error("FORBIDDEN"));
    expect(() => store.issueRecovery(randomUUID())).toThrowError(error("FORBIDDEN"));
    expect(() => store.recover("bad")).toThrowError(error("FORBIDDEN"));
    store.close(); expect(store.ready()).toBe(false); store.close();
    expect(() => store.ensureSession()).toThrowError(error("STORAGE_UNAVAILABLE"));
    expect(() => store.session(a.digest)).toThrowError(error("STORAGE_UNAVAILABLE"));
    expect(() => store.snapshot(a.id)).toThrowError(error("STORAGE_UNAVAILABLE"));
  });

  it("treats differently cased command UUIDs as one durable actor command", () => {
    const { store, a } = pair();
    const cmd = command("chat.send", { zoneId: "lounge", text: "Exactly once" });
    const receipt = store.execute(a.id, cmd);
    expect(store.execute(a.id, { ...cmd, commandId: cmd.commandId.toUpperCase() })).toEqual(receipt);
    expect(store.snapshot(a.id).chat).toHaveLength(1);
  });

  it("expires seven-day chat on read and prunes expired rows on writes and restart", () => {
    const { store, path, a } = pair();
    const now = Date.now(); const clock = vi.spyOn(Date, "now").mockReturnValue(now - 8 * 24 * 60 * 60 * 1000);
    store.execute(a.id, command("chat.send", { zoneId: "lounge", text: "Expired private context" }));
    clock.mockReturnValue(now);
    expect(store.snapshot(a.id).chat).toEqual([]);
    expect(store.db.prepare("SELECT COUNT(*) AS count FROM chat").get()).toEqual({ count: 1 });
    store.execute(a.id, command("chat.send", { zoneId: "lounge", text: "Fresh message" }));
    expect(store.db.prepare("SELECT COUNT(*) AS count FROM chat").get()).toEqual({ count: 1 });
    clock.mockReturnValue(now - 8 * 24 * 60 * 60 * 1000);
    const roomId = store.snapshot(a.id).residents.find(r => r.id === a.id)!.bedroomId;
    store.execute(a.id, command("chat.send", { zoneId: roomId, text: "Expired bedroom context" }));
    clock.mockReturnValue(now); store.close(); const next = reopen(path);
    expect(next.db.prepare("SELECT COUNT(*) AS count FROM chat").get()).toEqual({ count: 1 });
    expect(next.snapshot(a.id, roomId).chat).toEqual([]);
  });

  it("does not expose private placement or closed-palette edits through lounge projections", () => {
    const { store, a, b } = pair();
    const roomId = store.snapshot(a.id).residents.find(r => r.id === a.id)!.bedroomId;
    const before = store.snapshot(b.id);
    store.execute(a.id, command("room.placements", { roomId, placements: [{ id: randomUUID(), kind: "plant", x: -4, z: -2, rotation: 0, colour: "sage" }] }, 0));
    expect(store.snapshot(b.id)).toEqual(before);
    store.execute(a.id, command("room.configure", { roomId, open: false, palette: "peach" }, 1));
    expect(store.snapshot(b.id)).toEqual(before);
    store.execute(a.id, command("room.configure", { roomId, open: true, palette: "peach" }, 2));
    expect(store.snapshot(b.id).sequence).toBe(before.sequence + 1);
    expect(store.snapshot(b.id).residents.find(r => r.id === a.id)!.open).toBe(true);
  });

  it("rejects insecure resource links before card mutation", () => {
    const { store, a } = pair(); const before = store.snapshot(a.id);
    expect(() => store.execute(a.id, command("card.save", { ...card("Insecure"), resourceUrl: "http://example.com" }, 0))).toThrowError(error("INVALID_INPUT"));
    expect(store.snapshot(a.id)).toEqual(before);
  });

  it("rejects commands queued for a departed house rather than redirecting them to a new house", () => {
    const { store, a, b, home } = pair();
    const queuedChat = command("chat.send", { zoneId: "lounge", text: "Only for the former house" });
    const queuedLeave = command("house.leave");
    store.execute(a.id, command("house.transfer", { memberId: b.id }));
    store.execute(a.id, command("house.leave"));
    store.execute(a.id, command("house.create", { capacity: 2, name: "New house", colour: "sage" }));
    const newHome = store.me(a.id).home!; expect(newHome.id).not.toBe(home.id);
    const before = store.snapshot(a.id);
    expect(() => store.execute(a.id, queuedChat)).toThrowError(error("FORBIDDEN"));
    expect(() => store.execute(a.id, queuedLeave)).toThrowError(error("FORBIDDEN"));
    expect(store.snapshot(a.id)).toEqual(before);
    expect(store.snapshot(b.id).chat).toEqual([]);
    expect(() => store.execute(a.id, { commandId: randomUUID(), type: "chat.send", payload: { zoneId: "lounge", text: "Unscoped" } })).toThrowError(error("INVALID_INPUT"));
    store.execute(a.id, command("chat.send", { zoneId: "lounge", text: "Current house" }, undefined, newHome.id));
    expect(store.snapshot(a.id).chat[0]!.text).toBe("Current house");
  });

  it("retries invitation collisions without partial houses and bounds repeated RNG failure", () => {
    const { store } = fixture(); const a = store.ensureSession(), b = store.ensureSession(), c = store.ensureSession();
    randomHook.bytes = [new Uint8Array(5)];
    store.execute(a.id, command("house.create", { capacity: 2, name: "First", colour: "sage" }));
    const first = store.me(a.id).home!;
    randomHook.bytes = [new Uint8Array(5), new Uint8Array(5).fill(1)];
    store.execute(b.id, command("house.create", { capacity: 2, name: "Collision retry", colour: "rose" }));
    expect(store.me(b.id).home!.code).not.toBe(first.code);
    expect(store.db.prepare("SELECT COUNT(*) AS count FROM houses").get()).toEqual({ count: 2 });
    expect(store.db.prepare("SELECT COUNT(*) AS count FROM members WHERE status='active'").get()).toEqual({ count: 2 });
    const before = store.me(c.id);
    randomHook.bytes = Array.from({ length: 32 }, () => new Uint8Array(5));
    expect(() => store.execute(c.id, command("house.create", { capacity: 2, name: "Bounded failure", colour: "peach" }))).toThrowError(error("STORAGE_UNAVAILABLE"));
    expect(store.me(c.id)).toEqual(before);
    expect(store.db.prepare("SELECT COUNT(*) AS count FROM houses").get()).toEqual({ count: 2 });
  });

  it("rolls recovery rotation back when the replacement session cannot be persisted", () => {
    const { store, a } = pair(); const proof = store.issueRecovery(a.id);
    store.db.exec("CREATE TRIGGER fail_recovery_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'simulated disk failure'); END;");
    expect(() => store.recover(proof)).toThrowError(error("STORAGE_UNAVAILABLE"));
    expect(store.session(a.digest)).toEqual({ id: a.id });
    store.db.exec("DROP TRIGGER fail_recovery_session");
    const recovered = store.recover(proof);
    expect(recovered.id).toBe(a.id);
    expect(store.session(a.digest)).toBeUndefined();
    expect(store.session(recovered.digest)).toEqual({ id: a.id });
  });

});
