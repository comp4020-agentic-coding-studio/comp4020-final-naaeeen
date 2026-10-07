import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, test } from "vitest";

// Extract the executable instrument functions without running its CLI/server.
const source = readFileSync(new URL("../tools/board-resource.mjs", import.meta.url), "utf8");
const ast = ts.createSourceFile("board-resource.mjs", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = new Map<string, string>(), handlers = new Map<string, string>();
function collect(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node.getText(ast));
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "socket.on" &&
      node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[1])
    handlers.set(node.arguments[0].text, node.arguments[1].getText(ast));
  ts.forEachChild(node, collect);
}
collect(ast);
function functionSource(name: string) {
  const value = functions.get(name);
  if (!value) throw new Error("Missing instrument function " + name);
  return value;
}
type Element = { id: string; version: number; versionNonce: number; text?: string };
type View = { index: number; house: number; role: string; intendedFault: boolean; elements: Map<string, Element>;
  chatIds: Set<string>; sequence: number; subscriptionId: string; memberIndex: number; writerVersion: number;
  patchEvents: number; chatEvents: number; snapshots: number; saved: number };
type Delivery = { house: number; type: string; elementId?: string; version?: number; messageId?: string;
  at: number; pending: Set<number>; slow: Set<number>; sequence?: number };
type Tracker = { views: View[]; deliveries: Map<string, Delivery>; pendingByView: Map<number, Set<Delivery>>;
  latencies: { normal: number[]; slow: number[] }; houses: any[]; stats: Record<string, number>;
  reflect(v: View, elements: Element[] | null, chat: { id: string }[] | null, sequence: number, at?: number): void;
  delivery(house: number, type: string, details: object, at: number): Delivery;
  performWrite(v: View, chat?: boolean): Promise<void>;
  frame(name: string, v: View, payload: object): void; faults(): { scopeErrors: number; staleFramesIgnored: number };
  clock: { now: number } };
function view(index: number, house = 0, intendedFault = false): View {
  return { index, house, role: "board", intendedFault, elements: new Map(), chatIds: new Set(), sequence: 0,
    subscriptionId: "epoch" + index, memberIndex: 0, writerVersion: 1, patchEvents: 0, chatEvents: 0, snapshots: 0, saved: 0 };
}
function fixture(views = [view(0), view(1, 0, true), view(2, 1)], http = async (..._args: any[]) => ({ value: { ok: true, sequence: 3, elements: [] } })): Tracker {
  const deliveries = new Map(), pendingByView = new Map(), latencies = { normal: [], slow: [] }, clock = { now: 0 };
  const stats = { chatSaved: 0, patchScheduled: 0, patchSaved: 0 };
  const houses = [0, 1].map(index => ({ id: "house" + index, elements: [{ id: "text_0", version: 1, versionNonce: 100 }],
    chatSerial: 0, expectedChat: new Map(), expectedVersions: new Map(), expectedElements: new Map(), receiptJournal: [] }));
  const boardHandlers = ["board.patch", "board.chat", "board.snapshot"].map(name => JSON.stringify(name) + ":" + handlers.get(name)).join(",");
  const factory = new Function("views", "deliveries", "pendingByView", "latencies", "performance", "randomUUID", "houses", "stats", "http", "ok",
    functionSource("reflect") + functionSource("delivery") + functionSource("performWrite") +
    "let scopeErrors=0,staleFramesIgnored=0;" +
    "return {reflect,delivery,performWrite,frame(name,v,payload){" + functionSource("currentBoard") +
    "const callbacks={" + boardHandlers + "};callbacks[name](payload);},faults:()=>({scopeErrors,staleFramesIgnored})};");
  let serial = 0;
  return { views, deliveries, pendingByView, latencies, houses, stats, clock,
    ...factory(views, deliveries, pendingByView, latencies, { now: () => clock.now }, () => "delivery" + serial++, houses, stats, http, (reply: any) => {
      if (!reply?.ok) throw new Error("No ACK"); return reply;
    }) };
}
function baselineReflect(t: Tracker, v: View, elements: Element[] | null, chat: { id: string }[] | null, sequence: number, at: number) {
  if (elements) for (const e of elements) {
    const old = v.elements.get(e.id);
    if (!old || e.version > old.version || e.version === old.version && e.versionNonce <= old.versionNonce) v.elements.set(e.id, e);
  }
  if (chat) for (const m of chat) v.chatIds.add(m.id);
  v.sequence = Math.max(v.sequence ?? 0, sequence ?? 0);
  for (const d of t.deliveries.values()) {
    if (d.house !== v.house || !d.pending.has(v.index)) continue;
    const seen = d.type === "patch" ? (v.elements.get(d.elementId!)?.version ?? 0) >= d.version! : v.chatIds.has(d.messageId!);
    if (seen) { d.pending.delete(v.index); t.latencies[d.slow.has(v.index) ? "slow" : "normal"].push(at - d.at); }
  }
}
const element = (version: number, versionNonce = 100, id = "note"): Element => ({ id, version, versionNonce });
const retained = (t: Tracker) => [...t.deliveries.values()].map(d => ({ ...d, pending: [...d.pending], slow: [...d.slow] }));
const state = (t: Tracker) => ({ deliveries: retained(t), latencies: t.latencies,
  views: t.views.map(v => ({ elements: [...v.elements], chat: [...v.chatIds], sequence: v.sequence })) });

describe("registered resource delivery matching", () => {
  test("never traverses completed history while retaining missing and slow targets", () => {
    const t = fixture();
    for (let n = 0; n < 200; n++) {
      t.delivery(0, "patch", { elementId: "done", version: n + 1 }, n);
      for (const v of t.views.slice(0, 2)) t.reflect(v, [element(n + 1, 100, "done")], null, n + 1, 1000 + n);
    }
    const missing = t.delivery(0, "patch", { elementId: "missing", version: 2 }, 300);
    const chat = t.delivery(0, "chat", { messageId: "future-chat" }, 310);
    // A materialised historical values() list would also trigger this guard.
    t.deliveries.values = () => { throw new Error("Completed delivery history traversed"); };
    t.reflect(t.views[0], [element(9)], null, 500, 1200);
    expect([...missing.pending]).toEqual([0, 1]);
    expect([...chat.pending]).toEqual([0, 1]);
    t.reflect(t.views[0], [element(2, 100, "missing")], null, 501, 1210);
    expect([...missing.pending]).toEqual([1]);
    t.reflect(t.views[1], [element(3, 100, "missing")], [{ id: "future-chat" }], 502, 5000);
    expect([...missing.pending]).toEqual([]);
    expect([...chat.pending]).toEqual([0]);
    expect(t.latencies.slow.slice(-2)).toEqual([4700, 4690]);
    expect(t.pendingByView.has(1)).toBe(false);
    expect(t.pendingByView.get(0)?.has(chat)).toBe(true);
    expect(t.deliveries.size).toBe(202);
  });

  test("matches the original scan after every target, version, chat and recovery event", () => {
    const candidate = fixture(), baseline = fixture();
    const add = (house: number, type: string, details: object, at: number) => {
      candidate.delivery(house, type, details, at); baseline.delivery(house, type, details, at);
    };
    const observe = (index: number, elements: Element[] | null, chat: { id: string }[] | null, sequence: number, at: number) => {
      candidate.reflect(candidate.views[index], elements, chat, sequence, at);
      baselineReflect(baseline, baseline.views[index], elements, chat, sequence, at);
      expect(state(candidate)).toEqual(state(baseline));
    };
    add(0, "patch", { elementId: "note", version: 2 }, 100);
    add(0, "patch", { elementId: "note", version: 3 }, 101);
    add(0, "chat", { messageId: "kept" }, 102);
    add(0, "chat", { messageId: "absent" }, 103);
    add(1, "patch", { elementId: "note", version: 2 }, 104);
    observe(0, [element(1)], [{ id: "unrelated" }], 1, 110);
    observe(2, [element(99)], [{ id: "kept" }], 40, 120);
    observe(0, [element(4, 90)], [{ id: "kept" }], 4, 130);
    observe(0, [element(4, 110)], [{ id: "kept" }], 2, 140);
    observe(0, [element(4, 80)], null, 5, 150);
    // Reconnect discards transient cached state; unresolved observations survive.
    for (const tracker of [candidate, baseline]) {
      tracker.views[1].elements = new Map(); tracker.views[1].chatIds = new Set();
    }
    observe(1, [element(3)], [{ id: "kept" }], 3, 2000);
    observe(1, [element(2)], null, 1, 2010);
    observe(0, null, null, 5, 2020);
    expect(candidate.views[0].elements.get("note")?.versionNonce).toBe(80);
    expect(retained(candidate).map(d => d.pending)).toEqual([[], [], [], [0, 1], []]);
    expect(candidate.latencies).toEqual({ normal: [16, 30, 29, 28], slow: [1900, 1899, 1898] });
  });

  test("a zero-target intent stays in historical aggregates without pending index entries", () => {
    const t = fixture([]), d = t.delivery(0, "chat", { messageId: "unobserved" }, 10);
    expect(t.deliveries.size).toBe(1);
    expect(d.pending.size).toBe(0);
    expect(t.pendingByView.size).toBe(0);
    expect(t.latencies).toEqual({ normal: [], slow: [] });
  });

  test("one observed peer cannot remove another normal or slow peer's target", () => {
    const t = fixture([view(0), view(1), view(2, 0, true)]);
    const d = t.delivery(0, "patch", { elementId: "note", version: 2 }, 10);
    t.reflect(t.views[0], [element(3)], null, 3, 30);
    t.reflect(t.views[0], [element(4)], null, 4, 40);
    expect([...d.pending]).toEqual([1, 2]);
    expect(t.pendingByView.get(1)?.has(d)).toBe(true);
    expect(t.pendingByView.get(2)?.has(d)).toBe(true);
    t.reflect(t.views[1], [element(1)], null, 1, 50);
    expect([...d.pending]).toEqual([1, 2]);
    t.reflect(t.views[1], [element(2)], null, 2, 80);
    expect([...d.pending]).toEqual([2]);
    expect(t.latencies).toEqual({ normal: [20, 70], slow: [] });
    expect(t.deliveries.size).toBe(1);
  });

  test("snapshots recognise present targets without turning missing chat into delivery", () => {
    const t = fixture(), d = t.delivery(0, "chat", { messageId: "not-retained" }, 10);
    t.delivery(0, "chat", { messageId: "snapshot-chat" }, 20);
    t.delivery(0, "patch", { elementId: "note", version: 2 }, 30);
    const snapshot = { schemaVersion: 1, subscriptionId: t.views[0].subscriptionId, houseId: "house0", sequence: 8,
      elements: [element(3)], chat: [{ id: "snapshot-chat" }] };
    t.clock.now = 50; t.frame("board.snapshot", t.views[0], snapshot);
    expect([...d.pending]).toEqual([0, 1]);
    expect(t.latencies.normal).toEqual([30, 20]);
    expect(t.views[0].snapshots).toBe(1);
  });

  test("stale subscription and wrong-house frames cannot satisfy pending targets", () => {
    const t = fixture(), d = t.delivery(0, "patch", { elementId: "note", version: 2 }, 10);
    const valid = { schemaVersion: 1, subscriptionId: t.views[0].subscriptionId, houseId: "house0", sequence: 2, elements: [element(2)] };
    t.frame("board.patch", t.views[0], { ...valid, subscriptionId: "old-epoch" });
    t.frame("board.patch", t.views[0], { ...valid, houseId: "house1" });
    t.frame("board.patch", t.views[0], { ...valid, schemaVersion: 9 });
    expect([...d.pending]).toEqual([0, 1]);
    expect(t.views[0].elements.size).toBe(0);
    expect(t.faults()).toEqual({ scopeErrors: 2, staleFramesIgnored: 1 });
    t.clock.now = 70; t.frame("board.patch", t.views[0], valid);
    expect([...d.pending]).toEqual([1]);
    expect(t.latencies.normal).toEqual([60]);
  });

  test("keeps targets captured at creation and their original slow classification", () => {
    const t = fixture(), d = t.delivery(0, "patch", { elementId: "note", version: 2 }, 10);
    t.views[0].intendedFault = true; t.views[1].intendedFault = false;
    t.views.push(view(3));
    t.reflect(t.views[3], [element(2)], null, 2, 20);
    expect([...d.pending]).toEqual([0, 1]);
    t.reflect(t.views[0], [element(2)], null, 2, 30);
    t.reflect(t.views[1], [element(2)], null, 2, 40);
    t.reflect(t.views[1], [element(3)], null, 3, 100);
    expect(t.latencies).toEqual({ normal: [20], slow: [30] });
    expect(t.deliveries.size).toBe(1);
    expect(t.pendingByView.size).toBe(0);
  });

  test.each([false, true])("retains post-HTTP reflection for already observed %s writes", async chat => {
    let resolveReceipt!: (value: any) => void;
    const receipt = new Promise<any>(resolve => { resolveReceipt = resolve; });
    let body: any;
    const t = fixture(undefined, async (_path, _view, value) => { body = value; return receipt; });
    for (const v of t.views.slice(0, 2)) {
      if (!chat) v.elements.set("text_0", element(5, 90, "text_0"));
    }
    t.clock.now = 100;
    const job = t.performWrite(t.views[0], chat);
    const d = [...t.deliveries.values()][0];
    if (chat) for (const v of t.views.slice(0, 2)) v.chatIds.add(body.id);
    expect([...d.pending]).toEqual([0, 1]);
    t.clock.now = 700;
    resolveReceipt({ value: { ok: true, sequence: 3, elements: body.elements ?? [] } });
    await job;
    expect([...d.pending]).toEqual([]);
    expect(d.at).toBe(100); expect(d.sequence).toBe(3);
    expect(t.latencies).toEqual({ normal: [600], slow: [600] });
    expect(t.houses[0].receiptJournal).toHaveLength(1);
    expect(t.deliveries.size).toBe(1);
    expect(t.pendingByView.size).toBe(0);
  });

  test("a board event before a late HTTP receipt records latency exactly once", async () => {
    let resolveReceipt!: (value: any) => void;
    const receipt = new Promise<any>(resolve => { resolveReceipt = resolve; });
    let body: any;
    const t = fixture(undefined, async (_path, _view, value) => { body = value; return receipt; });
    t.clock.now = 100; const job = t.performWrite(t.views[0]);
    const d = [...t.deliveries.values()][0];
    for (const v of t.views.slice(0, 2)) t.reflect(v, body.elements, null, 3, 150);
    expect(t.latencies).toEqual({ normal: [50], slow: [50] });
    t.clock.now = 900; resolveReceipt({ value: { ok: true, sequence: 3, elements: body.elements } }); await job;
    expect(t.latencies).toEqual({ normal: [50], slow: [50] });
    expect([...d.pending]).toEqual([]); expect(d.sequence).toBe(3);
  });
});
