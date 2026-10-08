# Current release: verified 16 MiB server policy

8 October 2026. Source `d2dcf5f` with the prior motion/board refinements is verified
at `2723796` by [CI 37722868698](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37722868698).
All 504 checks, nine image browser cases, unchanged 300-second resource gates,
process/secret checks, backups, deployment and HTTPS smoke pass. Root verifies
all eight deployed source hashes and the actual server flag. Four current live
journeys pass: game 21.4s, rooms/DIY/access 33.6s, board 8.8s and recovery 3.0s.
[Exact results](../../evaluation/movement-reconciliation.results.json) and the
[full resource artifact](../../evaluation/board-resource.semi16-ci.results.json)
bind 202.17 MiB peak RSS, 6.757 ms normal p95, zero skips/missing targets/unexpected
disconnects and all 24 transports. Earlier failures and invalid diagnostics remain
history. Final evidence publication keeps runtime bytes unchanged and receives
its own CI result before completion.

# Current release: verified image allocation refinement

8 October 2026. Store `da3d7ec`, motion `5c40545` and evaluator `e54a694` are
verified at `aee040c` by [CI 37717775859](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37717775859).
All 498 checks, nine image browser cases, 300-second resource gates, process and
secret checks, backups, deployment and HTTPS smoke pass. Root verifies seven
deployed source hashes and affected live board cases at 9.7 and 3.4 seconds.
[Exact results](../../evaluation/movement-reconciliation.results.json) and the
[resource artifact](../../evaluation/board-resource.asset-ci.results.json) bind
202.54 MiB peak RSS, 9.282 ms normal p95, all 24 transports, zero skips/missing
targets/unexpected disconnects and full recovery. Earlier failures and diagnostic
limitations remain history. Final evidence publication keeps runtime bytes
unchanged and receives its own CI result before completion.

# Board image allocation refinement

8 October 2026. Source `da3d7ec` changes only the board store and its allocation
regressions, with updated source bindings in the resource protocol.

## Trigger and decision

Docs-only CI `37605048981` failed solely on peak RSS: 212.363 MiB against 210.
All 300-second workload, delivery, recovery and input gates passed. The prior
`37603266802` attempt remains a source-bound PASS. Both exact results are retained;
the later failure is not relabelled. Peak JS heap was slightly lower in the failed
run, while final external/Buffer memory was nearly equal. This establishes limited
headroom; it does not establish a heap leak, host cause or fragmentation mechanism.

An explicit young-generation budget was explored before changing production.
The planned baseline/semi8 comparison crossed machine suspension and is invalid.
Baseline wall time exceeded monotonic time by many hours and connections broke.
The already-running semi8 candidate is an unpaired 120-second diagnostic: RSS
202.516 MiB, but 597 pointer rate rejections, eight skipped patches and pointer
cadence below 18 Hz. It is not adopted. Duration/minimum failures do not excuse
those substantive failures. [Exact diagnostic](../../evaluation/runtime-memory-diagnostic.results.json)
retains the classification and raw-result hashes; private raw outputs/protocol/
runner are in `.local/runtime-memory-trial`. Independent adaptation review was
not run, and no A/B superiority or causal claim is made.

Source inspection then identified avoidable image allocations: asset reuse loads
a BLOB although it needs only MIME/digest; downloads copy the already materialized
SQLite byte array. The narrow fix removes these allocations, without Node flags,
scene caches, permission changes or acceptance changes. A wider snapshot cache or
controller refactor was deferred because it adds authority/lifecycle complexity.
Actual sustained RSS benefit remains unmeasured until the full new workload.

## Ownership evidence and implementation

[Node v24.21.0 SQLite conversion](https://github.com/nodejs/node/blob/v24.21.0/src/node_sqlite.cc#L132-L143)
creates an owned V8 backing store and copies the SQLite bytes into it. Thus the
returned Uint8Array is independently materialized. A [Buffer view](https://nodejs.org/download/release/v24.21.0/docs/api/buffer.html#static-method-bufferfromarraybuffer-byteoffset-length)
retains its exact offset/length without another copy. SQLite-to-JS copying remains.
Root independently read the native implementation and confirmed the HTTP consumer
sends the Buffer unchanged. No consumer transfers or mutates its backing.

The store now selects only MIME/digest for existing-asset checks and adapts a
returned BLOB through `Buffer.from(buffer, byteOffset, byteLength)`. Narrow row
types reflect the selected columns. Public Buffer type, bytes, immutable file IDs,
quotas, transactions, receipts and read authorization remain unchanged.

## Reproduction, review and current checks

Two intended allocation regressions fail on the old source while 24 controls pass.
Final 26/26 store tests cover near-limit metadata reuse without materialization,
bounded nonzero offsets, owned backing, native bytes after later queries/DB close,
and mutation isolation from persisted bytes. The original copied-Buffer test
assumed separate public backing stores; small copies can share a pool, so that
invalid assertion was removed. Native SQLite backing ownership remains checked.
The first default-config invocation failed missing-server setup; the corrected
existing board config supplies the store results. Neither is a product failure.

Fresh no-history review checks the native ownership/reset contract, HTTP consumer,
allocation changes and regression scope; no actionable findings. Store statement/
branch coverage is 89.93%/88%, distinct from the earlier overall board-unit gap.
Logs, patch, freeze and review are retained under `.local/asset-allocation-fix`.
Root full board-build/type/spec passes 498 across 28 files. After restarting only
the verified preview on original `.local/implementation-s1` data, both unchanged
standalone-board native cases pass in 9.0 and 2.5 seconds. Actual PNG paste/shared
canvas/recovery and near-limit HTTP binary fixtures pass. No sustained memory or
physical-device claim follows from these local checks.

## Full acceptance pending

Store SHA `8612adbaec2e436d894a175a9cf7e88eac74f832238ded3f1a03675141223025`;
instrument `ec3301bf` unchanged; new protocol
`9acf203180c28d6a30c5ba04b94b28c631c00271c334cede9a1b66cb278b3590` and manifest
`f9d4ad86f7800e2f26d288c09aaaf47852c2fb935c86327bdf1633e091bb25bc` bind the fix.
All v2 protocol fields except source hashes/manifest remain equal; revision
metadata is additional. Every workload, timing, memory, queue, input and recovery
criterion stays mandatory. Node launch arguments are unchanged. Next: actual
approved CI, full 300-second resource gate, backup/deploy and affected live-board
source/flows. The deployed prior gameplay proof remains its own scope.

## Actual full and deployed verification

CI37717775859 at aee040c passes all gates for300.002s, with202.5390625MiB peak
RSS, normalp959.282ms,7188patches/skips0,708chat, no normal-input rejects/missing targets/
unexpected disconnects and24finaltransports. Root verifies artifactfb49546c,
protocol9acf2031, manifestf9d4ad86 and every backend/instrument hash.
This establishes the registered attempt; it does not prove the earlier failure's
sole cause or a general memory/reliability improvement.

Probe2026-10-08T02:38:03.540Z matches seven source files, Node24.21.0 and one
sharedCPU/256MB/data mount;102228KiB appRSS is one moment, cgroup telemetry null.
Actual HTTPS boardcore9.7s andfull-house recovery3.4s pass on the changed store.
Game sources are unchanged; previous scoped livecore/room proof and current
nine-case image gate remain valid. Physical-device/human, sustained actualFly
load, WAN impairment andoff-volume restore remain not run; overall board-unit
coverage and student reflection limitations are unchanged.

Final evidence review caught reference aliasing in the reconstructed historical
release entry: current live fields had been copied into the older release record.
Root restored that entry from the immutable committed aee040c snapshot, compared
all three remote/resource/live fields for exact equality, and kept the seven-file
current probe separate. This is an evidence correction, not an application change.
