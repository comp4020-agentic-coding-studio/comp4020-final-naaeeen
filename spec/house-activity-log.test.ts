import { afterEach, describe, expect, test, vi } from "vitest";
import { activityMetadata, createActivityLogger, type ActivityRecord } from "../src/activity-log.ts";

const actor = "f1b3c401-d9ee-4a2f-8e8f-dd7264c7d99c";
const peer = "2a65544b-54b5-4c7f-a158-0e1cdba87310";
const commandId = "c568d304-66b5-447a-b25c-91f356e9476c";
const houseId = "31821ba3-56cb-4e57-9415-c316f4f7c0ed";
const zoneId = "952ad250-451f-4720-8f9b-6930adb5cbb5";
const fixedAt = "2026-10-19T01:02:03.456Z";
const now = () => new Date(fixedAt);

afterEach(() => vi.restoreAllMocks());

function capture() {
  const records: ActivityRecord[] = [];
  return { records, log: createActivityLogger(record => records.push(record), now) };
}

describe("bounded activity records", () => {
  test("uses the server clock and emits only validated activity fields", () => {
    const { records, log } = capture();
    log({ at: "client-time", actor, action: "house/command:room.open", outcome: "SAVED",
      transport: "http", commandId, houseId, zoneId: "lounge", sequence: 0 });
    expect(records).toEqual([{ at: fixedAt, actor, action: "house/command:room.open", outcome: "SAVED",
      transport: "http", commandId, houseId, zoneId: "lounge", sequence: 0 }]);
  });

  test("preserves validated UUID case for receipt correlation and accepts socket transport", () => {
    const { records, log } = capture();
    log({ actor: actor.toUpperCase(), action: "room.read", outcome: "Forbidden", transport: "socket",
      commandId: commandId.toUpperCase(), houseId: houseId.toUpperCase(), zoneId: zoneId.toUpperCase(),
      sequence: Number.MAX_SAFE_INTEGER });
    expect(records[0]).toEqual({ at: fixedAt, actor: actor.toUpperCase(), action: "room.read", outcome: "Forbidden",
      transport: "socket", commandId: commandId.toUpperCase(), houseId: houseId.toUpperCase(), zoneId: zoneId.toUpperCase(), sequence: Number.MAX_SAFE_INTEGER });
  });

  test("does not turn a duplicate display alias or body identity into authority", () => {
    const { records, log } = capture();
    log({ actor, action: "house.join", outcome: "saved", name: "Same alias", userId: peer });
    log({ actor: peer, action: "house.join", outcome: "saved", name: "Same alias", userId: actor });
    log({ name: "Same alias", userId: actor, action: "house.join", outcome: "denied" });
    expect(records.map(record => record.actor)).toEqual([actor, peer, null]);
    expect(records.every(record => !("name" in record) && !("userId" in record))).toBe(true);
  });

  test.each([null, undefined, "", "peer-name", "00000000-0000-0000-0000-000000000000",
    "f1b3c401-d9ee-0a2f-8e8f-dd7264c7d99c", "f1b3c401-d9ee-4a2f-7e8f-dd7264c7d99c",
    actor + "\n", 3])("uses null for a noncanonical actor %j", invalid => {
    const { records, log } = capture();
    log({ actor: invalid, action: "room.read", outcome: "denied" });
    expect(records[0]?.actor).toBe(null);
  });

  test("omits content, credentials, raw requests, arbitrary errors and unknown fields", () => {
    const { records, log } = capture();
    const canary = "PRIVATE_CONTENT_CANARY";
    log({ actor, action: "chat.send", outcome: "saved", text: canary, message: canary, name: canary,
      token: canary, cookie: canary, ip: canary, headers: { authorization: canary }, payload: { text: canary },
      error: new Error(canary), body: { actor: peer, text: canary }, secret: canary });
    expect(records).toEqual([{ at: fixedAt, actor, action: "chat.send", outcome: "saved" }]);
    expect(JSON.stringify(records)).not.toContain(canary);
  });

  test.each([
    { transport: "websocket", commandId: "command", houseId: "house", zoneId: "bedroom", sequence: -1 },
    { transport: null, commandId: 12, houseId: {}, zoneId: [], sequence: 0.5 },
    { transport: "HTTP", commandId: commandId + "\r\n", houseId: houseId + "x", zoneId: "lounge\n", sequence: Number.MAX_SAFE_INTEGER + 1 },
    { transport: {}, commandId: null, houseId: null, zoneId: null, sequence: Number.POSITIVE_INFINITY },
    { sequence: Number.NaN },
  ])("omits invalid optional metadata %#", metadata => {
    const { records, log } = capture();
    log({ actor, action: "room.read", outcome: "denied", ...metadata });
    expect(records).toEqual([{ at: fixedAt, actor, action: "room.read", outcome: "denied" }]);
  });

  test("accepts the action and outcome length limits", () => {
    const { records, log } = capture();
    log({ actor, action: "a" + "b".repeat(63), outcome: "A" + "b".repeat(47) });
    expect(records[0]?.action).toHaveLength(64);
    expect(records[0]?.outcome).toHaveLength(48);
  });

  test.each([
    { action: "a".repeat(65), outcome: "b".repeat(49) },
    { action: "House.read", outcome: "failed with private work" },
    { action: "1invalid", outcome: "1invalid" },
    { action: "", outcome: "" },
    { action: null, outcome: {} },
    { action: "chat.send\nforged", outcome: "saved\r\nforged" },
  ])("replaces invalid or unbounded event labels %#", labels => {
    const { records, log } = capture();
    log({ actor, ...labels });
    expect(records).toEqual([{ at: fixedAt, actor, action: "activity.unknown", outcome: "unknown" }]);
  });

  test("default stdout is one actual JSON line even for log-injection input", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    const log = createActivityLogger(undefined, now);
    log({ actor: actor + "\nforged", action: "room.read\nforged", outcome: "FAILED\r\nforged",
      commandId: commandId + "\n", text: "\n{\"actor\":\"forged\"}", headers: { cookie: "PRIVATE_COOKIE" } });
    expect(output).toHaveBeenCalledTimes(1);
    const line = output.mock.calls[0]?.[0];
    expect(typeof line).toBe("string");
    expect(line).not.toMatch(/[\r\n]/);
    expect(JSON.parse(line)).toEqual({ at: fixedAt, actor: null, action: "activity.unknown", outcome: "unknown" });
  });

  test("isolates a synchronous sink failure and leaves subsequent operations usable", () => {
    let calls = 0;
    const log = createActivityLogger(() => { calls++; throw new Error("sink unavailable"); }, now);
    const committed: string[] = [];
    function commit(value: string) {
      committed.push(value);
      log({ actor, action: "card.save", outcome: "saved" });
      return value;
    }
    expect(commit("first")).toBe("first");
    expect(commit("second")).toBe("second");
    expect(committed).toEqual(["first", "second"]);
    expect(calls).toBe(2);
  });

  test("reads the clock for each activity", () => {
    const output = vi.fn();
    const clock = vi.fn().mockReturnValueOnce(new Date(fixedAt)).mockReturnValueOnce(new Date("2026-10-19T01:02:04.000Z"));
    const log = createActivityLogger(output, clock);
    log({ actor, action: "house.read", outcome: "ok" });
    log({ actor, action: "house.read", outcome: "ok" });
    expect(output.mock.calls.map(([record]) => record.at)).toEqual([fixedAt, "2026-10-19T01:02:04.000Z"]);
  });

  test("the default clock creates an ISO server timestamp", () => {
    const output = vi.fn();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(fixedAt));
      createActivityLogger(output)({ actor, action: "house.read", outcome: "ok" });
      expect(output.mock.calls[0]?.[0]?.at).toBe(fixedAt);
    } finally { vi.useRealTimers(); }
  });
});

describe("command correlation metadata", () => {
  test("extracts only valid correlation fields, never payload contents or identities", () => {
    const raw = { commandId, houseId, actor, name: "PRIVATE_NAME", text: "PRIVATE_TEXT",
      outcome: "CLIENT_OUTCOME", token: "PRIVATE_TOKEN", headers: { cookie: "PRIVATE_COOKIE" },
      payload: { zoneId, actor: peer, text: "PRIVATE_TEXT", outcome: "CLIENT_OUTCOME" } };
    expect(activityMetadata(raw)).toEqual({ commandId, houseId, zoneId });
    expect(raw.payload.text).toBe("PRIVATE_TEXT");
  });

  test("supports the command id and room aliases", () => {
    expect(activityMetadata({ id: commandId.toUpperCase(), houseId: houseId.toUpperCase(), payload: { roomId: zoneId.toUpperCase() } }))
      .toEqual({ commandId: commandId.toUpperCase(), houseId: houseId.toUpperCase(), zoneId: zoneId.toUpperCase() });
    expect(activityMetadata({ id: commandId, payload: { zoneId: "lounge" } })).toEqual({ commandId, zoneId: "lounge" });
  });

  test("uses nullish precedence without rescuing invalid primary values from other aliases", () => {
    expect(activityMetadata({ commandId: "invalid", id: commandId, zoneId: "invalid", payload: { zoneId, roomId: zoneId } })).toEqual({});
    expect(activityMetadata({ commandId: null, id: commandId, zoneId: null, payload: { zoneId: null, roomId: zoneId } }))
      .toEqual({ commandId, zoneId });
    expect(activityMetadata({ zoneId: "lounge", payload: { zoneId, roomId: zoneId } })).toEqual({ zoneId: "lounge" });
  });

  test.each([null, undefined, true, false, 17, "raw", [], [commandId], () => {}])("rejects non-object raw input %j", raw => {
    expect(activityMetadata(raw)).toEqual({});
  });

  test.each([null, undefined, "text", [], 5])("ignores a non-record payload %j", payload => {
    expect(activityMetadata({ commandId, payload })).toEqual({ commandId });
  });

  test("omits invalid metadata and metadata not permitted by the helper", () => {
    expect(activityMetadata({ commandId: "c".repeat(1000), houseId: "house", zoneId: "lounge\n",
      sequence: 3, transport: "http", action: "chat.send", outcome: "saved", actor })).toEqual({});
  });
});
