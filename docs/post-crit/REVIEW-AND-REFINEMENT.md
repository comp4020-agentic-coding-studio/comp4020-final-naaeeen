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
