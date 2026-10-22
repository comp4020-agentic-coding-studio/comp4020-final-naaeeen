import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, test } from "vitest";
import {
  MEMORY_DIAGNOSTIC_BOUNDARIES,
  MEMORY_DIAGNOSTIC_COLUMNS,
  MEMORY_DIAGNOSTIC_PHASES,
  captureMemoryDiagnostic,
  memoryDiagnosticArtifact,
  newMemoryDiagnosticCapture,
} from "../tools/spatial-resource.mjs";

function sample(sequence = 1, monotonicMs = 0): any {
  return {
    rssMiB: 100,
    heapMiB: 40,
    externalMiB: 8,
    arrayBuffersMiB: 4,
    rssPeakMiB: 100,
    heapPeakMiB: 40,
    houseViews: 0,
    boardViews: 0,
    activeEngines: 0,
    memoryDiagnostic: {
      sequence,
      monotonicMs,
      heapTotalMiB: 64,
      heapTotalPeakMiB: 64,
      externalPeakMiB: 8,
      arrayBuffersPeakMiB: 4,
      osMaxRSSMiB: 150,
      boundary: null,
    },
  };
}

function row(capture: ReturnType<typeof newMemoryDiagnosticCapture>, index: number) {
  return Object.fromEntries(MEMORY_DIAGNOSTIC_COLUMNS.map((column, columnIndex) => [column, capture.rows[index][columnIndex]]));
}

function rejected(raw: any, code: string, phase = "bootstrap", capture = newMemoryDiagnosticCapture()) {
  const before = capture.rows.map((values: number[]) => [...values]);
  expect(captureMemoryDiagnostic(capture, raw, phase)).toEqual({ ok: false, code });
  expect(capture.rows).toEqual(before);
  expect(memoryDiagnosticArtifact(capture)).toMatchObject({ status: "INVALID", invalidSamples: 1 });
  expect(capture.errors).toEqual([{ code, sequence: Number.isSafeInteger(raw?.memoryDiagnostic?.sequence) && raw.memoryDiagnostic.sequence > 0 ? raw.memoryDiagnostic.sequence : null }]);
  return capture;
}

describe("pure memory diagnostic capture calibration", () => {
  test("retains a 500ms RSS spike between unchanged one-second current-RSS selections", () => {
    const capture = newMemoryDiagnosticCapture();
    const oneSecond: any[] = [];
    for (let index = 0; index <= 10; index++) {
      const current = sample(index + 1, index * 100);
      current.rssMiB = index === 5 ? 230 : 100;
      current.rssPeakMiB = index >= 5 ? 230 : 100;
      current.memoryDiagnostic.osMaxRSSMiB = index >= 5 ? 240 : 150;
      expect(captureMemoryDiagnostic(capture, current, "bootstrap")).toEqual({ ok: true });
      if (!oneSecond.length || index * 100 - oneSecond.at(-1).parentAt >= 1000)
        oneSecond.push({ ...current, parentAt: index * 100 });
    }
    expect(oneSecond.map(value => value.rssMiB)).toEqual([100, 100]);
    expect(oneSecond.at(-1).rssPeakMiB).toBe(230);
    expect(capture.rows).toHaveLength(11);
    expect(row(capture, 5)).toMatchObject({ sequence: 6, serverMonotonicMs: 500, rssMiB: 230, rssPeakMiB: 230, osMaxRSSMiB: 240 });
    expect(memoryDiagnosticArtifact(capture).status).toBe("VALID");
  });

  test("encodes each fixed phase and boundary numerically and remembers the last boundary", () => {
    const capture = newMemoryDiagnosticCapture();
    expect(new Set(MEMORY_DIAGNOSTIC_COLUMNS).size).toBe(MEMORY_DIAGNOSTIC_COLUMNS.length);
    expect(MEMORY_DIAGNOSTIC_COLUMNS).toHaveLength(19);
    const first = sample();
    expect(captureMemoryDiagnostic(capture, first, MEMORY_DIAGNOSTIC_PHASES[0])).toEqual({ ok: true });
    expect(row(capture, 0)).toMatchObject({ boundary: -1, lastBoundary: -1 });
    for (const [index, boundary] of MEMORY_DIAGNOSTIC_BOUNDARIES.entries()) {
      const boundarySample = sample(index + 2, index + 1);
      boundarySample.memoryDiagnostic.boundary = boundary;
      boundarySample.houseViews = 12;
      boundarySample.boardViews = 12;
      boundarySample.activeEngines = 24;
      const phaseIndex = index % MEMORY_DIAGNOSTIC_PHASES.length;
      expect(captureMemoryDiagnostic(capture, boundarySample, MEMORY_DIAGNOSTIC_PHASES[phaseIndex])).toEqual({ ok: true });
      expect(row(capture, index + 1)).toMatchObject({ phase: phaseIndex, boundary: index, lastBoundary: index, houseViews: 12, boardViews: 12, activeEngines: 24 });
    }
    const timerSample = sample(capture.rows.length + 1, MEMORY_DIAGNOSTIC_BOUNDARIES.length + 1);
    expect(captureMemoryDiagnostic(capture, timerSample, "recovery-check")).toEqual({ ok: true });
    expect(row(capture, capture.rows.length - 1)).toMatchObject({ boundary: -1, lastBoundary: MEMORY_DIAGNOSTIC_BOUNDARIES.length - 1 });
    expect(capture.rows.every((values: number[]) => values.length === 19 && values.every(Number.isFinite))).toBe(true);
  });

  test("preserves current and cumulative memory counters with OS lifetime maxRSS as a separate value", () => {
    const capture = newMemoryDiagnosticCapture();
    const initial = sample();
    initial.rssPeakMiB = 120;
    initial.heapPeakMiB = 50;
    initial.memoryDiagnostic.heapTotalPeakMiB = 70;
    initial.memoryDiagnostic.externalPeakMiB = 10;
    initial.memoryDiagnostic.arrayBuffersPeakMiB = 5;
    initial.memoryDiagnostic.osMaxRSSMiB = 260;
    expect(captureMemoryDiagnostic(capture, initial, "startup")).toEqual({ ok: true });
    expect(row(capture, 0)).toMatchObject({
      rssMiB: 100, heapUsedMiB: 40, heapTotalMiB: 64, externalMiB: 8, arrayBuffersMiB: 4,
      rssPeakMiB: 120, heapUsedPeakMiB: 50, heapTotalPeakMiB: 70, externalPeakMiB: 10,
      arrayBuffersPeakMiB: 5, osMaxRSSMiB: 260,
    });
    expect(row(capture, 0).rssPeakMiB).toBeLessThan(210);
    expect(row(capture, 0).osMaxRSSMiB).toBeGreaterThan(210);
    expect(memoryDiagnosticArtifact(capture).scope).toContain("OS maxRSS is separate");
  });

  test("accepts simultaneous monotonic timestamps, unchanged peaks and zero counters", () => {
    const capture = newMemoryDiagnosticCapture();
    for (const sequence of [1, 2]) {
      const current = sample(sequence, 0);
      for (const key of ["rssMiB", "heapMiB", "externalMiB", "arrayBuffersMiB", "rssPeakMiB", "heapPeakMiB"])
        current[key] = 0;
      for (const key of ["heapTotalMiB", "heapTotalPeakMiB", "externalPeakMiB", "arrayBuffersPeakMiB", "osMaxRSSMiB"])
        current.memoryDiagnostic[key] = 0;
      expect(captureMemoryDiagnostic(capture, current, "bootstrap")).toEqual({ ok: true });
    }
    expect(capture.rows).toHaveLength(2);
    expect(memoryDiagnosticArtifact(capture).status).toBe("VALID");
  });

  test("rejects missing or malformed nested metadata without retaining raw input", () => {
    for (const raw of [null, undefined, {}, { memoryDiagnostic: null }, { memoryDiagnostic: "private-marker" }, { memoryDiagnostic: [] }])
      rejected(raw, "MEMORY_DIAGNOSTIC_MISSING_SAMPLE");
    for (const mutate of [(raw: any) => delete raw.memoryDiagnostic.sequence, (raw: any) => raw.memoryDiagnostic.sequence = 0, (raw: any) => raw.memoryDiagnostic.sequence = 1.5, (raw: any) => raw.memoryDiagnostic.sequence = 2]) {
      const raw = sample();
      mutate(raw);
      rejected(raw, "MEMORY_DIAGNOSTIC_SEQUENCE");
    }
    const missingBoundary = sample();
    delete missingBoundary.memoryDiagnostic.boundary;
    rejected(missingBoundary, "MEMORY_DIAGNOSTIC_BOUNDARY");
  });

  test("rejects missing, nonnumeric, nonfinite and negative numeric fields", () => {
    const rootFields = ["rssMiB", "heapMiB", "externalMiB", "arrayBuffersMiB", "rssPeakMiB", "heapPeakMiB", "houseViews", "boardViews", "activeEngines"];
    const metadataFields = ["monotonicMs", "heapTotalMiB", "heapTotalPeakMiB", "externalPeakMiB", "arrayBuffersPeakMiB", "osMaxRSSMiB"];
    for (const [nested, fields] of [[false, rootFields], [true, metadataFields]] as const) {
      for (const field of fields) {
        for (const invalid of [undefined, "private-marker", NaN, Infinity, -Infinity, -1]) {
          const raw = sample();
          (nested ? raw.memoryDiagnostic : raw)[field] = invalid;
          const capture = rejected(raw, "MEMORY_DIAGNOSTIC_NONFINITE_OR_NEGATIVE");
          expect(JSON.stringify(capture), field).not.toContain("private-marker");
        }
      }
    }
  });

  test("rejects fractional counts and duplicate, skipped or regressing sequences", () => {
    for (const field of ["houseViews", "boardViews", "activeEngines"]) {
      const raw = sample();
      raw[field] = 0.5;
      rejected(raw, "MEMORY_DIAGNOSTIC_VIEW_COUNT");
    }
    for (const sequence of [1, 3, 0, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      const capture = newMemoryDiagnosticCapture();
      expect(captureMemoryDiagnostic(capture, sample(), "bootstrap")).toEqual({ ok: true });
      rejected(sample(sequence, 100), "MEMORY_DIAGNOSTIC_SEQUENCE", "bootstrap", capture);
    }
  });

  test("rejects time and sampled or OS peak regressions while preserving accepted rows", () => {
    const time = newMemoryDiagnosticCapture();
    expect(captureMemoryDiagnostic(time, sample(1, 100), "bootstrap")).toEqual({ ok: true });
    rejected(sample(2, 99), "MEMORY_DIAGNOSTIC_TIME_REGRESSION", "bootstrap", time);
    for (const [nested, key] of [
      [false, "rssPeakMiB"], [false, "heapPeakMiB"], [true, "heapTotalPeakMiB"],
      [true, "externalPeakMiB"], [true, "arrayBuffersPeakMiB"], [true, "osMaxRSSMiB"],
    ] as const) {
      const capture = newMemoryDiagnosticCapture();
      const first = sample();
      const firstTarget = nested ? first.memoryDiagnostic : first;
      firstTarget[key] += 10;
      expect(captureMemoryDiagnostic(capture, first, "bootstrap")).toEqual({ ok: true });
      rejected(sample(2, 100), "MEMORY_DIAGNOSTIC_PEAK_REGRESSION", "bootstrap", capture);
    }
  });

  test("rejects any sampled peak below its current memory value", () => {
    for (const [nested, key] of [
      [false, "rssPeakMiB"], [false, "heapPeakMiB"], [true, "heapTotalPeakMiB"],
      [true, "externalPeakMiB"], [true, "arrayBuffersPeakMiB"],
    ] as const) {
      const raw = sample();
      const target = nested ? raw.memoryDiagnostic : raw;
      target[key] -= 1;
      rejected(raw, "MEMORY_DIAGNOSTIC_PEAK_REGRESSION");
    }
  });

  test("unknown phase and boundary strings invalidate capture without retaining those strings", () => {
    const privateValue = "private-cookie-actor-house-room-command-content-filename";
    const wrongPhase = rejected(sample(), "MEMORY_DIAGNOSTIC_PHASE", privateValue);
    expect(JSON.stringify(wrongPhase)).not.toContain(privateValue);
    const raw = sample();
    raw.memoryDiagnostic.boundary = privateValue;
    const wrongBoundary = rejected(raw, "MEMORY_DIAGNOSTIC_BOUNDARY");
    expect(JSON.stringify(wrongBoundary)).not.toContain(privateValue);
  });

  test("retains only fixed primitive columns and bounded allowlisted errors through JSON round trips", () => {
    const capture = newMemoryDiagnosticCapture();
    const raw = sample();
    const privateValue = "private-cookie-actor-house-room-command-content-filename";
    Object.assign(raw, { payload: { text: privateValue }, cookie: privateValue, requestId: privateValue, houseId: privateValue, actorId: privateValue, commandId: privateValue, filename: privateValue, log: privateValue });
    Object.assign(raw.memoryDiagnostic, { payload: privateValue, cookie: privateValue });
    expect(captureMemoryDiagnostic(capture, raw, "bootstrap")).toEqual({ ok: true });
    const originalRow = [...capture.rows[0]];
    raw.rssMiB = 999;
    raw.memoryDiagnostic.monotonicMs = 999;
    raw.payload.text = "changed-private-value";
    expect(capture.rows[0]).toEqual(originalRow);
    for (let index = 0; index < 40; index++) {
      const invalid = sample(2, 100);
      invalid.memoryDiagnostic.boundary = privateValue;
      expect(captureMemoryDiagnostic(capture, invalid, "bootstrap")).toEqual({ ok: false, code: "MEMORY_DIAGNOSTIC_BOUNDARY" });
    }
    const artifact = memoryDiagnosticArtifact(capture);
    expect(artifact).toMatchObject({ schemaVersion: 1, status: "INVALID", invalidSamples: 40 });
    expect(artifact.errors).toHaveLength(32);
    expect(artifact.errors.every((error: { code: string; sequence: number | null }) => error.code === "MEMORY_DIAGNOSTIC_BOUNDARY" && error.sequence === 2)).toBe(true);
    expect(artifact.phases).toEqual(MEMORY_DIAGNOSTIC_PHASES);
    expect(artifact.boundaries).toEqual(MEMORY_DIAGNOSTIC_BOUNDARIES);
    expect(artifact.columns).toEqual(MEMORY_DIAGNOSTIC_COLUMNS);
    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(privateValue);
    expect(serialized).not.toContain("changed-private-value");
    for (const key of ["payload", "cookie", "requestId", "houseId", "actorId", "commandId", "filename", "log"])
      expect(Object.keys(JSON.parse(serialized))).not.toContain(key);
    expect(JSON.parse(serialized)).toEqual(artifact);
  });
});

const currentInstrument = readFileSync(new URL("../tools/board-resource.mjs", import.meta.url), "utf8");
const preservedInstrument = readFileSync(new URL("../docs/spatial-redesign/evidence/memory-diagnostic-preimage-board-instrument.mjs", import.meta.url), "utf8");

function executableNode(source: string, matches: (node: ts.Node, ast: ts.SourceFile) => boolean) {
  const ast = ts.createSourceFile("instrument.mjs", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const found: ts.Node[] = [];
  function visit(node: ts.Node) {
    if (matches(node, ast)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (found.length !== 1) throw new Error("Expected exactly one actual instrument node, found " + found.length);
  return found[0].getText(ast);
}

function parentMessageCallback(source: string) {
  const call = executableNode(source, (node, ast) => ts.isCallExpression(node) && node.expression.getText(ast) === "child.on" && node.arguments[0]?.getText(ast) === '"message"');
  const ast = ts.createSourceFile("callback.mjs", call, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const statement = ast.statements[0];
  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression))
    throw new Error("Expected actual child.on message call");
  return statement.expression.arguments[1].getText(ast);
}

function ingestionHarness() {
  const clock = { now: 0 };
  const harness = new Function("captureMemoryDiagnostic", "newMemoryDiagnosticCapture", "clock", [
    "const memoryDiagnostic = newMemoryDiagnosticCapture(), samples = [], waiters = new Map();",
    'let phase = "bootstrap", origin, runtime, lastSample, failure = null, readyCalls = 0;',
    "const performance = { now: () => clock.now };",
    "const readyResolve = () => readyCalls++;",
    "const handle = (" + parentMessageCallback(currentInstrument) + ");",
    "return { handle, memoryDiagnostic, samples, waiters, setPhase(value) { phase = value; },",
    "get failure() { return failure; }, get lastSample() { return lastSample; },",
    "get readyCalls() { return readyCalls; }, get origin() { return origin; }, get runtime() { return runtime; } };",
  ].join("\n"))(captureMemoryDiagnostic, newMemoryDiagnosticCapture, clock);
  return { harness, clock };
}

describe("actual memory diagnostic instrument wiring with pure fixtures", () => {
  test("keeps the existing child 100ms timer and one-second parent selector unchanged", () => {
    const compact = (source: string) => source.replace(/\s+/g, "");
    const selector = (source: string) => executableNode(source, (node, ast) => ts.isIfStatement(node) && node.expression.getText(ast).includes("samples.at(-1).parentAt") && node.expression.getText(ast).includes("1000"));
    const timer = (source: string) => executableNode(source, (node, ast) => ts.isCallExpression(node) && node.expression.getText(ast) === "setInterval" && node.arguments[0]?.getText(ast).includes("process.send?.(sample())"));
    expect(compact(selector(currentInstrument))).toBe(compact(selector(preservedInstrument)));
    expect(compact(timer(currentInstrument))).toBe(compact(timer(preservedInstrument)));
  });

  test("executes the actual parent callback: every 100ms sample is captured before the one-second selector", () => {
    const { harness, clock } = ingestionHarness();
    let reply: any;
    harness.waiters.set("synthetic-request", (value: any) => reply = value);
    for (let index = 0; index <= 10; index++) {
      clock.now = index * 100;
      const raw = sample(index + 1, index * 100);
      raw.kind = index === 0 ? "ready" : index === 5 ? "reply" : "sample";
      raw.rssMiB = index === 5 ? 230 : 100;
      raw.rssPeakMiB = index >= 5 ? 230 : 100;
      raw.memoryDiagnostic.osMaxRSSMiB = index >= 5 ? 240 : 150;
      if (index === 0) Object.assign(raw, { port: 4455, runtime: { node: "synthetic" } });
      if (index === 5) {
        raw.requestId = "synthetic-request";
        raw.memoryDiagnostic.boundary = "spatial.prepare.after";
        harness.setPhase("calibration-finish");
      }
      harness.handle(raw);
    }
    expect(harness.failure).toBeNull();
    expect(harness.readyCalls).toBe(1);
    expect(harness.origin).toBe("http://127.0.0.1:4455");
    expect(harness.runtime).toEqual({ node: "synthetic" });
    expect(harness.memoryDiagnostic.rows).toHaveLength(11);
    expect(row(harness.memoryDiagnostic, 5)).toMatchObject({ sequence: 6, serverMonotonicMs: 500, rssMiB: 230, phase: MEMORY_DIAGNOSTIC_PHASES.indexOf("calibration-finish"), boundary: MEMORY_DIAGNOSTIC_BOUNDARIES.indexOf("spatial.prepare.after") });
    expect(harness.samples.map((value: any) => [value.parentAt, value.rssMiB])).toEqual([[0, 100], [1000, 100]]);
    expect(harness.samples[1].rssPeakMiB).toBe(230);
    expect(harness.samples.every((value: any) => !("memoryDiagnostic" in value))).toBe(true);
    expect(harness.lastSample).not.toHaveProperty("memoryDiagnostic");
    expect(reply).toMatchObject({ kind: "reply", requestId: "synthetic-request", rssMiB: 230 });
    expect(reply).not.toHaveProperty("memoryDiagnostic");
    expect(harness.waiters.size).toBe(0);
  });

  test("actual parent callback turns invalid samples into a failure even inside the one-second skip interval", () => {
    const { harness, clock } = ingestionHarness();
    harness.handle({ ...sample(), kind: "sample" });
    clock.now = 100;
    const invalid = sample(2, 100);
    invalid.kind = "sample";
    invalid.memoryDiagnostic.boundary = "private-cookie-content";
    harness.handle(invalid);
    expect(harness.samples).toHaveLength(1);
    expect(harness.failure).toEqual({ phase: "bootstrap", code: "MEMORY_DIAGNOSTIC_BOUNDARY" });
    expect(memoryDiagnosticArtifact(harness.memoryDiagnostic)).toMatchObject({ status: "INVALID", invalidSamples: 1 });
    expect(JSON.stringify(harness.memoryDiagnostic)).not.toContain("private-cookie-content");
  });

  test("actual child sampler emits contiguous sequence, sampled peaks and Linux OS KiB conversion separately", () => {
    const sampler = executableNode(currentInstrument, node => ts.isFunctionDeclaration(node) && node.name?.text === "sample");
    const MiB = 1024 ** 2;
    const frames = [
      { rss: 100 * MiB, heapUsed: 40 * MiB, heapTotal: 64 * MiB, external: 8 * MiB, arrayBuffers: 4 * MiB, osKiB: 260 * 1024 },
      { rss: 90 * MiB, heapUsed: 30 * MiB, heapTotal: 60 * MiB, external: 7 * MiB, arrayBuffers: 3 * MiB, osKiB: 260 * 1024 },
    ];
    const clock = { index: 0, ms: 0 };
    const takeSample = new Function("frames", "clock", [
      "let rssPeak = 0, heapPeak = 0, memorySampleSequence = 0, heapTotalPeak = 0, externalPeak = 0, arrayBuffersPeak = 0;",
      "const process = { memoryUsage: () => frames[clock.index], resourceUsage: () => ({ maxRSS: frames[clock.index].osKiB }), cpuUsage: () => ({ user: 0, system: 0 }) };",
      "const performance = { now: () => clock.ms }, connections = new Set(), inspect = () => {}, p = { storageAcceptance: false };",
      'const sio = { of: () => ({ sockets: { size: 12 } }) }, peaks = {}, engines = {}, namespaces = {}, invalidTelemetry = 0, actions = {};',
      "const loop = { percentile: () => 0, max: 0 };",
      "return (" + sampler + ");",
    ].join("\n"))(frames, clock);
    const first = takeSample("fixture.seed.before");
    clock.index = 1;
    clock.ms = 100;
    const second = takeSample();
    expect(first).toMatchObject({ kind: "sample", rssMiB: 100, rssPeakMiB: 100, heapMiB: 40, heapPeakMiB: 40, memoryDiagnostic: { sequence: 1, monotonicMs: 0, heapTotalMiB: 64, heapTotalPeakMiB: 64, externalPeakMiB: 8, arrayBuffersPeakMiB: 4, osMaxRSSMiB: 260, boundary: "fixture.seed.before" } });
    expect(second).toMatchObject({ rssMiB: 90, rssPeakMiB: 100, heapMiB: 30, heapPeakMiB: 40, memoryDiagnostic: { sequence: 2, monotonicMs: 100, heapTotalMiB: 60, heapTotalPeakMiB: 64, externalPeakMiB: 8, arrayBuffersPeakMiB: 4, osMaxRSSMiB: 260, boundary: null } });
    const capture = newMemoryDiagnosticCapture();
    expect(captureMemoryDiagnostic(capture, first, "startup")).toEqual({ ok: true });
    expect(captureMemoryDiagnostic(capture, second, "bootstrap")).toEqual({ ok: true });
    expect(memoryDiagnosticArtifact(capture).status).toBe("VALID");
  });
});

function postCloseVerification(capture: ReturnType<typeof newMemoryDiagnosticCapture>, finalResult: any, source = currentInstrument) {
  const verification = executableNode(source, (node, ast) => ts.isTryStatement(node) && node.tryBlock.statements.some(statement => statement.getText(ast).includes("storageEvidence.beforeDecodeFiles")));
  const classifyFailure = executableNode(source, node => ts.isFunctionDeclaration(node) && node.name?.text === "failureStatus");
  return new Function("memoryDiagnostic", "finalResult", [
    "const freezeCalls = [], p = {}, protocolHash = 'synthetic-protocol', child = { exitCode: 0 }, storageEvidence = null;",
    "const freeze = (...args) => freezeCalls.push(args);",
    "const fail = code => { throw Object.assign(new Error(code), { code }); };",
    classifyFailure,
    verification,
    "return { result: finalResult, freezeCalls };",
  ].join("\n"))(capture, finalResult);
}

function completedResult(status: string, failure?: { phase: string; code: string }) {
  return { status, processClosure: { serverClosed: true }, gates: { rss: true }, ...(failure ? { failure } : {}) };
}

describe("actual post-close memory diagnostic failure promotion", () => {
  test("late invalid sample after recovery.after changes an already built CALIBRATION or PASS to FAIL", () => {
    for (const status of ["CALIBRATION", "PASS"]) {
      const capture = newMemoryDiagnosticCapture();
      const recovery = sample();
      recovery.memoryDiagnostic.boundary = "recovery.after";
      expect(captureMemoryDiagnostic(capture, recovery, "recovery-check")).toEqual({ ok: true });
      const completed = completedResult(status);
      const late = sample(2, 100);
      late.memoryDiagnostic.monotonicMs = NaN;
      expect(captureMemoryDiagnostic(capture, late, "recovery-check")).toEqual({ ok: false, code: "MEMORY_DIAGNOSTIC_NONFINITE_OR_NEGATIVE" });
      const checked = postCloseVerification(capture, completed);
      expect(checked.result).toBe(completed);
      expect(checked.result).toMatchObject({ status: "FAIL", failure: { phase: "post-close-verification", code: "MEMORY_DIAGNOSTIC_INVALID_SAMPLE" } });
      expect(checked.freezeCalls).toHaveLength(1);
      expect(memoryDiagnosticArtifact(capture)).toMatchObject({ status: "INVALID", invalidSamples: 1 });
    }
  });

  test("the preserved pre-guard post-close path reproduces the late-invalid false success", () => {
    const capture = newMemoryDiagnosticCapture();
    expect(captureMemoryDiagnostic(capture, sample(), "recovery-check")).toEqual({ ok: true });
    const completed = completedResult("CALIBRATION");
    const late = sample(2, 100);
    late.memoryDiagnostic.boundary = "private-late-boundary";
    expect(captureMemoryDiagnostic(capture, late, "recovery-check")).toEqual({ ok: false, code: "MEMORY_DIAGNOSTIC_BOUNDARY" });
    const oldPath = postCloseVerification(capture, { ...completed }, preservedInstrument);
    expect(oldPath.result.status).toBe("CALIBRATION");
    expect(oldPath.result).not.toHaveProperty("failure");
    const fixedPath = postCloseVerification(capture, { ...completed });
    expect(fixedPath.result).toMatchObject({ status: "FAIL", failure: { code: "MEMORY_DIAGNOSTIC_INVALID_SAMPLE" } });
  });

  test("empty capture invalidates the compact artifact and promotes an already built result to FAIL", () => {
    for (const status of ["CALIBRATION", "PASS"]) {
      const capture = newMemoryDiagnosticCapture();
      const checked = postCloseVerification(capture, completedResult(status));
      expect(checked.result).toMatchObject({ status: "FAIL", failure: { phase: "post-close-verification", code: "MEMORY_DIAGNOSTIC_EMPTY_CAPTURE" } });
      expect(checked.freezeCalls).toHaveLength(1);
      const artifact = memoryDiagnosticArtifact(capture);
      expect(artifact).toMatchObject({ status: "INVALID", rows: [], invalidSamples: 0, errors: [{ code: "MEMORY_DIAGNOSTIC_EMPTY_CAPTURE", sequence: null }] });
      expect(JSON.parse(JSON.stringify(artifact))).toEqual(artifact);
    }
  });

  test("valid capture preserves successful statuses and a late invalid capture preserves an earlier failure", () => {
    for (const status of ["CALIBRATION", "PASS"]) {
      const valid = newMemoryDiagnosticCapture();
      expect(captureMemoryDiagnostic(valid, sample(), "recovery-check")).toEqual({ ok: true });
      const checked = postCloseVerification(valid, completedResult(status));
      expect(checked.result.status).toBe(status);
      expect(checked.result).not.toHaveProperty("failure");
      expect(checked.freezeCalls).toHaveLength(2);
    }
    const capture = newMemoryDiagnosticCapture();
    expect(captureMemoryDiagnostic(capture, sample(), "bootstrap")).toEqual({ ok: true });
    const earlier = { phase: "bootstrap", code: "KNOWN_FUNCTIONAL_FAILURE" };
    const completed = completedResult("FAIL", earlier);
    const late = sample(2, 100);
    late.memoryDiagnostic.boundary = "invalid-late-boundary";
    expect(captureMemoryDiagnostic(capture, late, "recovery-check").ok).toBe(false);
    const checked = postCloseVerification(capture, completed);
    expect(checked.result.status).toBe("FAIL");
    expect(checked.result.failure).toBe(earlier);
    expect(checked.result.failure).toEqual({ phase: "bootstrap", code: "KNOWN_FUNCTIONAL_FAILURE" });
  });
});
