# Post-Crit review and refinement

22 October 2026. Base source `8cdad6ad17e698d5b02896d570afb7892f365351`.
This record separates independent findings, parent checks, revisions and acceptance.

## P0: first independent plan review

A fresh GPT-6 Astra/max reviewer received the factual goal, current source, plan,
resource snapshot and rubric without prior conversation or the decision lead's
verdict. It reviewed plan blob `68bf40d92ff2bd6869fd31e084fca84d031cc0e5` read-only.
It did not run browser, migration or load tests. Its conditional go applied only
to P1 and a P2 foundation after the first three contracts were clarified.

| Subsection | Finding checked against source | Refinement / next verification |
| --- | --- | --- |
| Camera comparison | Requiring every candidate to Follow prejudged stable framing. Observed coordinate changes also include reconciliation and seats. | Shared visible-actor/task criteria; Follow deadline only for A/B. Explicit temporary/locked/overview/edit transitions and intentional movement signals. Test blocked walks, routed/touch intent, cancellation and takeover. |
| My work ordering | Bedroom cards are empty; card writes advance lounge, while UI keys refresh by current-room sequence. | Self-only projection with lounge cursor; independent client high-water mark and scope. Test create/close/new, stale responses, bedroom saves and visiting another desk. |
| Presets and persistence | v1 constructor rejects later versions; no light or origin metadata exists. | Additive v2 fields, legacy standard light, stable catalogue IDs; explicit Apply replaces placements/palette/light while preserving door. Test archives, idempotence, rollback and restart. |
| Lounge and compatibility | Existing couch is decorative; old clients may retain old geometry after deployment. | Interaction inventory and compatibility/reload gate before release; compare routes with occupied seats and all capacities. |
| Shared table lifecycle | Disconnect retention alone allows abandonment; zone-bound pending leave could become ineligible. | Freeze ready/leave/resign/disconnect/replacement/restart rules before P4 code. Ensure local exit plus retry outside lounge; record terminal reasons. |
| Schedule and resources | Date-only target lacks allocation; original workload has more gates than RSS/p95. | Phase allowances, bounded prototype selection, preserve every gate, separate combined/constrained checks and receipt-growth measurement. |

Parent inspected the cited camera, store, realtime, client reducer/outbox and UI
paths. The confirmed findings changed the plan; agreement alone is not acceptance.
The source sends a fresh authorized snapshot after commands, so the proposed own
work projection can reuse that path, but real delivery tests are still required.
The same reviewer contextually rechecked plan blob
`2066af39404e5dde33426396dac125da49722bed` and approved P1 plus the bounded P2
foundation. This is a contextual recheck, not a second fresh review. It required
same-transaction own-work card/cursor reads, stale-envelope rejection before
updating the client cursor, room-command zone validation and preservation of dirty
furniture drafts when lighting advances the saved revision. Workers received those
requirements. No additional plan round is needed before these lanes start. P1/P2 implementation and
user/physical-device trials are not accepted by this document.

## Current evidence inventory

- Read-only live idle resource snapshot: `resource-baseline.json`.
- Primary research and declared comparisons: `RESEARCH.md`, `COMPARISONS.md`.
- Reproduced pre-fix camera regression and task protocol: `evidence/camera-protocol.md`.
- No completed camera/layout/game A/B trial, human preference study or new release.

## Owner model/permission update

The owner now permits GPT-6.1 Sol high through ultra for execution and GPT-6 Astra
high through max for decisions/review. Assign effort to uncertainty and consequence.
The current host reports full access with approval policy never. A new direct WSL
Git read succeeded. Stop reusing the old restricted terminal; this observation
establishes current command access, not a guarantee about future client sessions.

## P0 documentation checkpoint

Parent reopened the official Final Project brief, Three OrthographicCamera docs
and Discord Activities overview. They support the recorded course, scale and
embedding distinctions. Native evidence check passed (three Crit reflections, seven
resolving PROCESS commit citations); whitespace check passed. That documentation
check does not accept the intentionally failing P1 regression or new runtime.


## P2 foundation: implementation review and two refinements

A new history-free Astra/max reviewer inspected the frozen store/content/realtime
and client reducer changes against the factual persistence/ordering contract. It
found two actionable issues. The parent checked both against actual source.

| Finding | Reproduction and correction | Recheck |
| --- | --- | --- |
| Rose desk faces away from its chair | A general front-facing test failed Rose (-1.5 dot product) while five controls passed. Rotate only that desk from 1 to 3; footprint unchanged. | All six facing assertions and all arrival/target routes pass; 70 affected checks. |
| Clearing visible state loses the room cursor | Four new cases failed after clear/same-zone reselection/unacknowledged roundtrip, including the actual subscribe-before-ACK callback; one control passed. | Retain last accepted room stream/sequence independently of current display, reject stale envelopes before own-work mutation. All 70 client cases pass. |

The same reviewer contextually checked both final fixes and ran one isolated,
single-concurrency suite: 140 checks across five files passed. All four supplied
fix hashes matched before and after its run; no scoped blocker remained. Parent
inspected the final diff and reran native typecheck successfully. The current SQL
catalogue remains 57 constant statements under the existing 96 bound. Correctness
runs overlapped camera work; they are not resource or camera timing measurements.
Original source bindings remain unchanged in initial evidence; final bindings are
in `evidence/rooms-backend-orientation-refinement.json` and
`evidence/work-projection-review-refinement.json`.

Foundation acceptance permits a local implementation commit. P2 is not complete:
static module serving, My work/light/starter UI, dirty-draft conflict behavior,
actual multiuser room journeys and resource checks remain open. Parent and reviewer
also confirmed a pre-existing bedroom chair/backrest orientation mismatch; correct
its renderer convention and inspect actual seated poses during P2 UI integration.

The first staged whitespace check flagged a literal blank context line in a frozen
unified-diff evidence file. Preserve that byte-exact patch and classify only these
evidence patches in .gitattributes; do not trim its context or change runtime rules.
The subsequent staged check must pass. Credential scanning remains unchanged.


## P1 closure: control behavior, camera choice and readable people

The first fresh Astra/xhigh source review found two regressions missed by the
initial scripted task: focused HUD buttons prevented walking, and the expanded
landscape movement pad covered Follow. Native negative cases reproduced both.
The worker narrowed input isolation, preserved keyboard focus, moved short-height
controls and tested real pointer IDs/cancellation. Contextual review accepted the
fixes after inspecting current hashes and native results.

A separate history-free Astra/max policy review examined original-resolution A/B/C
images and measurements without the earlier preferred winner. It selected centered
Follow B for the owner's requested player anchor. Both A/B had passed mechanics;
less camera movement did not determine the choice. B's greater framing travel is
an explicit cost. C remains Overview, with 21.24/11.33px portrait actors unsuitable
for the declared default prominence target. No human preference was measured.

Parent and policy reviewer also saw labels covering heads/torsos despite a passing
72px bounding box. Predeclared body/label checks then failed. Actual posed body
rectangles now constrain the existing label packer. A later no-self observer case
exposed an early-return gap: two peer fixtures produced zero exclusions. The
bounded correction measures peers before optional self diagnostics. The final
168 tests and direct typecheck pass; fresh review plus contextual refinements find
no remaining scoped implementation blocker.

Full B four-view/reduced-motion and touch checks remain bound to world aaafa3df;
the final observer-only change is world b4e88e4b. Its affected native observer cases
pass portrait/landscape with 12 audited samples each and a current controller
smoke. Parent inspected original-resolution Robin/Taylor and observer screenshots:
bodies are clear and labels/messages attributable. Long shared-prefix names still
need roster/full-text fallback. These are real independent browser identities,
not human preference or physical-device trials. The final manifest keeps the two
source scopes separate and preserves exact original comparison source bytes.

P1 is accepted for a local commit and P2 UI handoff. Its isolated backend is d95055b;
whole-app acceptance against the separately committed P2 backend and the future
lounge/game remains open. No historical coverage percentage was relabelled as a
new observer-run measurement. P2 retains the separate bedroom chair-pose correction.


## P2 UI closure: useful rooms and recoverable edits

The Sol/ultra implementation followed a history-free Astra plan review and separate
fresh implementation review. Confirmed async findings changed the code: Close must
use the acknowledged card revision before its snapshot arrives; observer actions
must stop before creating outbox entries; a starter ACK cannot pair old fields
with a new room revision; explicit and automatic outbox settlement need bounded UI
reconciliation. Targeted failures preceded the fixes. Lighting advances only known
matching draft bases, and uncertain starter retries retain the original choice.

The parent reviewed actual source (including admission remaining separate from the
new live-controller save guard), ran all 77 current UI tests independently and
inspected original-resolution room, seated Follow and scrolled My work images.
The chair now faces its desk with its backrest behind the avatar. The new global
heading keeps the 44px Close panel action visible at the bottom of long forms,
distinct from Close card. A small content-bleed strip above the sticky header is a
remaining visual polish item, not a failed exit or data-preservation check.

The complete two-identity task passes all 13 declared criteria at desktop,
portrait and landscape. That full run precedes only the sticky-header CSS. Current
CSS has separate affected three-viewport Close/return/same-card checks and readable
Follow seated captures. A historical 160ms desktop zero-motion sample remains
unexplained; later bounded functional movement is not a 160ms latency pass. Exact
source scopes live in P2-ROOM-UI.md and the fulltask/final source manifests.

One known P1 evaluator error recurred: reading projected targets immediately after
a camera-mode change. The shared house-journey helper now waits for the actual RAF
projection boundary and matches placement IDs, and the P2 runner imports it.
This turns the repeated guidance into executable test practice. Raycast controls
passed without production geometry changes; the failed selector/timing attempts
remain recorded.

Final affected 320-check suite, typecheck and scoped diff pass. Reported scoped
coverage is 96.29% lines / 81.85% branches; UI branch/function gaps remain stated in
the worker record. Fresh/contextual review has no actionable scoped finding.
P2 is accepted locally; full six-resident integration, sustained resource gates,
physical devices and real-friend judgment remain P6 work. No release is claimed.

## P3/P4 and compatibility checkpoints, 22 October

The parent selected expanded20x14 after inspecting original-resolution matched
images and measured routes. All115 scoped geometry/world checks and six isolated
renderer cases passed. A fresh review's peer fallback-arrival finding was repaired.
A native seat failure came from the test mutating an already-held snapshot; the
corrected immutable fixture, retained diagnostic and negative distinction are in
lounge-review.md. Parent verified all declared source hashes before commitf11eb13.

P4 backend independently reviewed70 checks. Reproduced fixes prevent recycled
round IDs, pause an expired controlling session before lease deletion, and deliver
a pause persisted after transient storage failure. One captured operation time
prevents crossing maintenance expiry between validation and application. The UI
review found delayed Join/Return could retain a slot, focus on a newly-full column
could be lost, and inspecting Pending on motion would issue excessive HTTP reads.
Fixes bind deferred withdrawal to the original Join receipt and refresh on relevant
authority/game changes. Actual two-client native play, both-party Resume, keyboard,
touch and real My work return passed allthree viewports. See game-backend-* and
game-ui-* evidence for exact source/check scopes.

A fresh Astra/max compatibility/voice review ran132 focused checks and real-socket
voice/legacy probes; no actionable assigned-boundary issue remained. Parent's
new-version boundary tests reproduced9 failures before the gate;121 combined
client/server checks then passed. Legacy recovery never installs avatars/acquires
control. New clients latch mismatches while inspection/export remains available.
The independent frozen8cdad6a browser lane retains both a fixture failure and an
insufficient firstPASS: review required successful original ACK evidence, not only
an empty pending queue, and immutable old served hashes. The corrected cutover run
verifies exact lost-ACK replay and v1→v4 preservation;7 grader negative controls
pass. Later UI edits retain separate source scope. See compat-browser-checks.md.

## P5 update/voice UI refinements

Owner voice configuration uses a validated external destination and independent
revision. Newer local edits survive ACKs, cleared invitations cannot reappear via
old bedroom snapshots, and activity metadata omits URLs. Neutral update export
captures available local drafts before the display is cleared, with identity,
house, zone and revision context; Pending remains inspectable without reconnect.

Fresh Astra/max UI review reproduced two defects beyond the passing initial tests:
expired persisted voice intents did not block a freshUUID save, and changing
identity during export cleared every screen without presenting a next action.
Parent reproduced both as85PASS/2FAIL, then added inspected-outbox guards and an
explicit current-identity title transition. All87UI tests pass; contextual review
passes5 targeted cases with no remaining scoped issue. Native current UI is the
next independent gate. No model judgement or screenshot is called human validation.

## P6 native and resource milestone, 22 October

Current production source is ff949bc. The clock-correction reviewer reproduced
unreadable persisted rounds after a backward wall-clock change; six meaningful
regressions preceded the bounded timestamp floor. The 70 affected checks and fresh
contextual recheck passed. The complete required run then passed 863 tests.
Later resource-binding tests have a separate 25-test result, not a fabricated new
full-suite total. See game-clock-* and p6-required-current.json.

Current voice/update recovery and six-resident capabilities have source-bound
native evidence. The six-person study, rest and game cases are separate scopes;
the game has two players and four watchers. Earlier saturation, setup and route
failures remain preserved. The full-size 45-second route timeout has no confirmed
cause. Current requirements now add three to six actual contributors, which these
records do not satisfy. See six-browser-aggregate.json and both native handoffs.

A maintained two-context study -> break -> My work test now covers owner-configured
voice links, watcher admission, explicit play, shared moves, phone fit, neutral
withdrawal and saved next-step/Quiet preservation. Its first application attempt
passed; a separate earlier no-listener infrastructure failure remains recorded.
Parent independently recomputed all 496 source hashes, inspected the native phone
image and checked the closure record. No real Discord call or media test is claimed.
The About selector repair resolves an actual hidden-link ambiguity while retaining
painted-surface and pointer-hit assertions. No runtime change was needed.

The original 300-second workload passed all 21 gates; the separate combined game
workload passed all 23. Parent read the raw-bound acceptance and checked instrument
scope; a combined-only missing houseId was repaired after a genuine failure, not by
weakening server validation. The earlier original result remains bound to its exact
instrument. Passing sampled process RSS does not prove Fly enforcement or host-wide
memory. Storage analysis exposed 174.11 MiB logical growth, mostly retained board
responses; that result opens a real storage-improvement subsection.

A new history-free Astra/max validation reviewer inspected actual patches, raw
native results, 496 current source hashes, preserved resource protocols/results and
manifest. It independently ran 17 focused checks, skipped the live-service case
rather than presenting it as run, and regraded current success plus preserved
failure. No actionable milestone issue remained. Parent reconciled these findings
with source and existing acceptance; this review does not rerun browser/load/human
or Docker CI. All owned services and resource jobs are closed.

Local validation milestone is ready for a focused commit. New group participation,
room-purpose refinement, lossless receipt-storage work and their later acceptance
remain open; no overall goal completion or publication is implied.

## P7 receipt representation and migration review

The compact representation preserves exact accepted responses and the original
idempotency identity. Raw fallback compares actual SQLite text encoding, based on
the parent-reproduced UTF-16 counterexample. Initial red cases preceded the codec;
a fresh implementation review then found an added CHECK schema could be promoted
before a compressed write failed. A representative insertion probe was rejected
because it cannot establish arbitrary CHECK compatibility. The bounded solution
supports the application's canonical receipt schema, with harmless formatting
normalization and explicit rejection of persistent triggers/indexes.

A contextual review found a further mixed-case table-name lookup gap. The parent
reproduced it, the new regression failed before NOCASE was added, and all 213 board
tests then passed. Canonical UTF-8/UTF-16 migration positives remain alongside the
denials. The reviewer's final eight-case recheck closes both findings; the parent
inspected final code/hashes and ran the integrated 1,037-test suite. See
[evidence/storage-codec-review-closure.json](evidence/storage-codec-review-closure.json).
This qualifies a local implementation milestone, with native and sustained storage
acceptance still pending. Earlier passing workload results do not accept this source.


## P7 picture authority and client foundation

The actual prototype comparison selected a 12-piece page over a scrolling tray for
inventory visibility on the small view. It has a keyboard navigation tradeoff;
scripted activation counts are not solving time or user preference. A fresh review
caught a clipped transcript despite passing form checks. The affected landscape
repair retains separate source bindings from the full six-case prototype run.
The original illustration and immutable 24-piece mapping were then frozen.

Backend review traced rejected actions through consent cleanup. A revoked-bedroom
observer's denied takeover could remove the legitimate lounge controller from the
picture. A real access regression and malformed-input negatives now require
read-only preflight before cleanup, while preserving timely cleanup when later
housekeeping fails. All 203 affected tests and the contextual review pass; parent
recomputed all 12 source entries and inspected the actual authority path.

Client review found a different liveness boundary: a legitimately returned lounge
head could have exactly the same roster revision after bedroom revocation. The
client now admits that unchanged safe head under fresh authority without restoring
old consent. Its bounded comparison key retains prior member IDs until identity,
house or terminal disposal changes; it is not a secret or a reconstructed roster.
The original four-case reproduction and all 127 maintained client cases pass on
the repaired source. Parent checked source identities and integrated version scope.

See GROUP-BACKEND-NOTES.md, GROUP-CLIENT-NOTES.md and their linked failed/green
records. This foundation does not inherit the prototype's native layout result.
The real app's first landscape run separately exposed chat occlusion and clipping;
those fixes and three/six-browser participation remain native integration gates.
