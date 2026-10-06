# Operational verification evidence

7 October 2026. Local evidence from the actual integrated service under Ubuntu WSL
through the Windows-to-WSL bridge, Linux Node 24.21.0 and repository mise/pnpm.
No deployment, real network impairment, physical device, human usability or
user-value result is claimed.

## Storage startup, preservation and restore

`spec/house-operations.test.ts` contains five operational tests. Current
`src/store.ts` and `src/domain.ts` are unchanged from the frozen Crit8 commit
`6dc79c5`; a real populated v1 database uses those actual modules.

The additive house startup/restart test preserves legacy schema, rows, session,
saved lantern/window state, UUID receipt and checkpointed main-file bytes while
a separate house identity and house.sqlite are created and restored.

The restore test leaves committed writes in live SQLite WAL files and proves
ordinary main-file copies cannot see them. It uses the actual imported
`node:sqlite` `backup` API while both source databases stay open. The restored
service passes integrity/foreign-key checks and returns the original legacy and
house sessions, lounge/bedroom chat, author card/next step, room palette/layout,
permission and receipt state. A write made after backup remains on the source
and is explicitly absent from the restored snapshot: this is point-in-time
recovery, not lossless rollback of subsequent writes.

Both unknown schema versions fail startup without reseeding future-schema rows.
The house-schema rejection first exposed three leaked legacy database/WAL/SHM
file descriptors. A native `/proc/self/fd` assertion reproduced the leak (4/5
green); the parent fixed constructor cleanup, and all five tests then passed.

Two independent Node OS processes open their own HouseStore connections, wait
for coordinated stdin barriers and contend for the final permanent bedroom.
The actual transaction outcome is one success and one SPACE_FULL with no loser
profile/receipt side effect, including after restart. The stdout barrier marker
precedes SQLite entry, so the test does not claim it measured overlapping lock
waits inside SQLite.

Command: `mise exec -- pnpm exec vitest run --config vitest.house.config.ts spec/house-operations.test.ts`.
Latest focused result: 5/5 pass, exit 0, 1.08 seconds total. Typecheck also passed.
A fresh read-only review found no actionable test defect; its race-evidence
wording correction is included.

## Predeclared integrated load

`evaluation/house-load.protocol.json` was written before measurement.
`tools/house-load.mjs` forks a dedicated child importing the actual
`src/server.ts:createService`: complete HTTP routes, SQLite stores, Socket.IO
authentication/control/commands and live ticks. It binds 127.0.0.1:4096 with
configured loopback origin and non-Secure synthetic cookies. Each child has its
own ignored `.local/house-load/<run>/data`. The parent's development server on
4093 is untouched.

L1 is one six-person house, six controllers and six observers, including two
slow observers. L2 is two six-person houses and twelve controllers, including
one slow controller per house. Both have exactly twelve views. Controllers
target ten hertz, staggered across each 100ms period. Readable controllers also
honour the actual ACK plus 80ms server guard; achieved per-controller rates are
reported and must be within 9.8..10.2Hz. Actual collision/slide geometry defines
the bounded two-metres-per-second lounge route at the actual server-projected
arrival z, with x in [-2,2]; initial per-slot coordinates are retained as aggregate
fixture numbers. No assumed visual offset changes the authority position.

Each house sends six durable intents per minute, alternating ordinary chat and
author card edits. Commands have stable UUIDs, actual house IDs, original lounge
zone and current generation; revisions come from actually received snapshots.
The exact number of scheduled intents is bounded by the registered duration.

The slow-reader mechanism is the installed Node Engine.IO client's
`engine.transport.ws` object and pinned ws8.21.3's `pause()`, which sets
`_paused` and calls `_socket.pause()` on the actual TCP readable stream.
The harness verifies the stream is paused and no snapshots arrive. This is not
a delayed callback. A slow controller drains any outstanding motion ACK before
pause, then continues valid stationary ten-hertz frames during suppressed reads;
the same actual authority/geometry/dirty-tick/broadcast work still runs. Walking
resumes when readable.

Full runs pause for 65 seconds from t=15s and every 300s, wait through heartbeat
disconnection and thirty-second lease expiry, then create a fresh same-token
socket. Controller rejoin must have a new generation and Quiet, and the returned
durable sequence must cover the latest actual saved receipt. Slow catch-up
latencies remain in overall visibility p95 and separate slow-reader metrics.
Every intended view of the house is counted, including disconnected readers;
missing cursor delivery fails.

A runtime-only Server.prototype.attach wrapper captures the real Socket.IO
instance without replacing production handlers. Child RSS/event-loop delay and
actual Engine.IO packet buffers/ws.bufferedAmount are sampled every 100ms.
Sampling establishes observed maxima; it cannot prove invisible instantaneous
peaks. The production bounded-send checks provide supporting static evidence.
The architecture's event-loop criterion is qualitative; 50ms p95/100ms p99 are
additional predeclared local diagnostic bounds.

Raw logs, databases, cookies, invitation codes and generated identities remain
under ignored .local. Committable results contain hashes and aggregates only.

## Calibration and current status

The chronology below records the initial generator and original full runs. The
statement-reuse v2 and pacing v3 checkpoints at the end retain later outcomes
without rewriting those earlier failures.

Command: `mise exec -- node tools/house-load.mjs --duration 20 --config all`.

Initial simultaneous motion bursts produced 26 RATE_LIMITED replies in L1.
Staggered scheduling and measured ACK spacing corrected normal input generation.
Four later L2 rejections during suppressed reads prompted the predeclared
stationary-input policy; this keeps the same connected-controller input rate
without knowingly submitting invalid movement.

Frozen twenty-second calibration: L1/L2 exact fixtures, zero rejected normal motion and zero
unexpected ACK timeouts, all 24 expected durable view deliveries, valid measured
cadence. Observed child RSS maxima were 129.176MiB and 141.754MiB. The real paused
readers caught up in roughly three seconds, which stays in the small calibration
sample's p95. Rejected calibrations are retained in house-load.calibration-history.results.json.
Both are explicitly CALIBRATION, not full-gate passes: twenty
seconds and brief pauses cannot establish thirty-minute stability or expiry.

Parent G1 and the fresh harness review passed. An initial long L1 attempt was
stopped at the parent's explicit hold after the owner required a spawn repair
before runtime freeze. Its last observed t=60s sample had RSS148.855MiB, seven
saved intents and zero motion rejection/unexpected timeout. It is retained as
ABORTED in house-load.L1.aborted-before-freeze.results.json, not a product failure
or PASS. L2 was not started. Port4096 was verified released after scoped cleanup.

The parent explicitly froze the runtime and authorised start. The repaired
permanent-slot calibration verified six distinct server positions per house:
x=-1.625..1.625 at z=3.3, actual finite routes, health, exact intent counts,
healthy views and zero normal input rejection/unexpected timeout. These remain
short CALIBRATION results with genuine slow-reader catch-up included.

The final sequential thirty-minute L1/L2 measurement started at UTC13:46:56 on
6 October (Sydney7 October). Frozen L1 completed in1800.354 seconds and FAILED
the declared RSS gate: observed196.492MiB exceeds180MiB. Lower later/current
memory would not change that high-water failure.

Every other L1 gate passed:180 scheduled/saved intents;2160 actual-view cursor
deliveries with zero missing; p95 visible104.611ms including82 slow-target
deliveries (maximum60.038s); twelve completed slow-reader expiry/rejoin cycles;
twelve healthy final views; zero unexpected disconnects, normal input rejects or
unexpected ACK timeouts; measured9.999..10Hz per controller. Child event-loop
p95/p99 were14.565/18.072ms. Sampled queues had zero retained packets/bytes;
the sampling limitation above remains applicable.

L1's starting commit was2f941e1a1faee7bc6bdf5ffcbe77ddf11748ae8f, supplemented by
hashes of actual server/store/contract/geometry, harness/protocol and dependency
files. All hashes matched the current files after L1, despite allowed unrelated
parent work. Sanitised full evidence is house-load.L1.results.json.

L2 started automatically at UTC14:17:12 with a fresh isolated actual-server
child and completed in1800.343 seconds. It FAILED RSS at260.102MiB, and its
valid-input gate also recorded one STALE_GENERATION. All other registered
gates passed:180 saved intents per house (360total),2160 actual-view deliveries
with zero missing, visibility p95=107.838ms including82 slow targets with
max60.064s, twelve completed slow-controller expiry/rejoin cycles with new
generation/Quiet/fresh cursor, twelve final healthy views, zero unexpected
disconnects/timeouts, and measured9.997..10Hz. Event-loop p95/p99 were
17.744/23.658ms. Its starting HEAD wasfc86f0fcc3bcd74d201d592398b4a1173e82059f;
all captured source hashes still matched after the run.

The combined runner exited1 and its loopback listener was verified released.
Both original failures remain in separate original.results.json files and
full-history.results.json. Raw source/log/data fixtures remain ignored .local.

The single generation rejection is a harness readiness race, not evidence that
the server accepted unsafe input: transport connection becomes true before
the subscription ACK supplies current control generation. Version2 registers
a ready flag that gates motion and intent author selection until the actual
successful subscription. It also adds100-second calibration with one genuine
65-second TCP pause, heartbeat and lease expiry/rejoin per reader. That
calibration completed for both configurations and all applicable validity,
health, count/cadence, delivery and expiry/rejoin gates passed with zero input
errors. Measured durations were100.019/100.014 seconds, RSS154.727/166.574MiB,
and all120 view deliveries per configuration arrived. L2's two controllers
returned Quiet with newer generations and latest durable cursors; rates were
9.968..9.999Hz. Overall visibility p95 was about30seconds because a complete
slow-reader outage forms ten percent of this short sample and remains included.
Both results are CALIBRATION, not full acceptance; they cannot establish
thirty-minute resource stability or replace either failed full trial.

A fresh read-only review accepted version2's readiness/fault/accounting changes.
Native JavaScript syntax and JSON parsing checks passed. New complete thirty-
minute trials remain necessary after parent source refinement. The original
genuine RSS failures are unresolved.

Read-only research verified that motion currently requests a full snapshot
twice per move and per receiver tick, materialising retained chat/cards and
preparing repeated SQLite statements. Node24.21 creates a fresh weak
StatementSync wrapper per prepare, finalizing it during garbage collection;
the installed prototype has no close/finalize method. These mechanisms establish
allocation churn, not a profiled permanent leak or a proven explanation of RSS.
[Node24.21 implementation](https://github.com/nodejs/node/blob/v24.21.0/src/node_sqlite.cc#L1466-L1495).

An isolated installed-runtime probe showed a2240MiB V8 heap capacity on this
effectively unconstrained WSL host. Node/V8 defaults depend on detected memory
constraints; Fly256MiB defaults remain unmeasured. Heap capacity is not measured
RSS, and the existing failed gate is unchanged.
[Node sizing](https://github.com/nodejs/node/blob/v24.21.0/src/api/environment.cc#L196-L207).

The resource failure is retained; S4 load acceptance remains incomplete.
No heap flags, CPU limits, resource shape or production source were changed to
hide it. These localhost measurements do not establish the fixed Fly machine,
real network, physical-phone or human-use gates. Source refinements and new
complete trials are parent-owned.


## Statement-reuse v2 completion and generator-only pacing refinement

The parent completed the new 1,800-second L1/L2 statement-reuse v2 workloads and
verified every frozen source hash unchanged. L1 duration was 1,800.569 seconds,
RSS 167.922 MiB, one RATE_LIMITED rejection and combined outstanding maximum two.
L2 duration was 1,800.626 seconds, RSS 170.699 MiB, 29 RATE_LIMITED rejections and
combined maximum 36, including deliberately paused stationary ACKs. All other
registered gates passed, including 2,160 view deliveries per configuration,
current-generation/Quiet expiry rejoin and ten-hertz cadence. Both remain FAIL
because validNormalMotion failed. Passing their RSS gates does not erase the
original 196.492/260.102 MiB failures or establish complete sustained acceptance.

The old aggregate lacks rejection times/messages. A fresh initial cache review
and later contextual reproduction exposed a feasible generator path: readable
controllers can send while an earlier ACK is outstanding, compressing server
arrival to 200/201 ms after client sends at 100/200 ms. The unchanged actual
handler rejects the second movement-specific frame. This does not attribute the
old one/29 failures to that path; the general action-rate guard also uses
RATE_LIMITED.

All v2 source/result/history bytes were preserved before the generator change.
The exact protocol copy is `evaluation/house-load.protocol.v2-preserved.json`;
ignored source/result copies are indexed by
`.local/load-pacing-v2-preserved/preservation-manifest.json`. Version 3's diagnostic
criteria were declared before source calibration, with numerical workload and
acceptance gates unchanged. The repair applies single-flight only to readable
controllers, preserves minimum send/post-ACK 80 ms and `nextSend += 100`, and commits
local route state only after a current successful ACK. Paused stationary 10 Hz
frames remain unchanged. Diagnostics distinguish normal/paused outstanding maxima
and retain at most 32 safe rejection traces, with dropped-entry counts.

Meaningful actual-source red failed at two outstanding sends versus one. Fourteen
source/actual-handler controls now pass, including excessive/compressed motion
negative controls, timeout and stale-transport/generation fences, and actual
recorder-bound/privacy grading. Contextual independent review reproduced them;
a substituted trace-limit grader gap was corrected and mutant producer/protocol
limits are rejected. These controls inject clocks, transport and authority and
do not establish actual-service expiry or persistence.

The fixed actual-service L2 calibration on isolated port 4098, label `pacing-v3`,
completed in 100.025 seconds, exit 0, with RSS 147.488 MiB. All twelve controllers
met 9.985–9.998 Hz; 20 intents and all 120 view targets arrived, with zero motion
rejection/unexpected ACK timeout. Both 65-second TCP pauses and real expiry/rejoins
returned fresh generation/Quiet. Normal outstanding maximum was one; deliberately
paused maximum was 36 with 299 retained expected ACK timeouts. All applicable
health/accounting/cadence/resource/rejoin gates were true.

The classification remains CALIBRATION. fullDuration=false and combined p95
30,014.407 ms exceeds the unchanged one-second bound because concentrated slow
catch-up remains included. No full result is replaced. All thirteen current hashes
matched before/after; old full results/history remain unchanged, calibration history
retains its old prefix plus one new result, and port 4098 was released. Current
source/result/review and limits are recorded in
[LOAD-PACING-REFINEMENT](../revisit/LOAD-PACING-REFINEMENT.md).
The parent must inspect that evidence and provide an explicit GO before another
thirty-minute L1/L2 workload. No full run had been launched at that calibration checkpoint.


Following that review, the parent explicitly authorized one full pacing-v3 attempt:
exact 1,800-second L1 then L2 on port 4098, label `pacing-v3-full`. It started at
18:07:19 UTC on 6 October (7 October Sydney), exec session 45302, with thirteen
unchanged source/control/protocol hashes. The shared WSL host and brief separate
native-browser activity are limitations. The one authorized attempt is now complete, with both configurations passing
their declared local synthetic gates. No retry or deployment occurred. Results
remain separate from preserved original/v2 failures and the 100-second calibration.


## Completed pacing-v3 full acceptance, local synthetic scope

The exact sequential attempt exited 0. Retained files:
[full L1](../../evaluation/house-load.L1.pacing-v3-full.results.json) and
[full L2](../../evaluation/house-load.L2.pacing-v3-full.results.json).
L1 measured 1,800.344 seconds, observed RSS 165.160 MiB and combined visibility
p95 101.968 ms. L2 measured 1,800.367 seconds, RSS 169.031 MiB and p95 103.042 ms.
All registered gates are true for both: exact fixtures/duration, health, saved
intents, healthy views/cadence, complete delivery, normal motion, RSS, sampled queue,
event-loop and slow-reader rejoin checks.

L1 saved 180 intents and L2 saved 360, with all 2,160 view deliveries per configuration.
There were no rejected motion frames, unexpected ACK timeouts/disconnects or missing
deliveries. Controller rates were 9.999–10 Hz and 9.998–10 Hz. L1's 108,015 moves
were all ACKed. L2's 210,028 sends equal 208,220 ACKs plus 1,808 retained expected
paused-reader timeouts. Normal outstanding maximum was one in both; deliberately
paused-controller maximum was zero in L1 and 36 in L2.

Each completed twelve slow-reader cycles. L1's observer heartbeat/hold/rejoin does
not expire its separately connected controllers' leases. L2's controller cycles
verified actual expiry, fresh cursor, advanced generation and Quiet after rejoin.
Every slow target remains counted: 82 slow visibility samples per result, with
maxima 60,044.229/60,040.078 ms. A passing combined p95 does not promise a one-second
maximum. Queue measurements are sampled, not an instantaneous-peak proof.

All thirteen recorded source/control/protocol hashes matched before/after and
intermediate checkpoints. Both original and statement-reuse v2 full failures remain
unchanged, and full history retained its complete old prefix plus exactly two new
v3 results. Port 4098 was released. Complete conditions, source/reviewer calibration,
versions and limits are in
[LOAD-PACING-REFINEMENT](../revisit/LOAD-PACING-REFINEMENT.md).

This accepts the measured localhost synthetic load gates on a shared unconstrained
WSL host. It does not establish the fixed Fly VM/volume/TLS, WAN, physical phone or
human-use/value gates. The candidate was reviewed before the single authorized
attempt; no source change, automatic rerun, worker commit or publication occurred.


After the completed measurement and thirteen-hash reconciliation, the parent
released the runtime freeze and requested a committable code-only replay fixture.
The exact original v2 generator now exists at
`evaluation/house-load.generator.v2-preserved.mjs` (SHA-256 `42499e30eefdbe7342d1d7c83afd201ff30cc8cfca69c053c488bc1f9f590bee`),
and the exact measured grader is retained at
`evaluation/house-load-calibration.v3-measured.mjs` (SHA-256 `bdbeb43f86459092d170b0b550f76d90ef967d320c793f9b9ecee7b65b034872`).
Current calibration differs only in its default fixture path and has SHA-256
`e512797758371ce0f26fd905f383a8c010f0a26b5444d04aa619e9bf97d80c17`.
Its native syntax and fourteen source controls passed again without a live/full
rerun. Full-result identities still refer to the preserved measured grader.
Only known project code was copied; raw credentials/data/logs remain ignored.
No application, Node, geometry or package bytes changed for this compatibility step.
