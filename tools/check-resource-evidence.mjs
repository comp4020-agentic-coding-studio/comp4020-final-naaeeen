/** Fast retained synthetic-resource qualification check; never starts a service. */
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const hex = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const canonical = value => JSON.stringify(Object.fromEntries(Object.entries(value).sort()));
const sameKeys = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const sourcePath = value => typeof value === "string" && value.length > 0 && !isAbsolute(value) && !/[\\:\x00-\x1f]/.test(value) && value.split("/").every(part => part !== "" && part !== "." && part !== "..");
const baselineGates = Object.freeze([
  "scopedDelivery", "inbound", "httpBudget", "duration", "all24Initial", "all24Final",
  "rss", "boardQueues", "houseQueues", "telemetryValid", "eventLoop", "health",
  "unexpectedDisconnects", "allNormalDelivered", "allDeliveredIncludingCatchup",
  "normalP95", "normalInputs", "workload", "recovery", "negativeAck", "slowExpiry",
  "receiptReplayExact", "receiptStoredGrowth",
]);
const mixedGates = Object.freeze([...baselineGates,
  "gameActionsAndVisibleRevisions", "gameReceiptAndStateGrowth", "spatialLifecycle",
  "spatialMotion", "pictureActionsAndDelivery", "picturePersistenceAndReceipts",
  "spatialPersistenceAndBounds",
]);

/** Pure validation: actualSourceHashes and protocolSHA256 come from read-only IO. */
export function validateResourceEvidence({ protocol: p, result: r, protocolSHA256, actualSourceHashes } = {}) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  if (!object(p) || !object(r)) return ["Protocol and result must be JSON objects"];
  check(p.schemaVersion === 1 && r.schemaVersion === 1, "Unsupported schemaVersion");
  check(r.status === "PASS", "Result status must be PASS");
  const mixed = p.spatialScenario !== undefined;
  check(!mixed || p.spatialScenario?.profile === "REUSED12_ROOT_MIXED", "Unsupported resource profile");
  const expected = mixed ? mixedGates : baselineGates;
  check(object(r.gates) && sameKeys(Object.keys(r.gates), expected) && Object.values(r.gates).every(value => value === true), `Expected exactly ${expected.length} named true gates`);
  check(Number.isFinite(p.durationSeconds) && p.durationSeconds >= 300 && Number.isFinite(r.durationSeconds) && r.durationSeconds >= p.durationSeconds, "Duration must meet registered minimum of 300 seconds");
  check(p.bounds?.rssMaxMiB === 210 && Number.isFinite(r.server?.rssPeakMiB) && r.server.rssPeakMiB > 0 && r.server.rssPeakMiB <= 210, "RSS peak must be finite and within 210 MiB");
  check(object(r.errors) && Object.keys(r.errors).length === 0, "Result errors must be an empty object");
  check(hex(protocolSHA256) && r.protocolSHA256 === protocolSHA256, "Protocol SHA-256 mismatch");
  check(hex(p.instrumentSHA256) && r.instrumentSHA256 === p.instrumentSHA256 && p.sourceHashes?.["tools/board-resource.mjs"] === p.instrumentSHA256, "Instrument SHA-256 mismatch");
  const hashes = p.sourceHashes;
  const files = p.sourceFiles;
  const validSources = object(hashes) && Object.keys(hashes).length >= 53 && Object.keys(hashes).every(sourcePath) && Object.values(hashes).every(hex) && Array.isArray(files) && files.every(sourcePath) && new Set(files).size === files.length && sameKeys(Object.keys(hashes), files);
  check(validSources, "Source manifest must bind all registered canonical repository paths");
  if (validSources) {
    check(hex(p.sourceManifestSHA256) && sha256(canonical(hashes)) === p.sourceManifestSHA256 && r.sourceManifestSHA256 === p.sourceManifestSHA256, "Source manifest SHA-256 mismatch");
    check(object(r.sourceHashes) && canonical(r.sourceHashes) === canonical(hashes), "Result source hashes differ from protocol");
    check(object(actualSourceHashes) && canonical(actualSourceHashes) === canonical(hashes), "Current repository source hashes differ from protocol");
    check(p.sourceBinding?.requiredFiles === files.length, "Registered source count mismatch");
  }
  check(typeof p.sourceBinding?.node === "string" && r.runtime?.node === p.sourceBinding.node, "Recorded Node version differs from registration");
  check(Array.isArray(r.runtime?.execArgv) && sameKeys(r.runtime.execArgv, ["--max-semi-space-size=12"]), "Recorded server semi-space arguments differ from semi12");
  check(p.bounds?.gameInboundBytes === 16384 && r.runtime?.inboundBytes === p.bounds.gameInboundBytes, "Inbound limit differs from registered 16384 bytes");
  for (const [scope, prefix] of [["board", "board"], ["house", "house"]]) {
    for (const [metric, suffix] of [["packets", "QueuePackets"], ["bytes", "QueueBytes"]]) {
      const value = r.server?.queues?.[scope]?.[metric];
      const bound = p.bounds?.[prefix + suffix];
      check(Number.isFinite(bound) && bound > 0 && Number.isFinite(value) && value >= 0 && value <= bound, `${scope} queue ${metric} exceeds registered bound`);
    }
  }
  return errors;
}

export function isRepositoryRelativePath(local) {
  const first = local.split(/[\\/]/)[0];
  return first !== "" && first !== "." && first !== ".." && !isAbsolute(local);
}

function insideRepository(path) {
  const resolved = realpathSync(resolve(root, path));
  const local = relative(realpathSync(root), resolved);
  if (!isRepositoryRelativePath(local)) throw new Error("Evidence/source path escapes repository");
  return resolved;
}

export function checkResourceEvidence(protocolPath, resultPath) {
  const protocolBytes = readFileSync(insideRepository(protocolPath));
  const protocol = JSON.parse(protocolBytes.toString("utf8"));
  const result = JSON.parse(readFileSync(insideRepository(resultPath), "utf8"));
  const actualSourceHashes = {};
  if (object(protocol.sourceHashes)) {
    for (const file of Object.keys(protocol.sourceHashes)) {
      if (!sourcePath(file)) throw new Error("Invalid source path");
      actualSourceHashes[file] = sha256(readFileSync(insideRepository(file)));
    }
  }
  const errors = validateResourceEvidence({ protocol, result, protocolSHA256: sha256(protocolBytes), actualSourceHashes });
  if (errors.length) throw new Error(errors.join("; "));
  return { status: "PASS", scope: "RETAINED_SOURCE_QUALIFICATION_ONLY", protocol: protocolPath, result: resultPath, gates: Object.keys(result.gates).length, sourceFiles: Object.keys(actualSourceHashes).length, sourceManifestSHA256: protocol.sourceManifestSHA256, durationSeconds: result.durationSeconds, rssPeakMiB: result.server.rssPeakMiB };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    let pairs;
    if (!args.length) pairs = [
      ["evaluation/board-resource.protocol.json", "evaluation/board-resource.results.json"],
      ["docs/spatial-redesign/evidence/resource-mixed.protocol.json", "docs/spatial-redesign/evidence/resource-mixed.results.json"],
    ];
    else if (args.length === 4 && args[0] === "--protocol" && args[2] === "--result") pairs = [[args[1], args[3]]];
    else throw new Error("Usage: node tools/check-resource-evidence.mjs [--protocol PATH --result PATH]");
    for (const [protocol, result] of pairs) console.log(JSON.stringify(checkResourceEvidence(protocol, result)));
  } catch (error) {
    console.error(`Resource evidence FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
