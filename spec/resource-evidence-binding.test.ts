import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { checkResourceEvidence, isRepositoryRelativePath, validateResourceEvidence } from "../tools/check-resource-evidence.mjs";

const protocolBytes = readFileSync("evaluation/board-resource.protocol.json");
const protocol = JSON.parse(protocolBytes.toString());
const result = JSON.parse(readFileSync("evaluation/board-resource.results.json", "utf8"));
const actualSourceHashes = { ...protocol.sourceHashes };
const protocolSHA256 = createHash("sha256").update(protocolBytes).digest("hex");
const fixture = () => structuredClone({ protocol, result, protocolSHA256, actualSourceHashes });

describe("retained resource evidence binding", () => {
  it("contains resolved paths with either platform separator", () => {
    for (const path of ["../outside", "..\\outside", "..", "", "."]) {
      expect(isRepositoryRelativePath(path), path).toBe(false);
    }
    expect(isRepositoryRelativePath("evaluation/board-resource.results.json")).toBe(true);
    expect(isRepositoryRelativePath("evaluation\\board-resource.results.json")).toBe(true);
  });
  it("rejects absent evidence and JSON values that are not objects", () => {
    expect(validateResourceEvidence().length).toBeGreaterThan(0);
    expect(validateResourceEvidence({ ...fixture(), result: null }).length).toBeGreaterThan(0);
    expect(validateResourceEvidence({ ...fixture(), protocol: [] }).length).toBeGreaterThan(0);
  });
  it("rejects missing evidence files and paths outside the repository", () => {
    expect(() => checkResourceEvidence("evaluation/board-resource.protocol.json", "evaluation/does-not-exist.results.json")).toThrow();
    expect(() => checkResourceEvidence("/etc/hosts", "evaluation/board-resource.results.json")).toThrow(/escapes repository/);
  });
  it("accepts the actual qualified baseline and exact source bindings", () => {
    expect(validateResourceEvidence(fixture())).toEqual([]);
  });
  const invalid: [string, (f: ReturnType<typeof fixture>) => void][] = [
    ["empty gates", f => { f.result.gates = {}; }],
    ["missing expected gate", f => { delete f.result.gates.workload; }],
    ["false gate", f => { f.result.gates.rss = false; }],
    ["unexpected gate", f => { f.result.gates.extra = true; }],
    ["non-PASS status", f => { f.result.status = "CALIBRATION"; }],
    ["wrong schema", f => { f.result.schemaVersion = 2; }],
    ["nonfinite duration", f => { f.result.durationSeconds = Number.NaN; }],
    ["short duration", f => { f.result.durationSeconds = 299.999; }],
    ["excess RSS", f => { f.result.server.rssPeakMiB = 210.001; }],
    ["nonfinite RSS", f => { f.result.server.rssPeakMiB = Infinity; }],
    ["recorded error", f => { f.result.errors.failure = 1; }],
    ["malformed errors", f => { f.result.errors = []; }],
    ["protocol mismatch", f => { f.result.protocolSHA256 = "0".repeat(64); }],
    ["stale actual source", f => { f.actualSourceHashes["src/server.ts"] = "0".repeat(64); }],
    ["result source mismatch", f => { f.result.sourceHashes["src/server.ts"] = "0".repeat(64); }],
    ["missing source manifest", f => { f.protocol.sourceHashes = {}; }],
    ["foreign source path", f => { f.protocol.sourceHashes["../foreign.ts"] = "0".repeat(64); }],
    ["missing source list member", f => { f.protocol.sourceFiles.pop(); }],
    ["wrong instrument", f => { f.result.instrumentSHA256 = "0".repeat(64); }],
    ["wrong Node version", f => { f.result.runtime.node = "v22.0.0"; }],
    ["wrong semi-space", f => { f.result.runtime.execArgv = []; }],
    ["wrong inbound limit", f => { f.result.runtime.inboundBytes = 32768; }],
    ["changed RSS bound", f => { f.protocol.bounds.rssMaxMiB = 256; }],
  ];
  for (const [name, mutate] of invalid) {
    it(`rejects ${name}`, () => {
      const f = fixture();
      mutate(f);
      expect(validateResourceEvidence(f).length).toBeGreaterThan(0);
    });
  }
  it("accepts the actual 30-gate mixed profile and rejects a baseline substitution", () => {
    const bytes = readFileSync("docs/spatial-redesign/evidence/resource-mixed.protocol.json");
    const mixedProtocol = JSON.parse(bytes.toString());
    const mixedResult = JSON.parse(readFileSync("docs/spatial-redesign/evidence/resource-mixed.results.json", "utf8"));
    const f = { protocol: mixedProtocol, result: mixedResult, protocolSHA256: createHash("sha256").update(bytes).digest("hex"), actualSourceHashes };
    expect(validateResourceEvidence(f)).toEqual([]);
    f.result.gates = { ...result.gates };
    expect(validateResourceEvidence(f).length).toBeGreaterThan(0);
  });
});
