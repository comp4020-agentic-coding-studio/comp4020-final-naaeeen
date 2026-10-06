# Shared-house transport spike

This folder is a local technical comparison for the final shared study house.
It imports no production server/store code and changes no Crit8 release files.
The parent-owned protocol is `../../evaluation/shared-house-planning.protocol.json`,
SHA256 `57a4e07831b490ea15184707a1656f061dc32eab831036f07086f53c20128278`.
The runner checks that exact hash before a trial. Do not change the protocol,
thresholds or workload after seeing results.

## Run in the canonical Ubuntu repository

Use Ubuntu user lizhi and the repository's actual mise pins: Node24.21.0 and
pnpm11.9.0. Socket.IO and its fixture client are pinned to4.8.4 in this folder's
manifest and lockfile. Commands must run from this folder. The root has a separate
pnpm workspace, so keep installation isolated:

```sh
cd /home/lizhi/comp4020/comp4020-final-naaeeen/prototypes/house-network
mise exec -- pnpm install --ignore-scripts --ignore-workspace --frozen-lockfile
mise exec -- pnpm --ignore-workspace test
mise exec -- node verify.mjs --core-only
mise exec -- node verify.mjs
```

`verify.mjs` runs finite behavioral checks first, then one matched pair in SSE,
Socket.IO order. It prints one JSON document to stdout; test output is captured
inside the JSON. `--skip-core` is available when the same unchanged tests already
passed. `--reverse` is reserved for a second reverse-order pair only when an
unresolved ordering/infrastructure effect can change the decision. It does not
change thresholds. Results belong to the parent; the runner does not write them.

A transport can be started manually:

```sh
mise exec -- node server-cli.mjs --transport=sse --port=0
mise exec -- node server-cli.mjs --transport=socket.io --port=0
```

The module factory is `await start({transport: 'sse' | 'socket.io', port: 0,
database: '/absolute/path/to/this/folder/.local/file.sqlite'})`. It returns
`{baseUrl, transport, metrics(), close()}`. Every listener binds127.0.0.1.
Local data must resolve beneath this folder's ignored `.local/`; database files,
cookies and dependency caches must never be committed.

## Controlled workload and observations

Both adapters call the same synchronous RoomService. The fixture creates one
capacity-six room with six unique opaque-cookie identities, seeds the same six
chat texts, warms up for five seconds, then sends each client ten deterministic
bounded movement commands per second for twenty seconds. The twenty-second send
window contains1200 commands. Both candidates use the same host and runtime
settings. Each server runs in a fresh child process; the six synthetic clients
and benchmark clocks run in the parent harness. Client visible latency is the
elapsed same-host monotonic time between a command being sent and each of the
six clients first observing that exact command UUID. All-client delivery therefore
has7200 expected observations if all1200 measured moves succeed.

SSE emits complete authorized snapshots after each accepted update. Its commands
use same-origin HTTPPOST. Socket.IO uses WebSocket-only events/acks and incremental
deltas, with a full authoritative snapshot on join/reconnect. This compares
transport plus payload strategy, not pure transport overhead. One warmup/sample
pair is evidence about this fixture, not a statistically established reliability
rate or an optimal tick-rate result.

RSS is sampled from the actual server child process once per second plus window
boundaries. Byte counters come from Node's actual server TCP sockets, including
HTTP/WebSocket framing, handshakes when inside the window, and fixture metrics
requests; they exclude TCP/IP packet headers and ACKs. They are stream bytes,
not a packet capture or compressed mobile cost estimate. Server counters stop at the send-window boundary before acknowledgement/delivery
drain. A bounded drain after that window is reported separately from rejoin. No credentials appear in stdout.

Scheduler tick lateness and per-client actual inter-send intervals are reported
so catch-up bursts and host scheduling delays are visible. This does not make
an inference about the cause of a particular prior run's rate-limit drops.

The unchanged protocol thresholds are all core checks passing, no cross-room
delivery, visible p95<=1000ms and peak sampled server RSS<=200MiB.

## Shared authority and finite checks

SQLite stores random session-token digests, room codes/capacities, permanent member
slots, and chat with durable per-actor command UUID receipts. The database
transaction commits before either adapter broadcasts or acknowledges chat.
Retrying the same UUID/text returns the same message receipt; changed text rejects.
Capacity checks and slot assignment share one transaction. Snapshot history is the
latest50 messages, and this bounded fixture caps chat at256 per room, rooms at64,
and identities at128. Permanent members count toward capacity while offline.

Positions and connection counts stay in memory. Each identity has one room avatar
across multiple live connections. Every position must fit x0–10 and z0–8. A
token bucket allows12 accepted movement events/s with burst4 to tolerate the
controlled10/s schedule, including three ticks delivered after a bounded pause,
and rejects excess. The initial burst2 rejected this deterministic schedule;
the shared implementation changed after a failing regression, with protocol
thresholds and workload unchanged. See [rejected first run](REJECTED-RUN.md). Body identity/actor fields reject;
the server resolves the opaque cookie and rechecks membership on every command.
Lost movement is transient and is repaired by a snapshot; it is not durable chat.

Tests use actual loopback HTTP, streaming fetch/SSE, Socket.IO snapshot/delta clients and real
SQLite. They cover capacities2 and6, competing joins for the last slot/no extra
member, another room's authorization/delivery, bounds/throttle/forged identity,
duplicate and changed-payload chat UUIDs, reconnect snapshot, and process restart
retaining session/membership/chat while resetting transient positions/presence.
The HTTPPOST origin check and missing session are checked. These are technical
fixture tests, not a production security review or browser game usability test.

## Authentication and scope limits

`POST /fixture/session` is an intentionally labelled test-auth endpoint available
only on a127.0.0.1 listener with same-origin mutation requests. It creates random
identities; it does not prove invite, account recovery or production authorization.
The opaque token is HttpOnly/SameSite=Strict; Secure is absent on this HTTP
loopback fixture. No production database, token, public server or account is used.

There is no DIY, avatar renderer, collision/pathing geometry, seating state,
whiteboard, text-bubble UI, browser FPS measurement, Fly deployment, real-device
or human preference trial here. Socket.IO polling fallback, proxies, browser
connection limits, WAN packet loss and long-lived session revocation remain
unmeasured. Server ticks/path interpolation and durable production identity are
future application work; neither transport implements them automatically.

Primary references: [Socket.IO server API](https://socket.io/docs/v4/server-api/),
[client API](https://socket.io/docs/v4/client-api/),
[delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/),
[Node24 globals](https://nodejs.org/download/release/latest-v24.x/docs/api/globals.html).

## Shutdown regression

A short real-child check opens six connections, reconnects one client, then
checks both open-connection shutdown and simultaneous client disconnect before
shutdown. The first SSE simultaneous-disconnect run reproduced
ERR_STREAM_WRITE_AFTER_END and child exit1. Delivery/heartbeat now skip ended,
destroyed or stopping responses; closing starts before remaining connections are
terminated, and SQLite closes after the server finishes. Both SSE and Socket.IO
closure cases subsequently exited0 with empty stderr. The runner waits for child
stdio to close before finalizing exit/stderr evidence; exit0 remains required.
These checks add no movement benchmark or reliability-rate claim.
