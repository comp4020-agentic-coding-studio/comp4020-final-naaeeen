import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HouseStore } from "../src/house-store.ts";
import { createActivityLogger, activityMetadata } from "../src/activity-log.ts";
import { describe, expect, test } from "vitest";
import { parseDiscordDestination } from "../src/house-voice.ts";

describe("explicit Discord destination policy", () => {
  test.each([
    ["", null], ["   ", null],
    [" https://discord.gg/Study-Group_1 ", "https://discord.gg/Study-Group_1"],
    ["https://discord.com/invite/StudyGroup", "https://discord.com/invite/StudyGroup"],
    ["https://discord.com/channels/123456789012345678/223456789012345678", "https://discord.com/channels/123456789012345678/223456789012345678"],
  ])("keeps the bounded destination %s", (input, expected) => expect(parseDiscordDestination(input)).toBe(expected));
  test.each([
    undefined, null, 1, {}, "http://discord.gg/Study", "javascript:alert(1)",
    "https://discord.gg.evil.example/Study", "https://evil.example/discord.gg/Study",
    "https://user:pass@discord.gg/Study", "https://discord.gg:444/Study",
    "https://discord.gg/Study?next=https://evil.example", "https://discord.gg/Study#part",
    "https://discord.com/channels/@me/123456789012345678", "https://discord.com/api/webhooks/1/secret",
    "https://discord.com/channels/123/456/789", "https://discord.gg/%2e%2e/Study",
    "https://discord.gg/Stu\tdy", "https://discord.gg/Study\\next", "https://discord.gg/" + "a".repeat(600),
  ])("rejects unsupported destination %j", input => expect(() => parseDiscordDestination(input)).toThrow());
});


describe("saved member-only voice destination", () => {
  test("owner sets, updates and clears with receipts; stale and other-member edits cannot replace it", () => {
    const store = new HouseStore(":memory:");
    try {
      const owner = store.ensureSession(), peer = store.ensureSession(), outsider = store.ensureSession();
      store.execute(owner.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 2, name: "Owner", colour: "sage" } });
      const home = store.me(owner.id).home!;
      store.execute(peer.id, { commandId: randomUUID(), type: "house.join", payload: { code: home.code, name: "Peer", colour: "rose" } });
      expect(store.snapshot(peer.id).voice).toEqual({ url: null, revision: 0 });
      const command = { commandId: randomUUID(), type: "house.voice", houseId: home.id, expectedRevision: 0, payload: { url: "https://discord.gg/study" } };
      expect(() => store.execute(peer.id, command)).toThrow(/owner/i);
      expect(() => store.execute(outsider.id, command)).toThrow(/membership/i);
      const receipt = store.execute(owner.id, command);
      expect(store.execute(owner.id, command)).toEqual(receipt);
      expect(store.snapshot(peer.id).voice).toEqual({ url: command.payload.url, revision: 1 });
      const ownRoom = store.snapshot(owner.id).residents.find(p => p.id === owner.id)!.bedroomId;
      expect(store.snapshot(owner.id, ownRoom).voice).toEqual({ url: command.payload.url, revision: 1 });
      expect(() => store.execute(owner.id, { ...command, commandId: randomUUID(), payload: { url: "" } })).toThrow(/changed/i);
      store.execute(owner.id, { ...command, commandId: randomUUID(), expectedRevision: 1, payload: { url: "" } });
      expect(store.snapshot(peer.id).voice).toEqual({ url: null, revision: 2 });
      expect(store.execute(owner.id, command)).toEqual(receipt);
      expect(store.snapshot(peer.id).voice).toEqual({ url: null, revision: 2 });
      const records: unknown[] = []; createActivityLogger(record => records.push(record))({ actor: owner.id, action: "house.voice", outcome: "accepted", ...activityMetadata(command), url: command.payload.url });
      expect(JSON.stringify(records)).not.toContain("discord");
    } finally { store.close(); }
  });
  test("voice state and receipt are atomic and survive a process restart", () => {
    const dir = mkdtempSync(join(tmpdir(), "house-voice-")); let store = new HouseStore(join(dir, "house.sqlite"));
    try {
      const owner = store.ensureSession(); store.execute(owner.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 2, name: "Owner", colour: "sage" } });
      const home = store.me(owner.id).home!, before = store.snapshot(owner.id);
      const command = { commandId: randomUUID(), type: "house.voice", houseId: home.id, expectedRevision: 0, payload: { url: "https://discord.gg/study" } };
      store.db.exec("CREATE TRIGGER voice_receipt_failure BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT,'fixture'); END");
      expect(() => store.execute(owner.id, command)).toThrow(); expect(store.snapshot(owner.id).voice).toEqual({ url: null, revision: 0 });
      store.db.exec("DROP TRIGGER voice_receipt_failure"); const receipt = store.execute(owner.id, command);
      store.close(); store = new HouseStore(join(dir, "house.sqlite"));
      expect(store.snapshot(owner.id).voice).toEqual({ url: command.payload.url, revision: 1 });
      expect(store.snapshot(owner.id).residents).toEqual(before.residents);
      expect(store.execute(owner.id, command)).toEqual(receipt);
    } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
  });
});
