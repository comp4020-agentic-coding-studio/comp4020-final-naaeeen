# Board resource evidence, 7 October 2026

The combined board resource acceptance remains open. The original completed
300.001-second workload failed, and two later attempts also failed. Their saved
results remain separate from the current registered candidate. Lower candidate
RSS does not establish an overall PASS, and this documentation update runs no
workload.

## Preserved workload outcomes

| Saved artifact | Observed result | Interpretation |
| --- | --- | --- |
| [Original full result](../../evaluation/board-resource.original-full.results.json) | FAIL after 300.001 measured seconds; peak RSS 301.305 MiB; immediate slow-reader recovery flag false | RSS exceeded the 210 MiB gate and the fixed 256 MiB machine size. The final recovery checks passed, but they do not establish correctness at the earlier recovery checkpoint. |
| [Candidate full failure](../../evaluation/board-resource.candidate-full.failed.results.json) | FAIL in the slow-reader phase, code 23; peak RSS 203.801 MiB; maximum event-loop delay 53.284 seconds; 22 unexpected disconnects; 681 skipped scene deadlines and 58 skipped chat deadlines | The attempt ended without a completed full-duration result. Lower RSS is a partial observation; disconnects and incomplete workload prevent acceptance. |
| [Quiet retry failure](../../evaluation/board-resource.quiet-retry.failed.results.json) | FAIL in the measurement phase, code 23; peak RSS 200.656 MiB; maximum event-loop delay 67.210 seconds; four unexpected disconnects; 1,717 skipped scene deadlines and 148 skipped chat deadlines | The explicitly authorised retry also failed. It does not provide full acceptance, despite RSS remaining below the local gate. |

The 53.284-second and 67.210-second figures are event-loop stall maxima, derived
from `server.eventLoop.maxMs`. They are not trial durations. The two failure
artifacts do not record a completed `durationSeconds` field. Their specific stall
and disconnect causes remain UNATTRIBUTED; confirmed queue defects below do not
retroactively explain either failure.

The original run observed all 7,896 committed intents and 47,376 visibility targets
by final recovery, with normal visibility p95 of 25.148 ms and no normal rejects,
skipped writes or unexpected disconnects. Its real TCP pause, both deliberate
disconnects, rejoin, controller-generation advance and Quiet reset passed. The
recorded immediate `allCommittedRecovered` flag was false. These observations
remain in the FAIL artifact rather than being promoted to a successful trial.

[The supplementary Windows timing record](../../evaluation/board-resource.windows-timing.results.json)
observed no gap over one second during its 320.1-second window. That window excludes
the late 67-second stall in the quiet retry, so it establishes no pause cause.

## Diagnosis, alternatives and scoped refinements

The common task is the complete registered valid fixture, 24 independent engines,
unchanged rates and queue limits, and the same real paused-reader fault. The
alternatives were whole-scene quota processing versus touched-winner quota deltas,
and queuing every transient presence update versus retaining only the latest
presence while a transport is busy. Authority, reliable delivery and acceptance
bounds remain required under either choice.

One [matched original diagnostic](../../evaluation/board-memory/baseline100.results.json)
and one [quota-only diagnostic](../../evaluation/board-memory/candidate100.results.json)
are preserved under the [matched protocol](../../evaluation/board-memory/PROTOCOL.md).
Both remain DIAGNOSTIC with `diagnosticValid: false`, never full PASS. Across the
100-second pair, peak RSS changed from 286.480 to 202.344 MiB. Each called the actual
patch method 2,430 times; positive synchronous heap deltas changed from 17,940.289
to 2,335.089 MiB and patch wall time from 18.750 to 9.834 seconds. These aggregate
deltas describe transient churn, not retained allocation, total allocation or a
proved leak.

Both diagnostics saved 2,388 workload patches and 228 chats without skipped writes.
The original recorded three pointer RATE_LIMITED responses; the candidate recorded
one, one unexpected board disconnect and 66 pending visibility targets. Those
confounds remain visible. The quota candidate removes per-patch whole-scene
parsing and stringifying, using touched winners and current SQLite count/byte
totals inside the existing transaction. It retains exact wire UTF-8 quotas,
UTF-16 storage fallback, tombstones, canonical receipts and own contributions.
Prepared SQL was already cached. No authority cache, schema change or relaxed
capacity, byte, rate or queue limit was introduced.

A source-controlled counterexample showed that an immediate recovery grader could
compare a fixed snapshot against later HTTP writes. The repaired instrument
captures an immutable snapshot cursor, versions and chat IDs, closes the receipt
set of already-started HTTP writes, and grades only through that cursor. Eight
recorded source controls accept legitimate later writes and reject missing or
stale cutoff edits and missing retained messages. This identifies a feasible
grader defect, while the specific original false recovery flag stays unattributed.

Real-service control-packet fixtures reproduced a separate false close: a queued
known Engine.IO heartbeat has no data, but the old outbound guard treated it as
malformed below the queue limit. The current
[board guard](../../src/board-service.ts) and
[house guard](../../src/house-realtime.ts) count 32 header bytes for known control
packets without data. Unknown packet types and malformed message payloads still
close the connection. The maintained cases are
[board control packets](../../spec/board-control-packets.test.ts) and
[house control packets](../../spec/house-control-packets.test.ts).

A real current-subscription pressure fixture also showed that one legal large
subscribe ACK plus legal transient presence could fill the eight-packet board
queue below four MiB. Presence now coalesces while the transport is busy. Its ready
handler rebuilds current authorised presence and sends it only to that view;
revoke and resubscribe clear deferred state, and disconnect removes the listener.
Reliable ACK, patch and chat limits remain eight board packets/four MiB. House
limits remain four packets/two MiB, with one-MiB frames and unchanged 16-KiB inbound.
The [pressure cases](../../spec/board-rejoin-pressure.test.ts) retain the reliable
overflow negative control. Six recorded generator completion controls also guard
the current connection so an old pointer completion cannot block or release the
new connection's pending send.

Fresh static pressure review found no confirmed runtime defect in the current
board/house source. It identified missing deferred-ready lifecycle coverage for
removal, session recovery, changed subscription/house and listener cleanup. At that
review checkpoint the additional tests were NOT RUN. The parent subsequently
executed the strengthened pressure file: all seven cases passed, exit 0, in a
7.52-second test run. This includes four new deferred-ready lifecycle cases after
independent contextual review closed test-only evaluator gaps. The checked spec
hash is `812c6ae4a423db62b8b353b4f259d0a2f99b0eb8a1f310bf434bf511da5bfeab`.
The pressure-test lane changed no production source. This narrow local PASS does not accept
the complete resource workload, app check or combined native gate.

## Current registration and future execution gate

The [active protocol](../../evaluation/board-resource.protocol.json) retains
300 seconds, 24 physical engines, the full valid scene/images/chat fixture, the
210 MiB local RSS reserve gate, original rates, actual TCP pause and every workload,
visibility, recovery and queue gate. Its current identities are:

| Identity | SHA-256 |
| --- | --- |
| Exact protocol bytes | `1ef473487e69243cfc338710246354da125dcbdce4356ec93a8b15824eddb540` |
| Runtime source manifest | `545d79c3ea7d85addc95242b26232c8ec0b53bb50cb9a1b0b7387bf3bc937cd7` |
| Resource instrument | `6130e233edeb296c15dbf028103ea5a362de373ecf62b9d5539f7a0df1c71454` |

Every listed runtime source hash and the canonical manifest digest matched the
actual file bytes during this reconciliation. The current saved READY inspection
is `.local/redesign-closeout/final-resource-inspect.json`.

A final app review reproduced a served README link defect: `/board/` was resolved
to `https://github.com/board/` instead of the local board. The server now retains
root-relative app routes while resolving repository evidence links against the
repository. Its registered hash is
`64b92ea1c376161bf84a2add3bcf04b185ed7aced91f604b039878d456d238f0`.
The focused HTTP file passed eight tests after the repair. A ninth all-boundary
link case was subsequently added; the saved eight-test result does not certify
that expanded current file or the final required gate.

The [archived e579 protocol](../../evaluation/board-resource.e579.protocol.json)
is the earlier READY snapshot with protocol hash
`e579280416327319e6055e18c1ee06112d3dda21b2eca3330e95f24f22e692e2` and manifest
`a53a5cd36c13d516e839d1d25c944a2cebf4a8db1ae952d97f00c0e59ed321cf`.
Its saved `ci-resource-freeze.json` is historical. The refreshed protocol changes
only `src/server.ts` and the resulting manifest; the instrument, workload, grading,
faults, bounds and classification are unchanged. The earlier
`final-resource-freeze.json` identifies the failed e412 candidate. No resource run
followed the registration refresh.

The current protocol has no executed full result. The aggregate
[resource result](../../evaluation/board-resource.results.json) still records the
quiet retry FAIL and retained history, rather than a result for this registration.

[CI](../../.github/workflows/checks.yml) configures one future registered attempt
after the maintained browser gate. It inspects readiness, supplies the exact
protocol and source-manifest hashes, runs once without automatic retry, and
preserves a sanitised result. The workload step has an eight-minute limit; the
browser gate keeps its five-minute limit. The private-repository condition still
applies. This configured CI attempt has not executed locally or remotely in this
checkpoint, and no further local full retry is authorised. Final current-source
app checks, coverage, instrumented combined native acceptance, artifact checks and
commit evidence remain open in this record; the parent must append their actual
outcomes before local closeout. The scoped native refinements below do not close
those broader gates.

## Subsequent app and browser refinements

The house renderer now uses a 512-by-512 shadow map. A saved scoped recheck passed
the game core in 53.296 seconds and the legacy journey in 27.207 seconds. The game
retains its 60-second aggregate timeout, and the legacy renderer retains its
10-second readiness assertion. Earlier failures stay preserved. The actual clock
timing gap remains open: the saved two-case report does not include the later
startup-timing instrumentation required for the final seven-case gate.

Fresh app review also found the opaque title screen occluding Create/Join/Options
dialogs. A native screenshot/paint check failed at both 1920-by-1080 and 390-by-844.
The CSS panel now sits at layer 12 above its layer-11 backdrop and the title screen.
Both paint cases then passed, and contextual review closed that finding. These are
scoped browser observations, not full combined acceptance. Current native source
hashes are `827a9077d40ebf02bcc6f364822dec21b1f116a0e683d0698d48b270e96f282f`
for `public/house.css` and
`56f5fed2d0719df167f4267f2547d234bf591da37829e34a108bdb4811a06b5f`
for `public/house-world.js`; these frontend sources are outside the synthetic
resource source manifest.

Ignored provenance is `.local/redesign-closeout/readme-board-link-red.log`,
`readme-board-link-green.log`, `startup-shadow512.log`,
`title-dialog-paint-red.log`, `title-dialog-paint-green.log`, and their corresponding
native report directories. The strengthened pressure result is preserved in
`.local/redesign-closeout/board-pressure-lifecycle.result.json`. These local
records are inspectable working artifacts; the parent owns sanitised final
submission evidence and current-source closeout.

## Historical registration and calibration provenance

The first registration covered two six-member houses: twelve independent game
controllers plus twelve forceNew board views, giving 24 physical websocket engines.
The parent owned explicit GO, runtime freeze and coordination with GPU jobs. At
that registration checkpoint sustained execution was HELD. The later original
run and two failed attempts above supersede earlier statements that no full
attempt had started.

Per house, the fixture contains 202 mixed objects in a 1.6–1.9 MiB scene, including
20 tombstones; 100 retained 4,000-character board messages; and two valid near-two-MiB
PNGs. Snapshots contain image metadata, with authenticated exact binary reloads.
The task requests normal 10-Hz game inputs, up to 20-Hz pointers, and 132 scheduled
board HTTP writes per minute per identity, including scene edits and chat. Bootstrap
writes are distributed. All views, intent targets and deliberate or unexpected
disconnects must be accounted for.

A 2,000-object/two-MiB validator is the product bound. The 210 MiB RSS gate leaves
46 MiB inside the fixed 256 MiB machine size. This local synthetic exercise does
not enforce a Fly cgroup or rewrite the historical 180 MiB/30-minute L1/L2 results.

Before the first run, a real-service fixture reproduced a valid large-bootstrap
disconnect: the full snapshot was sent in both the ACK and `board.snapshot`,
exceeding the four-MiB admission bound. The repair sends the full snapshot once
in the ACK, or once as an event when there is no acknowledgement callback. The
same fixture passed without increasing bounds or reducing the valid content.

The initial oversized Windows bridge command failed before a child or runtime
started. Bounded source writes and native syntax checking then completed. These
were preparation events, not workload results.

Context-retaining independent instrument review found three pretrial evaluator
defects: an undefined house reference in snapshot reflection, uncounted late scene
deadlines and chat catch-up bursts, and missing protocol-byte drift checks with
inconsistent output classification. Actual extracted source controls reproduced
the failures; all five passed after repair and independent recheck. They include
incoming-data reflection, 27 skipped scene slots and one skipped chat slot at the
registered 14-second delayed callback, and exact protocol-byte drift rejection.
This was contextual review and source calibration, not another fresh review or
resource trial.

The parent separately reproduced a valid Unicode game-transcript disconnect and
registered the one-MiB frame/two-MiB queue/four-packet allowance, with game inbound
remaining 16 KiB. Historical 512-KiB/180-MiB results remain unchanged. The original
full registration, recorded before later repairs, is preserved as the
[original protocol](../../evaluation/board-resource.original-full.protocol.json).
The two later failures share the preserved
[e412 protocol](../../evaluation/board-resource.e412.protocol.json), source manifest
`83401ab659d60b153ff1a770e5f8d488e1ca1b1df051b282989a808c4c7e5b55`, and instrument
`d769e19f39d95182716416b31e9ab13b9879e65cefe7217000d27d2f6f8bf3bf`.

Native Docker/Fly/WAN, browser React/WebGL memory, physical devices, human preference
and user value remain outside this synthetic resource evidence. Reconnect checks
also remain separate from already recorded full-process restart persistence tests.
