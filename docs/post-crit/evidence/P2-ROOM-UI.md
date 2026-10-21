# P2 useful room UI and recovery evidence

Working source based on P1 `1699d44` and room foundation `1671cec`; local only.
The parent owns final integration, acceptance and commit. Current native results
and exact source hashes are adjacent JSON files; earlier attempts remain scoped.

## Requirement and implementation trail

| Subsection | Evidence and decision | Refinement and verification |
| --- | --- | --- |
| One useful work card | Existing author-owned study-card form is reused as My work. The lounge retains house cards; bedrooms display only current user's active card. Every visited desk opens the visitor's work, with explicit house visibility. | Work refresh, ACK wait/retirement and Close use the independent ownWork cursor. Tests cover unchanged room cursor, delayed ACK before snapshot, newer drafts, close/new card, observer and authorized reconnect. |
| Native useful objects | Existing preset geometry and collision routes remain canonical; desk/lamp approach points are computed once per room rebuild. Placement IDs disambiguate multiple objects. | Actual raycasts cover desk/lamp rotations and chair picking. Only bedroom chair's visual group gains pi; square footprints and stored seat headings do not change. |
| Saved lighting | Separate owner lighting form, reached from lamps or My room, changes only standard/cosy/dim. Standard retains original light parameters; other settings change actual hemisphere, sun and lamp illumination. | Matching dirty settings/layout bases advance only for this known-independent command. Stale bases remain stale. Explicit Use saved lighting resets only lighting; denied/late callbacks keep private DOM cleared. |
| Optional starter adoption | SVG uses real preset footprints and shows furniture, palette, lighting replacement and retained door state. Preview leaves saved content/drafts alone. Apply requires save or explicit discard of existing drafts. | Original UUID/revision/preset survive uncertain replies. Per-section version counters retain newer drafts. A known starter ACK blocks edits until the corresponding actual room snapshot arrives; old values never gain the new revision. |
| Pending recovery | Original pending destination remains fixed. Pending-panel retry/discard and actual outbox inspection reconcile UI memory; active requests are excluded from reconciliation. | Empty outbox after automatic settlement no longer permanently blocks Apply. A direct Check pending room actions button and a one-time room-open check provide recovery without polling. |
| Data and permission boundaries | Reuses current v2 store/client foundation; no camera/client/store/shared-geometry/game production edits. New server change only serves house-room-content.js. | Current real backend on isolated 4102/data verifies visitors, door close, observer, reload/restart and removal; original 4093/data is untouched. Foundation migration/ownership tests retain their distinct source scope. |

## Independent review and reconciliation

Plan review: `room_ui_plan_review`, reviewer role, GPT-6 Astra max, history none,
read-only. Findings traced stale Close after ACK, observer outbox queuing,
room-only work refresh and missing placement identity. These became focused REDs.

Implementation review: `room_ui_fresh_review`, reviewer role, GPT-6 Astra max,
history none, read-only. Its Node/JSDOM reproductions exposed stale starter values
paired with new revision and explicit Pending-panel map ghosts. The worker added
three failing tests and the snapshot gate / explicit reconciliation. Contextual
recheck identified automatic settlements; two more failing tests covered empty
outbox recovery and stale lighting reset. The reviewer ran 16 P2 tests and found no
further actionable defects in those refinements. This is one fresh review plus
contextual rechecks, not several independent trials. Browser/resource checks were
outside that review. Parent reproduction/final checks are separate.

## Harness correction and actual trial limits

P1 had already documented that mode changes precede RAF projection metadata.
The duplicated P2 runner repeated that known gap. Maintained house-journey.ts now
exports a bounded two-RAF wait, used after chooseCamera and before projected clicks;
it also filters exact placement IDs. P2 runner reuse is verified separately.
Frozen P1 scripts and hashes remain untouched. No geometry changed to accommodate
fixture timing. Eight desk/lamp raycast cases passed unchanged source and served
as discriminating checks against a false production diagnosis.

Initial native attempt targeted a hidden Options House settings button instead
of the actual HUD button (evaluator failure). Second attempt read projection too
early after Overview (known evaluator gap). Third exceeded the runner's inherited
5-second cold-render wait, while its later screenshot showed the actual joined
lounge; this is an initialization timing failure, not a measured interaction
latency result. JSON records are retained. Initial failure PNG paths were reused
and overwritten by the second attempt; no missing first screenshot is claimed.
Later failure files and full-resolution current PNGs remain distinct.

These results are synthetic-identity localhost browser evidence. They are not
physical-device performance, human preference, friend evaluation, deployment or
the unchanged 300-second combined resource gate. No productivity benefit follows.

## Parent artifact finding and final affected checks

Parent inspection of the original landscape work PNG found that the long form
scrolled My work and Close panel offscreen while Close card remained visible.
Native wheel-to-bottom RED confirmed close y=-137 at390x844 and y=-565 at844x390,
44x44 but hit=false. The existing panel heading is now sticky and opaque; no new
confirmation flow or card action change was added. Final native actual hit checks
find the44x44 Close panel at y41/y53 in portrait/landscape; Close returns keyboard
control and preserves the same active card/revision at all3viewports. Follow-mode
seated images show actual desktop128px and portrait72px avatars. Earlier Overview
images verify sit/stand only and do not prove readable seated pose.

The first focused desktop attempt recorded zero movement after a fixed160ms hold.
Its cause remains UNKNOWN. The later evaluator holds until >.01 local displacement
within a3second bound and releases the key in finally. This is functional evidence,
not160ms responsiveness or a diagnosis of the old sample. The failed partial result
is retained. Future recurrence should record focused target, observable control
prerequisites/private canControl exposure limits, seat state, local/authorized
server poses, collision-valid direction and actual input-to-observed latency before
assigning a cause. No additional trial was run solely to explain the old sample.

The original full task and shared-helper runs preceded only this final sticky CSS.
Their immutable manifests retain their original CSS hash; final affected shell
results/manifest bind current CSS. Other production hashes match. The final review
contextual recheck verified source/evaluator hashes and recorded all3shell flows
and both Follow poses, with no remaining actionable findings. It ran no new browser.

Final affected checks:320/320 tests in8files; typecheck and diff checks are recorded
separately. Scoped line/branch coverage:96.29%/81.85% aggregate; UI95.38%/78.29%,
world97.30%/85.93%, content94.73%/94.11%. UI function coverage is79.87%; the narrower
branch/function gaps remain explicit rather than inflated by aggregate coverage.
See rooms-ui-tests.results.json for actual scope/failures and source bindings.
