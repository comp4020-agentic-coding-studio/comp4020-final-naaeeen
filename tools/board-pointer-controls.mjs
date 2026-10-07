/** Actual-source completion controls; no server, browser or load job. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const source = readFileSync("tools/board-resource.mjs", "utf8");
const start = source.indexOf("            pointerTimer = setInterval("), end = source.indexOf("            writeTimer = setInterval(", start);
const block = source.slice(start, end);
const finallyMatch = block.match(/                        finally \{([\s\S]*?)\n                        \}/);
if (!finallyMatch) throw new Error("Actual pointer finally block is unavailable.");
const finish = new Function("v", "pointerSocket", "pointerSubscription", "sentDuringFault", "performance", finallyMatch[1]);
const socket = {}, oldSocket = {}, now = 200;
function view(overrides = {}) { return { socket, subscriptionId: "current", pointerPending: true, nextPointer: 100, ...overrides }; }
const current = view(); finish(current, socket, "current", false, { now: () => now });
const oldConnection = view(); finish(oldConnection, oldSocket, "current", false, { now: () => now });
const oldEpoch = view(); finish(oldEpoch, socket, "old", false, { now: () => now });
const fault = view(); finish(fault, socket, "current", true, { now: () => now });
const connectionStart = source.indexOf("    async function connect(v) {");
const connectionHandlers = source.indexOf('        socket.on("disconnect"', connectionStart);
const connectionPrefix = source.slice(connectionStart + "    async function connect(v) {".length, connectionHandlers);
const replaceConnection = new Function("v", "io", "origin", "performance", connectionPrefix);
const recovered = view({ socket: oldSocket, subscriptionId: "old", pointerPending: true, motionPending: true, nextPointer: 5000, nextMotion: 5000, connections: 1, cookie: "synthetic" });
replaceConnection(recovered, () => socket, "http://fixture.invalid", { now: () => now });
const resetCurrent = !recovered.pointerPending && !recovered.motionPending && recovered.nextPointer === 250 && recovered.nextMotion === 300;
finish(recovered, oldSocket, "old", true, { now: () => now + 100 });
const heldOldAckCannotBlockNew = !recovered.pointerPending && recovered.socket === socket;
recovered.subscriptionId = "current"; recovered.pointerPending = true; recovered.nextPointer = 900;
finish(recovered, oldSocket, "old", true, { now: () => now + 100 });
const heldOldAckCannotClearNew = recovered.pointerPending && recovered.nextPointer === 900;
const outcomes = {
  freshConnectionResetsVolatilePending: resetCurrent,
  heldOldAckCannotBlockNew,
  heldOldAckCannotClearNew,
  sameEpochNormalWaitsAfterAck: !current.pointerPending && current.nextPointer === 250,
  oldSocketCannotReleaseCurrent: oldConnection.pointerPending && oldConnection.nextPointer === 100,
  oldSubscriptionCannotReleaseCurrent: oldEpoch.pointerPending && oldEpoch.nextPointer === 100,
  faultKeepsNominalPolicy: !fault.pointerPending && fault.nextPointer === 100,
  capturedSocketUsedForEmission: block.includes('await pointerSocket.timeout(5000).emitWithAck("board.pointer", { subscriptionId: pointerSubscription,'),
  spacingConstantUnchanged: block.includes("v.nextPointer = now + 50") && block.includes("performance.now() + 50"),
};
const pass = Object.values(outcomes).every(Boolean);
console.log(JSON.stringify({ status: pass ? "POINTER_COMPLETION_CONTROL_PASS" : "POINTER_COMPLETION_CONTROL_FAIL", sourceSHA256: createHash("sha256").update(source).digest("hex"), outcomes }));
if (!pass) process.exitCode = 1;
