/** Registered LOCAL SYNTHETIC combined resource exercise. */
import { fork } from "node:child_process";
import { SERVER_NODE_ARGS } from "../src/server-runtime.ts";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { HOUSE_WORLD_VERSION } from "../public/house-version.js";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { getHeapStatistics } from "node:v8";
import { release as kernelRelease } from "node:os";
import {setTimeout as timerDelay} from "node:timers/promises";
import { crc32, deflateSync } from "node:zlib";
import { Server } from "socket.io";
import { io } from "socket.io-client";
import { createSpatialWorkload, newMemoryDiagnosticCapture, captureMemoryDiagnostic, captureMemoryDiagnosticTerminal, finalizeMemoryDiagnostic, flushMemoryDiagnosticTerminal, MEMORY_DIAGNOSTIC_BOUNDARIES, failResourceAck, resourceFailureCategory, resourceMotionDue } from "./spatial-resource.mjs";
import { validateSourceBindings, capturePictureAuthority, pictureAuthorityEvidence, newBoardACKLedger, recordBoardACK, receiptStorage, databaseFiles, verifyClosedBoardLedger, gradeReceiptReplay, gradeReceiptGrowth, picturePlan, normalizePictureFrame, pictureFrameMatches, puzzleIntentACK, gradePictureEvidence, verifyClosedPictureTables } from "./board-resource-p7.mjs";
const arg = k => {
    const n = process.argv.indexOf(k);
    return n < 0 ? undefined : process.argv[n + 1];
};
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const protocolPath = resolve(root, arg("--protocol-file") ?? "evaluation/board-resource.protocol.json");
if (!protocolPath.endsWith(".protocol.json")) throw new Error("A .protocol.json file is required");
const resultPath = protocolPath.replace(/\.protocol\.json$/, ".results.json");
const memoryDiagnosticPath = protocolPath.replace(/\.protocol\.json$/, ".memory-diagnostic.json");
const rateAttributionPath = protocolPath.replace(/\.protocol\.json$/, ".rate-attribution.json");
const hash = b => createHash("sha256").update(b).digest("hex"), sleep = ms => new Promise(r => setTimeout(r, ms));
const q = (a, p) => a.length ? [...a].sort((a, b) => a - b)[Math.max(0, Math.ceil(a.length * p) - 1)] : null, round = n => n === null ? null : Math.round(n * 1000) / 1000;
const fail = code => {
    throw Object.assign(new Error(code), { code });
}, ok = r => {
    if (!r?.ok)
        failResourceAck(r, "NO_ACK");
    return r;
};
function freeze(p, protocolHash) {
    if(hash(readFileSync(protocolPath))!==protocolHash)fail("PROTOCOL_FREEZE_CHANGED");
    validateSourceBindings(p);
    if (hash(Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(p.sourceHashes).sort())))) !== p.sourceManifestSHA256)
        fail("SOURCE_MANIFEST_INVALID");
    for (const [f, h] of Object.entries(p.sourceHashes))
        if (hash(readFileSync(join(root, f))) !== h)
            fail("SOURCE_FREEZE_CHANGED");
    if (hash(readFileSync(fileURLToPath(import.meta.url))) !== p.instrumentSHA256)
        fail("INSTRUMENT_CHANGED");
}
function queue(c) {
    const b = c.writeBuffer, w = c.transport?.socket;
    if (!Array.isArray(b) || typeof w?.bufferedAmount !== "number")
        return null;
    let bytes = w.bufferedAmount;
    for (const p of b) {
        if(p.data===undefined&&["open","close","ping","pong","upgrade","noop"].includes(p.type)){bytes+=32;continue;}
        if (typeof p.data !== "string" && !Buffer.isBuffer(p.data))
            return null;
        bytes += Buffer.byteLength(p.data) + 32;
    }
    return { packets: b.length, bytes };
}
async function serve() {
    const p = JSON.parse(readFileSync(protocolPath, "utf8"));
    freeze(p,arg("--protocol"));
    let sio;
    const original = Server.prototype.attach;
    Server.prototype.attach = function (...a) {
        sio = this;
        return original.apply(this, a);
    };
    const actions = {};
    console.log = (...a) => {
        for (const s of a)
            if (typeof s === "string")
                try {
                    const r = JSON.parse(s);
                    if (typeof r.action === "string" && typeof r.outcome === "string") {
                        const k = r.action + ":" + r.outcome;
                        actions[k] = (actions[k] ?? 0) + 1;
                    }
                }
                catch {
                }
    };
    const { createService } = await import("../src/server.ts"), service = createService({ dataDir: arg("--data"), secureCookies: false });
    const roles = new WeakMap(), connections = new Set(), peaks = { house: { packets: 0, bytes: 0 }, board: { packets: 0, bytes: 0 }, unknown: { packets: 0, bytes: 0 } }, engines = { created: 0, closed: 0, peak: 0 }, namespaces = { houseCreated: 0, houseClosed: 0, boardCreated: 0, boardClosed: 0 };
    let invalidTelemetry = 0;
    function inspect(c) {
        const v = queue(c);
        if (!v) {
            if (c.readyState === "open" && c.transport?.name === "websocket")
                invalidTelemetry++;
            return;
        }
        const kind = roles.get(c) ?? "unknown";
        peaks[kind].packets = Math.max(peaks[kind].packets, v.packets);
        peaks[kind].bytes = Math.max(peaks[kind].bytes, v.bytes);
    }
    sio.engine.on("connection", c => {
        connections.add(c);
        engines.created++;
        engines.peak = Math.max(engines.peak, connections.size);
        const send = c.sendPacket;
        c.sendPacket = function (...a) {
            inspect(this);
            const r = send.apply(this, a);
            inspect(this);
            return r;
        };
        c.once("close", () => {
            connections.delete(c);
            engines.closed++;
        });
    });
    for (const [name, kind] of [["/", "house"], ["/board", "board"]])
        sio.of(name).on("connection", s => {
            roles.set(s.conn, kind);
            namespaces[kind + "Created"]++;
            s.once("disconnect", () => namespaces[kind + "Closed"]++);
        });
    const loop = monitorEventLoopDelay({ resolution: 10 });
    loop.enable();
    let rssPeak = 0, heapPeak = 0;
    let memorySampleSequence = 0, heapTotalPeak = 0, externalPeak = 0, arrayBuffersPeak = 0;
    const filePeaks = new Map();
    function sample(memoryBoundary = null) {
        for (const c of connections)
            inspect(c);
        const m = process.memoryUsage(), monotonicMs = performance.now(), serverWallMs=p.rateAttribution?Date.now():null, osMaxRSSMiB = process.resourceUsage().maxRSS / 1024;
        rssPeak = Math.max(rssPeak, m.rss);
        heapPeak = Math.max(heapPeak, m.heapUsed);
        heapTotalPeak = Math.max(heapTotalPeak, m.heapTotal);
        externalPeak = Math.max(externalPeak, m.external);
        arrayBuffersPeak = Math.max(arrayBuffersPeak, m.arrayBuffers);
        const files = p.storageAcceptance ? databaseFiles(arg("--data")) : null;
        if (files) for (const f of files) {
            const prior = filePeaks.get(f.name) ?? { name:f.name, logicalBytes:0, allocatedBytes:0 };
            prior.logicalBytes=Math.max(prior.logicalBytes,f.logicalBytes); prior.allocatedBytes=Math.max(prior.allocatedBytes,f.allocatedBytes); filePeaks.set(f.name,prior);
        }
        return { ...(files ? {databaseFiles:files,databaseFilePeaks:[...filePeaks.values()]} : {}), memoryDiagnostic: {sequence:++memorySampleSequence,monotonicMs,heapTotalMiB:m.heapTotal/1024**2,heapTotalPeakMiB:heapTotalPeak/1024**2,externalPeakMiB:externalPeak/1024**2,arrayBuffersPeakMiB:arrayBuffersPeak/1024**2,osMaxRSSMiB,boundary:memoryBoundary,...(p.rateAttribution?{serverWallMs}: {})}, kind: "sample", rssMiB: m.rss / 1024 ** 2, heapMiB: m.heapUsed / 1024 ** 2, externalMiB: m.external / 1024 ** 2, arrayBuffersMiB: m.arrayBuffers / 1024 ** 2, rssPeakMiB: rssPeak / 1024 ** 2, heapPeakMiB: heapPeak / 1024 ** 2, queues: peaks, activeEngines: connections.size, houseViews: sio.of("/").sockets.size, boardViews: sio.of("/board").sockets.size, engines, namespaces, invalidTelemetry, eventLoop: { p95Ms: loop.percentile(95) / 1e6, p99Ms: loop.percentile(99) / 1e6, maxMs: loop.max / 1e6 }, cpu: process.cpuUsage(), actions };
    }
    // Read-only aggregate diagnostics; no authority or transport handler is replaced.
    const storageQueries = p.storageAcceptance || p.gameScenario ? {
        games: service.houseStore.db.prepare("SELECT count(*) AS rows,coalesce(sum(octet_length(state)),0) AS stateBytes,coalesce(max(octet_length(state)),0) AS maxStateBytes,coalesce(sum(CASE WHEN json_type(state,'$.current')!='null' THEN 1 ELSE 0 END),0) AS activeTables FROM game_tables"),
        gameReceipts: service.houseStore.db.prepare("SELECT count(*) AS count,coalesce(sum(octet_length(response)),0) AS storedBytes FROM receipts WHERE json_type(response,'$.result.code')='text'"),
        puzzleReceipts: p.pictureScenario ? service.houseStore.db.prepare("SELECT count(*) AS count,coalesce(sum(octet_length(response)),0) AS storedBytes FROM receipts WHERE json_type(response,'$.result.puzzleRevision')='integer'") : null,
        puzzles: p.pictureScenario ? service.houseStore.db.prepare("SELECT count(*) AS rows,coalesce(max(octet_length(state)),0) AS maxStateBytes,coalesce(sum(json_extract(state,'$.current.completed')),0) AS completedTables,coalesce(sum(json_array_length(state,'$.current.placements')),0) AS placements FROM puzzle_tables") : null
    } : null;
    function storageSample() {
        if (!storageQueries) fail("STORAGE_NOT_REGISTERED");
        const cgroup = {};
        for (const name of ["memory.current", "memory.peak", "memory.events", "memory.events.local"])
            try { cgroup[name] = readFileSync("/sys/fs/cgroup/" + name, "utf8").trim(); } catch {}
        return { receipts:receiptStorage(service.houseStore.db),boardReceipts:receiptStorage(service.boardStore.db),gameReceipts:storageQueries.gameReceipts.get(),gameTables:storageQueries.games.get(),...(p.pictureScenario ? {puzzleReceipts:storageQueries.puzzleReceipts.get(),puzzleTables:storageQueries.puzzles.get()} : {}),files:databaseFiles(arg("--data")),cgroup };
    }
    const timer = setInterval(() => process.send?.(sample()), 100);
    timer.unref();
    let closing = false;
    process.on("message", async (m) => {
        try {
            if (m?.kind === "negative") {
                const peer = sio.of("/board").sockets.get(m.socketId);
                if (!peer)
                    fail("NEGATIVE_PEER_MISSING");
                peer.conn.transport.writable = false;
                process.send?.({ kind: "negativeReady", requestId: m.requestId });
            }
            else if (m?.kind === "storage")
                process.send?.({ kind: "storage", requestId: m.requestId, ...storageSample() });
            else if (m?.kind === "sample")
                process.send?.({ ...sample(m.memoryBoundary ?? null), kind: "reply", requestId: m.requestId });
            else if (m?.kind === "stop" && !closing) {
                closing = true;
                clearInterval(timer);
                process.send?.(sample());
                loop.disable();
                await service.close();
                if(!await flushMemoryDiagnosticTerminal(process,memorySampleSequence))process.exit(1);
                process.exit(0);
            }
        }
        catch (e) {
            process.send?.({ kind: "childFailure", code: e.code ?? "CHILD_FAILURE" });
        }
    });
    await new Promise((done, reject) => {
        service.server.once("error", reject);
        service.server.listen(0, "127.0.0.1", done);
    });
    const runtime = { node: process.version, host: { platform: process.platform, kernel: kernelRelease(), runner: process.env.GITHUB_ACTIONS === "true" ? "GitHub Actions" : /microsoft/i.test(kernelRelease()) ? "WSL" : "local" }, execArgv: process.execArgv, heapLimitMiB: getHeapStatistics().heap_size_limit / 1024 ** 2, constrainedMemoryBytes: process.constrainedMemory(), inboundBytes:sio.engine.opts.maxHttpBufferSize, cgroupMemoryMax: null, cgroupCpuMax: null };
    for (const [f, k] of [["/sys/fs/cgroup/memory.max", "cgroupMemoryMax"], ["/sys/fs/cgroup/cpu.max", "cgroupCpuMax"]])
        try {
            runtime[k] = readFileSync(f, "utf8").trim();
        }
        catch {
        }
    process.send?.({ ...sample(), kind: "ready", port: service.server.address().port, runtime });
}
function index(n) {
    const a = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    return n < 62 ? "a" + a[n] : "b" + a[Math.floor((n - 62) / 62)] + a[(n - 62) % 62];
}
function shape(id, type, n, e = {}) {
    return { id, type, x: n * 12, y: 20, width: 240, height: 140, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "#fff3bf", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: null, seed: 1, version: 1, versionNonce: 100, updated: 1000, isDeleted: false, boundElements: null, link: null, locked: false, index: index(n), ...e };
}
function scene(houseIndex=0) {
    const a = [];
    for (let n = 0; n < 80; n++) {
        const text = ("Synthetic house "+houseIndex+" resource note " + n + "\n").padEnd(11000, "n");
        a.push(shape("box_" + n, "rectangle", a.length, { boundElements: [{ id: "text_" + n, type: "text" }] }));
        a.push(shape("text_" + n, "text", a.length, { text, originalText: text, fontSize: 20, fontFamily: 5, textAlign: "left", verticalAlign: "top", containerId: "box_" + n, autoResize: false, lineHeight: 1.25 }));
    }
    for (let n = 0; n < 10; n++)
        a.push(shape("arrow_" + n, "arrow", a.length, { points: [[0, 0], [40, 20]], lastCommittedPoint: null, startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: "arrow", elbowed: false }));
    for (let n = 0; n < 10; n++)
        a.push(shape("draw_" + n, "freedraw", a.length, { points: Array.from({ length: 64 }, (_, i) => [i, i % 11]), pressures: Array(64).fill(0.5), simulatePressure: false, lastCommittedPoint: null }));
    for (let n = 0; n < 20; n++)
        a.push(shape("deleted_" + n, "rectangle", a.length, { isDeleted: true }));
    for (let n = 0; n < 2; n++)
        a.push(shape("image_" + n, "image", a.length, { fileId: "resource_png_" + n, status: "saved", scale: [1, 1], crop: null }));
    return a;
}
function png(seed) {
    const side = 820, h = Buffer.alloc(13);
    h.writeUInt32BE(side);
    h.writeUInt32BE(side, 4);
    h[8] = 8;
    h[9] = 2;
    const data = Buffer.alloc(side * (side * 3 + 1));
    let s = seed >>> 0;
    for (let y = 0; y < side; y++)
        for (let x = 1; x <= side * 3; x++) {
            s ^= s << 13;
            s ^= s >>> 17;
            s ^= s << 5;
            data[y * (side * 3 + 1) + x] = s & 255;
        }
    function chunk(t, b) {
        const c = Buffer.alloc(b.length + 12);
        c.writeUInt32BE(b.length);
        c.write(t, 4, "ascii");
        b.copy(c, 8);
        c.writeUInt32BE(crc32(c.subarray(4, -4)), c.length - 4);
        return c;
    }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", h), chunk("IDAT", deflateSync(data)), chunk("IEND", Buffer.alloc(0))]);
}
function checkpointFromSnapshot(snapshot) {
    return { sequence: snapshot.sequence, elements: new Map(snapshot.elements.map(e => [e.id, e.version])), chatIds: new Set(snapshot.chat.map(m => m.id)) };
}
function gradeRecoveredCheckpoint(checkpoint, seedElements, seedChat, journal) {
    const versions = new Map(seedElements.map(e => [e.id, e.version]));
    const chats = new Map(seedChat.map(m => [m.id, m.sequence]));
    for (const receipt of journal) {
        if (receipt.sequence > checkpoint.sequence) continue;
        if (receipt.type === "patch") {
            for (const element of receipt.elements) versions.set(element.id, Math.max(versions.get(element.id) ?? 0, element.version));
        } else chats.set(receipt.id, receipt.sequence);
    }
    return [...versions].every(([id, version]) => (checkpoint.elements.get(id) ?? 0) >= version) &&
        [...chats].sort((a, b) => a[1] - b[1]).slice(-100).every(([id]) => checkpoint.chatIds.has(id));
}
async function checkpointRecovered(view, house) {
    // These HTTP writes had started before this subscription ACK. They may have
    // committed before its cursor but not returned their receipts yet. Each has
    // the existing bounded HTTP deadline; the workload and slow job stay outside.
    await Promise.all(view.receiptsAtCheckpoint);
    return gradeRecoveredCheckpoint(view.recoveryCheckpoint, house.elements, house.seedChat, house.receiptJournal);
}
function gameStepPlan(neutral) {
    const steps = [{ type: "join", slot: 0, code: "joined" }, { type: "join", slot: 1, code: "joined" }, { type: "ready", slot: 0, code: "ready" }, { type: "ready", slot: 1, code: "started" }];
    const columns = neutral ? [0, 1] : [0, 1, 0, 1, 0, 1, 0];
    for (const [i, column] of columns.entries()) steps.push({ type: "move", slot: i % 2, column, code: !neutral && i === 6 ? "win" : "moved" });
    if (neutral) steps.push({ type: "leave", slot: 0, code: "left" });
    return steps;
}
function gameTargetIndices(houseIndex, scheduledSeconds, slowReader) {
    return Array.from({ length: 6 }, (_, memberIndex) => houseIndex * 12 + memberIndex * 2)
        .filter(index => !(index === 0 && scheduledSeconds >= slowReader.pauseAtSeconds && scheduledSeconds < slowReader.pauseAtSeconds + slowReader.pauseSeconds));
}
function rememberGameProjection(view, game) {
    if (!game || !Number.isSafeInteger(game.revision)) return;
    view.gameFrames ??= new Map();
    if (!view.gameFrames.has(game.revision)) view.gameFrames.set(game.revision, { game, at: performance.now(), hash: hash(Buffer.from(JSON.stringify(game))) });
}
function gameProjectionMatches(game, expected) {
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    if (!game || game.revision !== expected.revision || game.rosterRevision !== expected.rosterRevision) return false;
    const terminal = expected.status === "terminal", state = terminal ? game.latestResult : game.current;
    if (!state || state.roundId !== expected.roundId || !same(state.players, expected.players) || !same(state.cells, expected.cells) || !same(state.lastMove, expected.lastMove)) return false;
    if (terminal) return game.current === null && state.reason === expected.reason && state.winner === expected.winner && Number.isSafeInteger(state.startedAt) && Number.isSafeInteger(state.endedAt) && state.endedAt >= state.startedAt;
    return state.status === expected.status && same(state.ready?.map(Boolean), expected.ready) && state.turn === expected.turn && state.resumeRevision === 0 && state.recoveryDeadlineAt === null;
}
function gradeGameEvidence(scenario, slowReader, evidence) {
    const actions = evidence.actions, times = [];
    if (evidence.status !== "COMPLETE" || actions.length !== scenario.expectedActions || evidence.rounds.length !== 12) return false;
    for (let houseIndex = 0; houseIndex < 2; houseIndex++) {
        let revision = 0;
        for (let roundIndex = 0; roundIndex < 6; roundIndex++) {
            const plan = gameStepPlan(scenario.neutralRoundIndices.includes(roundIndex));
            for (const [stepIndex, step] of plan.entries()) {
                const matches = actions.filter(a => a.houseIndex === houseIndex && a.roundIndex === roundIndex && a.stepIndex === stepIndex);
                if (matches.length !== 1) return false;
                const action = matches[0], scheduled = scenario.roundStartsSeconds[roundIndex] + stepIndex * scenario.actionIntervalSeconds;
                const targets = gameTargetIndices(houseIndex, scheduled, slowReader);
                if (action.status !== "VISIBLE" || typeof action.gameHash !== "string" || !/^[a-f0-9]{64}$/.test(action.gameHash) || action.type !== step.type || action.slot !== step.slot || action.code !== step.code || action.revision !== ++revision || action.scheduledOffsetSeconds !== scheduled || !Number.isFinite(action.sendLagMs) || action.sendLagMs < 0 || action.sendLagMs > scenario.maximumScheduleLagMs || JSON.stringify(action.targetIndices) !== JSON.stringify(targets) || action.observed.length !== targets.length) return false;
                for (const target of targets) {
                    const observations = action.observed.filter(o => o.viewIndex === target);
                    if (observations.length !== 1 || observations[0].gameHash !== action.gameHash || !Number.isFinite(observations[0].latencyMs) || observations[0].latencyMs < 0) return false;
                    times.push(observations[0].latencyMs);
                }
            }
            const rounds = evidence.rounds.filter(r => r.houseIndex === houseIndex && r.roundIndex === roundIndex);
            if (rounds.length !== 1 || rounds[0].actions !== plan.length || rounds[0].finalRevision !== revision || rounds[0].outcome !== (scenario.neutralRoundIndices.includes(roundIndex) ? "player_left" : "win")) return false;
        }
    }
    return times.length === scenario.expectedReadableProjectionTargets && q(times, 0.95) <= scenario.visibleP95Ms;
}
function writeResult(r) {
    let old;
    try {
        old = JSON.parse(readFileSync(resultPath, "utf8"));
    }
    catch {
    }
    const history = old?.history ?? [];
    if (old && old.status !== "NOT_RUN")
        history.push({ ...old, history: undefined });
    writeFileSync(resultPath, JSON.stringify({ ...r, history }, null, 2) + "\n");
}
function failureStatus(code){return ["SOURCE_FREEZE_CHANGED","INSTRUMENT_CHANGED","PROTOCOL_FREEZE_CHANGED"].includes(code)?"ABORTED":"FAIL";}
async function run() {
    const protocolBytes = readFileSync(protocolPath), p = JSON.parse(protocolBytes), protocolHash = hash(protocolBytes);
    freeze(p, protocolHash);
    const calibration = process.argv.includes("--bootstrap-calibration");
    if(p.rateAttribution&&(!calibration||!p.spatialScenario))fail("RATE_TRACE_BOOTSTRAP_PROFILE_REQUIRED");
    if (!calibration && (!process.argv.includes("--run") || arg("--go") !== protocolHash || arg("--freeze") !== p.sourceManifestSHA256))
        fail("PARENT_GO_REQUIRED");
    const startedAt = new Date().toISOString(), dir = join(root, ".local/board-resource", startedAt.replaceAll(":", "-") + "-" + randomUUID());
    mkdirSync(join(dir, "data"), { recursive: true });
    const child = fork(fileURLToPath(import.meta.url), ["--child", "--data", join(dir, "data"),"--protocol",protocolHash,"--protocol-file",protocolPath], { cwd: root, silent: true, execArgv: [...SERVER_NODE_ARGS], env: { ...process.env, NODE_ENV: "test" } });
    let origin, runtime, lastSample, phase = "startup", failure = null, closing = false, running = false, start = 0, end = 0, unexpectedDisconnects = 0, scopeErrors=0, staleFramesIgnored=0, stderrBytes = 0, stdoutBytes = 0;
    const gameEvidence = p.gameScenario ? { status: "NOT_RUN", actions: [], rounds: [], storage: [] } : null;
    const pictureEvidence = p.pictureScenario ? {status:"NOT_RUN",actions:[],admissions:[],invalidFrames:0,conflictingFrames:0} : null;
    const storageEvidence = p.storageAcceptance ? {baseline:null,final:null,verification:null} : null;
    const memoryDiagnostic = newMemoryDiagnosticCapture({includeWallTime:!!p.rateAttribution});
    const memorySampleSequences = new WeakMap();
    let memoryMeasurementEndSequence=null,memoryMeasurementGateRSSPeakMiB=null;
    const boardACKLedger = p.storageAcceptance ? newBoardACKLedger() : null;
    let finalResult = null;
    let spatial = null;
    const childExit = new Promise(done => child.once("exit",(code,signal)=>done({code,signal})));
    const httpCounts = new Map();
    const samples = [], errors = {}, houses = [], views = [], deliveries = new Map(), pendingByView = new Map(), latencies = { normal: [], slow: [] }, jobs = new Set(), stats = { motionSent: 0, motionOk: 0, motionRejected: 0, motionTimeouts: 0, pointerSent: 0, pointerOk: 0, pointerRejected: 0, pointerTimeouts: 0, patchScheduled: 0, patchSkipped: 0, patchSaved: 0, patchRejected: 0, chatSaved: 0,chatSkipped:0, expectedFaultTimeouts: 0, invalidSent: 0, invalidAcked: 0, initialSnapshots: 0, assetReads: 0, assetBytesRead: 0 };
    let readyResolve, readyReject;
    const ready = new Promise((r, j) => {
        readyResolve = r;
        readyReject = j;
    }), waiters = new Map();
    child.on("message", v => {
        if (v?.kind === "ready") {
            origin = "http://127.0.0.1:" + v.port;
            runtime = v.runtime;
            readyResolve();
        }
        if (["sample", "reply", "ready"].includes(v?.kind)) {
            const captured = captureMemoryDiagnostic(memoryDiagnostic,v,phase);
            if(!captured.ok) failure ??= {phase,code:captured.code};
            // The old one-second series/grader sees exactly its prior fields.
            const {memoryDiagnostic: ignoredMemoryDiagnostic,...regularSample}=v;
            if(captured.ok)memorySampleSequences.set(regularSample,v.memoryDiagnostic.sequence);
            v=regularSample;
            lastSample = v;
            if (!samples.length || performance.now() - samples.at(-1).parentAt >= 1000)
                samples.push({ ...v, parentAt: performance.now(), phase });
        }
        if (v?.requestId && waiters.has(v.requestId)) {
            waiters.get(v.requestId)(v);
            waiters.delete(v.requestId);
        }
        if (v?.kind === "childFailure")
            failure ??= { phase, code: v.code };
        if(v?.kind==="memoryDiagnosticTerminal") {
            const terminal=captureMemoryDiagnosticTerminal(memoryDiagnostic,v.lastSequence);
            if(!terminal.ok)failure??={phase,code:terminal.code};
            else {
                const ackFailed=()=>{memoryDiagnostic.terminalError="MEMORY_DIAGNOSTIC_TERMINAL_ACK_FAILED";failure??={phase,code:"MEMORY_DIAGNOSTIC_TERMINAL_ACK_FAILED"};};
                try {child.send({kind:"memoryDiagnosticTerminalAck",lastSequence:v.lastSequence},error=>{if(error)ackFailed();});} catch {ackFailed();}
            }
        }
    });
    child.on("error", () => {
        readyReject(new Error("CHILD_PROCESS_ERROR"));
        failure ??= { phase, code: "CHILD_PROCESS_ERROR" };
    });
    child.on("exit", code => {
        if (!closing) {
            failure ??= { phase, code: "CHILD_EXIT_" + code };
            readyReject(new Error("Child exited"));
        }
    });
    child.stderr.on("data", b => stderrBytes += b.length);
    child.stdout.on("data", b => stdoutBytes += b.length);
    const error = code => errors[code] = (errors[code] ?? 0) + 1;
    function countHttp(m, write) {
        const c = httpCounts.get(m.identity) ?? { reads: [], writes: [] };
        c[write ? "writes" : "reads"].push(performance.now());
        httpCounts.set(m.identity, c);
    }
    function rollingMax(times) {
        let left = 0, max = 0;
        for (let right = 0; right < times.length; right++) {
            while (times[right] - times[left] >= 60000)
                left++;
            max = Math.max(max, right - left + 1);
        }
        return max;
    }
    async function rpc(kind, body = {}) {
        const requestId = randomUUID();
        return new Promise((done, reject) => {
            const timer = setTimeout(() => {
                waiters.delete(requestId);
                reject(Object.assign(new Error("IPC_TIMEOUT"), { code: "IPC_TIMEOUT" }));
            }, 10000);
            waiters.set(requestId, v => {
                clearTimeout(timer);
                done(v);
            });
            child.send({ kind, requestId, ...body });
        });
    }
    async function memoryBoundary(name) {
        const index=MEMORY_DIAGNOSTIC_BOUNDARIES.indexOf(name);
        if(index<0)fail("MEMORY_DIAGNOSTIC_BOUNDARY");
        const before=performance.now(),value=await rpc("sample",{memoryBoundary:name});
        memoryDiagnostic.boundaryAwaitOverhead.push([index,performance.now()-before]);
        if(memoryDiagnostic.invalidSamples)fail("MEMORY_DIAGNOSTIC_INVALID_SAMPLE");
        return value;
    }
    async function http(path, m, body) {
        const captureAfterReflection=running;
        if (m && path.startsWith("/api/board/"))
            countHttp(m, body !== undefined);
        const r = await fetch(origin + path, { method: body === undefined ? "GET" : "POST", headers: { Origin: origin, ...(m ? { Cookie: m.cookie, "X-House-Identity": m.identity } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
        const value = await r.json();
        if (!r.ok)
            fail(value.code ?? "HTTP_" + r.status);
        let captureACK;
        if (boardACKLedger && m && body !== undefined && value?.ok && ["/api/board/patch","/api/board/chat","/api/board/asset"].includes(path)) {
            captureACK=()=>recordBoardACK(boardACKLedger,m.identity,path.slice("/api/board/".length),body,value);
            // Bootstrap has no timed delivery intents. Timed writes capture only after reflect.
            if (!captureAfterReflection) {captureACK();captureACK=undefined;}
        }
        return { value, cookie: r.headers.get("set-cookie")?.split(";")[0] ?? m?.cookie, captureACK };
    }
    function reflect(v, elements, chat, sequence, at = performance.now()) {
        if (elements)
            for (const e of elements) {
                const old = v.elements.get(e.id);
                if (!old || e.version > old.version || e.version === old.version && e.versionNonce <= old.versionNonce)
                    v.elements.set(e.id, e);
            }
        if (chat)
            for (const m of chat)
                v.chatIds.add(m.id);
        v.sequence = Math.max(v.sequence ?? 0, sequence ?? 0);
        // Retain the full delivery history for grading; inspect only this
        // view's unresolved targets on the event/HTTP-receipt hot path.
        const pending = pendingByView.get(v.index);
        if (!pending)
            return;
        for (const d of pending) {
            if (d.house !== v.house || !d.pending.has(v.index))
                continue;
            const seen = d.type === "patch" ? (v.elements.get(d.elementId)?.version ?? 0) >= d.version : v.chatIds.has(d.messageId);
            if (seen) {
                d.pending.delete(v.index);
                pending.delete(d);
                latencies[d.slow.has(v.index) ? "slow" : "normal"].push(at - d.at);
            }
        }
        if (!pending.size)
            pendingByView.delete(v.index);
    }
    async function connect(v) {
        v.ready = false;
        if(p.pictureScenario&&v.role==="house"){v.pictureAuthority=null;v.pictureFrames=new Map();}
        // Pending volatile sends belong to the replaced connection, not this one.
        v.pointerPending = false;
        v.motionPending = false;
        v.nextPointer = performance.now() + 50;
        v.nextMotion = performance.now() + 100;
        const socket = io(origin + (v.role === "board" ? "/board" : ""), { autoConnect: false, forceNew: true, reconnection: false, transports: ["websocket"], extraHeaders: { Origin: origin, Cookie: v.cookie }, ...(v.role === "house" ? { auth: { worldVersion: HOUSE_WORLD_VERSION } } : {}) });
        v.socket = socket;
        v.connections++;
        const connectionOrdinal = v.connections;
        socket.on("disconnect", reason => {
            v.disconnectEvents.push({ connectionOrdinal, current: socket === v.socket, reason: String(reason), phase, elapsedSeconds: start ? round((performance.now() - start) / 1000) : null });
            v.disconnects++;
            if (socket !== v.socket)
                return;
            v.ready = false;
            if (!closing && phase!=="startup" && !v.intendedFault) {
                unexpectedDisconnects++;
                error("UNEXPECTED_" + v.role + "_DISCONNECT");
            }
            v.reasons[reason] = (v.reasons[reason] ?? 0) + 1;
        });
        function currentBoard(r){if(r?.schemaVersion!==1){scopeErrors++;return false;}if(!v.subscriptionId||r.subscriptionId!==v.subscriptionId){staleFramesIgnored++;return false;}if(r.houseId!==houses[v.house].id){scopeErrors++;return false;}return true;}
        socket.on("board.patch", r => {
            if (currentBoard(r)) {
                reflect(v, r.elements, null, r.sequence);
                v.patchEvents++;
            }
        });
        socket.on("board.chat", r => {
            if (currentBoard(r)) {
                reflect(v, null, [r.message], r.sequence);
                v.chatEvents++;
            }
        });
        socket.on("board.snapshot", r => {
            if (currentBoard(r)) {
                reflect(v, r.elements, r.chat, r.sequence);
                v.snapshots++;
            }
        });
        socket.on("board.presence", r => {
            if (currentBoard(r))
                v.presences++;
        });
        socket.on("board.revoked", () => v.revoked++);
        socket.on("house.snapshot", r => {
            if (v.socket !== socket)
                return;
            if (p.gameScenario) {
                if (r?.worldVersion !== HOUSE_WORLD_VERSION || r.durable?.house?.id !== houses[v.house].id || r.durable?.selfId !== v.identity) { scopeErrors++; return; }
                rememberGameProjection(v, r.durable.game);
            }
            v.snapshot = r;
            if (p.pictureScenario && (!spatial || !v.spatialSubscribing && r.durable.zoneId === "lounge")) capturePicture(v,r);
            v.generation = r.generation;
            v.houseSnapshots++;
        });
        socket.on("house.motion", () => {
            if (v.socket === socket)
                v.houseMotions++;
        });
        await new Promise((done, reject) => {
            const timer = setTimeout(() => reject(Object.assign(new Error("CONNECT_TIMEOUT"), { code: "CONNECT_TIMEOUT" })), 5000);
            socket.once("connect", () => {
                clearTimeout(timer);
                done();
            });
            socket.once("connect_error", e => {
                clearTimeout(timer);
                reject(Object.assign(e, { code: e.data?.code ?? "CONNECT_ERROR" }));
            });
            socket.connect();
        });
        if (v.role === "board") {
            const r = ok(await socket.timeout(5000).emitWithAck("board.subscribe", { houseId: houses[v.house].id }));
            if(r.schemaVersion!==1||r.snapshot.schemaVersion!==1||r.snapshot.subscriptionId!==r.subscriptionId||r.snapshot.houseId!==houses[v.house].id)fail("BOARD_SUBSCRIPTION_SCOPE_MISMATCH");
            v.recoveryCheckpoint = checkpointFromSnapshot(r.snapshot);
            v.receiptsAtCheckpoint = [...writeJobs];
            v.subscriptionId = r.subscriptionId;
            v.elements = new Map();
            v.chatIds = new Set();
            reflect(v, r.snapshot.elements, r.snapshot.chat, r.snapshot.sequence);
            v.files = r.snapshot.files;
            v.initialSnapshotBytes = Buffer.byteLength(JSON.stringify(r));
            stats.initialSnapshots++;
        }
        else {
            const r = ok(await socket.timeout(5000).emitWithAck("house.subscribe", { zoneId: "lounge", controllerToken: v.token }));
            if (!r.snapshot.controller)
                fail("NOT_CONTROLLER");
            if(r.snapshot.durable.house.id!==houses[v.house].id||r.snapshot.durable.selfId!==v.identity)fail("HOUSE_SCOPE_MISMATCH");
            v.snapshot = r.snapshot;
            v.serverEpoch=r.snapshot.serverEpoch; v.pictureIntentSequence=0;
            if (p.pictureScenario) {
                v.pictureAuthority=capturePictureAuthority(r.snapshot);
                const admission={houseIndex:v.house,memberIndex:v.memberIndex,viewIndex:v.index,connectionOrdinal:v.connections,...pictureAuthorityEvidence(v.pictureAuthority)};
                const previous=pictureEvidence.admissions.findIndex(a=>a.viewIndex===v.index);
                if(previous<0)pictureEvidence.admissions.push(admission);else pictureEvidence.admissions[previous]=admission;
                capturePicture(v,r.snapshot);
            }
            if (p.gameScenario) rememberGameProjection(v, r.snapshot.durable.game);
            v.generation = r.snapshot.generation;
            const own = r.snapshot.players.find(a => a.id === v.identity);
            v.x = own.x;
            v.z = own.z;
            v.motionSequence = 0;
        }
        v.ready = true;
        v.eligibleAt = performance.now();
    }
    function newView(m, house, role) {
        const v = { ...m, house, role, index: views.length, token: randomUUID(), connections: 0, disconnects: 0, reasons: {}, disconnectEvents: [], ready: false, intendedFault: false, elements: new Map(), chatIds: new Set(), sequence: 0, patchEvents: 0, chatEvents: 0, snapshots: 0, presences: 0, houseSnapshots: 0, houseMotions: 0, revoked: 0, motionSent: 0, pointerSent: 0, normalMotionSent: 0, normalPointerSent: 0, motionPending: false, pointerPending: false, writePending: false, eligibleMs: 0, writerVersion: 1, saved: 0, skipped: 0,chatSkipped:0 };
        views.push(v);
        return v;
    }
    function launch(fn) {
        const job = Promise.resolve().then(fn).catch(e => {
            error(e.code ?? "WORKLOAD_FAILURE");
            failure ??= { phase, code: e.code ?? "WORKLOAD_FAILURE", ackCategory: resourceFailureCategory(e) };
        }).finally(() => jobs.delete(job));
        jobs.add(job);
        return job;
    }
    function delivery(house, type, details, at) {
        const targets = views.filter(v => v.role === "board" && v.house === house), d = { house, type, ...details, at, pending: new Set(targets.map(v => v.index)), slow: new Set(targets.filter(v => v.intendedFault).map(v => v.index)) };
        deliveries.set(randomUUID(), d);
        for (const v of targets) {
            let pending = pendingByView.get(v.index);
            if (!pending)
                pendingByView.set(v.index, pending = new Set());
            pending.add(d);
        }
        return d;
    }
    const writeJobs = new Set();
    function write(v, chat = false) {
        const job = performWrite(v, chat);
        writeJobs.add(job);
        job.then(() => writeJobs.delete(job), () => writeJobs.delete(job));
        return job;
    }
    async function performWrite(v, chat = false) {
        const h = houses[v.house], at = performance.now();
        let response;
        if (chat) {
            const id = randomUUID(), d = delivery(v.house, "chat", { messageId: id }, at), r = ok((response = await http("/api/board/chat", v, { id, houseId: h.id, text: ("Synthetic scheduled message " + h.chatSerial++).padEnd(4000, "c") })).value);
            stats.chatSaved++;
            h.expectedChat.set(id, r.sequence);
            h.receiptJournal.push({ type: "chat", id, sequence: r.sequence });
            d.sequence = r.sequence;
        }
        else {
            const base = h.elements.find(e => e.id === "text_" + v.memberIndex), next = { ...base, version: ++v.writerVersion, versionNonce: 100 + v.writerVersion, updated: 1000 + v.writerVersion, text: ("Synthetic house "+v.house+" member "+v.memberIndex+" revision " + v.writerVersion + "\n").padEnd(11000, "n") };
            next.originalText = next.text;
            const d = delivery(v.house, "patch", { elementId: next.id, version: next.version }, at);
            stats.patchScheduled++;
            const r = ok((response = await http("/api/board/patch", v, { id: randomUUID(), houseId: h.id, elements: [next] })).value);
            stats.patchSaved++;
            v.saved++;
            h.expectedVersions.set(next.id, next.version);h.expectedElements.set(next.id,next);
            h.receiptJournal.push({ type: "patch", sequence: r.sequence, elements: r.elements.map(e => ({ id: e.id, version: e.version })) });
            d.sequence = r.sequence;
        }
        for (const peer of views.filter(a => a.role === "board" && a.house === v.house))
            reflect(peer, null, null, peer.sequence);
        // Preserve the existing HTTP/event reflection timing points before digest work.
        response?.captureACK?.();
    }
    async function playGameRound(houseIndex, roundIndex) {
        const scenario = p.gameScenario, neutral = scenario.neutralRoundIndices.includes(roundIndex);
        const actors = scenario.playerMemberIndices.map(memberIndex => views.find(v => v.role === "house" && v.house === houseIndex && v.memberIndex === memberIndex));
        const h = houses[houseIndex], steps = gameStepPlan(neutral), startOffset = scenario.roundStartsSeconds[roundIndex];
        const expected = { revision: h.gameRevision ?? 0, rosterRevision: h.gameRosterRevision ?? 0, roundId: null, status: "waiting", players: [null, null], ready: [false, false], cells: Array(42).fill(null), turn: 0, lastMove: null };
        const old = actors[0].snapshot.durable.game;
        if (!old || old.current !== null || old.revision !== expected.revision || old.rosterRevision !== expected.rosterRevision) fail("GAME_ROUND_INITIAL_STATE");
        for (const [stepIndex, step] of steps.entries()) {
            const scheduledOffsetSeconds = startOffset + stepIndex * scenario.actionIntervalSeconds;
            while (performance.now() < start + scheduledOffsetSeconds * 1000) await timerDelay(Math.max(1, start + scheduledOffsetSeconds * 1000 - performance.now()), undefined, { signal: cancellation.signal });
            const at = performance.now(), sendLagMs = at - start - scheduledOffsetSeconds * 1000;
            if (sendLagMs > scenario.maximumScheduleLagMs) fail("GAME_ACTION_DEADLINE");
            const actor = actors[step.slot], targetIndices = gameTargetIndices(houseIndex, scheduledOffsetSeconds, p.slowReader);
            const targets = targetIndices.map(i => views[i]);
            if (targets.some(v => !v || !v.ready || !v.socket.connected || v.intendedFault)) fail("GAME_READABLE_TARGET_UNAVAILABLE");
            const entry = { houseIndex, roundIndex, stepIndex, type: step.type, slot: step.slot, scheduledOffsetSeconds, sendLagMs: round(sendLagMs), targetIndices, observed: [], status: "PENDING" };
            gameEvidence.actions.push(entry);
            const payload = { roundId: expected.roundId };
            if (step.type === "ready") payload.rosterRevision = expected.rosterRevision;
            if (step.type === "move") payload.column = step.column;
            const command = { commandId: randomUUID(), type: "game." + step.type, houseId: h.id, payload, ...(["join", "move"].includes(step.type) ? { expectedRevision: expected.revision } : {}) };
            const receipt = ok(await actor.socket.timeout(5000).emitWithAck("house.command", { generation: actor.generation, zoneId: "lounge", command }));
            entry.status = "ACCEPTED"; entry.code = receipt.result?.code; entry.revision = receipt.entityRevision;
            if (stepIndex === 0) {
                if (typeof receipt.result?.roundId !== "string") fail("GAME_ROUND_ID_MISSING");
                expected.roundId = receipt.result.roundId;
            }
            expected.revision++;
            if (step.type === "join") { expected.players[step.slot] = actor.identity; expected.rosterRevision++; }
            else if (step.type === "ready") {
                expected.ready[step.slot] = true;
                if (expected.ready.every(Boolean)) { expected.status = "active"; expected.ready = [false, false]; }
            } else if (step.type === "move") {
                let row = 5; while (row >= 0 && expected.cells[row * 7 + step.column] !== null) row--;
                if (row < 0) fail("GAME_INVALID_REGISTERED_COLUMN");
                expected.cells[row * 7 + step.column] = step.slot;
                expected.lastMove = { row, column: step.column, slot: step.slot };
                expected.turn = 1 - step.slot;
            }
            if (step.code === "win" || step.type === "leave") {
                expected.status = "terminal"; expected.rosterRevision++;
                expected.reason = step.type === "leave" ? "player_left" : "win"; expected.winner = step.type === "leave" ? null : 0;
            }
            if (receipt.entityRevision !== expected.revision || receipt.result?.roundId !== expected.roundId || receipt.result?.code !== step.code) fail("GAME_RECEIPT_MISMATCH");
            const deadline = performance.now() + 5000;
            while (targets.some(v => !v.gameFrames?.has(expected.revision)) && performance.now() < deadline) await sleep(10);
            for (const v of targets) {
                const frame = v.gameFrames?.get(expected.revision);
                if (!frame) fail("GAME_PROJECTION_TIMEOUT");
                if (!gameProjectionMatches(frame.game, expected)) fail("GAME_PROJECTION_MISMATCH");
                entry.observed.push({ viewIndex: v.index, latencyMs: round(frame.at - at), gameHash: frame.hash });
            }
            entry.gameHash = entry.observed[0].gameHash;
            if (entry.observed.some(o => o.gameHash !== entry.gameHash)) fail("GAME_PROJECTION_DIVERGED");
            entry.status = "VISIBLE";
        }
        h.gameRevision = expected.revision; h.gameRosterRevision = expected.rosterRevision;
        gameEvidence.rounds.push({ houseIndex, roundIndex, outcome: neutral ? "player_left" : "win", actions: steps.length, finalRevision: expected.revision });
        gameEvidence.storage.push({ phase: "round-finish", houseIndex, roundIndex, elapsedSeconds: round((performance.now() - start) / 1000), ...cleanSample(await rpc("storage")) });
    }
    function capturePicture(v,snapshot) {
        if(!v.pictureAuthority)return;
        const h=houses[v.house],frame=normalizePictureFrame(snapshot,{houseIndex:v.house,houseId:h.id,selfId:v.identity,memberIds:h.members.map(m=>m.identity),...v.pictureAuthority});
        if(!frame.scopeValid||frame.placements.some(e=>e.memberIndex<0))pictureEvidence.invalidFrames++;
        v.pictureFrames??=new Map();
        const key=frame.roundHash+":"+frame.puzzleRevision+":"+frame.rosterRevision,prior=v.pictureFrames.get(key);
        if(prior&&JSON.stringify(prior.frame)!==JSON.stringify(frame))pictureEvidence.conflictingFrames++;
        if(!prior)v.pictureFrames.set(key,{frame,at:performance.now()});
    }
    async function observePicture(entry,expected,targets,at) {
        const deadline=performance.now()+5000;
        while(performance.now()<deadline) {
            if(expected.rosterRevision===undefined) {
                const candidate=[...(targets[0].pictureFrames?.values()??[])].find(o=>o.at>=at&&pictureFrameMatches(o.frame,expected));
                if(candidate)expected.rosterRevision=candidate.frame.rosterRevision;
            }
            if(expected.rosterRevision!==undefined) {
                const observed=targets.map(v=>({v,observation:[...(v.pictureFrames?.values()??[])].find(o=>o.at>=at&&pictureFrameMatches(o.frame,expected))}));
                if(observed.every(o=>o.observation)) {
                    entry.observed=observed.map(({v,observation})=>({viewIndex:v.index,latencyMs:round(observation.at-at),frame:observation.frame}));
                    entry.rosterRevision=expected.rosterRevision;entry.status="VISIBLE";return;
                }
            }
            await sleep(10);
        }
        fail("PICTURE_PROJECTION_TIMEOUT");
    }
    async function playPicture(houseIndex) {
        const scenario=p.pictureScenario,h=houses[houseIndex],targets=Array.from({length:6},(_,m)=>views[houseIndex*12+2*m]);
        const plan=picturePlan(scenario),participants=new Map(),selfHashes=Array(6).fill(null),placements=[];
        let roundId=null,roundHash=null,rosterHead=null;
        if(targets[0].snapshot.durable.puzzle?.current!==null||targets[0].snapshot.durable.puzzle?.revision!==0)fail("PICTURE_INITIAL_STATE");
        for(const [stepIndex,step] of plan.entries()) {
            while(performance.now()<start+step.atSeconds*1000)await timerDelay(Math.max(1,start+step.atSeconds*1000-performance.now()),undefined,{signal:cancellation.signal});
            const at=performance.now(),sendLagMs=at-start-step.atSeconds*1000;
            if(sendLagMs>scenario.maximumScheduleLagMs||step.type==="place"&&sendLagMs>=scenario.placementIntervalSeconds*1000)fail("PICTURE_ABSOLUTE_DEADLINE");
            if(targets.some(v=>!v.ready||!v.socket.connected||v.intendedFault))fail("PICTURE_TARGET_UNAVAILABLE");
            const actor=targets[step.memberIndex],entry={houseIndex,stepIndex,type:step.type,memberIndex:step.memberIndex,scheduledOffsetSeconds:step.atSeconds,sendLagMs:round(sendLagMs),status:"PENDING",observed:[]};
            pictureEvidence.actions.push(entry);
            const expected={houseIndex,puzzleRevision:1,roundHash,illustrationId:scenario.illustrationId,illustrationVersion:scenario.illustrationVersion,illustrationDigest:scenario.illustrationDigest,completed:false,placements,rosterMembers:[],selfHashes,rosterRevision:rosterHead,authorities:targets.map(v=>pictureAuthorityEvidence(v.pictureAuthority))};
            if(step.type==="start") {
                const snapshot=actor.snapshot;
                entry.beforeRosterRevision=snapshot.puzzleRoster.revision;
                const command={commandId:randomUUID(),houseId:h.id,type:"puzzle.start",expectedRevision:snapshot.durable.puzzle.revision,payload:{expectedRoundId:snapshot.durable.puzzle.current?.id??null,illustrationId:scenario.illustrationId,illustrationVersion:scenario.illustrationVersion,confirmUnfinished:false,authority:{serverEpoch:snapshot.serverEpoch,accessGeneration:snapshot.accessGeneration,generation:snapshot.generation},expectedRoster:{serverEpoch:snapshot.puzzleRoster.serverEpoch,revision:snapshot.puzzleRoster.revision}}};
                const ack=ok(await actor.socket.timeout(5000).emitWithAck("house.command",{generation:actor.generation,zoneId:"lounge",command}));
                if(ack.entityRevision!==1||ack.result?.puzzleRevision!==1||typeof ack.result.roundId!=="string")fail("PICTURE_START_ACK");
                roundId=ack.result.roundId;roundHash=hash(Buffer.from(roundId));entry.ack={ok:true,entityRevision:ack.entityRevision,puzzleRevision:ack.result.puzzleRevision,roundHash};
                Object.assign(expected,{roundHash,rosterRevision:undefined,minimumRosterRevision:entry.beforeRosterRevision});
            } else if(step.type==="join") {
                const snapshot=actor.snapshot,request={generation:actor.generation,zoneId:"lounge",serverEpoch:snapshot.serverEpoch,accessGeneration:snapshot.accessGeneration,intentSequence:++actor.pictureIntentSequence,requestId:randomUUID(),roundId,mode:"join"};
                const ack=ok(await actor.socket.timeout(5000).emitWithAck("house.puzzle.intent",request));
                entry.requestHash=hash(Buffer.from(request.requestId));entry.ack=puzzleIntentACK(ack,request);participants.set(step.memberIndex,ack.participationId);selfHashes[step.memberIndex]=entry.ack.participationHash;
                if(entry.ack.rosterRevision<=rosterHead)fail("PICTURE_ROSTER_NOT_ADVANCED");
                Object.assign(expected,{rosterRevision:entry.ack.rosterRevision,rosterMembers:Array.from({length:step.memberIndex+1},(_,i)=>i)});
            } else {
                const pieceIndex=stepIndex-7,revision=pieceIndex+2;
                const command={commandId:randomUUID(),houseId:h.id,type:"puzzle.place",payload:{roundId,participationId:participants.get(step.memberIndex),pieceId:step.pieceId,destination:step.destination}};
                const ack=ok(await actor.socket.timeout(5000).emitWithAck("house.command",{generation:actor.generation,zoneId:"lounge",command}));
                if(ack.entityRevision!==revision||ack.result?.puzzleRevision!==revision||ack.result.roundId!==roundId||ack.result.pieceId!==step.pieceId||ack.result.destination!==step.destination||ack.result.completed!==(pieceIndex===23))fail("PICTURE_PLACEMENT_ACK");
                entry.pieceId=step.pieceId;entry.destination=step.destination;entry.ack={ok:true,entityRevision:ack.entityRevision,puzzleRevision:ack.result.puzzleRevision,roundHash,pieceId:ack.result.pieceId,destination:ack.result.destination,completed:ack.result.completed};
                placements.push({pieceId:step.pieceId,destination:step.destination,memberIndex:step.memberIndex});
                Object.assign(expected,{puzzleRevision:revision,rosterMembers:[0,1,2,3,4,5]});
                if(pieceIndex===23){expected.completed=true;expected.rosterMembers=[];expected.selfHashes=Array(6).fill(null);expected.rosterRevision=undefined;expected.minimumRosterRevision=rosterHead;}
            }
            entry.roundHash=roundHash;entry.status="ACCEPTED";
            await observePicture(entry,expected,targets,at);
            rosterHead=entry.rosterRevision;
        }
    }
    const cancellation=new AbortController();
    let slowEvidence = null, negativeEvidence = null;
    let motionTimer, pointerTimer, writeTimer, freezeTimer, progressTimer;
    try {
        await Promise.race([ready, sleep(15000).then(() => fail("STARTUP_TIMEOUT"))]);
        if(memoryDiagnostic.invalidSamples)fail("MEMORY_DIAGNOSTIC_INVALID_SAMPLE");
        phase = "bootstrap";
        if (!(await http("/healthz")).value.ok)
            fail("HEALTH_START");
        const elements = scene(), sceneBytes = Buffer.byteLength(JSON.stringify(elements)), images = [png(101), png(102)];
        if (sceneBytes < p.fixture.sceneMinBytes || sceneBytes > p.fixture.sceneMaxBytes || elements.length > 2000 || elements.some(e => Buffer.byteLength(JSON.stringify(e)) > 32768))
            fail("INVALID_SCENE_FIXTURE");
        if (images.some(b => b.length < p.fixture.imageMinBytes || b.length > 2097152))
            fail("INVALID_IMAGE_FIXTURE");
        for (let h = 0; h < 2; h++) {
            const members = [], house = { index: h, id: null, code: null, elements:scene(h), images:[png(101+h*100),png(102+h*100)], expectedVersions: new Map(), expectedElements:new Map(), expectedChat: new Map(), receiptJournal: [], seedChat: [], chatSerial: 0 };
            houses.push(house);
            house.members=members;
            await memoryBoundary("fixture.seed.before");
            for (let n = 0; n < 6; n++) {
                const opened = await http("/api/house/me"), member = { cookie: opened.cookie, identity: opened.value.identity.id, memberIndex: n };
                await http("/api/house/command", member, { commandId: randomUUID(), type: n === 0 ? "house.create" : "house.join", payload: { ...(n === 0 ? { capacity: 6 } : { code: house.code }), name: "Synthetic resident " + n, colour: ["sage", "blue", "rose", "amber", "peach", "lavender"][n] } });
                const me = (await http("/api/house/me", member)).value;
                if (n === 0) {
                    house.id = me.home.id;
                    house.code = me.home.code;
                }
                members.push(member);
            }
            for (let n = 0; n < 2; n++)
                ok((await http("/api/board/asset", members[n], { id: randomUUID(), houseId: house.id, file: { id: "resource_png_" + n, mimeType: "image/png", dataURL: "data:image/png;base64," + house.images[n].toString("base64") } })).value);
            await memoryBoundary("fixture.assets.after");
            let batch = [], batches = 0;
            async function submit() {
                if (!batch.length)
                    return;
                const body = { id: randomUUID(), houseId: house.id, elements: batch };
                if (Buffer.byteLength(JSON.stringify(body)) > 131072)
                    fail("INVALID_PATCH_FIXTURE");
                ok((await http("/api/board/patch", members[batches++ % 6], body)).value);
                batch = [];
            }
            for (const e of house.elements) {
                if (Buffer.byteLength(JSON.stringify([...batch, e])) > 110000)
                    await submit();
                batch.push(e);
            }
            await submit();
            await memoryBoundary("fixture.elements.after");
            for (let n = 0; n < 100; n++)
                ok((await http("/api/board/chat", members[n % 6], { id: randomUUID(), houseId: house.id, text: ("Synthetic retained message " + n).padEnd(4000, "c") })).value);
            await memoryBoundary("fixture.chat.after");
            const saved = (await http("/api/board/snapshot?houseId=" + house.id, members[0])).value;
            house.seedChat = saved.chat.map(m => ({ id: m.id, sequence: m.sequence }));
            house.fixture = { elements: elements.length, sceneBytes, chatMessages: saved.chat.length, chatBytes: Buffer.byteLength(JSON.stringify(saved.chat)), files: saved.files.length, snapshotBytes: Buffer.byteLength(JSON.stringify(saved)), imageBytes: house.images.map(b => b.length), imageSHA256: house.images.map(hash), patchBatches: batches };
            if (saved.chat.length !== 100 || saved.files.length !== 2 || saved.files.some(f => Object.hasOwn(f, "dataURL")))
                fail("FIXTURE_SNAPSHOT_MISMATCH");
            await memoryBoundary("fixture.snapshot.after");
            await memoryBoundary("subscriptions.before");
            for (const m of members) {
                const controller = newView(m, h, "house");
                await connect(controller);
                ok(await controller.socket.timeout(3000).emitWithAck("house.availability", { generation: controller.generation, value: "chat" }));
                await connect(newView(m, h, "board"));
            }
            await memoryBoundary("subscriptions.after");
        }
        const boardViews = views.filter(v => v.role === "board");
        await memoryBoundary("asset-fanout.before");
        await Promise.all(boardViews.map(async (v) => {
            for (let n = 0; n < 2; n++) {
                countHttp(v, false);
                const r = await fetch(origin + v.files[n].url, { headers: { Origin: origin, Cookie: v.cookie }, signal: AbortSignal.timeout(10000) });
                if (!r.ok)
                    fail("ASSET_READ_FAILED");
                const b = Buffer.from(await r.arrayBuffer());
                if (hash(b) !== hash(houses[v.house].images[n]))
                    fail("ASSET_BYTES_CHANGED");
                stats.assetReads++;
                stats.assetBytesRead += b.length;
            }
        }));
        await sleep(100);
        const initial = await memoryBoundary("asset-fanout.after");
        if (initial.houseViews !== 12 || initial.boardViews !== 12 || initial.activeEngines !== 24 || views.some(v => !v.socket.connected))
            fail("INITIAL_VIEW_COUNT");
        phase = "invalid-ack-negative";
        await memoryBoundary("invalid-ack.before");
        const negative = boardViews.at(-1);
        negative.intendedFault = true;
        const prior = negative.disconnects;
        await rpc("negative", { socketId: negative.socket.id });
        for (let n = 0; n < 100; n++) {
            stats.invalidSent++;
            negative.socket.emit("board.pointer", { subscriptionId: negative.subscriptionId, x: null, y: 0 }, () => stats.invalidAcked++);
        }
        for (let n = 0; n < 40 && negative.socket.connected; n++)
            await sleep(25);
        const negativeSample = await memoryBoundary("invalid-ack.after");
        negativeEvidence = { requests: 100, transportFault: "server writable=false diagnostic", closed: negative.disconnects > prior, queuePacketsPeak: negativeSample.queues.board.packets, queueBytesPeak: negativeSample.queues.board.bytes };
        if (!negativeEvidence.closed || negativeEvidence.queuePacketsPeak > 8 || negativeEvidence.queueBytesPeak > 4194304)
            fail("INVALID_ACK_BOUND_FAILURE");
        await memoryBoundary("rejoin.before");
        negative.socket.disconnect();
        await connect(negative);
        negative.intendedFault = false;
        await memoryBoundary("rejoin.after");
        if (p.spatialScenario) {
            spatial = createSpatialWorkload({ origin, scenario:p.spatialScenario, signal:cancellation.signal, rpc, houses, views,rateAttribution:p.rateAttribution,
                onSubscribe(v,snapshot) {
                    v.snapshot=snapshot;v.generation=snapshot.generation;v.serverEpoch=snapshot.serverEpoch;
                    rememberGameProjection(v,snapshot.durable.game);
                    if(snapshot.durable.zoneId==="lounge") {
                        v.pictureAuthority=capturePictureAuthority(snapshot);
                        v.pictureFrames=new Map();
                        const admission={houseIndex:v.house,memberIndex:v.memberIndex,viewIndex:v.index,connectionOrdinal:v.connections,...pictureAuthorityEvidence(v.pictureAuthority)};
                        const index=pictureEvidence.admissions.findIndex(row=>row.viewIndex===v.index);
                        if(index<0)fail("SPATIAL_ADMISSION_MISSING");pictureEvidence.admissions[index]=admission;
                        capturePicture(v,snapshot);
                    }
                },
                async reconnect(v) {
                    v.intendedFault=true;
                    if(v.eligibleAt)v.eligibleMs+=performance.now()-v.eligibleAt;
                    v.socket.disconnect();
                    const deadline=performance.now()+5000;
                    while((await rpc("sample")).houseViews!==11) {if(performance.now()>deadline)fail("SPATIAL_OLD_CONTEXT_NOT_RELEASED");await sleep(25);}
                    await connect(v);v.intendedFault=false;
                }
            });
            await memoryBoundary("spatial.prepare.before");
            if(p.rateAttribution)freeze(p,protocolHash);
            await spatial.prepare();
            if(p.rateAttribution)freeze(p,protocolHash);
            await memoryBoundary("spatial.prepare.after");
        }
        if (p.storageAcceptance || p.gameScenario) {
            const baseline=cleanSample(await rpc("storage"));
            if (storageEvidence) storageEvidence.baseline=baseline;
            if (gameEvidence) gameEvidence.storage.push({phase:"baseline",...baseline});
        }
        if (calibration) {
            phase = "calibration-finish";
            start = performance.now();
            spatial?.begin(start);
            end = start;
        }
        else {
            phase = "measurement";
            running = true;
            start = performance.now();
            spatial?.begin(start);
            progressTimer = setInterval(() => process.stdout.write(JSON.stringify({ status: "RUNNING", elapsedSeconds: round((performance.now() - start) / 1000), phase, rssMiB: lastSample?.rssMiB, rssPeakMiB: lastSample?.rssPeakMiB, houseViews: lastSample?.houseViews, boardViews: lastSample?.boardViews, patchSaved: stats.patchSaved, chatSaved: stats.chatSaved, unexpectedDisconnects }) + "\n"), 30000);
            const duration = p.durationSeconds * 1000;
            for (const v of views) {
                v.eligibleAt = start;
                v.nextMotion = start + 100 + (v.index % 12) * 8;
                v.nextPointer = start + 50 + (v.index % 12) * 4;
                v.nextWrite = start + 500 + (v.index % 12) * 35;
                v.nextChat = start + 5000 + (v.index % 12) * 300;
            }
            motionTimer = setInterval(() => {
                const now = performance.now();
                spatial?.sampleMotion(now);
                for (const v of views) {
                    if (v.role !== "house" || !resourceMotionDue(v, now))
                        continue;
                    if (!v.ready || v.motionPending && !v.intendedFault || !v.socket.connected)
                        continue;
                    if (spatial && !spatial.shouldMove(v)) continue;
                    v.motionPending = true;
                    v.motionSent++;
                    if (!v.intendedFault)
                        v.normalMotionSent++;
                    stats.motionSent++;
                    const socket = v.socket, generation = v.generation, point = spatial ? spatial.motionTarget(v) : {x:v.x,z:v.z};
                    launch(async () => {
                        try {
                            const r = await socket.timeout(5000).emitWithAck("house.move", { generation, sequence: ++v.motionSequence, x: point.x, z: point.z, heading: 0 });
                            if (r?.ok) {
                                stats.motionOk++;
                                spatial?.motionACK(v,point);
                            }
                            else {
                                stats.motionRejected++;
                                error(r?.code ?? "MOTION_NO_ACK");
                            }
                        }
                        catch {
                            if (v.intendedFault)
                                stats.expectedFaultTimeouts++;
                            else
                                stats.motionTimeouts++;
                        }
                        finally {
                            v.motionPending = false;
                        }
                    });
                }
            }, 5);
            pointerTimer = setInterval(() => {
                const now = performance.now();
                for (const v of views) {
                    if (v.role !== "board" || now < v.nextPointer)
                        continue;
                    v.nextPointer = now + 50;
                    if (!v.ready || v.pointerPending && !v.intendedFault || !v.socket.connected)
                        continue;
                    v.pointerPending = true;
                    v.pointerSent++;
                    if (!v.intendedFault)
                        v.normalPointerSent++;
                    stats.pointerSent++;
                    const pointerSocket = v.socket, pointerSubscription = v.subscriptionId, sentDuringFault = v.intendedFault;
                    launch(async () => {
                        try {
                            const r = await pointerSocket.timeout(5000).emitWithAck("board.pointer", { subscriptionId: pointerSubscription, x: 100 + v.memberIndex, y: 200, selectedElementIds: ["box_" + v.memberIndex] });
                            if (r?.ok)
                                stats.pointerOk++;
                            else {
                                stats.pointerRejected++;
                                error(r?.code ?? "POINTER_NO_ACK");
                            }
                        }
                        catch {
                            if (sentDuringFault || v.intendedFault)
                                stats.expectedFaultTimeouts++;
                            else
                                stats.pointerTimeouts++;
                        }
                        finally {
                            // A late old-connection ACK cannot release a new subscription's send.
                            if (v.socket === pointerSocket && v.subscriptionId === pointerSubscription) {
                                v.pointerPending = false;
                                // Keep the 50 ms / maximum 20 Hz rule after actual normal ACK.
                                // The declared paused-reader fault continues nominal sends.
                                if (!sentDuringFault) v.nextPointer = Math.max(v.nextPointer, performance.now() + 50);
                            }
                        }
                    });
                }
            }, 4);
            writeTimer = setInterval(() => {
                const now = performance.now();
                for (const v of views) {
                    if (v.role !== "board")
                        continue;
                    if (now >= v.nextWrite) {
                        const due=Math.floor((now-v.nextWrite)/500)+1;
                        v.nextWrite+=due*500;
                        if(due>1){v.skipped+=due-1;stats.patchSkipped+=due-1;}
                        if (v.writePending) {
                            v.skipped++;
                            stats.patchSkipped++;
                        }
                        else {
                            v.writePending = true;
                            launch(async () => {
                                try {
                                    await write(v);
                                }
                                catch (e) {
                                    stats.patchRejected++;
                                    throw e;
                                }
                                finally {
                                    v.writePending = false;
                                }
                            });
                        }
                    }
                    if (now >= v.nextChat) {
                        const due=Math.floor((now-v.nextChat)/5000)+1;
                        v.nextChat+=due*5000;
                        if(due>1){v.chatSkipped+=due-1;stats.chatSkipped+=due-1;}
                        launch(() => write(v, true));
                    }
                }
            }, 5);
            freezeTimer = setInterval(() => {
                try {
                    freeze(p, protocolHash);
                }
                catch (e) {
                    failure ??= { phase, code: e.code };
                }
            }, 10000);
            const slowHouse = views.find(v => v.role === "house" && v.house === 0 && v.memberIndex === 0), slowBoard = views.find(v => v.role === "board" && v.house === 0 && v.memberIndex === 0);
            const slowJob = launch(async () => {
                await timerDelay(p.slowReader.pauseAtSeconds * 1000,undefined,{signal:cancellation.signal});
                phase = "slow-reader";
                const pausedAt = performance.now(), generation = slowHouse.generation, received = slowBoard.patchEvents + slowBoard.chatEvents + slowBoard.snapshots;
                for (const v of [slowHouse, slowBoard]) {
                    v.intendedFault = true;
                    v.eligibleMs += pausedAt - v.eligibleAt;
                    const ws = v.socket.io.engine.transport.ws;
                    if (typeof ws?.pause !== "function" || typeof ws?._socket?.isPaused !== "function")
                        fail("TCP_PAUSE_PATH_CHANGED");
                    ws.pause();
                    if (!ws._socket.isPaused())
                        fail("TCP_NOT_PAUSED");
                }
                slowEvidence = { tcpPauseVerified: true, pauseSeconds: p.slowReader.pauseSeconds, role: "one resident with two independent TCP transports", bothDisconnected: false, rejoined: false, generationAdvanced: false, quietAfterExpiry: false, allCommittedRecovered: false };
                await timerDelay(p.slowReader.pauseSeconds * 1000,undefined,{signal:cancellation.signal});
                slowEvidence.readerStayedPaused = slowBoard.patchEvents + slowBoard.chatEvents + slowBoard.snapshots === received;
                slowEvidence.bothDisconnected = !slowHouse.socket.connected && !slowBoard.socket.connected;
                for (const v of [slowHouse, slowBoard]) {
                    try {
                        v.socket.io.engine.transport.ws?.resume();
                    }
                    catch {
                    }
                    v.socket.disconnect();
                    await connect(v);
                }
                slowEvidence.generationAdvanced = slowHouse.generation > generation;
                slowEvidence.quietAfterExpiry = slowHouse.snapshot.players.find(a => a.id === slowHouse.identity)?.availability === "quiet";
                slowEvidence.rejoined = true;
                slowEvidence.allCommittedRecovered = await checkpointRecovered(slowBoard, houses[0]);
                slowEvidence.checkpointSequence = slowBoard.recoveryCheckpoint.sequence;
                slowEvidence.receiptsAtCutoff = houses[0].receiptJournal.filter(r => r.sequence <= slowEvidence.checkpointSequence).length;
                slowEvidence.postCheckpointReceiptsExcluded = houses[0].receiptJournal.filter(r => r.sequence > slowEvidence.checkpointSequence).length;
                for (const v of [slowHouse, slowBoard]) {
                    v.intendedFault = false;
                    v.eligibleAt = performance.now();
                }
                phase = "measurement";
            });
            if (p.gameScenario) {
                gameEvidence.status = "RUNNING";
                for (let houseIndex = 0; houseIndex < 2; houseIndex++) launch(async () => {
                    for (let roundIndex = 0; roundIndex < p.gameScenario.roundStartsSeconds.length; roundIndex++) await playGameRound(houseIndex, roundIndex);
                });
            }
            if (p.pictureScenario) {
                pictureEvidence.status="RUNNING";
                for(let houseIndex=0;houseIndex<2;houseIndex++) launch(()=>playPicture(houseIndex));
            }
            if(spatial) launch(()=>spatial.run());
            while (performance.now() - start < duration) {
                if (failure)
                    break;
                await sleep(Math.min(1000, duration - (performance.now() - start)));
            }
            end = performance.now();
            spatial?.sampleMotion(end);
            running = false;
            for (const timer of [motionTimer, pointerTimer, writeTimer, freezeTimer, progressTimer])
                clearInterval(timer);
            if(failure)cancellation.abort();
            await Promise.all([...jobs]);
            if(failure)fail(failure.code);
            await slowJob;
        }
        if (p.storageAcceptance || p.gameScenario) {
            const finalStorage=cleanSample(await rpc("storage"));
            if(storageEvidence)storageEvidence.final=finalStorage;
            if(gameEvidence){gameEvidence.storage.push({phase:"final",...finalStorage});gameEvidence.status=calibration?"CALIBRATION_GAME_ACTIONS_NOT_RUN":"COMPLETE";}
        }
        if(pictureEvidence)pictureEvidence.status=calibration?"CALIBRATION_PICTURE_NOT_RUN":"COMPLETE";
        phase = "recovery-check";
        await memoryBoundary("recovery.before");
        for (const v of views)
            if (v.eligibleAt && v.ready && !v.intendedFault)
                v.eligibleMs += performance.now() - v.eligibleAt;
        function canonical(value){if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";return JSON.stringify(value);}
        const recovery = [];
        for (const h of houses) {
            const m = views.find(v => v.role === "board" && v.house === h.index), saved = (await http("/api/board/snapshot?houseId=" + h.id, m)).value, versions = new Map(saved.elements.map(e => [e.id, e.version])),actualElements=new Map(saved.elements.map(e=>[e.id,e]));
            recovery.push({ houseIndex: h.index, allSeedIds:h.elements.every(e=>actualElements.has(e.id)), allUnmodifiedElements:h.elements.filter(e=>!h.expectedVersions.has(e.id)).every(e=>canonical(actualElements.get(e.id))===canonical(e)),allLatestPayloads:[...h.expectedElements].every(([id,e])=>canonical(actualElements.get(id))===canonical(e)),tombstones:saved.elements.filter(e=>e.isDeleted).length, allLatestVersions: [...h.expectedVersions].every(([id, ver]) => (versions.get(id) ?? 0) >= ver), allScheduledChat: [...h.expectedChat].sort((a, b) => a[1] - b[1]).slice(-100).every(([id]) => saved.chat.some(m => m.id === id)), files: saved.files.length, metadataOnly: saved.files.every(f => !Object.hasOwn(f, "dataURL")), elements: saved.elements.length, chat: saved.chat.length });
        }
        await sleep(300);
        const final = await memoryBoundary("recovery.after");
        memoryMeasurementEndSequence=memorySampleSequences.get(final);
        memoryMeasurementGateRSSPeakMiB=final.rssPeakMiB;
        lastSample = final;
        const health = (await http("/healthz")).value.ok === true;
        freeze(p, protocolHash);
        const pending = [...deliveries.values()].reduce((n, d) => n + d.pending.size, 0), normalPending = [...deliveries.values()].reduce((n, d) => n + [...d.pending].filter(i => !d.slow.has(i)).length, 0), seconds = (end - start) / 1000;
        const perView = views.map(v => ({ viewIndex: v.index, houseIndex: v.house, role: v.role, connections: v.connections, disconnects: v.disconnects, disconnectReasons: v.reasons, connectedAtEnd: v.socket.connected, eligibleSeconds: round(v.eligibleMs / 1000), motionSent: v.motionSent, motionHz: v.role === "house" && v.eligibleMs ? round(v.normalMotionSent / (v.eligibleMs / 1000)) : null, pointerSent: v.pointerSent, pointerHz: v.role === "board" && v.eligibleMs ? round(v.normalPointerSent / (v.eligibleMs / 1000)) : null, saved: v.saved, skipped: v.skipped, patchEvents: v.patchEvents, chatEvents: v.chatEvents, snapshotEvents: v.snapshots, presenceEvents: v.presences, houseSnapshots: v.houseSnapshots, houseMotions: v.houseMotions, revoked: v.revoked, initialSnapshotWireBytes: v.initialSnapshotBytes ?? null }));
        const httpBudget = [...httpCounts.values()].map((c, n) => ({ actorIndex: n, totalReads: c.reads.length, totalWrites: c.writes.length, rollingReadMax60s: rollingMax(c.reads), rollingWriteMax60s: rollingMax(c.writes) }));
        const gates = { scopedDelivery:scopeErrors===0,inbound:runtime.inboundBytes===16384,httpBudget: httpBudget.every(c => c.rollingReadMax60s <= 240 && c.rollingWriteMax60s <= 240), duration: calibration ? null : seconds >= 300, all24Initial: true, all24Final: final.houseViews === 12 && final.boardViews === 12 && final.activeEngines === 24 && views.every(v => v.socket.connected), rss: final.rssPeakMiB <= 210, boardQueues: final.queues.board.packets <= 8 && final.queues.board.bytes <= 4194304, houseQueues: final.queues.house.packets <= 4 && final.queues.house.bytes <= 2097152, telemetryValid: final.invalidTelemetry === 0, eventLoop: final.eventLoop.p95Ms <= 50 && final.eventLoop.p99Ms <= 100, health, unexpectedDisconnects: unexpectedDisconnects === 0, allNormalDelivered: normalPending === 0, allDeliveredIncludingCatchup: pending === 0, normalP95: latencies.normal.length ? q(latencies.normal, 0.95) <= 1000 : calibration ? null : false, normalInputs: stats.motionRejected === 0 && stats.motionTimeouts === 0 && stats.pointerRejected === 0 && stats.pointerTimeouts === 0 && stats.patchRejected === 0, workload: calibration ? null : stats.patchSkipped === 0 &&stats.chatSkipped===0&& stats.patchSaved >= p.workload.minimumSavedPatches && stats.chatSaved >= p.workload.minimumSavedChat && perView.filter(v => v.role === "house").every(v => v.motionHz >= 9.5 && v.motionHz <= 10.2) && perView.filter(v => v.role === "board").every(v => v.pointerHz >= 18 && v.pointerHz <= 20.5), recovery: recovery.every(r => r.allSeedIds&&r.allUnmodifiedElements&&r.allLatestPayloads&&r.tombstones===20&&r.elements===202&&r.allLatestVersions && r.allScheduledChat && r.files === 2 && r.metadataOnly), negativeAck: negativeEvidence.closed && negativeEvidence.queuePacketsPeak <= 8, slowExpiry: calibration ? null : !!slowEvidence?.readerStayedPaused && slowEvidence.bothDisconnected && slowEvidence.rejoined && slowEvidence.generationAdvanced && slowEvidence.quietAfterExpiry && slowEvidence.allCommittedRecovered };
        if (p.gameScenario) {
            gates.gameActionsAndVisibleRevisions = calibration ? null : gradeGameEvidence(p.gameScenario, p.slowReader, gameEvidence);
            const baseline = gameEvidence.storage[0], finalStorage = gameEvidence.storage.at(-1);
            gates.gameReceiptAndStateGrowth = calibration ? null : finalStorage.gameReceipts.count - baseline.gameReceipts.count === p.gameScenario.expectedActions && finalStorage.gameTables.rows === 2 && finalStorage.gameTables.activeTables === 0 && finalStorage.gameTables.maxStateBytes <= 8192;
        }
        if (spatial) { Object.assign(gates,spatial.finish()); spatial.evidence.originalFullMotionWorkloadGate=gates.workload; gates.workload=spatial.gradeWorkload(stats,perView,p.workload); }
        const result = { ...(spatial ? {spatial:spatial.evidence} : {}), ...(p.gameScenario ? { game: gameEvidence } : {}), ...(pictureEvidence ? {picture:pictureEvidence} : {}), ...(storageEvidence ? {receiptStorage:storageEvidence} : {}), schemaVersion: 1, status: calibration ? "CALIBRATION" : Object.values(gates).every(v => v === true) ? "PASS" : "FAIL", scope: "SYNTHETIC; process RSS, not constrained to Fly", startedAt, finishedAt: new Date().toISOString(), protocolSHA256: protocolHash, sourceManifestSHA256: p.sourceManifestSHA256, instrumentSHA256: p.instrumentSHA256, sourceHashes: p.sourceHashes, runtime, durationSeconds: round(seconds), fixture: houses.map(h => ({ houseIndex: h.index, ...h.fixture })), server: cleanSample(final), samples: samples.map(({ parentAt, ...s }) => ({ ...cleanSample(s), phase: s.phase, elapsedSeconds: start ? round((parentAt - start) / 1000) : null })), stats, httpBudget, perView, delivery: { targets: pending + latencies.normal.length + latencies.slow.length, committedIntents: deliveries.size, observed: latencies.normal.length + latencies.slow.length, normalObserved: latencies.normal.length, slowObserved: latencies.slow.length, pending, normalPending, normalP95Ms: round(q(latencies.normal, 0.95)), normalP99Ms: round(q(latencies.normal, 0.99)), normalMaxMs: round(latencies.normal.length ? Math.max(...latencies.normal) : null), slowP95Ms: round(q(latencies.slow, 0.95)), slowMaxMs: round(latencies.slow.length ? Math.max(...latencies.slow) : null) }, negativeEvidence, slowEvidence, recovery, unexpectedDisconnects,scopeErrors,staleFramesIgnored, errors, gates, stderrBytes, stdoutBytes, limitations: p.limitations };
        finalResult=result;

    }
    catch (e) {
        failure ??= { phase, code: e.code ?? e.name ?? "HARNESS_FAILURE", ackCategory: resourceFailureCategory(e) };
        const status=failureStatus(failure.code);
        finalResult = { ...(spatial ? {spatial:spatial.evidence} : {}), ...(p.gameScenario ? { game: gameEvidence } : {}), ...(pictureEvidence ? {picture:pictureEvidence} : {}), ...(storageEvidence ? {receiptStorage:storageEvidence} : {}), schemaVersion: 1, status, scope: "SYNTHETIC; process RSS, not constrained to Fly", startedAt, finishedAt: new Date().toISOString(), protocolSHA256: protocolHash, sourceManifestSHA256: p.sourceManifestSHA256, instrumentSHA256: p.instrumentSHA256, sourceHashes: p.sourceHashes, runtime, phase, failure, stats, samples: samples.map(({ parentAt, ...sample }) => ({ ...cleanSample(sample), phase: sample.phase, elapsedSeconds: start ? round((parentAt - start) / 1000) : null })), perView: views.map(v => ({ viewIndex: v.index, houseIndex: v.house, role: v.role, connectionOrdinal: v.connections, currentSocketConnected: Boolean(v.socket?.connected), currentSubscriptionKnown: v.role === "board" ? Boolean(v.subscriptionId) : null, currentSnapshotCursor: v.recoveryCheckpoint?.sequence ?? v.snapshot?.durable?.sequence ?? null, ready: v.ready, pointerPending: v.pointerPending, motionPending: v.motionPending, disconnectEvents: v.disconnectEvents })), slowEvidence, fixture: houses.map(h => ({ houseIndex: h.index, ...h.fixture })), server: cleanSample(lastSample), unexpectedDisconnects, errors, stderrBytes, stdoutBytes, limitations: p.limitations };
        process.exitCode = 1;
    }
    finally {
        running = false;
        closing = true;
        cancellation.abort();
        for (const t of [motionTimer, pointerTimer, writeTimer, freezeTimer, progressTimer])
            clearInterval(t);
        // Stop new work first; preserve already-in-flight ACKs while the real
        // sockets/server remain alive. Their original5000ms deadlines still apply.
        if(p.rateAttribution&&spatial)await spatial.drainBootstrapTrace();
        spatial?.close();
        for (const v of views)
            v.socket?.disconnect();
        if(child.connected)child.send({ kind: "stop" });
        await Promise.race([childExit,sleep(5000).then(()=>child.kill("SIGTERM"))]);
        if(child.exitCode===null&&child.signalCode===null)await Promise.race([childExit,sleep(2000).then(()=>child.kill("SIGKILL"))]);
    }
    // No codec verification is performed in the measured server or before its exit.
    if(finalResult) {
        finalResult.processClosure={generatorPID:process.pid,serverPID:child.pid,serverExitCode:child.exitCode,serverSignal:child.signalCode,serverClosed:child.exitCode!==null||child.signalCode!==null};
        try {
            freeze(p,protocolHash);
            if(memoryDiagnostic.invalidSamples)fail("MEMORY_DIAGNOSTIC_INVALID_SAMPLE");
            if(!memoryDiagnostic.rows.length)fail("MEMORY_DIAGNOSTIC_EMPTY_CAPTURE");
            const completion=finalizeMemoryDiagnostic(memoryDiagnostic,memoryMeasurementEndSequence,memoryMeasurementGateRSSPeakMiB);
            if(completion.status!=="VALID")fail(completion.failureCode);
            if(!finalResult.processClosure.serverClosed)fail("RESOURCE_SERVER_CLOSE_TIMEOUT");
            if(child.exitCode!==0)fail("RESOURCE_SERVER_EXIT_FAILED");
            if(storageEvidence && finalResult.gates) {
                storageEvidence.beforeDecodeFiles=databaseFiles(join(dir,"data"));
                storageEvidence.verification=verifyClosedBoardLedger(join(dir,"data/board.sqlite"),boardACKLedger);
                storageEvidence.afterDecodeFiles=databaseFiles(join(dir,"data"));
                finalResult.gates.receiptReplayExact=gradeReceiptReplay(storageEvidence.verification)&&storageEvidence.verification.actualRows===storageEvidence.final.boardReceipts.count;
                finalResult.gates.receiptStoredGrowth=gradeReceiptGrowth(storageEvidence,p.storageAcceptance.maximumGrowthBytes);
                if(p.pictureScenario) {
                    finalResult.gates.pictureActionsAndDelivery=calibration?null:gradePictureEvidence(p.pictureScenario,pictureEvidence);
                    pictureEvidence.persisted=verifyClosedPictureTables(join(dir,"data/house.sqlite"),houses,p.pictureScenario,pictureEvidence);
                    const b=storageEvidence.baseline,f=storageEvidence.final;
                    finalResult.gates.picturePersistenceAndReceipts=calibration?null:pictureEvidence.persisted.allMatch&&f.receipts.count-b.receipts.count===(174+(p.spatialScenario?.media.expectedHouseCommands??0))&&f.puzzleReceipts.count-b.puzzleReceipts.count===50&&f.puzzleTables.rows===2&&f.puzzleTables.completedTables===2&&f.puzzleTables.placements===48&&f.puzzleTables.maxStateBytes<=8192;
                }
                if(spatial) finalResult.gates.spatialPersistenceAndBounds=spatial.verifyClosed(join(dir,"data/house.sqlite"));
                finalResult.status=calibration?"CALIBRATION":Object.values(finalResult.gates).every(v=>v===true)?"PASS":"FAIL";
            }
            freeze(p,protocolHash);
        } catch(e) {
            const status=failureStatus(e.code??e.name);finalResult.status=status;
            if(status==="ABORTED"){if(finalResult.failure)finalResult.preAbortFailure=finalResult.failure;finalResult.failure={phase:"post-close-verification",code:e.code??e.name};}
            else finalResult.failure??={phase:"post-close-verification",code:e.code??e.name};
        }
        finalResult.measurementFinishedAtUTC=finalResult.finishedAt;
        finalResult.finishedAt=new Date().toISOString();
        if(p.rateAttribution&&spatial) {
            try {
                await spatial.drainBootstrapTrace();
                freeze(p,protocolHash);
                const trace=spatial.bootstrapRateTraceArtifact();
                writeFileSync(rateAttributionPath,JSON.stringify(trace)+"\n");
                finalResult.rateAttribution={artifact:relative(root,rateAttributionPath),sha256:hash(readFileSync(rateAttributionPath)),rows:trace.rows.length,status:trace.status,firstFailure:trace.firstFailure};
            } catch(error) {
                const status=failureStatus(error.code??error.name);finalResult.status=status;
                if(status==="ABORTED"&&finalResult.failure){finalResult.preAbortFailure=finalResult.failure;finalResult.failure={phase:"rate-attribution-artifact",code:error.code??error.name};}
                else finalResult.failure??={phase:"rate-attribution-artifact",code:error.code??"RATE_TRACE_WRITE_FAILED"};
            }
        }
        // Child closure precedes compact diagnostic serialization; the resource
        // criteria and original one-second result series remain independent.
        try {
            const diagnostic={...finalizeMemoryDiagnostic(memoryDiagnostic,memoryMeasurementEndSequence,memoryMeasurementGateRSSPeakMiB),protocolSHA256:protocolHash,sourceManifestSHA256:p.sourceManifestSHA256,instrumentSHA256:p.instrumentSHA256,childClosed:finalResult.processClosure.serverClosed};
            writeFileSync(memoryDiagnosticPath,JSON.stringify(diagnostic)+"\n");
            finalResult.memoryDiagnostic={artifact:relative(root,memoryDiagnosticPath),sha256:hash(readFileSync(memoryDiagnosticPath)),status:diagnostic.status,samples:memoryDiagnostic.rows.length,invalidSamples:memoryDiagnostic.invalidSamples,boundaryAwaits:memoryDiagnostic.boundaryAwaitOverhead.length};
        } catch {
            finalResult.status="FAIL";finalResult.failure??={phase:"memory-diagnostic-artifact",code:"MEMORY_DIAGNOSTIC_WRITE_FAILED"};
        }
        writeResult(finalResult);
        process.stdout.write(JSON.stringify({status:finalResult.status,durationSeconds:finalResult.durationSeconds,rssMaxMiB:finalResult.server?.rssPeakMiB,normalP95Ms:finalResult.delivery?.normalP95Ms,gates:finalResult.gates,...(finalResult.failure?{failure:finalResult.failure}:{})})+"\n");
        if(!["PASS","CALIBRATION"].includes(finalResult.status))process.exitCode=1;
    }
}
function cleanSample(v) {
    if (!v)
        return null;
    const { kind, requestId, port, runtime, ...data } = v;
    return data;
}
async function checkpointSelfCheck() {
    const seeds = [{ id: "note", version: 1 }], seedChat = Array.from({ length: 100 }, (_, n) => ({ id: "chat" + n, sequence: n + 1 }));
    const snapshot = { sequence: 200, elements: [{ id: "note", version: 5 }], chat: [...seedChat.slice(1), { id: "recent", sequence: 200 }] };
    const checkpoint = checkpointFromSnapshot(snapshot), journal = [
        { type: "patch", sequence: 150, elements: [{ id: "note", version: 5 }] },
        { type: "chat", sequence: 200, id: "recent" },
        { type: "patch", sequence: 201, elements: [{ id: "note", version: 6 }] },
        { type: "chat", sequence: 202, id: "future" },
    ];
    const grade = c => gradeRecoveredCheckpoint(c, seeds, seedChat, journal);
    const outcomes = { validCutoffWithFutureReceipts: grade(checkpoint) };
    const missingPatch = { ...checkpoint, elements: new Map() }, stalePatch = { ...checkpoint, elements: new Map([["note", 4]]) };
    outcomes.missingCommittedPatchRejected = !grade(missingPatch);
    outcomes.staleCommittedPatchRejected = !grade(stalePatch);
    const missingChat = { ...checkpoint, chatIds: new Set(checkpoint.chatIds) }; missingChat.chatIds.delete("recent");
    outcomes.missingRetainedChatRejected = !grade(missingChat);
    const wrongRetention = { ...checkpoint, chatIds: new Set(seedChat.map(m => m.id)) };
    outcomes.old100InsteadOfLatestRejected = !grade(wrongRetention);
    snapshot.elements[0].version = 999; snapshot.chat.length = 0;
    outcomes.immutableCheckpoint = checkpoint.elements.get("note") === 5 && checkpoint.chatIds.size === 100;
    const lateHouse = { elements: seeds, seedChat, receiptJournal: [{ type: "chat", sequence: 200, id: "recent" }] };
    const late = Promise.resolve().then(() => lateHouse.receiptJournal.push({ type: "patch", sequence: 150, elements: [{ id: "note", version: 5 }] }));
    const lateView = { recoveryCheckpoint: { ...checkpoint, elements: new Map([["note", 4]]) }, receiptsAtCheckpoint: [late] };
    outcomes.lateReceiptBeforeCursorAwaited = !(await checkpointRecovered(lateView, lateHouse));
    outcomes.latest100Positive = grade(checkpoint);
    const pass = Object.values(outcomes).every(Boolean);
    process.stdout.write(JSON.stringify({ status: pass ? "CHECKPOINT_SELF_CHECK_PASS" : "CHECKPOINT_SELF_CHECK_FAIL", outcomes }) + "\n");
    if (!pass) process.exitCode = 1;
}
async function selfCheck(){
 const ts=await import("typescript"),raw=readFileSync(fileURLToPath(import.meta.url),"utf8"),sf=ts.createSourceFile("instrument.mjs",raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let reflectSource,freezeSource,writeSource;
 function scan(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==="reflect")reflectSource=n.getText(sf);if(ts.isFunctionDeclaration(n)&&n.name?.text==="freeze")freezeSource=n.getText(sf);if(ts.isCallExpression(n)&&n.expression.getText(sf)==="setInterval"&&n.arguments[0]?.getText(sf).includes("v.nextWrite"))writeSource=n.arguments[0].getText(sf);ts.forEachChild(n,scan);}scan(sf);
 const outcomes={};
 try{const f=new Function("deliveries","pendingByView","latencies","performance","return ("+reflectSource+");")(new Map(),new Map(),{normal:[],slow:[]},{now:()=>0}),v={elements:new Map(),chatIds:new Set(),sequence:0,house:0,index:0};f(v,[{id:"incoming_probe",version:2,versionNonce:1}],null,1);outcomes.suppliedIncomingApplied=v.elements.has("incoming_probe")&&v.sequence===1;}catch(e){outcomes.suppliedIncomingApplied=false;outcomes.reflectException=e.name;}
 try{const f=new Function("deliveries","pendingByView","latencies","performance","house","return ("+reflectSource+");")(new Map(),new Map(),{normal:[],slow:[]},{now:()=>0},{elements:[{id:"seed_probe",version:1,versionNonce:1}]}),v={elements:new Map(),chatIds:new Set(),sequence:0,house:0,index:0};f(v,[{id:"incoming_probe",version:2,versionNonce:1}],null,1);outcomes.seedCannotSubstituteIncoming=v.elements.has("incoming_probe")&&!v.elements.has("seed_probe");}catch{outcomes.seedCannotSubstituteIncoming=false;}
 let clock=14000,calls={patch:0,chat:0};const stats={patchSkipped:0,chatSkipped:0},v={role:"board",nextWrite:500,nextChat:5000,writePending:false,skipped:0,chatSkipped:0};const callback=new Function("performance","views","stats","launch","write","return ("+writeSource+");")({now:()=>clock},[v],stats,fn=>void fn(),async(_v,chat=false)=>{calls[chat?"chat":"patch"]++;});callback();await Promise.resolve();clock++;callback();await Promise.resolve();outcomes.collapsedDeadlinesCounted=stats.patchSkipped===27&&stats.chatSkipped===1&&v.nextWrite===14500&&v.nextChat===15000&&calls.patch===1&&calls.chat===1;
 const contents={"/fixture/runtime.ts":Buffer.from("runtime stable"),instrument:Buffer.from("instrument stable"),protocol:Buffer.from("changed criteria")},reads=[],sourceHashes={"runtime.ts":hash(contents["/fixture/runtime.ts"])},p={sourceFiles:Object.keys(sourceHashes),sourceHashes,sourceManifestSHA256:hash(Buffer.from(JSON.stringify(sourceHashes))),instrumentSHA256:hash(contents.instrument)};
 const f=new Function("hash","readFileSync","join","root","protocolPath","fail","validateSourceBindings","return ("+freezeSource.replaceAll("fileURLToPath(import.meta.url)",JSON.stringify("instrument"))+");")(hash,path=>{reads.push(path);return contents[path];},join,"/fixture","protocol",code=>fail(code),validateSourceBindings);try{f(p,hash(Buffer.from("original criteria")));outcomes.protocolDriftRejected=false;}catch(e){outcomes.protocolDriftRejected=e.code==="PROTOCOL_FREEZE_CHANGED";}outcomes.protocolActuallyRead=reads.includes("protocol");
 const pass=outcomes.suppliedIncomingApplied&&outcomes.seedCannotSubstituteIncoming&&outcomes.collapsedDeadlinesCounted&&outcomes.protocolDriftRejected&&outcomes.protocolActuallyRead;process.stdout.write(JSON.stringify({status:pass?"SELF_CHECK_PASS":"SELF_CHECK_FAIL",outcomes})+"\n");if(!pass)process.exitCode=1;
}
if(process.argv.includes("--self-check"))await selfCheck();else if (process.argv.includes("--child"))
    await serve();
else if (process.argv.includes("--checkpoint-self-check")) await checkpointSelfCheck();
else if (process.argv.includes("--inspect")) {
    const p = JSON.parse(readFileSync(protocolPath, "utf8"));
    const sourceBound=validateSourceBindings(p,true);
    if(!sourceBound)process.stdout.write(JSON.stringify({status:"HELD",reason:"SOURCE_BINDING_REQUIRED",protocolSHA256:hash(readFileSync(protocolPath)),instrumentSHA256:hash(readFileSync(fileURLToPath(import.meta.url))),requiredSourceFiles:p.sourceFiles?.length??0})+"\n");
    else {freeze(p,hash(readFileSync(protocolPath)));
    process.stdout.write(JSON.stringify({ status: "READY", protocolSHA256: hash(readFileSync(protocolPath)), sourceManifestSHA256: p.sourceManifestSHA256, instrumentSHA256: p.instrumentSHA256, sceneBytes: Buffer.byteLength(JSON.stringify(scene())), imageBytes: [png(101).length, png(102).length] }) + "\n");}
}
else
    await run();
