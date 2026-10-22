import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io, type Socket } from "socket.io-client";
import { createService } from "../src/server.ts";
import { HOUSE_WORLD_VERSION } from "../public/house-version.js";
import { createLayout, findRoute } from "../public/house-geometry.js";
import ts from "typescript";
import { describe, expect, test, vi } from "vitest";

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

  test("receipt digest work follows the original reflected delivery timing point", async () => {
    let release!: (value:any)=>void, captured=false;
    const pending=new Promise<any>(done=>release=done);
    const t=fixture(undefined,async()=>pending);
    for(const v of t.views.slice(0,2))v.elements.set("text_0",element(5,90,"text_0"));
    t.clock.now=100;const write=t.performWrite(t.views[0]);t.clock.now=700;
    release({value:{ok:true,sequence:3,elements:[]},captureACK:()=>{captured=true;expect(t.latencies).toEqual({normal:[600],slow:[600]});t.clock.now=9000;}});
    await write;expect(captured).toBe(true);expect(t.latencies).toEqual({normal:[600],slow:[600]});
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


describe("registered combined game grading", () => {
  const projection = () => ({ revision: 5, rosterRevision: 2, current: {
    roundId: "round", status: "active", players: ["a", "b"], ready: [null, null],
    cells: Array(42).fill(null), turn: 0, lastMove: null, resumeRevision: 0, recoveryDeadlineAt: null
  }, latestResult: null });
  const expected = () => ({ revision: 5, rosterRevision: 2, roundId: "round", status: "active",
    players: ["a", "b"], ready: [false, false], cells: Array(42).fill(null), turn: 0, lastMove: null });
  const grader = () => new Function("return (" + functionSource("gameProjectionMatches") + ");")();
  test("accepts the exact visible game and rejects wrong revision, round, cells and player", () => {
    const grade = grader(); expect(grade(projection(), expected())).toBe(true);
    for (const field of ["revision", "rosterRevision"]) {
      const wrong = projection(); (wrong as any)[field]++; expect(grade(wrong, expected())).toBe(false);
    }
    for (const mutate of [
      (g: any) => g.current.roundId = "other",
      (g: any) => g.current.cells[0] = 1,
      (g: any) => g.current.players[1] = "outsider",
      (g: any) => g.current.ready[0] = {},
      (g: any) => g.current.status = "paused",
    ]) { const wrong = projection(); mutate(wrong); expect(grade(wrong, expected())).toBe(false); }
  });
  test("distinguishes a terminal win from neutral withdrawal and absent terminal state", () => {
    const grade = grader(), e = { ...expected(), status: "terminal", reason: "win", winner: 0 };
    const g: any = { revision: 5, rosterRevision: 2, current: null, latestResult: {
      roundId: "round", players: ["a", "b"], cells: e.cells, lastMove: null, reason: "win", winner: 0,
      startedAt: 100, endedAt: 200 } };
    expect(grade(g, e)).toBe(true); g.latestResult.reason = "player_left"; expect(grade(g, e)).toBe(false);
    g.latestResult = null; expect(grade(g, e)).toBe(false);
  });
  test("the original protocol retains every workload, gate, duration, fault and capacity field", () => {
    const old = JSON.parse(readFileSync(new URL("../docs/post-crit/evidence/resource-pre-adaptation-protocol.json", import.meta.url), "utf8"));
    const current = JSON.parse(readFileSync(new URL("../evaluation/board-resource.protocol.json", import.meta.url), "utf8"));
    const combined = JSON.parse(readFileSync(new URL("../docs/post-crit/evidence/combined-resource.protocol.json", import.meta.url), "utf8"));
    for (const key of ["durationSeconds", "automaticRetry", "configuration", "fixture", "workload", "slowReader", "negativeControls", "bounds", "measurement", "classification", "limitations"]) {
      expect(current[key], key).toEqual(old[key]); expect(combined[key], key).toEqual(old[key]);
    }
    const oldSource = readFileSync(new URL("../docs/post-crit/evidence/resource-pre-adaptation-instrument.mjs", import.meta.url), "utf8");
    const gateLine = (raw: string) => raw.split("\n").find(line => line.includes("const gates = {"));
    expect(gateLine(source)).toBe(gateLine(oldSource));
  });
  test("observed revision grading rejects missing, duplicate, slow-excluded, changed and late targets", () => {
    const scenario = JSON.parse(readFileSync(new URL("../docs/post-crit/evidence/combined-resource.protocol.json", import.meta.url), "utf8")).gameScenario;
    const slow = { pauseAtSeconds: 30, pauseSeconds: 65 };
    const factory = new Function("q", functionSource("gameStepPlan") + functionSource("gameTargetIndices") + functionSource("gradeGameEvidence") + "return {plan:gameStepPlan,grade:gradeGameEvidence};");
    const { plan, grade } = factory((values: number[], percentile: number) => [...values].sort((a,b) => a-b)[Math.ceil(values.length * percentile)-1]);
    const evidence: any = { status: "COMPLETE", actions: [], rounds: [] };
    for (let houseIndex = 0; houseIndex < 2; houseIndex++) {
      let revision = 0;
      for (let roundIndex = 0; roundIndex < 6; roundIndex++) {
        const steps = plan(roundIndex === 2);
        for (const [stepIndex, step] of steps.entries()) {
          const scheduledOffsetSeconds = [5,45,105,145,185,225][roundIndex] + stepIndex;
          const targetIndices = Array.from({length:6}, (_,m) => houseIndex * 12 + 2*m).filter(i => !(i===0 && scheduledOffsetSeconds>=30 && scheduledOffsetSeconds<95));
          evidence.actions.push({houseIndex,roundIndex,stepIndex,type:step.type,slot:step.slot,code:step.code,revision:++revision,scheduledOffsetSeconds,sendLagMs:0,targetIndices,status:"VISIBLE",gameHash:"a".repeat(64),observed:targetIndices.map(viewIndex=>({viewIndex,gameHash:"a".repeat(64),latencyMs:100}))});
        }
        evidence.rounds.push({houseIndex,roundIndex,actions:steps.length,finalRevision:revision,outcome:roundIndex===2?"player_left":"win"});
      }
    }
    expect(grade(scenario,slow,evidence)).toBe(true);
    expect(evidence.actions.reduce((n: number,a: any)=>n+a.observed.length,0)).toBe(733);
    for (const change of [
      (e: any) => e.actions[0].observed.pop(),
      (e: any) => e.actions[0].observed[1] = e.actions[0].observed[0],
      (e: any) => e.actions.find((a: any)=>a.houseIndex===0 && a.roundIndex===1).targetIndices.unshift(0),
      (e: any) => e.actions[0].revision++,
      (e: any) => e.actions[0].observed[0].gameHash = "other",
      (e: any) => e.actions.forEach((a: any)=>{delete a.gameHash;a.observed.forEach((o: any)=>delete o.gameHash);}),
      (e: any) => e.actions.forEach((a: any)=>{a.gameHash=null;a.observed.forEach((o: any)=>o.gameHash=null);}),
      (e: any) => e.actions.forEach((a: any)=>{a.gameHash="malformed";a.observed.forEach((o: any)=>o.gameHash="malformed");}),
      (e: any) => e.actions.pop(),
      (e: any) => e.actions[0].sendLagMs = 1001,
      (e: any) => e.actions.forEach((a: any)=>a.observed.forEach((o: any)=>o.latencyMs=1001)),
      (e: any) => e.rounds[0].outcome = "player_left",
    ]) { const changed=structuredClone(evidence);change(changed);expect(grade(scenario,slow,changed)).toBe(false); }
  });
  test("fixed finite schedules retain both Ready actions, legal moves, win and neutral Leave", () => {
    const plan = new Function("return (" + functionSource("gameStepPlan") + ");")();
    expect(plan(false).map((s: any) => s.type)).toEqual(["join", "join", "ready", "ready", ...Array(7).fill("move")]);
    expect(plan(false).slice(4).map((s: any) => s.column)).toEqual([0, 1, 0, 1, 0, 1, 0]);
    expect(plan(true).map((s: any) => s.type)).toEqual(["join", "join", "ready", "ready", "move", "move", "leave"]);
  });
});


// Extract the actual command expression used by playGameRound, including its wiring.
function instrumentGameCommand(step: any, expected: any, houseId: string) {
  const gameAST = ts.createSourceFile("round.mjs", functionSource("playGameRound"), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let payloadStart: number | undefined, commandEnd: number | undefined;
  function find(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(gameAST) === "payload") payloadStart = node.parent.parent.getStart(gameAST);
    if (ts.isVariableDeclaration(node) && node.name.getText(gameAST) === "command") commandEnd = node.parent.parent.getEnd();
    ts.forEachChild(node, find);
  }
  find(gameAST);
  if (payloadStart === undefined || commandEnd === undefined) throw new Error("Missing actual game command construction");
  const construction = gameAST.text.slice(payloadStart, commandEnd);
  return new Function("randomUUID", "step", "expected", "h", construction + ";return command;")(randomUUID, step, expected, { id: houseId });
}

describe("combined resource command authority binding", () => {
  test("the sole instrument change is the combined-only command house field", () => {
    const measured = readFileSync(new URL("../docs/post-crit/evidence/resource-measured-instrument.mjs", import.meta.url), "utf8");
    const p6Repaired = readFileSync(new URL("../docs/post-crit/evidence/p7-resource-preimage-instrument.mjs", import.meta.url), "utf8");
    expect(p6Repaired).toBe(measured.replace('const command = { commandId: randomUUID(), type: "game." + step.type, payload,', 'const command = { commandId: randomUUID(), type: "game." + step.type, houseId: h.id, payload,'));
    const failed = JSON.parse(readFileSync(new URL("../docs/post-crit/evidence/combined-resource.first-fail.protocol.json", import.meta.url), "utf8"));
    const current = JSON.parse(readFileSync(new URL("../docs/post-crit/evidence/combined-resource.protocol.json", import.meta.url), "utf8"));
    expect(current.gameScenario).toEqual(failed.gameScenario);
  });
  test("the actual emitted command retains the original house destination", () => {
    const c = instrumentGameCommand({type:"join",slot:0}, {roundId:null,revision:0}, "bound-home");
    expect(c.houseId).toBe("bound-home"); expect(c.payload).toEqual({roundId:null}); expect(c.expectedRevision).toBe(0);
  });
  test("real socket authority rejects missing/foreign houses, saves complete games and replays original receipt", async () => {
    const dir = mkdtempSync(join(tmpdir(), "resource-command-")), service = createService({dataDir:dir,secureCookies:false});
    const sockets: Socket[] = [];
    let now = Date.now();
    const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
    try {
      await new Promise<void>(done=>service.server.listen(0,"127.0.0.1",done));
      const address = service.server.address(); if (!address || typeof address === "string") throw new Error("No fixture port");
      const origin = "http://127.0.0.1:" + address.port;
      async function http(path: string, cookie?: string, body?: object): Promise<any> {
        const r = await fetch(origin+path,{method:body?"POST":"GET",headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})});
        const value = await r.json(); if(!r.ok) throw new Error("Fixture HTTP rejected");
        return {value,cookie:r.headers.get("set-cookie")?.split(";")[0]??cookie};
      }
      const houses: any[] = [];
      for(let houseIndex=0;houseIndex<2;houseIndex++) {
        const people: any[]=[]; let house: any;
        for(let n=0;n<2;n++) {
          const opened=await http("/api/house/me");
          await http("/api/house/command",opened.cookie,{commandId:randomUUID(),type:n?"house.join":"house.create",payload:{...(n?{code:house.code}:{capacity:2}),name:"Resource fixture",colour:n?"rose":"sage"}});
          const me=await http("/api/house/me",opened.cookie); house=me.value.home;
          const socket=io(origin,{autoConnect:false,forceNew:true,reconnection:false,transports:["websocket"],auth:{worldVersion:HOUSE_WORLD_VERSION},extraHeaders:{Origin:origin,Cookie:opened.cookie}});
          sockets.push(socket);const person:any={socket,identity:me.value.identity.id,snapshot:null,motionSequence:0};
          socket.on("house.snapshot",r=>person.snapshot=r);
          await new Promise<void>((done,reject)=>{socket.once("connect",done);socket.once("connect_error",reject);socket.connect();});
          const subscription=await socket.timeout(3000).emitWithAck("house.subscribe",{zoneId:"lounge",controllerToken:randomUUID()});
          expect(subscription.ok).toBe(true);expect(subscription.snapshot.controller).toBe(true);person.snapshot=subscription.snapshot;people.push(person);
          // This authority fixture uses the real chair claim: standing elsewhere
          // no longer grants a game role. Only the fixture's civil clock advances.
          const layout=createLayout(2), seat=layout.seats.find(candidate=>candidate.id==="game-seat-"+(n+1))!;
          const own=person.snapshot.players.find((candidate:any)=>candidate.id===person.identity);
          const route=findRoute(layout,{x:own.x,z:own.z},seat.target);
          expect(route).not.toBeNull();
          for(const point of route!.slice(1)) {
            now+=80;
            expect(await socket.timeout(3000).emitWithAck("house.move",{generation:person.snapshot.generation,sequence:++person.motionSequence,...point,heading:0})).toMatchObject({ok:true});
          }
          expect(await socket.timeout(3000).emitWithAck("house.seat",{generation:person.snapshot.generation,seatId:seat.id})).toMatchObject({ok:true});
          await vi.waitFor(()=>expect(person.snapshot.players.find((candidate:any)=>candidate.id===person.identity)?.seatId).toBe(seat.id));
        }
        houses.push({id:house.id,people});
      }
      const initial=instrumentGameCommand({type:"join",slot:0},{roundId:null,revision:0},houses[0].id);
      const send=async(person:any,command:any)=>person.socket.timeout(3000).emitWithAck("house.command",{generation:person.snapshot.generation,zoneId:"lounge",command});
      const missing={...initial,commandId:randomUUID()};delete missing.houseId;
      expect(await send(houses[0].people[0],missing)).toMatchObject({ok:false,code:"INVALID_INPUT"});
      expect(await send(houses[0].people[0],{...initial,commandId:randomUUID(),houseId:houses[1].id})).toMatchObject({ok:false,code:"FORBIDDEN"});
      const plan=new Function("return ("+functionSource("gameStepPlan")+");")();
      for(const [houseIndex,house] of houses.entries()) {
        let game=service.houseStore.snapshot(house.people[0].identity).game!;
        let original:any,originalReceipt:any;
        for(const [stepIndex,step] of plan(houseIndex===1).entries()) {
          const expected={roundId:game.current?.roundId??null,revision:game.revision,rosterRevision:game.rosterRevision};
          const command=instrumentGameCommand(step,expected,house.id);
          const receipt=await send(house.people[step.slot],command);
          expect(receipt.ok).toBe(true);expect(receipt.result.code).toBe(step.code);expect(receipt.entityRevision).toBe(game.revision+1);
          if(stepIndex===0){original=command;originalReceipt=receipt;}
          const deadline=Date.now()+3000;
          while(house.people.some((person:any)=>person.snapshot.durable.game.revision<receipt.entityRevision) && Date.now()<deadline) await new Promise(done=>setTimeout(done,5));
          for(const person of house.people)expect(person.snapshot.durable.game.revision).toBe(receipt.entityRevision);
          game=service.houseStore.snapshot(house.people[0].identity).game!;
        }
        expect(game.current).toBeNull();expect(game.latestResult!.reason).toBe(houseIndex===1?"player_left":"win");
        expect(await send(house.people[0],original)).toEqual(originalReceipt);
      }
      expect(service.houseStore.db.prepare("SELECT count(*) AS n FROM receipts").get()).toEqual({n:22});
    } finally {
      for(const socket of sockets)socket.disconnect();await service.close();clock.mockRestore();rmSync(dir,{recursive:true,force:true});
    }
  },20000);
});
