# Load-generator pacing refinement

7 October 2026. S4.I6e/S4.I6f, with source-version and evaluator discipline from
S4.H2/H3. This is a generator-only correction. Application, realtime, database,
geometry, dependencies, Fly shape and acceptance thresholds are unchanged.
The initial correction scope did not authorize a thirty-minute rerun. After the
bounded calibration and review, the parent authorized one full attempt below.

## Requirement, observation and preserved versions

Readable controllers should generate valid ordinary motion at the declared
9.8–10.2 Hz cadence, while the deliberate slow-reader workload keeps stationary
10 Hz frames during actual TCP read suppression. A failed motion must remain a
failed motion. It cannot advance a synthetic route pose or become a saved ACK.

The complete statement-reuse v2 runs remain FAIL. L1 lasted 1,800.569 seconds,
passed RSS at 167.922 MiB, and recorded one RATE_LIMITED normal-motion rejection.
L2 lasted 1,800.626 seconds, passed RSS at 170.699 MiB, and recorded 29
RATE_LIMITED rejections. Their other gates passed, including 2,160 view deliveries,
slow-reader expiry/rejoin and measured cadence. Combined outstanding maxima were
2 and 36; L2 includes deliberately paused stationary ACKs, so 36 is not attributed
to ordinary readable concurrency.

Before editing the generator, 22 complete source/result/history files were copied
and hashed in `.local/load-pacing-v2-preserved/preservation-manifest.json`. The
exact v2 protocol is retained as `evaluation/house-load.protocol.v2-preserved.json`.
All original and latest v2 result files and existing history entries remain intact.
Baseline generator SHA-256:
`42499e30eefdbe7342d1d7c83afd201ff30cc8cfca69c053c488bc1f9f590bee`.
Unchanged realtime SHA-256:
`0a3823c4dfc62e77aa52206c6d260d47f3367f5f6bfacfaa8cd16ae8c0beb995`.

## Alternatives and declared calibration

The current source checked elapsed time since the previous successful ACK but not
whether another motion ACK was still outstanding. It also advanced local route
pose before acceptance. Alternatives were weakening the server guard or cadence,
ignoring old rejections, imposing single-flight on every paused view, or repairing
only ordinary readable pacing/ACK state. The first three change the promised
workload or hide a failure. The selected repair preserves the existing timing,
route, complete-view accounting and paused stationary workload.

Version 3's diagnostic criteria were registered in `house-load.protocol.json`
before the first new source test. Original workload registration remains dated
6 October; the separate `registeredBeforeNewChecksUTC` records this correction's
chronology. Numeric bounds, configurations, rate/speed/intent/expiry/count criteria,
complete-delivery accounting and latency inclusion were checked equal to v2.

The source comparison uses AST-extracted actual v2/current motion callbacks and
the actual realtime handler transpiled with installed TypeScript. Only clocks,
transport and authority are synthetic; the pacing logic, HouseError and geometry
are actual source. This proves a feasible source path, not persistence, session
expiry, live network behavior or attribution of the old one/29 rejections. Those
v2 aggregates lack rejection timing/messages, and RATE_LIMITED has two server paths.

One fixed 100-second actual-service L2 calibration is declared on port 4098 with
label `pacing-v3`. It must retain twelve views, ten saved intents per house,
120 target deliveries, normal cadence/zero rejects, current-generation/Quiet
expiry rejoin and the complete 65-second TCP pause. fullDuration remains false;
short fault concentration can exceed combined p95 because slow catch-up is retained.
It remains CALIBRATION. A full run requires parent review and an explicit GO.
Stop the lane if paused traffic, cadence, accounting, expiry or normal-motion
criteria fail; do not repeat until a favorable run appears.

## Meaningful red, repair and current source controls

The first native source test observed the declared red: the current v2 callback
sent at client 100 and 200 ms while its first ACK was outstanding. The actual
handler received at 200 and 201 ms; the second frame was RATE_LIMITED with
“Movement updates are limited to ten per second.” The candidate assertion failed
with two outstanding sends versus one. Local optimistic pose was ahead of the
accepted pose. This reproduces a feasible bug; it does not assign the old full-run
rejections to this path.

The repair applies single-flight only while readable, retains both 80 ms minimum
send/post-ACK spacing and `nextSend += 100`, and commits route pose/direction only
after an actual successful ACK from the same socket and current control generation.
A late success still counts as an acknowledged frame but cannot overwrite new
connection/control state. Reconnect refuses unresolved motion ACKs; actual positive
reconnect remains part of the live calibration.

Deliberately paused views still send stationary 10 Hz while ACKs are outstanding.
Combined, normal/readable and paused maxima are recorded separately. At most 32
rejected-frame traces retain view index, sequence/generation, send/ACK/elapsed and
previous-ACK times, outstanding counts, pause/readiness flags and full rejection
code/message. Expected paused timeouts retain their aggregate counter without
filling the rejection trace. Dropped trace entries are counted. No identities,
cookies, controller tokens, invitation codes, coordinates or chat/card content
are written into these traces.

Initial post-repair source controls passed ten cases. Contextual independent review
found a false-PASS gap: the fixture reconstructed a trace limit of 32 rather than
reading the actual source declaration. The grader now reads that declaration,
checks it against the protocol's declared 32, and rejects changed producer/protocol
limits. Additional source controls exercise normal/paused timeout branches,
different-socket and actual takeover-generation ACK fences, and the actual connect
function's unresolved-ACK refusal. Fourteen cases now pass, exit 0:

- Preserved v2 compressed-arrival rejection remains a negative control.
- Candidate waits for ACK; ACK+79 ms is blocked and ACK+80 ms can send.
- Ordinary and delayed-first-ACK 60-second source trials each achieve 10 Hz.
- Paused source trial retains 20 stationary frames in two seconds with 20 unacknowledged sends.
- Readiness/disconnection/pause-drain guards block sends.
- Current transport/generation state survives delayed old ACKs.
- Unchanged server rejects compressed walking, excessive movement and general action bursts.
- Actual recorder retains 32 entries, reports eight dropped entries, and excludes private fields.
- Grader mutations and unresolved reconnect ACKs are rejected.

Command: `mise exec -- node tools/house-load-calibration.mjs`.
At the measured checkpoint this local source calibration required the exact
ignored v2 fixture. That dependency was explicitly recorded during review. The
post-measurement compatibility step below replaces its default with a committable
byte-identical source fixture. Native source controls and live-service calibration
still have different scopes; no coverage percentage is claimed.

## Live calibration and remaining gate

Command: `mise exec -- node tools/house-load.mjs --duration 100 --config L2 --port 4098 --label pacing-v3`.
The actual-service run completed with exit 0 in 100.025 seconds. Its retained
[result](../../evaluation/house-load.L2.calibration.pacing-v3.results.json) remains
CALIBRATION. Current evidence:

| Observation | Actual result |
| --- | --- |
| Views/intents/delivery | Twelve healthy final views; 20 saved intents; all 120 targets; zero missing delivery |
| Ordinary input | 10,989 sends; 10,690 ACKs; zero rejected motion or unexpected ACK timeout |
| Connected-controller cadence | 9.985–9.998 Hz for all twelve controllers; unchanged 9.8–10.2 Hz criterion |
| Deliberate paused faults | 299 expected ACK timeouts; both real 65-second TCP pauses and expiry/rejoins completed |
| Outstanding frames | Normal/readable maximum 1; paused maximum 36; combined maximum 36 |
| Rejoin state | Both readers returned with fresh snapshots, advanced generation and Quiet |
| Child resource samples | RSS 147.488 MiB; event-loop p95/p99 11.026/13.435 ms; sampled retained queues 0 |
| Retained slow latency | Combined p95 30,014.407 ms; maximum 60,014.661 ms; all slow samples included |
| Rejection diagnostics | Zero retained rejection entries and zero dropped entries; recorder limit remains 32 |

Every applicable health, workload, view, cadence, RSS, delivery, normal-motion,
queue, event-loop and expiry/rejoin gate was true. fullDuration was false and
visibleP95 was false: a complete outage forms a larger fraction of this short
sample, and the unchanged one-second criterion still includes that catch-up.
Neither false gate was removed or renamed. This is successful generator-calibration
evidence, not a full-gate PASS or thirty-minute acceptance.

All thirteen generator/protocol/calibration/backend/geometry/dependency hashes
matched before and after. Old v2/original result files and full-history bytes were
unchanged. The calibration history kept its complete old prefix and added exactly
one v3 result. The owned child shut down and port 4098 was verified released.
This worker changed no application bytes or unrelated services.

Independent source review was contextual: it resolved the trace-limit finding and
independently ran fourteen controls. The parent now owns inspection, acceptance
and any explicit GO for full L1/L2. No thirty-minute run had been launched at the calibration checkpoint. Full-duration,
Fly/cgroup/WAN, physical-device and human-value verification remain open. No
coverage percentage is claimed for this source replay/tool lane.

## Exact measured versions and maintenance consequence

| Artifact | SHA-256 |
| --- | --- |
| tools/house-load.mjs | `ceba00d60e979d1c5cd2295b37144a60970f106748c7868643e1a9dc647323f0` |
| tools/house-load-calibration.mjs at measurement; preserved in evaluation/house-load-calibration.v3-measured.mjs | `bdbeb43f86459092d170b0b550f76d90ef967d320c793f9b9ecee7b65b034872` |
| evaluation/house-load.protocol.json | `a0c154321cb202c0d1a26582c0ef5100ec4306e752d0658f5cae008e7fd7d970` |
| src/house-realtime.ts, unchanged | `0a3823c4dfc62e77aa52206c6d260d47f3367f5f6bfacfaa8cd16ae8c0beb995` |

The original ignored v2 source/history copies remain preserved. A byte-identical
committable default fixture is supplied after measurement below. Future protocol
changes require their own declaration/version and source hashes. Keep
readable versus deliberately paused pacing distinct, test bad controls, and never
reinterpret a failed full result from this shorter diagnostic. No worker commit
or remote action was made.



## Parent-authorized full v3 attempt

After inspecting the actual single-flight/ACK-pose/current-generation code, the
unchanged bounds and the fourteen-control review, the parent explicitly authorized
one complete attempt: L1 for 1,800 seconds, then L2 for 1,800 seconds, unique label
`pacing-v3-full`, port 4098. This replaces the earlier hold; it authorizes local
testing, not publication. Failure is retained with no automatic retry.

Invocation was 6 October 2026 at 18:07:19 UTC (7 October in Sydney), exec session
45302. All thirteen source/protocol/control files matched the successful calibration
before launch. Freeze/start records are ignored
`.local/load-pacing-v3-full-freeze.json` and `.local/load-pacing-v3-full-start.json`.
The original/v2 failures and full history remain intact.

The host is shared unconstrained WSL. Other GPU lanes were closed, while the parent
ran brief isolated native browser journeys on port 4094 near the beginning.
Documentation/static UI work is not loaded by this server benchmark. These host
conditions are recorded rather than claiming a fixed Fly/cgroup or exclusive CPU
experiment. The backend, geometry, packages, generator, protocol and source controls
remained frozen. Current disposition: COMPLETE, with both configurations passing
their declared local synthetic gates. Final evidence is reconciled below.


## Completed full v3 result and reconciliation

The one authorized sequential attempt exited 0. Both retained result files are
PASS with every declared gate true; neither required a retry:

| Configuration | Duration | Observed RSS peak | Combined visibility p95 | Intents / deliveries | Motion / unexpected ACK faults |
| --- | ---: | ---: | ---: | --- | --- |
| [L1](../../evaluation/house-load.L1.pacing-v3-full.results.json) | 1,800.344 s | 165.160 MiB | 101.968 ms | 180 / 2,160 | 0 / 0 |
| [L2](../../evaluation/house-load.L2.pacing-v3-full.results.json) | 1,800.367 s | 169.031 MiB | 103.042 ms | 360 / 2,160 | 0 / 0 |

L1's six controllers achieved 9.999–10 Hz. All 108,015 sent moves were
acknowledged; normal outstanding maximum was one and paused-controller maximum
was zero because its slow views were observers. Twelve observer heartbeat/hold/
rejoin cycles completed. They do not imply that the separately connected controller
leases expired.

L2's twelve controllers achieved 9.998–10 Hz. Its 210,028 sent moves reconcile
exactly to 208,220 successful ACKs plus 1,808 expected timeouts from deliberately
paused readers. Normal outstanding maximum was one; paused and combined maxima
were 36. Twelve controller cycles completed with verified actual TCP suppression,
lease expiry, rejoin, fresh cursor, advanced generation and Quiet state.

Both ended with twelve healthy views, no unexpected disconnects, no missing target
delivery and zero retained/dropped rejection traces. Slow recovery was retained:
each result includes 82 slow-target samples; maximum visibility was 60,044.229 ms
for L1 and 60,040.078 ms for L2. Passing p95 does not claim every update arrived
within one second. Event-loop p95/p99 were 11.018/13.550 ms and 11.117/14.221 ms.
Sampled retained packet/byte queues were zero; unseen instantaneous peaks remain
unproven by the 100 ms sampler.

All thirteen source/control/protocol hashes matched at start, ten/twenty-minute
checkpoints and completion. Both result files contain that exact manifest. The
ignored `.local/load-pacing-v3-full-after.json` records complete before/after hashes,
retention and cleanup. Original/v2 result bytes remain unchanged. Full history kept
its complete old prefix and appended exactly these two results. The calibration
result remains CALIBRATION with its false fullDuration/visibleP95 gates intact.
Port 4098 was verified released after the runner and actual child exited.

The parent independently inspected the candidate and reconciled the contextual
source/evaluator review before authorizing this attempt. Worker verification then
parsed both actual files, checked every gate/count/rate/slow-reader record, reconciled
sent versus ACK/expected-timeout totals, compared all hashes and retained history.
No application or generator change was made under measurement. The earlier one/29
rejections still have unresolved event-level attribution; these passing results
cannot retrofit timing/message traces onto those old failures.

Disposition: ACCEPTED LOCAL SYNTHETIC LOAD for the measured source and registered
fixtures, subject to parent final acceptance. This is one local acceptance attempt under registered fixtures,
not a universal reliability rate, causal RSS comparison, Fly/cgroup/WAN or physical-
device result, human preference, student-understanding result or grade guarantee.
Those external/value gates remain open. No worker commit, push or deployment occurred.


## Post-measurement fixture compatibility and exact provenance footer

The parent independently parsed both retained PASS files and matched all thirteen
actual files. Runtime freeze was released only after final worker result/protocol/
link/diff and before/after checks. No instrument or grade changed during measurement.
The parent then explicitly authorized a code-only committable replay fixture.

[evaluation/house-load.generator.v2-preserved.mjs](../../evaluation/house-load.generator.v2-preserved.mjs)
is byte-for-byte the known original v2 generator, SHA-256
`42499e30eefdbe7342d1d7c83afd201ff30cc8cfca69c053c488bc1f9f590bee`.
It is historical source for AST replay; do not run its old default live-load CLI.
[evaluation/house-load-calibration.v3-measured.mjs](../../evaluation/house-load-calibration.v3-measured.mjs)
retains the exact measured grader bytes, SHA-256
`bdbeb43f86459092d170b0b550f76d90ef967d320c793f9b9ecee7b65b034872`.
Only existing project code was copied, with no captured credentials, actor/session
values, raw data/logs or embedded vendor implementations. Existing source licensing
and attribution remain applicable.

The current `tools/house-load-calibration.mjs` differs from the measured grader in
exactly one default file-path literal: it reads the committable v2 fixture instead
of the ignored local copy. Its SHA-256 is
`e512797758371ce0f26fd905f383a8c010f0a26b5444d04aa619e9bf97d80c17`.
There are no remaining `.local/` reads in that tool. Baseline SHA validation, actual
callback/handler/recorder extraction, all assertions and declared limits are
unchanged. Native syntax checks and all fourteen controls passed again, exit 0.
A checkout with the declared runtime/dependencies now has the source needed for
this replay; no new full measurement was run or implied by the compatibility check.

L1's recorded starting HEAD is `bf7c80142ec1b88afe18807a29e63bf36d6f5bf2`; L2's is
`ea604400634acfbcd5be87de5e7c01e901b5596d`. Parent core/verification commits
`ea604400634acfbcd5be87de5e7c01e901b5596d` and
`5548bb14f629a35ccb9955de21b5c9beafe0fa5d` exist in actual local history. Git history
changed during the attempt while measured bytes stayed identical. The result's
thirteen-file manifest and preserved measured grader—not a later HEAD alone—identify
what ran. The current fixture-path change is explicitly after that frozen identity.

Final status: PASS/PASS for one completed local synthetic v3 attempt; runtime freeze
RELEASED; old failures/history retained; fixture compatibility fourteen-control
recheck PASS; no full rerun, worker commit, app/Node/geometry/package edit, push or
deployment. Parent owns final acceptance and staging. External/value gates remain
NOT RUN, as stated above.
