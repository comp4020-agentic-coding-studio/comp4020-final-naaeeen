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

# Prospective server young-generation budget

8 October 2026. Source `4e83db6`. This is a provisional runtime policy, requiring
new controlled CI and live validation before acceptance or deployment.

## Why revisit the launcher

The same unflagged application/instrument has both passing and RSS-only failing
300-second CI attempts. Latest `37719301016` at docs-only `18a2cfe` peaks at
216.191 MiB, against 210, with 63.046 MiB peak JS heap. Every workload, input,
delivery, queue and recovery gate passes; normal p95 is 6.534 ms. The earlier
asset release remains deployed and verified for its recorded attempt. The later
failure stays FAIL; it does not establish a leak or a single allocation cause.

[Node v24.21.0 CLI guidance](https://nodejs.org/download/release/v24.21.0/docs/api/cli.html#--max-semi-space-sizesize-in-mib)
describes the young-generation memory/throughput tradeoff and memory-dependent
defaults. Unlimited synthetic children reported a 4288 MiB heap limit. That limit
is not committed RSS. An explicit semi-space size gives the server a consistent
young-generation policy across production and the synthetic child. Eight MiB
per semi-space implies a 24 MiB young-generation capacity; it does not bound
whole-process RSS or change the old-space limit.

## Alternatives and protected acceptance

Keep the default, use one explicit young-generation setting, or investigate a
native allocator policy. The next candidate changes only server semi-space to
8 MiB. Wider old-space/allocator changes are deferred to avoid combining factors.
Image-copy and evaluator refinements remain separately verified changes.
The interrupted WSL comparison and unpaired candidate from the earlier diagnostic
remain unqualified. Its pointer/skipped failures are not dismissed or attributed
to host or the flag without evidence. This new candidate stands on a prospective
full controlled-host run; it is not accepted as a prior A/B winner.

The common task stays two houses, 12 controllers plus 12 separate board views,
near-limit fixtures, 300 seconds and the same slow-reader/recovery controls. Every
210 MiB RSS, zero-skips, pacing, latency, input, queue and recovery criterion stays.
If any full gate fails, deployment must stop. Qualification is one frozen full
attempt and affected deployed flows, not a short probe or model preference.

## Launch parity and actual checks

`src/server-runtime.ts` exports a frozen server-only argument list. Direct Docker
CMD and pnpm start use that same checked argument. The resource fork receives a
copy; its generator remains unflagged. No resident launcher, global NODE_OPTIONS,
old-space override, Node version, data/schema or API change is introduced.
Six maintained tests inspect real launcher code and include actual Node/fork flag
and environment probes. Three missing-budget baseline failures become green.
Two intermediate fixture-only errors remain in the logs. Focused16/2 files,
typecheck/diff and fresh no-history review pass. The reviewer independently runs
a Node24 flag probe and syntax/type checks, without a server or workload.
The three-line constant's 100% coverage is not overall server/board coverage.

Root restarts only the verified preview on original data, then passes504 required
build/type/spec checks across29 files. Actual local boardcore7.8s, full-house board
recovery1.9s and gamecore19.8s pass with the budgeted server. These demonstrate local
behavior; they do not qualify sustained RSS or physical-device performance.
Logs are retained in .local/server-runtime-budget and .local/redesign-closeout.

## Source freeze and next gate

The first metadata inspection rejected an unsorted new manifest entry before any
load. Root corrected canonical sorting, added Docker/runtime policy source binding,
and kept the stricter freeze checks intact. Original selfcheck5 and recovery
checkpoint8 pass. V3 exact protocol is archived; new code/instrument/source metadata
is bound without changing a workload, timer or acceptance predicate.
Current source/protocol identities are in the updated full resource protocol.
Next: approved main CI504/native9/fullresource, backup/deploy only on all PASS,
then eight deployed source hashes plus the actual server flag and affected live
flows. A synthetic PASS remains distinct from sustained actual Fly stress,
physical phones, human value and a grade claim.

## Controlled 8 MiB result and next candidate

CI37721319415 at a6b5fcc is a full controlled FAIL solely on workload. Server
arguments are exactly semi8, generator unflagged; RSS181.410MiB/heap32.990 meets
memory, but three scene slots are skipped and pointer range17.900–18.232Hz
includes values below18. All normal input rejection/timeout counts are zero; all
47,358targets are observed and recovery passes. These failures remain substantive;
no deployment occurs and GC or the flag is not asserted as the sole cause. The
complete failed artifact and exact v4 protocol remain committed.

Next source d2dcf5f changes only the shared setting from8 to16 in four coupled
sites. A larger young generation is the next single-factor capacity/collection
tradeoff, not an accepted winner. Old-space, generator, API, workloads and all
criteria stay unchanged. Intended coupling mismatch5/6 becomes6/6PASS; type/diff
and labelled contextual parameter recheck pass. Root504/29 required checks and
local budgeted board7.8s/recovery2.1s/game15.6s pass. The tool itself is unchanged.
Prospective full300s actualCI, deployment gating and affectedlive checks remain
required; the previous structural review is not renamed as another fresh trial.

## Accepted controlled and deployed result

Full CI37722868698 at2723796 passes every original gate for300s: server flags
exactlysemi16, RSS202.171875MiB, heap36.799766540527344MiB, normalp956.757ms,
7188patches/skips0,708chat, pointer18.757–18.897Hz, no normal-input rejection or
timeout, no pending/unexpecteddisconnect and24finaltransports. Protocol4f8feadb,
manifestdaec2567, instrument7cce6f96 and every source hash match. Root downloads
artifactb07a8915 and verifies its literal all-true gates. The configured16policy
qualifies for this workload; it is not an optimality or universal reliability claim.
GitHub instances/fixed order are not a matched causal performance study.

After deployment, probe2026-10-08T03:39:01.833Z verifies eight code files and the
actual server16 argument, Node24.21.0/sharedCPU1/256MB/data mount. AppRSS103920KiB
is one moment; cgroup telemetry unavailable. Actual HTTPS game21.4s, room/DIY/
access33.6s, board8.8s and full-house recovery3.0s pass. Existing physical/human/
sustainedFly/WAN/off-volume/overallboardcoverage/student-writing limits remain.
Historical release records are copied from immutable snapshots or deep copies;
current live evidence never overwrites older release attribution.
