import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, test } from "vitest";
import * as spatial from "../tools/spatial-resource.mjs";
import { createLayout, findRoute } from "../public/house-geometry.js";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const boardSource = read("tools/board-resource.mjs"), spatialSource = read("tools/spatial-resource.mjs");
const sentinel = "synthetic-private-message-cookie-token-identity-payload";
const budget = { ok: false, code: "RATE_LIMITED", message: "Please slow down your house actions." };
const interval = { ok: false, code: "RATE_LIMITED", message: "Movement updates are limited to ten per second." };

function actualNode(source: string, select: (node: ts.Node) => boolean) {
  const ast = ts.createSourceFile("instrument.mjs", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), found: ts.Node[] = [];
  function visit(node: ts.Node) { if (select(node)) found.push(node); ts.forEachChild(node, visit); }
  visit(ast);
  if (found.length !== 1) throw new Error("Actual instrument node count: " + found.length);
  return found[0];
}

function variable(source: string, name: string) {
  return (actualNode(source, node => ts.isVariableDeclaration(node) && node.name.getText() === name) as ts.VariableDeclaration).initializer!.getText();
}

function actualFunction(source: string, name: string) {
  return actualNode(source, node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText();
}

function actualOK(source: string) {
  const fail = new Function("failResourceAck", "return (" + variable(source, "fail") + ")")((spatial as any).failResourceAck);
  return new Function("fail", "failResourceAck", "return (" + variable(source, "ok") + ")")(
    fail, (spatial as any).failResourceAck,
  );
}

function projectOuter(error: any, initial: any = null) {
  const clause = actualNode(boardSource, node => ts.isCatchClause(node) && node.block.getText().includes("failureStatus(failure.code)")) as ts.CatchClause;
  const projection = clause.block.statements[0].getText();
  return new Function("e", "phase", "failure", "resourceFailureCategory", projection + ";return failure;")(
    error, "prepare", initial, (spatial as any).resourceFailureCategory,
  );
}

function projectLaunch(error: any, initial: any = null) {
  const launch = actualFunction(boardSource, "launch");
  const callback = actualNode(launch, node => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "catch") as ts.CallExpression;
  return new Function("e", "phase", "failure", "error", "resourceFailureCategory", "(" + callback.arguments[0].getText() + ")(e);return failure;")(
    error, "prepare", initial, () => {}, (spatial as any).resourceFailureCategory,
  );
}

function rejected(ok: (reply: any) => any, reply: any) {
  try { ok(reply); } catch (error) { return error; }
  throw new Error("Expected the actual ok() to reject");
}

function actualBootstrap(ack: any, traced = false, transport?: Error) {
  const calls: any[] = [], actor: any = {
    index: 2, generation: 7, motionSequence: 1,
    socket: { timeout(ms: number) { calls.push(["timeout", ms]); return this; }, async emitWithAck(event: string, body: any) {
      calls.push([event, body]); if (transport) throw transport; return ack;
    } },
  };
  let rateTrace: any = null;
  if (traced) {
    const bound = JSON.parse(read("docs/spatial-redesign/evidence/rate-attribution-route-bound.json"));
    rateTrace = spatial.newBootstrapRateTrace(bound);
    const layout = createLayout(6), seat = layout.seats.find(value => value.id === "game-seat-2")!;
    spatial.registerBootstrapRateRoute(rateTrace, actor.index, findRoute(layout, layout.arrivals![1], seat.target));
  }
  const bindings: any = { rateTrace, traceJobs: new Set(), ask: new Function("return (" + variable(spatialSource, "ask") + ")")(),
    ok: actualOK(spatialSource), fail: new Function("failResourceAck", "return (" + variable(spatialSource, "fail") + ")")((spatial as any).failResourceAck),
    failResourceAck: (spatial as any).failResourceAck,
    beginBootstrapRateAction: spatial.beginBootstrapRateAction, finishBootstrapRateAction: spatial.finishBootstrapRateAction };
  const ask = new Function(...Object.keys(bindings), "return (" + actualFunction(spatialSource, "bootstrapAsk") + ")")(...Object.values(bindings));
  return { calls, rateTrace, run: () => ask(actor, 1, "move", { sequence: 1, x: 1, z: 1, heading: 0 }) };
}

describe("safe first rejected ACK category", () => {
  test.each([[budget, "ACTION_BUDGET"], [interval, "MOVE_INTERVAL"]] as const)("actual spatial/board throw reaches both real catch projections: %s", (reply, category) => {
    for (const source of [spatialSource, boardSource]) {
      const error = rejected(actualOK(source), { ...reply, identity: sentinel, token: sentinel, payload: sentinel });
      for (const project of [projectOuter, projectLaunch]) {
        const failure = project(error);
        expect(failure).toEqual({ phase: "prepare", code: "RATE_LIMITED", ackCategory: category });
        expect(JSON.stringify(failure)).not.toContain(sentinel);
        expect(JSON.stringify(failure)).not.toContain(reply.message);
      }
    }
  });

  test.each([
    [{ ...budget, message: sentinel }, "RATE_LIMITED"],
    [{ ...budget, message: budget.message + " " }, "RATE_LIMITED"],
    [{ ...budget, code: "FORBIDDEN" }, "FORBIDDEN"],
    [null, "SPATIAL_NO_ACK"],
  ] as const)("unknown/non-rate/missing ACKs remain OTHER with original code: %s", (reply, code) => {
    const failure = projectOuter(rejected(actualOK(spatialSource), reply));
    expect(failure).toEqual({ phase: "prepare", code, ackCategory: "OTHER" });
    expect(JSON.stringify(failure)).not.toContain(sentinel);
  });

  test("actual successful predicates preserve response identity", () => {
    for (const source of [spatialSource, boardSource]) for (const reply of [{ ok: true }, { ok: 1 }]) expect(actualOK(source)(reply)).toBe(reply);
  });

  test("real non-traced bootstrap keeps one existing ask and the 5000ms timeout", async () => {
    const fixture = actualBootstrap(interval);
    let caught: any;
    try { await fixture.run(); } catch (error) { caught = error; }
    expect(projectOuter(caught)).toEqual({ phase: "prepare", code: "RATE_LIMITED", ackCategory: "MOVE_INTERVAL" });
    expect(fixture.calls).toEqual([["timeout", 5000], ["house.move", { generation: 7, sequence: 1, x: 1, z: 1, heading: 0 }]]);
    expect(fixture.rateTrace).toBeNull();
  });

  test("real traced rejection preserves its existing trace and categorizes the thrown ACK", async () => {
    const fixture = actualBootstrap(budget, true);
    let caught: any;
    try { await fixture.run(); } catch (error) { caught = error; }
    expect(projectOuter(caught)).toEqual({ phase: "prepare", code: "RATE_LIMITED", ackCategory: "ACTION_BUDGET" });
    expect(spatial.bootstrapRateArtifact(fixture.rateTrace)).toMatchObject({ firstFailure: { classification: "ACTION_BUDGET" } });
    expect(fixture.calls).toHaveLength(2);
  });

  test("transport and forged fields cannot impersonate a classified ACK", async () => {
    const transport = Object.assign(new Error(sentinel), { code: "RATE_LIMITED", ackCategory: "ACTION_BUDGET", rateLimitCategory: "MOVE_INTERVAL", body: sentinel });
    const fixture = actualBootstrap(null, false, transport);
    let caught: any;
    try { await fixture.run(); } catch (error) { caught = error; }
    expect(caught).toBe(transport);
    for (const project of [projectOuter, projectLaunch]) {
      expect(project(caught)).toEqual({ phase: "prepare", code: "RATE_LIMITED", ackCategory: "OTHER" });
      expect(JSON.stringify(project(caught))).not.toContain(sentinel);
    }
  });

  test("later errors cannot replace the first category in either catch", () => {
    const first = projectOuter(rejected(actualOK(spatialSource), budget));
    const later = rejected(actualOK(spatialSource), interval);
    expect(projectOuter(later, first)).toBe(first);
    expect(projectLaunch(later, first)).toBe(first);
    expect(first.ackCategory).toBe("ACTION_BUDGET");
  });

  test("complete actual launch settles rejected ACK jobs and retains the first failure", async () => {
    const codes: string[] = [];
    const harness = new Function("resourceFailureCategory", "phase", "error", `
      let failure = null;
      const jobs = new Set();
      ${actualFunction(boardSource, "launch")}
      return { launch, jobs, get failure() { return failure; } };
    `)((spatial as any).resourceFailureCategory, "prepare", (code: string) => codes.push(code));
    const firstError = rejected(actualOK(spatialSource), budget);
    const firstJob = harness.launch(async () => { throw firstError; });
    expect(harness.jobs.has(firstJob)).toBe(true);
    await firstJob;
    const first = harness.failure;
    expect(first).toEqual({ phase: "prepare", code: "RATE_LIMITED", ackCategory: "ACTION_BUDGET" });
    expect(harness.jobs.size).toBe(0);

    const laterError = rejected(actualOK(spatialSource), interval);
    const laterJob = harness.launch(() => Promise.reject(laterError));
    expect(harness.jobs.has(laterJob)).toBe(true);
    await laterJob;
    expect(harness.failure).toBe(first);
    expect(harness.jobs.size).toBe(0);
    expect(codes).toEqual(["RATE_LIMITED", "RATE_LIMITED"]);
    expect(JSON.stringify(harness.failure)).not.toContain(sentinel);
  });
});
