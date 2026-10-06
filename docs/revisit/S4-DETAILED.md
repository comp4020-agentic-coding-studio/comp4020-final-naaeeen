# S4 detailed retrospective revisit and current refinement

7 October 2026. Eleven separate checkpoints follow the active REPORT and evidence
methods. The parent reconciles actual source and operational evidence with
attributed read-only reviews. These are eleven detailed records, not eleven new
independent experiments.

The backend is frozen for new sequential L1/L2 measurements. UI, world and camera
refinement continues separately. Earlier results do not transfer automatically to
new source bytes. Paths below are repository-relative; immutable versions belong
in the linked protocol/result records. Human, physical-device and deployment gates
remain separately open.

## S4.I6d Migration, backup and restore

User outcome: saved work and identity survive maintenance, while the public C8
dataset remains intact alongside the additive private house. Sources are the
server's dual-store construction/shutdown, the HouseStore SQLite schema, unchanged
legacy Store/domain modules and five maintained `spec/house-operations.test.ts`
tests. [Operations evidence](../implementation/operations-evidence.md) records the
actual Linux Node 24.21.0 service and database checks.

Normal and restart paths preserve separate cookies/identities, memberships, room
permissions/layouts, chat, card next steps and actor-owned command receipts.
Unknown legacy or house schema version 99 must reject startup without reseeding.
Failure while constructing the second store must close the first. Recovery checks
cover integrity, foreign keys, original sessions and duplicate-command receipts.
A concurrent backup preserves committed WAL data, while a later source write is
absent from the earlier snapshot.

The alternatives were a main-file copy, a stopped checkpoint/copy and SQLite online
backup. The actual bad-control main-file copy omitted WAL-only identities; online
backup of both live databases restored the expected state. A main-file-only backup
is therefore rejected. Separate stores do not share a cross-database transaction:
quiesce writes if a paired snapshot needs one common point-in-time boundary.

The unknown house-schema case first reproduced three leaked legacy file descriptors
through `/proc/self/fd`. Constructor cleanup corrected it; five affected tests and
typecheck passed. Fresh read-only review found no actionable test defect after
reconciliation, with the race-evidence wording limit retained. Status: ACCEPTED
LOCAL OPERATIONS. A production-volume rehearsal and operator backup/rollback
runbook remain open. They must state backup time, write quiescence and loss of
post-backup writes. No lossless rollback or deployed backup is claimed.

## S4.I6e Races and evaluator calibration

Invariant: a check accepts legitimate behavior and rejects actual violations,
without treating invalid synthetic inputs as product defects. Sources are the
store/realtime/HTTP/operations suites, load and memory protocols/graders, and the
[UI](UI-REFINEMENT.md), [outbox](OUTBOX-REFINEMENT.md) and
[world readability](WORLD-READABILITY.md) refinement records.

Two OS processes with separate HouseStore connections contend for one permanent
slot: exactly one wins, the loser has no profile/receipt side effect, and restart
preserves allocation. Their stdout barriers precede SQLite entry; they do not
measure overlapping lock waits inside SQLite. Denied cases include actor/house
scope, room revocation, stale seat/controller generations, stale revisions and UUID
reuse with a different payload. Recovery includes lost-ACK retry, interrupted
readers, restore and same-token rejoin. Sequential tests remain labelled sequential.

Alternatives include an in-process domain test, real sockets with an authority
double, the real service/SQLite, OS processes, browsers and deployment. Choose the
smallest method that covers the asserted boundary; mocked cookies or storage do
not establish their live behavior.

Observed evaluator corrections are retained. Load version 2 waits for the actual
subscribe ACK/current generation and counts every intended view. An independent reviewer
reproduction with the actual client and an isolated UI fixture exposed a late-ACK
`STALE_ZONE` cleanup race missed by a mocked successful ACK; the reported UUID
sequence was A, A, B with two effects in that fixture. Final real-service/browser
acceptance remains separate. Native border-box grading missed overflowing 40-W
name glyphs; Range/scroll-width checks exposed it. Camera criteria/protocol were
frozen before their comparison. Memory grading retained missing/wrong-content
controls, occupied-port INFRASTRUCTURE_FAILURE and SIGTERM ABORTED outcomes.

Status: REVIEWED WITH GAPS. The parent must reconcile current integrated regression
results and final candidate versions. Grader calibration is useful local evidence,
not an agent-efficacy or human-value result.

## S4.I6f Load, slow readers and resource bounds

User outcome: twelve supported views remain coherent within the fixed single
shared-CPU Fly machine's 256 MB budget. Sources are
`evaluation/house-load.protocol.json` version 2, the real `createService` child in
`tools/house-load.mjs`, [operations evidence](../implementation/operations-evidence.md)
and the [matched memory diagnostic](MEMORY-COMPARISON.md). Production handlers are
not mocked by this synthetic localhost workload.

L1 has one six-member house, six controllers and six observers. L2 has two
six-member houses and twelve controllers. Connected controllers target 10 Hz;
each house submits six durable intents per minute. Two slow readers undergo actual
65-second TCP read suppression, heartbeat disconnection, 30-second lease expiry
and same-token rejoin with a current generation, Quiet status and fresh cursor.
The full workload has six cycles per reader and 1,800 seconds per configuration.
Every intended view is counted, including disconnected slow readers.

Acceptance requires 180 saved intents per house, 2,160 view deliveries per
configuration, no missing delivery or invalid normal motion, no unexpected ACK
timeout, twelve healthy final views, achieved rates of 9.8–10.2 Hz, RSS no greater
than 180 MiB and combined reliable visibility p95 no greater than one second.
Queue samples occur every 100 ms and cannot prove absent instantaneous peaks.
Short runs retain slow-reader catch-up rather than removing it to improve p95.

Original L1 FAILED the RSS gate at 196.492 MiB; the other gates passed, with
visibility p95 104.611 ms. Original L2 FAILED at RSS 260.102 MiB and recorded one
harness `STALE_GENERATION` caused by resuming before the subscription ACK. Its
other gates passed, with visibility p95 107.838 ms. Original files and full history
remain intact. Version 2's 100-second readiness/expiry trials had no invalid normal
frames but remain CALIBRATION results, not replacements for the failed full runs.

The declared matched A/B/C/D diagnostic used two 100-second fresh-data repeats per
candidate: A baseline; B bounded statement reuse; C reuse plus lean motion
projection; D child-only 96 MiB old-space. B reduced preparation work and CPU with
a smaller change. C improved CPU further without incremental short-run RSS benefit.
D had one additional RSS/input failure. All eight trials retained their combined
slow-reader visibility failures and DIAGNOSTIC_FAIL classifications. None proves
sustained acceptance or a permanent leak.

The parent selected B: a per-store map capped at 96 constant SQL plans, current
parameter bindings, no row cache, and cleanup on close/startup failure. The warmed
read regression reduced 650 preparations to fewer than eight; 56 affected tests
and fresh correctness review supported local integration. New unchanged
1,800-second L1/L2 workloads run sequentially with `--label statement-reuse-v2`
on isolated port 4097. The eleven-entry source manifest at
`.local/sustained-statement-reuse-v2-freeze.json` still matched during this document
reconciliation; labelled result names refuse overwrites.

Status: NEEDS ACCEPTANCE. At this checkpoint the new sequential runner is RUNNING;
do not declare a
new full PASS before completed results are reconciled or change backend bytes
under measurement. Fly/cgroup/TLS/WAN verification remains NOT RUN. Local RSS is
not deployed stability.

## S4.I6g Semantic instruments

Outcome: an observer can explain meaningful actor actions and outcomes from
instruments without private messages, codes, tokens or recovery proofs. Sources
are the realtime action logger, server `actionLog`, action-count aggregates and
semantic start/stop regressions.

Normal traces distinguish the first actual movement and stop from repeated idle
ticks, plus sit/stand, zone changes and return. Denied, stale and conflict outcomes
remain distinct from saved changes. Reconnect or retry must not imply a second
durable effect. Identity/recovery/export, control, seats, rooms, cards and membership
lifecycle are within the instrumented scope.

Alternatives were raw frame dumps, command-only logging and semantic lifecycle
events. Raw 10 Hz positions obscure intent and increase volume/private exposure;
bounded semantic events are the chosen default. Once-at-transition stop logging
was corrected, and the parent observed a passing 22-test realtime checkpoint.
Load action aggregates support counts, not blind-human comprehension.

Status: REVIEWED WITH GAPS. Durable retry logs do not always distinguish receipt
replay from a fresh save; HTTP failure/context/latency fields remain minimal. A
C10 instruments-only group observation/demo, retention/access policy and deployed
inspection remain NOT RUN. Any further instrumentation must be declared after the
runtime freeze. Private text or credentials are not a debugging shortcut, and a
log count does not establish the student's understanding.

## S4.I6h Required checks, coverage, browser and CI

Outcome: future edits protect the actual usable core. Sources are the native mise
scripts, Vitest/Playwright configuration, maintained `spec/house-*.test.ts` files,
`tests/e2e`, supplied course checks and GitHub workflow. `pnpm check` runs type/spec
checks; `check:evidence` checks the submission sensors. Neither establishes prose
truth or human experience.

Paths include create/join/move/chat/return, typing/touch, owned DIY and saved rooms,
permitted visits/revocation, seats and author cards. Final lifecycle, recovery and
identity-fault browser cases remain separately tracked. Four earlier maintained
house journeys passed without retries on earlier dirty source bytes. Attributed
checkpoints include 35 client tests and scoped HTTP/realtime/store results of
8/22/22 tests. The parent-observed 32-test mocked UI checkpoint did not settle the
actual-client race; it must not be confused with the older 27-test/hash report in
UI-REFINEMENT. Native long-name regression moved from three red cases to three
green cases using real glyph grading. Twenty-three focused camera tests passed;
the native matched camera comparison is still in progress.

The alternatives are a favorable partial coverage percentage or coverage of actual
behavioral boundaries/flows. Choose the latter and disclose included/excluded
files and branches. The existing house coverage configuration excludes UI, world
and server, so its percentage cannot represent all surfaces. Earlier UI/world
reports also disclose branch/function gaps. Final current-candidate coverage and
integration checks remain required after the relevant refinements.

[CI verification](../implementation/CI-VERIFICATION.md) records the concrete repair:
the workflow now selects five bounded core/legacy tests against its intended
production Docker image, with an explicit matching localhost origin, Secure
cookies, bounded readiness, diagnostics/artifacts and cleanup. Actual native
service tests passed one house-core and four legacy cases using explicitly selected
Chromium revision 1234. A transcript false failure was corrected by checking the
literal message span rather than legitimate bold author labels. Matching revision
1243 / Chrome 153.0.8010.12 subsequently passed the cookie-only browser GET/fetch
round trip. The final five-test replay on that matching browser is HELD for stable
UI/world source and a parent release signal.

Fresh CI review's unbounded health-curl finding was repaired and contextually
rechecked. Native YAML/shell checks and a parameter-calibrated stalled-response
trial passed. Docker WSL integration is unavailable: image build/start, production
entrypoint and remote CI are NOT RUN. Status: REVIEWED WITH GAPS. Earlier browser
or scoped test results do not accept the final combined candidate.

## S4.I6i Release and production

Outcome: a verified candidate becomes usable while saved work survives. Sources
are the Dockerfile's Node 24.21.0/pnpm 11.9.0 pins, `fly.toml`'s one shared-CPU
256 MB machine and one initial 1 GB volume mounted at `/data`, server Origin checks,
Secure/HttpOnly/SameSite cookies, CSP/static allowlist, input bounds, rate limits
and session rechecks. Current Fly configuration sets `PUBLIC_ORIGIN` explicitly.
The rendered `/readme/` source links point to the repository; new files appear
there remotely only after an authorized push.

Normal paths require mounted startup, both stores healthy, authorized private-room
realtime and saved return. Wrong/absent data paths and unknown schema versions
must fail instead of reseeding. Shutdown must close Socket.IO, legacy SSE and
paused HTTP connections with a bounded result. Backup/rollback preserves compatible
schema and explains the loss of later writes.

The cookie actor remains authoritative. The intended-identity header rejects an
old draft under a different cookie; it is a precondition, not a credential. Room,
membership and controller fences must survive replay. The parent reproduced an
HTTP 200 versus expected 403 identity mismatch, then verified the repair and
matching-actor acceptance. Independent follow-up accepted that boundary, not a
complete security assessment or deployment.

Alternatives were immediate release, a verified candidate/backup rehearsal, or a
larger hosting shape. Retain the fixed course platform; do not upgrade resources
to conceal failed acceptance. Keep the secret hook and required dependency/audit/
diff gates. New public push/deploy requires scoped approval for the concrete
candidate. The recorded C8 URL is
https://comp4020-final-naaeeen.fly.dev/ and the `crit-8` tag still peels to `6dc79c5`.
Status: DEPLOYMENT NOT RUN. Prepare the final local candidate, checks and evidence
first. Credential rotation, paid services and permission bypasses are outside scope.

## S4.I6j Maintenance, content and sustainable growth

Outcome: extend rooms, furniture and interactions without breaking saved work or
turning the bounded core into a full builder. Sources are stable catalogue IDs and
footprints, layout/geometry templates, schema/version contracts, separate renderer/
domain/transport modules and the bounded SQL-plan map.

Normal growth adds licensed furniture/themes through stable categories, IDs,
palettes and anchors. Invalid footprints, blocked arrival corridors and unauthorized
edits remain denied. Concurrent revision conflicts preserve drafts; moving/removing
a chair resets or releases occupants coherently. Recovery requires deterministic
migration of saved rooms and safe refusal of unknown schema versions.

Alternatives are a broad catalogue/editor, a declarative bounded catalogue and a
full engine. The current six categories, ten pieces, grid placement, quarter-turns
and palettes bound expression. Follow-camera state remains transient; camera
movement/zoom does not change server collision geometry. B caches up to 96 constant
SQL plans, not permission/profile rows. Future dynamic SQL needs another bound and
memory review. Current fresh-read/error/schema-reprepare/close probes passed at
the recorded B checkpoint; the sustained gate remains separate.

Status: REVIEWED WITH GAPS. Maintain installed-version/license/reuse inventory,
migration rules and coherent module/check documentation. Database/model/content
compatibility and real device performance must support future expansion. Dependency
audit is still a final gate. Timers, uploads, CRDTs or a new engine are not automatic
requirements; larger physical rooms need a routing benefit and regression evidence.

## S4.I6k Evidence, course argument and understanding

Outcome: a reader can assess the purpose, choices, corrections and real capability.
Sources are authoritative PLAN, README, actual commit history, harness/spec, dated
source register, review/work logs, the detailed 43-ID register and lecture notes.

Each record preserves requirement -> observed version -> alternatives/protocol ->
result -> finding -> revision -> affected recheck -> actual commit -> gaps. Reject
claims that a passing build proves usefulness/enjoyment, synthetic load equals Fly,
model agreement equals human A/B, a hypothetical study ran, or A2 history counts
as new A3 work. A truthful compact handoff preserves continuation instead of stale
process descriptions or arbitrary restarts.

Alternatives are a feature catalogue, a test-count-only reflection and a causal
argument grounded in evidence. Choose concrete behavior: voluntary familiar-peer
help, an author-written next step, quiet co-study and owned private rooms. Demand
and preference remain unvalidated. Source facts, inference and owner hypotheses
stay distinct. C9 realtime, C10 instruments and the final rubric map to real
features and outstanding group/human steps, not a grade guarantee.

Local commits `53a03b4`, `a7f596a`, `eb59848`, `2f941e1`, `fc86f0f` and `1c44cb7`
exist in actual history. Integration/UI/operations/evidence changes remain dirty
and need cohesive commits. PROCESS is subject to student authorship/review; do not
invent feelings. Status: REVIEWED WITH GAPS. Final links, source hashes and actual
commit associations require reconciliation. The separately authorized global-method
installation is not evidence of improved application quality.

## S4.H1 Active A3 methods and loading

Invariant: later tasks repeatedly use appropriate methods for meaningful parts.
Sources are root AGENTS/CLAUDE, the active REPORT committed in `1c44cb7`, five
A3-adapted method files and corrected nested planning-source routing. Historical
A2 REPORT/18 trials remain provenance and were not rerun or relabelled. Current
paper attribution uses v3; the owner's cadence is policy, not universal proof.

The alternatives are a one-time instruction read or recurring checks scoped to the
current subsection, and wholesale historical A2 guidance or focused A3 routing.
The owner chose the granular recurring loop. Structural/qualitative calibration
supports loading and claim discipline; no matched agent-efficacy trial is claimed.

At entry/resume, section exit and substantial commits, read relevant guidance and
current source/state. New findings, failures or API changes trigger an earlier
revisit. Parallel work needs owned paths and respected freezes. Recovery requires
an updated handoff: a completed L2 run must not remain described as running. The
fresh-review routing exception permits a sanitized factual packet instead of a
mandatory verdict-bearing handoff; the observed packet contamination was corrected.

For the separate global-method request, the parent extracted reusable defaults and
a focused skill. Qualitative review exposed host-discovery and unavailable-review
handling gaps, then the parent installed corrected Windows/WSL copies with backups
and structural/reference checks. This reconciliation read the updated global
instructions on both hosts and the new skill. Current desktop injection is observed;
web/mobile synchronization is NOT RUN. Project deadlines, stack, English-only scope
and release permission were not imported as universal defaults.

Status: ACCEPTED LOCAL GUIDANCE, with behavioral efficacy NOT RUN. Continue checking
real outcomes. Guidance presence and review agreement do not establish effectiveness.

## S4.H2 Comparison and review validity

Invariant: a technique name cannot substitute for observed evidence. Sources are
active REPORT sections 4–6, the comparison method, memory/camera protocols and
review packets/results.

Alternatives include uncontrolled screenshots/model rankings, matched technical
diagnostics, fresh source review and registered human trials. Choose the evidence
type that can resolve the current decision; no method substitutes for a different
boundary or a real observed result.

Compare declared tasks, changed factors, matched environments, source hashes and
protected good/bad grading cases; retain failures/aborts. Use masks/order where
relevant. Fresh initial context and a later contextual recheck remain distinct.
Actual runtime versus mocked routes, static images versus interaction, reduced
viewport height versus physical IME, and human A/B versus model preference are
separate evidence. Sources and reviewer conclusions require critical checking.

Observed corrections remain explicit. One review started with fresh context but
its packet included a prior verdict; it was not fully blind, and parent routing
was corrected. Changed font conditions invalidated a matched glyph A/B claim.
Short SQL trials retain diagnostic classifications and slow-reader latencies.
Actual 40-W glyph overflow invalidated border-box grading. Actual-client integration
invalidated a repair accepted from mocked ACKs. Global qualitative scenarios are
not new agent A/B trials.

Status: REVIEWED WITH GAPS. Final camera comparison/review and corrected full load
results must be reconciled before acceptance. Human studies remain NOT RUN. Review
counts and current model agreement support no efficacy claim.

## S4.H3 Coordination, continuation and checkpoints

Outcome: complete sustained authorized work with bounded ownership and inspectable
history. Sources are native agents, current handoff, active goal, freeze manifests,
revisit register and work log. The parent owns final integration, reconciliation,
verification and commits.

The alternatives are fully sequential work, unbounded parallel edits and bounded
parallel lanes with explicit ownership/contracts/freezes. Independent research,
UI, client, world and CI work proceeds in parallel; dependent patch review stays
sequential. Holds need a reason, owner, next action and release signal.
The measured backend remains frozen; static world files not loaded by the benchmark
may change separately. New camera/global-method steering expands active work rather
than cancelling the core. Failed tools, occupied ports and thread limits are
infrastructure outcomes, not product defects or new permission.

The stale handoff that described completed L2 as running was corrected. A delayed
development restart initially left the camera module returning 404 on port 4093;
the parent verified the old server process before replacing only that development
listener. Frozen port 4097 was untouched. CI's isolated port 4096 fixture and its
final matching-browser replay have a documented hold/release condition.

Status: REVIEWED WITH GAPS. All 43 rows now have individual audit records and
attributed statuses; final checks, commits and local completion remain pending.
Stop resolved lanes and continue unresolved ones. Budget, time or context exhaustion
cannot make an unfinished objective complete. Human/deployment authorization stays
within its actual scope.


## Final source-bound reconciliation,7October

Parent independently parsed actual retained v3 L1/L2JSON:both PASS,allgates true,
allthirteen recorded hashes matched atmeasurement exit. L1/L2RSS165.160/169.031MiB,
1800.344/1800.367s,reliablep95101.968/103.042ms and2160deliveries each;zeroinvalid
normalmotion/unexpectedtimeouts,twelvefaultcycles andtwelvehealthyfinalviews.
Original/v2FAIL and shortCALIBRATION results remain retained. Livecalibration
fixture-route portability changes afterfreeze do not constitute another full trial;
exactmeasuredsource/protocol snapshots are retained separately.

Currentrequired195/typecheckPASS,expanded163coverage93.43lines/84.27statements/
77.47branches,the latter below80target. Nineteennativecasespassed acrossscopedruns;
finalindependent-from-author contextual73client/UIrecheck acceptedfouroriginalrepairs.
Busy-host maintainedfailures remainUNCONFIRMED;5s standalone diagnostic used adifferent
deadline,registered10s real/stubbothPASS thenunchangedmaintained2PASS underquietGPU.
No timeout wasraised. Newrootroomtest feedback/spawn predicates nowfollow actual
visible/persisted state; originalFalseFAIL retained. This resolveslocalI6f/I6h/H2
runtime/evaluator gates,notFly,physicaldevice,humanvalue,studentwriting orclassdemo.
