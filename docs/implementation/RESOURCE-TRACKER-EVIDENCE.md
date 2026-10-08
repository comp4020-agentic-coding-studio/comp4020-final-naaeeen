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

# Verified movement and evaluator release

Runtime `5c40545` and evaluator `e54a694` are verified at `daef80c` by
[CI 37603266802](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37603266802):
495 required checks across 28 files, nine native cases, all 300-second resource
gates, process and secret checks, mounted backups, deployment and HTTPS smoke.
Six deployed source hashes match. The revised live core and room journeys pass
in 19.2 and 30.9 seconds. [Exact results](../../evaluation/movement-reconciliation.results.json)
and the [resource artifact](../../evaluation/board-resource.indexed-ci.results.json)
bind the source, protocol, instrument and observations. Earlier failures remain
preserved. Pending labels below describe their historical checkpoints. The final
evidence publication keeps runtime bytes unchanged and receives its own CI check;
a further status-only publication is unnecessary.

# Resource evaluator refinement

7 October 2026. Sourcee54a694; application motion remains5c40545. This changes
instrumentation, not application behavior or acceptance criteria.

## Trigger and alternatives

CI37600728762 passes485/27 and maintainednative9, but its300.001s workload fails:
ten skipped scene slots and boardpointer16.283–16.617Hz below18. All other gates
pass. The exact failed artifact and old v1 protocol remain committed. Backend
manifest and original instrument equal earlier successful CI. Host variation or
application causality is not established by that equality or the aggregate data.

Inspecting reflect reveals repeated scans of every historical delivery on each
board event, plus six reflections after each savedHTTP write. Completed history
remains in the full ledger. Compare historical scanning, a global unresolved set,
and per-view unresolved sets under identical targets/events/timestamps; retain
all ledger records, unobserved targets, canonical version/nonce merging, slow
classification, actual receipt-race reflection and final counters. Choose per-view
matching for its bounded unrelated/completed-history work. One global-index timing
was slightly lower; that single diagnostic is not a general speed ranking.

## Actual controlled evidence

[Microprotocol](../../evaluation/resource-tracker-comparison.protocol.json) is
separate from the full300s protocol. Exact frozen-source baseline and candidate
functions plus a global unresolved alternative observe2,016intents/12,096targets,
48pending and10,040normal+2,008slow observations. State and exact latency arrays
match, checksum1e0944147f4b2accd3e45b5994a9a3c1b9809315a87d8dd5b110b84951d31009.
Reflection visits2,443,392 /19,368 /5,736; single fixed-order diagnostic times
21.060 /2.252 /2.322ms. [Results](../../evaluation/resource-tracker-comparison.results.json)
prove the stated algorithm equivalence and visit counts, not sustained improvement.

Meaningful baseline red1/8 detects completed-history traversal; seven valid
controls pass. Candidate10/10 covers incomplete/cross-house/stale/higher-version,
chat/snapshot/lateHTTP/cache-reset recovery, empty target and partial-peer cases.
Existing selfcheck5/5 and checkpoint selfcheck8/8 pass. Fresh no-history read-only
review verified registration before HTTP await, deletion only after observation,
reconnect index preservation and untouched ledger/scheduling/grading. A contextual
follow-up inspected the last two controls. Reviewer did not execute tests; worker
and parent did. The reset fixture is not a real reconnect; full actual transport
and slow-reader recovery remain the subsequent workload's responsibility.

Parent required board build/type/spec495PASS across28 files, diff/evidence checks
pass. Retained private logs/review/microcomparison runner are in
.local/resource-delivery-tracker/2026-10-07-pending-index; the parent full check is
.local/redesign-closeout/tracker-required-check.log. Maintained tests have no
.local dependency and run from actual instrument functions on a clean checkout.

## Freeze and acceptance

InstrumentSHAec3301bfaf2d3b9e9ebbb1335d6e2245923f74957a256cafd90660862a7229ed;
new fullprotocolSHA98e62217a1b8482ba18e8005993888895f6231ee71af514db157ec298b29fe23;
backendmanifest545d79c3ea7d85addc95242b26232c8ec0b53bb50cb9a1b0b7387bf3bc937cd7.
Old exactprotocol1ef47348/instrument6130e233 are preserved in v1. Root compared
all original protocol fields except instrumentSHA for equality; the new revision
metadata is additional. Gates and motion/pointer/write timer source blocks are
byte-identical. Zero skipped writes,18–20.5pointerHz,9.5–10.2motionHz, all24views,
300seconds, memory, delivery, recovery, negative and expiry bounds stay mandatory.

Next is one explicitly source-frozen full attempt through the approved existing
CI/Fly release. All gates must pass before deployment. A failed result stays FAIL;
no automatic retry or weakened threshold is introduced. Reduced algorithmic cost
is established; the precise earlier failure cause and sustained effect remain
unproven until new measurements. Physical Fly/phones, WAN and human results are
outside this synthetic gate.

## Actual full verification

CI37603266802 on protocol98e62217/instrumentec3301bf passes all300s gates. Root
independently verifies artifactad745f1c and backend/source hashes. All7,188patches
save with zero skips;708chat; pointer18.307–18.637Hz; no pending/unexpected
disconnection; full realTCP slow-reader rejoin/recovery passes. RSS204.85MiB and
normalp9510.658ms meet unchanged criteria. This completes the previously unrun
actual-transport/sustained gate for this attempt; it does not establish a causal
performance model or human preference. Earlier37600728762FAIL remains separate.
