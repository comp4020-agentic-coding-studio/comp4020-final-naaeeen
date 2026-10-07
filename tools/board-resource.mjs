/** Registered LOCAL SYNTHETIC combined resource exercise. */
import { fork } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { getHeapStatistics } from "node:v8";
import { release as kernelRelease } from "node:os";
import {setTimeout as timerDelay} from "node:timers/promises";
import { crc32, deflateSync } from "node:zlib";
import { Server } from "socket.io";
import { io } from "socket.io-client";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."), protocolPath = join(root, "evaluation/board-resource.protocol.json"), resultPath = join(root, "evaluation/board-resource.results.json");
const hash = b => createHash("sha256").update(b).digest("hex"), arg = k => {
    const n = process.argv.indexOf(k);
    return n < 0 ? undefined : process.argv[n + 1];
}, sleep = ms => new Promise(r => setTimeout(r, ms));
const q = (a, p) => a.length ? [...a].sort((a, b) => a - b)[Math.max(0, Math.ceil(a.length * p) - 1)] : null, round = n => n === null ? null : Math.round(n * 1000) / 1000;
const fail = code => {
    throw Object.assign(new Error(code), { code });
}, ok = r => {
    if (!r?.ok)
        fail(r?.code ?? "NO_ACK");
    return r;
};
function freeze(p, protocolHash) {
    if(hash(readFileSync(protocolPath))!==protocolHash)fail("PROTOCOL_FREEZE_CHANGED");
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
    function sample() {
        for (const c of connections)
            inspect(c);
        const m = process.memoryUsage();
        rssPeak = Math.max(rssPeak, m.rss);
        heapPeak = Math.max(heapPeak, m.heapUsed);
        return { kind: "sample", rssMiB: m.rss / 1024 ** 2, heapMiB: m.heapUsed / 1024 ** 2, externalMiB: m.external / 1024 ** 2, arrayBuffersMiB: m.arrayBuffers / 1024 ** 2, rssPeakMiB: rssPeak / 1024 ** 2, heapPeakMiB: heapPeak / 1024 ** 2, queues: peaks, activeEngines: connections.size, houseViews: sio.of("/").sockets.size, boardViews: sio.of("/board").sockets.size, engines, namespaces, invalidTelemetry, eventLoop: { p95Ms: loop.percentile(95) / 1e6, p99Ms: loop.percentile(99) / 1e6, maxMs: loop.max / 1e6 }, cpu: process.cpuUsage(), actions };
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
            else if (m?.kind === "sample")
                process.send?.({ ...sample(), kind: "reply", requestId: m.requestId });
            else if (m?.kind === "stop" && !closing) {
                closing = true;
                clearInterval(timer);
                process.send?.(sample());
                loop.disable();
                await service.close();
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
    if (!calibration && (!process.argv.includes("--run") || arg("--go") !== protocolHash || arg("--freeze") !== p.sourceManifestSHA256))
        fail("PARENT_GO_REQUIRED");
    const startedAt = new Date().toISOString(), dir = join(root, ".local/board-resource", startedAt.replaceAll(":", "-") + "-" + randomUUID());
    mkdirSync(join(dir, "data"), { recursive: true });
    const child = fork(fileURLToPath(import.meta.url), ["--child", "--data", join(dir, "data"),"--protocol",protocolHash], { cwd: root, silent: true, execArgv: [], env: { ...process.env, NODE_ENV: "test" } });
    let origin, runtime, lastSample, phase = "startup", failure = null, closing = false, running = false, start = 0, end = 0, unexpectedDisconnects = 0, scopeErrors=0, staleFramesIgnored=0, stderrBytes = 0, stdoutBytes = 0;
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
    async function http(path, m, body) {
        if (m && path.startsWith("/api/board/"))
            countHttp(m, body !== undefined);
        const r = await fetch(origin + path, { method: body === undefined ? "GET" : "POST", headers: { Origin: origin, ...(m ? { Cookie: m.cookie, "X-House-Identity": m.identity } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
        const value = await r.json();
        if (!r.ok)
            fail(value.code ?? "HTTP_" + r.status);
        return { value, cookie: r.headers.get("set-cookie")?.split(";")[0] ?? m?.cookie };
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
        // Pending volatile sends belong to the replaced connection, not this one.
        v.pointerPending = false;
        v.motionPending = false;
        v.nextPointer = performance.now() + 50;
        v.nextMotion = performance.now() + 100;
        const socket = io(origin + (v.role === "board" ? "/board" : ""), { autoConnect: false, forceNew: true, reconnection: false, transports: ["websocket"], extraHeaders: { Origin: origin, Cookie: v.cookie } });
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
            v.snapshot = r;
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
            failure ??= { phase, code: e.code ?? "WORKLOAD_FAILURE" };
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
        if (chat) {
            const id = randomUUID(), d = delivery(v.house, "chat", { messageId: id }, at), r = ok((await http("/api/board/chat", v, { id, houseId: h.id, text: ("Synthetic scheduled message " + h.chatSerial++).padEnd(4000, "c") })).value);
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
            const r = ok((await http("/api/board/patch", v, { id: randomUUID(), houseId: h.id, elements: [next] })).value);
            stats.patchSaved++;
            v.saved++;
            h.expectedVersions.set(next.id, next.version);h.expectedElements.set(next.id,next);
            h.receiptJournal.push({ type: "patch", sequence: r.sequence, elements: r.elements.map(e => ({ id: e.id, version: e.version })) });
            d.sequence = r.sequence;
        }
        for (const peer of views.filter(a => a.role === "board" && a.house === v.house))
            reflect(peer, null, null, peer.sequence);
    }
    const cancellation=new AbortController();
    let slowEvidence = null, negativeEvidence = null;
    let motionTimer, pointerTimer, writeTimer, freezeTimer, progressTimer;
    try {
        await Promise.race([ready, sleep(15000).then(() => fail("STARTUP_TIMEOUT"))]);
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
            for (let n = 0; n < 100; n++)
                ok((await http("/api/board/chat", members[n % 6], { id: randomUUID(), houseId: house.id, text: ("Synthetic retained message " + n).padEnd(4000, "c") })).value);
            const saved = (await http("/api/board/snapshot?houseId=" + house.id, members[0])).value;
            house.seedChat = saved.chat.map(m => ({ id: m.id, sequence: m.sequence }));
            house.fixture = { elements: elements.length, sceneBytes, chatMessages: saved.chat.length, chatBytes: Buffer.byteLength(JSON.stringify(saved.chat)), files: saved.files.length, snapshotBytes: Buffer.byteLength(JSON.stringify(saved)), imageBytes: house.images.map(b => b.length), imageSHA256: house.images.map(hash), patchBatches: batches };
            if (saved.chat.length !== 100 || saved.files.length !== 2 || saved.files.some(f => Object.hasOwn(f, "dataURL")))
                fail("FIXTURE_SNAPSHOT_MISMATCH");
            for (const m of members) {
                const controller = newView(m, h, "house");
                await connect(controller);
                ok(await controller.socket.timeout(3000).emitWithAck("house.availability", { generation: controller.generation, value: "chat" }));
                await connect(newView(m, h, "board"));
            }
        }
        const boardViews = views.filter(v => v.role === "board");
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
        const initial = await rpc("sample");
        if (initial.houseViews !== 12 || initial.boardViews !== 12 || initial.activeEngines !== 24 || views.some(v => !v.socket.connected))
            fail("INITIAL_VIEW_COUNT");
        phase = "invalid-ack-negative";
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
        const negativeSample = await rpc("sample");
        negativeEvidence = { requests: 100, transportFault: "server writable=false diagnostic", closed: negative.disconnects > prior, queuePacketsPeak: negativeSample.queues.board.packets, queueBytesPeak: negativeSample.queues.board.bytes };
        if (!negativeEvidence.closed || negativeEvidence.queuePacketsPeak > 8 || negativeEvidence.queueBytesPeak > 4194304)
            fail("INVALID_ACK_BOUND_FAILURE");
        negative.socket.disconnect();
        await connect(negative);
        negative.intendedFault = false;
        if (calibration) {
            phase = "calibration-finish";
            start = performance.now();
            end = start;
        }
        else {
            phase = "measurement";
            running = true;
            start = performance.now();
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
                for (const v of views) {
                    if (v.role !== "house" || now < v.nextMotion)
                        continue;
                    v.nextMotion += 100;
                    if (v.nextMotion < now)
                        v.nextMotion = now + 100;
                    if (!v.ready || v.motionPending && !v.intendedFault || !v.socket.connected)
                        continue;
                    v.motionPending = true;
                    v.motionSent++;
                    if (!v.intendedFault)
                        v.normalMotionSent++;
                    stats.motionSent++;
                    const socket = v.socket, generation = v.generation;
                    launch(async () => {
                        try {
                            const r = await socket.timeout(5000).emitWithAck("house.move", { generation, sequence: ++v.motionSequence, x: v.x, z: v.z, heading: 0 });
                            if (r?.ok)
                                stats.motionOk++;
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
            while (performance.now() - start < duration) {
                if (failure)
                    break;
                await sleep(Math.min(1000, duration - (performance.now() - start)));
            }
            end = performance.now();
            running = false;
            for (const timer of [motionTimer, pointerTimer, writeTimer, freezeTimer, progressTimer])
                clearInterval(timer);
            if(failure)cancellation.abort();
            await Promise.all([...jobs]);
            if(failure)fail(failure.code);
            await slowJob;
        }
        phase = "recovery-check";
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
        const final = await rpc("sample");
        lastSample = final;
        const health = (await http("/healthz")).value.ok === true;
        freeze(p, protocolHash);
        const pending = [...deliveries.values()].reduce((n, d) => n + d.pending.size, 0), normalPending = [...deliveries.values()].reduce((n, d) => n + [...d.pending].filter(i => !d.slow.has(i)).length, 0), seconds = (end - start) / 1000;
        const perView = views.map(v => ({ viewIndex: v.index, houseIndex: v.house, role: v.role, connections: v.connections, disconnects: v.disconnects, disconnectReasons: v.reasons, connectedAtEnd: v.socket.connected, eligibleSeconds: round(v.eligibleMs / 1000), motionSent: v.motionSent, motionHz: v.role === "house" && v.eligibleMs ? round(v.normalMotionSent / (v.eligibleMs / 1000)) : null, pointerSent: v.pointerSent, pointerHz: v.role === "board" && v.eligibleMs ? round(v.normalPointerSent / (v.eligibleMs / 1000)) : null, saved: v.saved, skipped: v.skipped, patchEvents: v.patchEvents, chatEvents: v.chatEvents, snapshotEvents: v.snapshots, presenceEvents: v.presences, houseSnapshots: v.houseSnapshots, houseMotions: v.houseMotions, revoked: v.revoked, initialSnapshotWireBytes: v.initialSnapshotBytes ?? null }));
        const httpBudget = [...httpCounts.values()].map((c, n) => ({ actorIndex: n, totalReads: c.reads.length, totalWrites: c.writes.length, rollingReadMax60s: rollingMax(c.reads), rollingWriteMax60s: rollingMax(c.writes) }));
        const gates = { scopedDelivery:scopeErrors===0,inbound:runtime.inboundBytes===16384,httpBudget: httpBudget.every(c => c.rollingReadMax60s <= 240 && c.rollingWriteMax60s <= 240), duration: calibration ? null : seconds >= 300, all24Initial: true, all24Final: final.houseViews === 12 && final.boardViews === 12 && final.activeEngines === 24 && views.every(v => v.socket.connected), rss: final.rssPeakMiB <= 210, boardQueues: final.queues.board.packets <= 8 && final.queues.board.bytes <= 4194304, houseQueues: final.queues.house.packets <= 4 && final.queues.house.bytes <= 2097152, telemetryValid: final.invalidTelemetry === 0, eventLoop: final.eventLoop.p95Ms <= 50 && final.eventLoop.p99Ms <= 100, health, unexpectedDisconnects: unexpectedDisconnects === 0, allNormalDelivered: normalPending === 0, allDeliveredIncludingCatchup: pending === 0, normalP95: latencies.normal.length ? q(latencies.normal, 0.95) <= 1000 : calibration ? null : false, normalInputs: stats.motionRejected === 0 && stats.motionTimeouts === 0 && stats.pointerRejected === 0 && stats.pointerTimeouts === 0 && stats.patchRejected === 0, workload: calibration ? null : stats.patchSkipped === 0 &&stats.chatSkipped===0&& stats.patchSaved >= p.workload.minimumSavedPatches && stats.chatSaved >= p.workload.minimumSavedChat && perView.filter(v => v.role === "house").every(v => v.motionHz >= 9.5 && v.motionHz <= 10.2) && perView.filter(v => v.role === "board").every(v => v.pointerHz >= 18 && v.pointerHz <= 20.5), recovery: recovery.every(r => r.allSeedIds&&r.allUnmodifiedElements&&r.allLatestPayloads&&r.tombstones===20&&r.elements===202&&r.allLatestVersions && r.allScheduledChat && r.files === 2 && r.metadataOnly), negativeAck: negativeEvidence.closed && negativeEvidence.queuePacketsPeak <= 8, slowExpiry: calibration ? null : !!slowEvidence?.readerStayedPaused && slowEvidence.bothDisconnected && slowEvidence.rejoined && slowEvidence.generationAdvanced && slowEvidence.quietAfterExpiry && slowEvidence.allCommittedRecovered };
        const result = { schemaVersion: 1, status: calibration ? "CALIBRATION" : Object.values(gates).every(v => v === true) ? "PASS" : "FAIL", scope: "SYNTHETIC; process RSS, not constrained to Fly", startedAt, finishedAt: new Date().toISOString(), protocolSHA256: protocolHash, sourceManifestSHA256: p.sourceManifestSHA256, instrumentSHA256: p.instrumentSHA256, sourceHashes: p.sourceHashes, runtime, durationSeconds: round(seconds), fixture: houses.map(h => ({ houseIndex: h.index, ...h.fixture })), server: cleanSample(final), samples: samples.map(({ parentAt, ...s }) => ({ ...cleanSample(s), phase: s.phase, elapsedSeconds: start ? round((parentAt - start) / 1000) : null })), stats, httpBudget, perView, delivery: { targets: pending + latencies.normal.length + latencies.slow.length, committedIntents: deliveries.size, observed: latencies.normal.length + latencies.slow.length, normalObserved: latencies.normal.length, slowObserved: latencies.slow.length, pending, normalPending, normalP95Ms: round(q(latencies.normal, 0.95)), normalP99Ms: round(q(latencies.normal, 0.99)), normalMaxMs: round(latencies.normal.length ? Math.max(...latencies.normal) : null), slowP95Ms: round(q(latencies.slow, 0.95)), slowMaxMs: round(latencies.slow.length ? Math.max(...latencies.slow) : null) }, negativeEvidence, slowEvidence, recovery, unexpectedDisconnects,scopeErrors,staleFramesIgnored, errors, gates, stderrBytes, stdoutBytes, limitations: p.limitations };
        writeResult(result);
        process.stdout.write(JSON.stringify({ status: result.status, durationSeconds: result.durationSeconds, rssMaxMiB: final.rssPeakMiB, normalP95Ms: result.delivery.normalP95Ms, gates }) + "\n");
        if (!calibration && result.status !== "PASS")
            process.exitCode = 1;
    }
    catch (e) {
        failure ??= { phase, code: e.code ?? e.name ?? "HARNESS_FAILURE" };
        const status=failureStatus(failure.code);
        writeResult({ schemaVersion: 1, status, scope: "SYNTHETIC; process RSS, not constrained to Fly", startedAt, finishedAt: new Date().toISOString(), protocolSHA256: protocolHash, sourceManifestSHA256: p.sourceManifestSHA256, instrumentSHA256: p.instrumentSHA256, sourceHashes: p.sourceHashes, runtime, phase, failure, stats, samples: samples.map(({ parentAt, ...sample }) => ({ ...cleanSample(sample), phase: sample.phase, elapsedSeconds: start ? round((parentAt - start) / 1000) : null })), perView: views.map(v => ({ viewIndex: v.index, houseIndex: v.house, role: v.role, connectionOrdinal: v.connections, currentSocketConnected: Boolean(v.socket?.connected), currentSubscriptionKnown: v.role === "board" ? Boolean(v.subscriptionId) : null, currentSnapshotCursor: v.recoveryCheckpoint?.sequence ?? v.snapshot?.durable?.sequence ?? null, ready: v.ready, pointerPending: v.pointerPending, motionPending: v.motionPending, disconnectEvents: v.disconnectEvents })), slowEvidence, fixture: houses.map(h => ({ houseIndex: h.index, ...h.fixture })), server: cleanSample(lastSample), unexpectedDisconnects, errors, stderrBytes, stdoutBytes, limitations: p.limitations });
        process.stdout.write(JSON.stringify({ status, phase, code: failure.code }) + "\n");
        process.exitCode = 1;
    }
    finally {
        running = false;
        closing = true;
        for (const t of [motionTimer, pointerTimer, writeTimer, freezeTimer, progressTimer])
            clearInterval(t);
        for (const v of views)
            v.socket?.disconnect();
        child.send?.({ kind: "stop" });
        await Promise.race([new Promise(done => child.once("exit", done)), sleep(5000).then(() => child.kill("SIGTERM"))]);
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
 const contents={"/fixture/runtime.ts":Buffer.from("runtime stable"),instrument:Buffer.from("instrument stable"),protocol:Buffer.from("changed criteria")},reads=[],sourceHashes={"runtime.ts":hash(contents["/fixture/runtime.ts"])},p={sourceHashes,sourceManifestSHA256:hash(Buffer.from(JSON.stringify(sourceHashes))),instrumentSHA256:hash(contents.instrument)};
 const f=new Function("hash","readFileSync","join","root","protocolPath","fail","return ("+freezeSource.replaceAll("fileURLToPath(import.meta.url)",JSON.stringify("instrument"))+");")(hash,path=>{reads.push(path);return contents[path];},join,"/fixture","protocol",code=>fail(code));try{f(p,hash(Buffer.from("original criteria")));outcomes.protocolDriftRejected=false;}catch(e){outcomes.protocolDriftRejected=e.code==="PROTOCOL_FREEZE_CHANGED";}outcomes.protocolActuallyRead=reads.includes("protocol");
 const pass=outcomes.suppliedIncomingApplied&&outcomes.seedCannotSubstituteIncoming&&outcomes.collapsedDeadlinesCounted&&outcomes.protocolDriftRejected&&outcomes.protocolActuallyRead;process.stdout.write(JSON.stringify({status:pass?"SELF_CHECK_PASS":"SELF_CHECK_FAIL",outcomes})+"\n");if(!pass)process.exitCode=1;
}
if(process.argv.includes("--self-check"))await selfCheck();else if (process.argv.includes("--child"))
    await serve();
else if (process.argv.includes("--checkpoint-self-check")) await checkpointSelfCheck();
else if (process.argv.includes("--inspect")) {
    const p = JSON.parse(readFileSync(protocolPath, "utf8"));
    freeze(p,hash(readFileSync(protocolPath)));
    process.stdout.write(JSON.stringify({ status: "READY", protocolSHA256: hash(readFileSync(protocolPath)), sourceManifestSHA256: p.sourceManifestSHA256, instrumentSHA256: p.instrumentSHA256, sceneBytes: Buffer.byteLength(JSON.stringify(scene())), imageBytes: [png(101).length, png(102).length] }) + "\n");
}
else
    await run();
