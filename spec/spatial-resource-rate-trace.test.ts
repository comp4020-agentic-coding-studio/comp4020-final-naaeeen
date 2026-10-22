import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, test } from "vitest";
import { createLayout, findRoute } from "../public/house-geometry.js";
import {
  BOOTSTRAP_RATE_COLUMNS,
  MEMORY_DIAGNOSTIC_COLUMNS,
  MEMORY_DIAGNOSTIC_WALL_COLUMNS,
  beginBootstrapRateAction,
  bootstrapRateArtifact,
  captureMemoryDiagnostic,
  classifyBootstrapRateAck,
  finishBootstrapRateAction,
  memoryDiagnosticArtifact,
  newBootstrapRateTrace,
  newMemoryDiagnosticCapture,
  registerBootstrapRateRoute,
} from "../tools/spatial-resource.mjs";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const bound = JSON.parse(read("docs/spatial-redesign/evidence/rate-attribution-route-bound.json"));
const current = read("tools/spatial-resource.mjs");
const prior = read("docs/spatial-redesign/evidence/rate-attribution-preimage-spatial-instrument.mjs");
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const privateValue = "private-cookie-identity-token-body-raw-message";
const budgetAck = { ok: false, code: "RATE_LIMITED", message: "Please slow down your house actions." };
const intervalAck = { ok: false, code: "RATE_LIMITED", message: "Movement updates are limited to ten per second." };
const cloneBound = () => structuredClone(bound);

function routeFor(actorIndex: number) {
  const memberIndex = (actorIndex % 12) / 2;
  const layout = createLayout(6), seat = layout.seats.find(value => value.id === "game-seat-" + (memberIndex + 1))!;
  const route = findRoute(layout, layout.arrivals![memberIndex], seat.target);
  if (!route) throw new Error("Missing canonical fixture route");
  return route;
}

function fixture() {
  const time = { monotonicMs: 100, wallMs: 100000 };
  const trace = newBootstrapRateTrace(cloneBound(), () => ({ ...time }));
  for (const entry of bound.routes) registerBootstrapRateRoute(trace, entry.actorIndex, routeFor(entry.actorIndex));
  return { trace, time };
}

function rowFor(trace: ReturnType<typeof newBootstrapRateTrace>, actorIndex = 2, step = 1) {
  return beginBootstrapRateAction(trace, actorIndex, step, step, "move");
}

function memorySample(sequence = 1, wallMs: any = 1000): any {
  return {
    rssMiB: 100, heapMiB: 40, externalMiB: 8, arrayBuffersMiB: 4, rssPeakMiB: 100, heapPeakMiB: 40,
    houseViews: 12, boardViews: 12, activeEngines: 24,
    memoryDiagnostic: { sequence, monotonicMs: sequence * 100, heapTotalMiB: 64, heapTotalPeakMiB: 64, externalPeakMiB: 8, arrayBuffersPeakMiB: 4, osMaxRSSMiB: 150, boundary: null, serverWallMs: wallMs },
  };
}

function executable(source: string, predicate: (node: ts.Node, ast: ts.SourceFile) => boolean) {
  const ast = ts.createSourceFile("instrument.mjs", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), nodes: ts.Node[] = [];
  function visit(node: ts.Node) { if (predicate(node, ast)) nodes.push(node); ts.forEachChild(node, visit); }
  visit(ast);
  if (nodes.length !== 1) throw new Error("Expected one actual instrument node, found " + nodes.length);
  return nodes[0].getText(ast);
}

function actualFunction(name: string, source = current) {
  return executable(source, node => ts.isFunctionDeclaration(node) && node.name?.text === name);
}

function actualSit(ask: (actor: any, event: string, body: any) => Promise<any>) {
  const { trace } = fixture();
  trace.registered.clear();
  const events: any[] = [], layout = createLayout(6), player = { seatId: null as string | null };
  const actor: any = { index: 2, memberIndex: 1, house: 0, x: layout.arrivals![1].x, z: layout.arrivals![1].z, motionSequence: 0, identity: privateValue, token: privateValue };
  const env = {
    rateTrace: trace, registerBootstrapRateRoute, beginBootstrapRateAction, finishBootstrapRateAction,
    createLayout, findRoute, evidence: { seatClaims: [] }, start: 0,
    fail: (code: string) => { throw Object.assign(new Error(code), { code }); },
    ok: (reply: any) => { if (!reply?.ok) throw Object.assign(new Error(reply?.code ?? "SPATIAL_NO_ACK"), { code: reply?.code ?? "SPATIAL_NO_ACK" }); return reply; },
    self: () => player, isSeated: () => false, stand: async () => { throw new Error("Unexpected stand"); },
    control: async (_actor: any, operation: () => Promise<any>) => operation(),
    waitFor: async (predicate: () => boolean) => { expect(predicate()).toBe(true); }, updatePosition: () => {},
    round: (value: number) => value, signal: new AbortController().signal,
    timerDelay: async (ms: number) => { events.push(["sleep", ms]); },
    ask: async (target: any, event: string, body: any) => { events.push(["ask", event, { ...body }]); const ack = await ask(target, event, body); if (ack?.ok && event === "house.seat") player.seatId = body.seatId; return ack; },
  };
  const functions = new Function("env", [
    "const { rateTrace, registerBootstrapRateRoute, beginBootstrapRateAction, finishBootstrapRateAction, createLayout, findRoute, evidence, start, fail, ok, self, isSeated, stand, control, waitFor, updatePosition, round, signal, timerDelay, ask } = env;",
    "const traceJobs = new Set();",
    actualFunction("bootstrapAsk"),
    "return { sit: (" + actualFunction("sit") + "), traceJobs };",
  ].join("\n"))(env);
  return { ...functions, actor, trace, events, player };
}

describe("bounded bootstrap rate trace pure calibration", () => {
  test("classifies only exact RATE_LIMITED messages and keeps unknown replies as OTHER", () => {
    expect(classifyBootstrapRateAck({ ok: true, code: "RATE_LIMITED", message: privateValue })).toBe("OK");
    expect(classifyBootstrapRateAck(budgetAck)).toBe("ACTION_BUDGET");
    expect(classifyBootstrapRateAck(intervalAck)).toBe("MOVE_INTERVAL");
    for (const ack of [undefined, null, {}, { ok: false }, { ...budgetAck, code: "OTHER" }, { ...budgetAck, message: budgetAck.message + " " }, { ...intervalAck, message: privateValue }])
      expect(classifyBootstrapRateAck(ack)).toBe("OTHER");
  });

  test("binds actual canonical routes and completes exactly194 numeric rows with seat sequence context", () => {
    expect(digest(read("public/house-geometry.js"))).toBe(bound.geometrySHA256);
    expect(bound.routes.map((entry: any) => [entry.actorIndex, entry.moves, entry.seatActions])).toEqual([[2, 41, 1], [4, 54, 1], [14, 41, 1], [16, 54, 1]]);
    const { trace, time } = fixture();
    for (const entry of bound.routes) {
      const route = routeFor(entry.actorIndex);
      expect(route.length - 1).toBe(entry.moves);
      expect(digest(JSON.stringify(route))).toBe(entry.routeSHA256);
      for (let step = 1; step <= entry.moves + 1; step++) {
        const isSeat = step === entry.moves + 1;
        const row = beginBootstrapRateAction(trace, entry.actorIndex, step, isSeat ? entry.moves : step, isSeat ? "seat" : "move");
        time.monotonicMs += 2; time.wallMs -= 10;
        finishBootstrapRateAction(trace, row, { ok: true, message: privateValue });
        time.monotonicMs += 100;
      }
    }
    const artifact = bootstrapRateArtifact(trace);
    expect(artifact).toMatchObject({ status: "COMPLETE", maximumRows: 194, firstFailure: null });
    expect(artifact.columns).toEqual(BOOTSTRAP_RATE_COLUMNS);
    expect(artifact.rows).toHaveLength(194);
    expect(artifact.rows.every((values: number[]) => values.length === 10 && values.every(Number.isFinite))).toBe(true);
    expect(artifact.rows.filter((row: number[]) => row[3] === 1).map((row: number[]) => [row[0], row[1], row[2]])).toEqual([[2, 42, 41], [4, 55, 54], [14, 42, 41], [16, 55, 54]]);
    expect(JSON.parse(JSON.stringify(artifact))).toEqual(artifact);
    expect(JSON.stringify(artifact)).not.toContain(privateValue);
    expect(() => beginBootstrapRateAction(trace, 2, 43, 42, "move")).toThrow("RATE_TRACE_CAP_OR_STEP");
    expect(trace.rows).toHaveLength(194);
    expect(bootstrapRateArtifact(trace).status).toBe("STOPPED");
  });

  test("rejects changed caps, actors, route counts, seat counts and route digest schemas", () => {
    for (const change of [(value: any) => value.maximumRows = 195, (value: any) => value.routes.pop(), (value: any) => value.routes[0].actorIndex = 4, (value: any) => value.routes[0].moves--, (value: any) => value.routes[0].seatActions = 2, (value: any) => value.routes[0].routeSHA256 = "changed"]) {
      const config = cloneBound(); change(config);
      expect(() => newBootstrapRateTrace(config)).toThrow("RATE_TRACE_BOUND_INVALID");
    }
  });

  test("route length, coordinates, actor admission and duplicate registration drift stop new sends", () => {
    for (const mutation of [
      (trace: any) => registerBootstrapRateRoute(trace, 2, routeFor(2).slice(1)),
      (trace: any) => { const route = routeFor(2); route[1] = { ...route[1], x: route[1].x + .01 }; registerBootstrapRateRoute(trace, 2, route); },
      (trace: any) => registerBootstrapRateRoute(trace, 99, routeFor(2)),
      (trace: any) => { registerBootstrapRateRoute(trace, 2, routeFor(2)); registerBootstrapRateRoute(trace, 2, routeFor(2)); },
    ]) {
      const trace = newBootstrapRateTrace(cloneBound());
      expect(() => mutation(trace)).toThrow("RATE_TRACE_ROUTE_DRIFT");
      expect(bootstrapRateArtifact(trace)).toMatchObject({ status: "STOPPED", firstFailure: { outcome: "ROUTE_DRIFT" } });
      expect(() => rowFor(trace)).toThrow("RATE_TRACE_STOPPED");
      expect(trace.rows).toHaveLength(0);
    }
  });

  test("wrong step, action, actor and sequence context fail before adding a row", () => {
    for (const args of [[2, 2, 1, "move"], [2, 1, 1, "seat"], [99, 1, 1, "move"], [2, 1, -1, "move"], [2, 1, NaN, "move"], [2, 1, 1.5, "move"]] as const) {
      const { trace } = fixture();
      expect(() => beginBootstrapRateAction(trace, ...args)).toThrow("RATE_TRACE_CAP_OR_STEP");
      expect(trace.rows).toHaveLength(0);
      expect(bootstrapRateArtifact(trace).status).toBe("STOPPED");
      expect(() => rowFor(trace, 4)).toThrow("RATE_TRACE_STOPPED");
    }
  });

  test("first denial stops sends while already-started ACKs drain without replacing the failure", () => {
    const { trace } = fixture(), denied = rowFor(trace), inFlight = rowFor(trace, 4);
    finishBootstrapRateAction(trace, denied, budgetAck);
    const first = bootstrapRateArtifact(trace).firstFailure;
    expect(first).toEqual({ outcome: "ACK_DENIED", classification: "ACTION_BUDGET", actorIndex: 2, step: 1, motionSequenceContext: 1 });
    expect(() => rowFor(trace, 14)).toThrow("RATE_TRACE_STOPPED");
    finishBootstrapRateAction(trace, inFlight, intervalAck);
    expect(bootstrapRateArtifact(trace).firstFailure).toBe(first);
    expect(trace.rows).toHaveLength(2);
  });

  test("timeouts and invalid ACK ownership are explicit and do not retain raw errors", () => {
    const { trace } = fixture(), row = rowFor(trace);
    finishBootstrapRateAction(trace, row, { message: privateValue, body: privateValue }, true);
    expect(row.slice(8)).toEqual([3, 3]);
    expect(bootstrapRateArtifact(trace)).toMatchObject({ status: "STOPPED", firstFailure: { outcome: "ACK_TIMEOUT", classification: "OTHER" } });
    expect(() => rowFor(trace, 4)).toThrow("RATE_TRACE_STOPPED");
    expect(() => finishBootstrapRateAction(trace, row, { ok: true })).toThrow("RATE_TRACE_ACK_STATE");
    const fresh = fixture();
    expect(() => finishBootstrapRateAction(fresh.trace, [...row], { ok: true })).toThrow("RATE_TRACE_ACK_STATE");
    expect(JSON.stringify(bootstrapRateArtifact(trace))).not.toContain(privateValue);
  });

  test("nonfinite and regressing ACK clocks stop the trace while wall rollback remains valid", () => {
    for (const invalid of [NaN, Infinity, -Infinity]) {
      const { trace, time } = fixture(); time.monotonicMs = invalid;
      expect(() => rowFor(trace)).toThrow("RATE_TRACE_CLOCK_INVALID");
      expect(trace.rows).toHaveLength(0);
      expect(trace.stopped).toBe(true);
      expect(bootstrapRateArtifact(trace).status).toBe("STOPPED");
    }
    for (const clock of [{ monotonicMs: 99, wallMs: 1000 }, { monotonicMs: NaN, wallMs: 1000 }, { monotonicMs: 101, wallMs: Infinity }]) {
      const { trace, time } = fixture(), row = rowFor(trace);
      Object.assign(time, clock);
      expect(() => finishBootstrapRateAction(trace, row, { ok: true })).toThrow("RATE_TRACE_CLOCK_INVALID");
      expect(trace.stopped).toBe(true);
      expect(() => rowFor(trace, 4)).toThrow("RATE_TRACE_STOPPED");
    }
    const { trace, time } = fixture(), row = rowFor(trace);
    time.monotonicMs += 1; time.wallMs -= 5000;
    finishBootstrapRateAction(trace, row, { ok: true });
    expect(row.slice(4, 8)).toEqual([100, 100000, 101, 95000]);
    expect(trace.stopped).toBe(false);
  });

  test("raw ACK fields, identity strings, tokens and request bodies never enter serialized trace", () => {
    const { trace } = fixture(), row = rowFor(trace);
    finishBootstrapRateAction(trace, row, { ...budgetAck, message: privateValue, body: { privateValue }, identity: privateValue, controllerToken: privateValue, commandId: privateValue, cookie: privateValue });
    const artifact = bootstrapRateArtifact(trace), serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(privateValue);
    expect(artifact.firstFailure?.classification).toBe("OTHER");
    expect(artifact.rows[0]).toHaveLength(10);
    expect(JSON.parse(serialized)).toEqual(artifact);
    const malformed = newBootstrapRateTrace(cloneBound());
    expect(() => registerBootstrapRateRoute(malformed, privateValue, [])).toThrow("RATE_TRACE_ROUTE_DRIFT");
    expect(JSON.stringify(bootstrapRateArtifact(malformed))).not.toContain(privateValue);
  });
});

describe("optional server wall clock memory schema", () => {
  test("default v1 retains19 columns while v2 describes20 columns and permits finite wall rollback", () => {
    const v1 = newMemoryDiagnosticCapture(), v2 = newMemoryDiagnosticCapture({ includeWallTime: true });
    for (const sequence of [1, 2]) {
      const raw = memorySample(sequence, sequence === 1 ? 2000 : 1000);
      expect(captureMemoryDiagnostic(v1, raw, "bootstrap")).toEqual({ ok: true });
      expect(captureMemoryDiagnostic(v2, raw, "bootstrap")).toEqual({ ok: true });
    }
    const first = memoryDiagnosticArtifact(v1), second = memoryDiagnosticArtifact(v2);
    expect(first).toMatchObject({ schemaVersion: 1, status: "VALID" });
    expect(first.columns).toEqual(MEMORY_DIAGNOSTIC_COLUMNS);
    expect(first.columns).toHaveLength(19);
    expect(first).not.toHaveProperty("wallClockSemantics");
    expect(first.rows.every((row: number[]) => row.length === 19)).toBe(true);
    expect(second).toMatchObject({ schemaVersion: 2, status: "VALID" });
    expect(second.columns).toEqual(MEMORY_DIAGNOSTIC_WALL_COLUMNS);
    expect(second.columns).toEqual([...first.columns, "serverWallMs"]);
    expect(second.wallClockSemantics).toContain("may regress");
    expect(second.rows.map((row: number[]) => row.at(-1))).toEqual([2000, 1000]);
    expect(second.rows.every((row: number[]) => row.length === 20)).toBe(true);
    expect(JSON.parse(JSON.stringify(second))).toEqual(second);
  });

  test("v2 rejects missing and nonfinite wall values while default v1 excludes them", () => {
    for (const invalid of [undefined, NaN, Infinity, -Infinity, privateValue]) {
      const raw = memorySample(1, invalid), v2 = newMemoryDiagnosticCapture({ includeWallTime: true });
      if (invalid === undefined) delete raw.memoryDiagnostic.serverWallMs;
      expect(captureMemoryDiagnostic(v2, raw, "bootstrap")).toEqual({ ok: false, code: "MEMORY_DIAGNOSTIC_WALL_NONFINITE" });
      expect(v2.rows).toHaveLength(0);
      expect(memoryDiagnosticArtifact(v2).status).toBe("INVALID");
      expect(JSON.stringify(memoryDiagnosticArtifact(v2))).not.toContain(privateValue);
      const v1 = newMemoryDiagnosticCapture();
      expect(captureMemoryDiagnostic(v1, raw, "bootstrap")).toEqual({ ok: true });
      expect(v1.rows[0]).toHaveLength(19);
    }
  });
});

describe("actual bootstrap caller rate attribution wiring", () => {
  test("the original socket ACK operation is unchanged", () => {
    const ask = (source: string) => executable(source, node => ts.isVariableDeclaration(node) && node.name.getText() === "ask");
    expect(ask(current).replace(/\s+/g, "")).toBe(ask(prior).replace(/\s+/g, ""));
  });

  test("actual sit retains100ms sleeps and waits for each move ACK before sending another", async () => {
    let resolveFirst!: (value: any) => void, firstSent!: () => void;
    const first = new Promise<any>(resolve => resolveFirst = resolve), sent = new Promise<void>(resolve => firstSent = resolve);
    let sends = 0;
    const driver = actualSit(async () => { sends++; if (sends === 1) { firstSent(); return first; } return { ok: true }; });
    const initial = { x: driver.actor.x, z: driver.actor.z };
    const pending = driver.sit(driver.actor, "game-seat-2", true);
    await sent;
    expect(sends).toBe(1);
    expect(driver.events).toHaveLength(2);
    expect({ x: driver.actor.x, z: driver.actor.z }).toEqual(initial);
    resolveFirst({ ok: true });
    await pending;
    const sleeps = driver.events.filter((event: any[]) => event[0] === "sleep"), requests = driver.events.filter((event: any[]) => event[0] === "ask");
    expect(sleeps).toHaveLength(41);
    expect(sleeps.every((event: any[]) => event[1] === 100)).toBe(true);
    expect(requests).toHaveLength(42);
    expect(requests.slice(0, -1).map((event: any[]) => event[2].sequence)).toEqual(Array.from({ length: 41 }, (_, index) => index + 1));
    expect(requests.at(-1)).toEqual(["ask", "house.seat", { seatId: "game-seat-2" }]);
    expect(driver.trace.rows.at(-1).slice(0, 4)).toEqual([2, 42, 41, 1]);
    expect(driver.traceJobs.size).toBe(0);
    expect(JSON.stringify(bootstrapRateArtifact(driver.trace))).not.toContain(privateValue);
  });

  test("actual caller stops on first denied ACK and records only its fixed classification", async () => {
    const driver = actualSit(async () => budgetAck);
    await expect(driver.sit(driver.actor, "game-seat-2", true)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(driver.events.filter((event: any[]) => event[0] === "ask")).toHaveLength(1);
    expect(driver.events.filter((event: any[]) => event[0] === "sleep")).toEqual([["sleep", 100]]);
    expect(bootstrapRateArtifact(driver.trace)).toMatchObject({ status: "STOPPED", firstFailure: { outcome: "ACK_DENIED", classification: "ACTION_BUDGET", actorIndex: 2, step: 1, motionSequenceContext: 1 } });
    expect(driver.traceJobs.size).toBe(0);
  });

  test("actual caller maps only the exact installed timeout message to timeout and clears its tracked job", async () => {
    const driver = actualSit(async () => { throw new Error("operation has timed out"); });
    await expect(driver.sit(driver.actor, "game-seat-2", true)).rejects.toMatchObject({ code: "RATE_TRACE_ACK_TIMEOUT" });
    expect(driver.events.filter((event: any[]) => event[0] === "ask")).toHaveLength(1);
    expect(driver.traceJobs.size).toBe(0);
    expect(bootstrapRateArtifact(driver.trace)).toMatchObject({ status: "STOPPED", firstFailure: { outcome: "ACK_TIMEOUT", classification: "OTHER" } });
    expect(JSON.stringify(bootstrapRateArtifact(driver.trace))).not.toContain(privateValue);
  });
});

describe("rate trace ACK lifecycle and cleanup discrimination", () => {
  test("transport rejection is explicit ACK_TRANSPORT_ERROR without raw error retention", async () => {
    for (const message of ["socket has been disconnected", privateValue]) {
      const driver = actualSit(async () => { throw new Error(message); });
      await expect(driver.sit(driver.actor, "game-seat-2", true)).rejects.toMatchObject({ code: "RATE_TRACE_ACK_TRANSPORT_ERROR" });
      expect(driver.trace.rows).toHaveLength(1);
      expect(driver.trace.rows[0].slice(8)).toEqual([4, 3]);
      const artifact = bootstrapRateArtifact(driver.trace);
      expect(artifact.outcomes[4]).toBe("ACK_TRANSPORT_ERROR");
      expect(artifact).toMatchObject({ status: "STOPPED", firstFailure: { outcome: "ACK_TRANSPORT_ERROR", classification: "OTHER" } });
      expect(JSON.stringify(artifact)).not.toContain(message);
      expect(driver.traceJobs.size).toBe(0);
      expect(driver.events.filter((event: any[]) => event[0] === "ask")).toHaveLength(1);
    }
  });

  test("pure trace records transport rejection separately from an actual timeout", () => {
    const transport = fixture(), transportRow = rowFor(transport.trace);
    finishBootstrapRateAction(transport.trace, transportRow, null, false, true);
    const timeout = fixture(), timeoutRow = rowFor(timeout.trace);
    finishBootstrapRateAction(timeout.trace, timeoutRow, null, true);
    expect(transportRow.slice(8)).toEqual([4, 3]);
    expect(timeoutRow.slice(8)).toEqual([3, 3]);
    expect(bootstrapRateArtifact(transport.trace).firstFailure?.outcome).toBe("ACK_TRANSPORT_ERROR");
    expect(bootstrapRateArtifact(timeout.trace).firstFailure?.outcome).toBe("ACK_TIMEOUT");
  });

  test("actual finally drains a concurrent successful ACK before disconnecting after another actor denies", async () => {
    const usePreimage = process.env.RATE_TRACE_DRAIN_PREIMAGE === "1";
    const mainSource = read(usePreimage ? "docs/spatial-redesign/evidence/rate-attribution-predrain-board-instrument.mjs" : "tools/board-resource.mjs");
    const spatialSource = usePreimage ? read("docs/spatial-redesign/evidence/rate-attribution-predrain-spatial-instrument.mjs") : current;
    const cleanup = executable(mainSource, (node, ast) => ts.isBlock(node) && ts.isTryStatement(node.parent) && node.parent.finallyBlock === node && node.getText(ast).includes("v.socket?.disconnect()"));
    const { trace } = fixture(), events: string[] = [];
    let resolvePending!: (value: any) => void, rejectPending!: (error: Error) => void, enteredCleanup!: () => void;
    const pendingACK = new Promise<any>((resolve, reject) => { resolvePending = resolve; rejectPending = reject; });
    const cleanupEntered = new Promise<void>(resolve => enteredCleanup = resolve);
    const fail = (code: string) => { throw Object.assign(new Error(code), { code }); };
    const ask = (actor: any) => actor.index === 2 ? Promise.resolve(budgetAck) : pendingACK;
    const invoke = new Function("rateTrace", "ask", "beginBootstrapRateAction", "finishBootstrapRateAction", "fail", [
      "const traceJobs = new Set();",
      "const ok = reply => { if (!reply?.ok) fail(reply?.code ?? 'NO_ACK'); return reply; };",
      "return { invoke: (" + actualFunction("bootstrapAsk", spatialSource) + "), traceJobs };",
    ].join("\n"))(trace, ask, beginBootstrapRateAction, finishBootstrapRateAction, fail);
    const deniedJob = invoke.invoke({ index: 2, motionSequence: 1 }, 1, "move", { sequence: 1 });
    const pendingJob = invoke.invoke({ index: 4, motionSequence: 1 }, 1, "move", { sequence: 1 });
    const pendingOutcome = pendingJob.then((value: any) => value, (error: Error) => error);
    expect(await deniedJob.catch((error: { code: string }) => error.code)).toBe("RATE_LIMITED");
    const originalFailure = bootstrapRateArtifact(trace).firstFailure;
    expect(originalFailure).toMatchObject({ outcome: "ACK_DENIED", classification: "ACTION_BUDGET", actorIndex: 2 });
    expect(invoke.traceJobs.size).toBe(1);
    let disconnected = false;
    const spatial = {
      async drainBootstrapTrace() { events.push("drain-start"); await Promise.allSettled([...invoke.traceJobs]); events.push("drain-finish"); },
      close() { events.push("spatial-close"); },
    };
    const views = [{ socket: { disconnect() { events.push("socket-disconnect"); disconnected = true; rejectPending(new Error("socket has been disconnected")); } } }];
    const env = {
      p: { rateAttribution: {} }, spatial, views,
      cancellation: { abort() { events.push("cancel-new-work"); enteredCleanup(); } },
      clearInterval: () => events.push("timer-clear"),
      child: { connected: true, exitCode: 0, signalCode: null, send() { events.push("child-stop"); }, kill() { events.push("child-kill"); } },
      childExit: Promise.resolve({ code: 0 }), sleep: () => new Promise(() => {}),
    };
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const cleanupJob = new AsyncFunction("env", [
      "const { p, spatial, views, cancellation, clearInterval, child, childExit, sleep } = env;",
      "let running = true, closing = false;",
      "const motionTimer = 1, pointerTimer = 2, writeTimer = 3, freezeTimer = 4, progressTimer = 5;",
      cleanup,
      "return { running, closing };",
    ].join("\n"))(env);
    await cleanupEntered;
    const disconnectedBeforePendingACK = disconnected;
    resolvePending({ ok: true });
    await pendingOutcome;
    const closed = await cleanupJob;
    expect({
      disconnectedBeforePendingACK,
      pendingActorOutcome: trace.rows.find((row: number[]) => row[0] === 4)?.[8],
      firstFailure: bootstrapRateArtifact(trace).firstFailure,
    }).toMatchObject({ disconnectedBeforePendingACK: false, pendingActorOutcome: 1, firstFailure: { outcome: "ACK_DENIED", classification: "ACTION_BUDGET", actorIndex: 2 } });
    expect(bootstrapRateArtifact(trace).firstFailure).toBe(originalFailure);
    expect(events.indexOf("drain-finish")).toBeLessThan(events.indexOf("spatial-close"));
    expect(events.indexOf("drain-finish")).toBeLessThan(events.indexOf("socket-disconnect"));
    expect(events.indexOf("socket-disconnect")).toBeLessThan(events.indexOf("child-stop"));
    expect(closed).toEqual({ running: false, closing: true });
    expect(invoke.traceJobs.size).toBe(0);
  });
});
