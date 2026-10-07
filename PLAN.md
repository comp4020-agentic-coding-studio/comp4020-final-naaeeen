# Current acceptance: verified movement and evaluator release

Runtime `5c40545` and evaluator `e54a694` pass actual CI `37603266802` at
`daef80c`: 495 required checks, nine native cases, unchanged 300-second resource
gates, backups, deployment and affected live flows. Read
[the current release record](docs/implementation/MOVEMENT-RECONCILIATION.md) and
[exact result](evaluation/movement-reconciliation.results.json). Earlier scoped
results and failures remain history; physical/human/coverage/student-writing
limits are preserved. Final evidence-only publication has unchanged runtime.

# Active redesign extension, 7 October 2026

The owner tried the local core and requested a substantial game UI/UX, spatial and
camera redesign plus a full standalone-capable shared whiteboard with movable chat.
[Owner brief](docs/product/OWNER-REDESIGN-2026-10-07.md) and
[phased implementation extension](docs/implementation/REDESIGN-PLAN.md) are the
current scope and subsection gates. They supersede the earlier card-only board and
drawing-as-future cut line below. This root remains the single authoritative plan;
the preserved sections retain product rationale and historical delivery evidence.

Current source separates the author-owned study cards from the shared drawing
canvas. The historical card-only row, drawing/upload cut order and two-database
statements below describe S0–S4, before this owner-authorised extension. The current
board has its own authority, image BLOBs, element-level reconciliation, explicit
quotas and a third SQLite file. It does not inherit acceptance from the previous
195-test candidate or thirty-minute L1/L2 workload.

Prior source-specific release acceptance was VERIFIED: runtime ee40225 at b95d9a1 passes
CI37594001833,465requiredchecks,nine browser cases,the registered300s resource
exercise,mounted backup/deploy,and selected revised live game/room flows. See
[final release](docs/implementation/FINAL-RELEASE.md) and
[exact closure](evaluation/final-release.results.json). Earlier metadata/GPU
failures remain preserved. This does not establish physical-device or human value
results; board unit coverage and student personal writing gaps remain explicit.

Current local acceptance and operational limits are reconciled in
[redesign validation](docs/implementation/REDESIGN-VALIDATION.md). R4 keeps the
provided course checks and public-repository/deploy conditions, adds the maintained
standalone-board browser cases, preserves the Crit 8 tag and original user data,
and provides the local preview and verified deployed app. Physical phones, sustained
resource use on the actual Fly VM, WAN impairment, a real friend value pilot and
student-authored PROCESS/reflections remain separate gates.


# Shared Study House: purpose-first delivery plan

6 October 2026. Authorised implementation is active; see docs/implementation/ACTIVE-TASK.md.
This root PLAN.md is the one active plan. Prior plans are preserved in
[history](docs/history/before-purpose-refinement/PLAN.md). Technical progress does
not decide what the product is for.

## 1. The decision in one paragraph

For 2-6 already-known university friends studying the same or related subjects
during an overlapping evening,build a small game-like house that helps someone
who is stuck find a voluntarily willing peer,have a short text conversation,and
keep an author-written next step for later. Friends may also sit quietly together.
The primary user outcome is one clarified next step,with willing participants
and minimal unwanted interruption. This is a provisional value hypothesis,not
validated demand or a claim of higher productivity/grades.

Read [PRODUCT-POSITIONING](docs/product/PRODUCT-POSITIONING.md) for target,trigger,
purpose,selling point,fair alternatives and falsifiers. Original [house requirements](docs/product/OWNER-BRIEF-2026-10-06.md)
and [new purpose request](docs/product/OWNER-POSITIONING-ADDENDUM-2026-10-06.md)
remain authoritative. If owner/user evidence points elsewhere,we can restart the
positioning before production code; no previous answer is a design constraint.

## 2. Why this rather than a feature collection

Current gogh,Virtual Cottage2,Mini Cozy Room and On-Together already offer much of
avatar/decoration/co-study/chat. Gather and Discord preserve discussion;Focusmate
supports familiar partners. None of those capabilities alone is our innovation.
The candidate difference is the default low-pressure familiar-peer task flow.

Compare fairly against private Discord with status convention,pinned question
format,threads and a next-step summary. If the group prefers it,or questions are
rare/uncomfortable,the house has not earned its extra interaction cost.
[Current evidence](docs/research/2026-10-06-positioning-evidence.md) records product
updates and papers;[comparison](docs/planning/POSITIONING-COMPARISON.md) records
four candidates and two fresh evaluations. Agreement is model judgement,not a
human A/B win. Candidate A,simply starting/finishing alongside friends,is a pivot
option requiring its own evidence,not an automatically successful fallback.

Research suggests awareness and shared conventions matter;room geometry does
not itself create a meaningful place. Avatar location is not actual attention,
and no paper proves this house improves students' results. We test presence and
ownership because they are chosen experiential values,not by inventing a study
benefit for every requested feature.

## 3. A single complete usage loop

Join the known house -> recognise actual friends -> choose Quiet/Can chat ->
sit/work -> optionally post goal/question/context -> a willing friend replies ->
walk/talk -> author records next step -> continue or leave -> retrieve it later.

No decoration,goal entry or help request is required before ordinary movement/chat.
No automatic pairing,queue,helper assignment,forced timer,teleport or compulsory
reply. Door permission,connection presence and declared availability are distinct.
A conversation corner is a social cue;it does not silently make public-room chat private.
The help loop is in the lounge:connected+present there+self-declared Can chat
identifies currently approachable peers. Bedroom retreat never changes willingness
or door permission automatically;no cross-room summoning feature is required.

## 4. First-release cut line

| Keep complete | Bound precisely | Enhance only after a measured need |
| --- | --- | --- |
| Unique house code;2-6 permanent members | One active house/identity;capacity fixed initially | Multi-house selector/public discovery |
| Own bedrooms/doors and recognisable DIY | Six furniture categories,up to10pieces,grid move/quarter-turn/palette | Large catalogue/modular building/clothing |
| Controllable real avatars and text | Idle/walk/sit/stand;fixed-angle close follow+Overview;bounded bubbles/transcript | Extra reactions/free orbit/photo modes |
| Shared seats and voluntary quiet study | Explicit Quiet/Can chat;no attention inference | Shared timer under reviewed deadline contract |
| Useful live shared board | One active card/member,up to12inactive cards(closed/ownerLeft);18total | Pen strokes,uploads,filters,rich canvas/CRDT |
| Safe saved return and basic recovery | Cookie identity,recovery proof,room/card persistence | Full archive/history-management UI |

Card fields: small goal,optional question,optional resource link,next step,
helpRequested choice,state(active/closed/ownerLeft),author/UUID/revision. Author controls
content/outcome;peers respond in ordinary chat. No additional offer workflow until
a pilot shows replies are hard to notice. Independent cards update without
overwriting others;conflicting edits retain the draft.

Minimum safety/private room rules and graceful departure are retained;we do not
expose a boundary while dropping its protection. Their smallest mechanisms belong
in the implementation budget. A full archive browser is not a launch feature.
[Reliability design](docs/architecture/SHARED-HOUSE-IMPLEMENTATION.md) retains
detailed lifecycle rules and clearly marks timer/drawing/image extensions.

## 5. Evidence and gates before expanding

G0,target fit: owner assists access to at least two existing-friend pairs or one
3-4person group. Ask for recent co-study/help episodes and actual current tools.
Recruitment and interviews are NOT RUN. Strong requests scripted by us demonstrate
usability only,not naturally occurring need. If B has no meaningful trigger,pivot
before building specialised workflow.

G1,integrated loop: two real browsers create/join,see real movement,exchange text,
save identity/a chat message and reconnect;the useful card loop is completed in S3. Separate successful network/layout spikes do not
meet this gate. No extra furniture,timers or uploads until this works.

G2,value pilot: chosen task versus configured Discord;counterbalance order,
bounded sessions,record coaching,correct willingness interpretation,unwanted
interruption,extra setup/movement,next-step findability and reasoned reuse choice.
[Protocol](evaluation/positioning.protocol.json) contains B's tentative scenario;
it is not a four-way human winner test. Register the final participant protocol
before any trial. No human trial has run.

G3,return: observe next-day retrieval/continuation and whether return was voluntary
or prompted. If only decorating is valued,revise the purpose argument. If a baseline
is preferable,record that rather than hide the result.

## 6. Implement by section inside usable vertical phases

These are exact responsibility boundaries,not invitations to implement disconnected
layers for a week. Every phase has a working user story,actual version,checks,
review and a decision about the next phase.

| Section | Inputs/outputs and ownership | First acceptance |
| --- | --- | --- |
| I1 Identity/house/store | Server-resolved identity,code,permanent slots/rooms;atomic commands and migration | Same identity returns to full house;last-slot race yields one claimant;safe transfer/leave/remove/export |
| I2 Realtime/client reducer | Authorised snapshot/cursor,input generation,chat/presence events | Two browsers agree;no stale private response or duplicate avatar |
| I3 World/avatar/input | Template/catalogue state and real players -> fixed-angle3D,collision,door/seat targets | Keyboard/touch move,talk,sit,enter/return;typing never drives |
| I4 Shared card board | Author goal/question/next-step intent -> per-card revision/persistence | Two cards edited concurrently;no losing draft or falsely closed request |
| I5 UI/room expression | Lobby,contextual HUD,transcript,DIY and willingness controls | Who/where/willingness understood;friend recognises personal corner |
| I6 Verification/instruments | Invariants,browser flows,structured action events,restore/load evidence | Promised core works at both viewports and fixed Fly shape |

Freeze interfaces before splitting workers. Parent owns contract,integration,
grading and final verification. Workers get non-overlapping paths,preserve others
and use available roles/skills. Fresh review is read-only;source and actual runtime
outcomes can overrule confident agent output.

## 7. Phases,dependencies and estimated budget

Assume one accountable owner with roughly5-6focused hours/day and bounded AI
assistance. Estimate58-73implementation/verification hours plus2-4for the initial target check
and10-14reserve:70-91hours,not measured evidence or a guarantee. If only3hours/day are available,
extend the calendar instead of deleting the owner-core experience.
Day numbers start at implementation;exact next Crit cutoff is verified separately.

| Phase / target | Sections and user story | Work breakdown | Exit gate / artifact | Estimate |
| --- | --- | --- | --- | --- |
| S0,current | Purpose/cutline and target access | Current sources,candidate comparison,owner/user episodes,decision | This plan+G0result;do not claim demand yet | Research done;2-4h future target check |
| S1,days1-3 | I1-I3,I5-I6:invite a friend and actually meet | Identity/code/rooms skeleton5-6h;realtime4-5h;simple world/lobby with basic phone controls4-5h;integration/review3-4h | Two-browser create/join/move/chat/save identity+chat/rejoin on both viewports with basic touch/input;basic action logs;small commit+evidence |16-20h |
| S2,days4-6 | I1-I3,I5:stay and make the place yours | Door access/seat leases4-5h;room+bounded DIY4-5h;recovery/migration/minimal membership lifecycle4-6h;paired use/review2-3h | Own room/visits saved;willingness follows reconnect policy;revocation/races and minimal transfer/last-leave/remove/rotation/export tested;first uncoached scene use |14-19h |
| S3,days7-9 | I1-I2,I4-I5:one request to one next step | Card schema/UI4-5h;sync/conflicts3-4h;complete task/return/review3h | Live useful board;author-controlled result;departure card/overflow/export tested;next-day task;G2preparation |10-12h |
| S4,days10-14 | I1-I6:hold up under real use | Phone/keyboard/slow network5-6h;load/logs/restore5-6h;value pilot3-4h;fixes/docs/release candidate5-6h | Fixed resource tests,verified deployed candidate after authorisation,course evidence and G2/G3observations |18-22h |
| Reserve | Confirmed failures only | Integration/device/review fixes | No automatic feature expansion |10-14h |

Dependency chain:
S0 -> S1 -> S2 -> S3 -> S4.
Within S1,I1 identity/command interface precedes I2 events and I3 real avatar binding.
I3 primitives may be prototyped concurrently,but first delivery integrates them.
S2 room permissions precede guest data. I1/I2/I5 deliver minimal owner transfer,
sole-resident archive,member removal/code rotation/reinstatement and own-data export
in S2;no full archive browsing UI. S3 extends the same departure transaction with
card ownerLeft/snapshot/retention behaviour and tests. S3 small card schema precedes
richer board.
Human feedback begins as soon as S1 works,not only on day14. Instrumentation starts
with semantic commands,not a last-minute dashboard. No new horizontal milestone
is accepted without the associated usable story.

Every phase ends with: frozen candidate -> required/affected checks -> independent
review -> parent verification/refinement -> focused commit -> evidence/harness
update -> go/pivot/hold decision. Passing a code test cannot replace value judgement.

## 8. Acceptance and stop conditions

Core behavioural checks:2-6capacity,unique code,ownership,room access/revocation,
control takeover,seat races,UUID retry,stream order,avatar collision and per-card
conflict preservation. Recovery must return an existing member rather than steal
another slot. Archive ownership is protected even though an archive product UI
is deferred. Author marking a card closed does not prove a correct academic answer.

Real browser task at1920x1080 and390x844:join -> approach/greet -> choose willingness
-> sit -> question card/chat -> next step -> own room/DIY/visit -> reload/reconnect.
Exercise resize,keyboard,touch and actual IME/phone where available.
Do not require all users to post help or decorate before they can use the house.

Retain the exact production L1/L2loads from the architecture doc:12total connections
in either one six-person house+six observers or two six-person houses with12controllers;
bounded movement/chat/card updates,slow readers,30minutes,RSS<=180MiB and reliable
changes p95<=1second. Original v1 trials and statement-reuse v2 trials retained FAIL outcomes; repaired
pacing-v3 full trials passed both configurations with the same gates. Short calibrations
cannot substitute. See operational/refinement evidence for individual results. Test migration/backup restoration before any database release.

The current workflow wires a bounded five-test browser lane against its production
image with configured localhost origin and Secure cookies. Local native rehearsal
passed; Docker/image/remote workflow execution remains unverified here. Run actual pnpm check and
check:evidence,affected tests,dependency/secret checks;report coverage scope.
Do not create application coverage for prose.

Budget cut order:timer -> pen/images ->extra catalogue/reactions -> full archive UI.
Core movement,real chat,owned room/shared place/useful board stay. If core remains
infeasible,extend schedule or explicitly revisit owner constraints,not mark done.

## 9. The HD case and what evidence earns it

[Official assessment](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/)
expects a focused response,corroborated choices/corrections and robust actual use.
There is no feature-count strategy or grade guarantee.

Our proposed good: peer help starts voluntarily,a quiet resident is not forcibly
summoned,and the requester keeps an actionable next step. README states target,
purpose,alternatives and limits;CLAUDE guards truth/quiet/ownership;spec protects
checkable properties;people judge comfort,embodiment,ownership and usefulness.
A curated source-to-choice-to-test-to-commit chain matters more than a catalogue
of APIs or agent reviews. The owner authors personal PROCESS/reflections from
actual events;we do not fabricate feelings or human trials.

C9 requires deployed realtime plus one consequential multiplayer behaviour decision:
explicit willingness or card conflict/quiet delivery is suitable if implemented.
C10 requires server action logs/live observation and an instruments-only group demo.
Log meaningful actor/action/time/outcome,not private text,codes or raw motion frames.
Keep the earlier Crit8 tag frozen. Final course page states noon Monday9November2026;the working timezone is Sydney;
the two-week budget is not that deadline and may not cover the next Crit cutoff.

## 10. Continuation and current evidence status

When the core is valued,add licensed catalogue/theme variants through stable IDs,
footprints,seat/door anchors and versioned schemas. Test existing-room migration.
Only a demonstrated need earns drawing/uploads/timers/multiple houses or a CRDT.
The current Node/SQLite/Three+Socket option remains economical;switch rendering
only for measured device/interaction problems.2D does not solve a weak user goal.

The earlier S1–S4 local core was completed; its historical evidence is preserved. Human need/preference NOT RUN. Pinned production Socket.IO packages and
private house authority/world/UI now exist; no new candidate has been published.
Read docs/implementation/VALIDATION.md and HARNESS-AUDIT.md for actual status.
[Positioning decision record](docs/planning/POSITIONING-COMPARISON.md) and
[worklog](docs/planning/WORKLOG.md) separate completed planning from future gates.

The authorised S1–S4 local core is complete. Current implementation, native checks
and source-bound sustained acceptance are recorded in
[VALIDATION](docs/implementation/VALIDATION.md). Remaining external and student
gates are tracked separately. Check G0 context first when
people are available;otherwise reversible S1 work proceeds under the recorded
hypothesis and value remains unvalidated. Do not expand specialised mechanics or
claim usefulness without the appropriate human evidence. No extra approval gate
is inferred from missing user-study data.

Harness gates: before phase entry/exit and each substantial commit, reconcile
applicable rules with evidence and record omissions/corrections in
[HARNESS-AUDIT](docs/implementation/HARNESS-AUDIT.md). The full runtime measurement is complete; recorded source bytes remained fixed
throughout. New measurements require a new declared candidate.

Owner7Octoberpriority: A3harnessadaptationfirst, then detailedcapability/failure-path
revisitS0-S4. See [REPORT](docs/harness/REPORT.md) and
[register](docs/revisit/REGISTER.md); eachsubsection has its own evidence,decision,
review and refinement. Fouraggregatephase summaries do not suffice.


## Owner camera refinement,7October2026

The owner requests a substantially larger visible world, rooms, avatars and
conversation, including full-frame play where the room can extend offscreen.
The canvas already fills the viewport; whole-room fitting inside conservative
HUD reservations makes the actual scene too small. Moving an orthographic camera
closer does not itself increase scale. Compare the unchanged full-fit baseline
against a close fixed-angle, bounded self-follow camera with a dead zone and
accessible Overview/Recenter. A close stationary view is a negative-control option;
free orbit adds gesture/orientation cost and is deferred unless it earns that cost.

The parent selects bounded follow for a prototype, following current Three0.186.1
and source-backed game-camera research. Preserve authoritative geometry and motion,
privacy, typing isolation and explicit Quiet. Use actual HUD safe rectangles;
keep self visible, avoid offscreen-edge floating chat, settle while seated, preserve
mode/scale on resize and provide a stable room editing view. Reduced motion removes
follow easing/bob; Overview supplies a stationary alternative.

Declare a matched technical/design comparison before observing new results, then
measure avatar projection, visible room coverage, target hit picking, reachability,
labels/glyph bounds, drift and native task completion at desktop/portrait/landscape.
The proposed scale/coverage ranges are design targets, not ergonomic standards.
Screenshots and model review do not prove human preference. A larger rendered room
comes first; physical geometry expansion needs a separate layout/routing benefit
and regression check. Results: [camera evidence](docs/implementation/CAMERA-EVIDENCE.md) and
[manifest](docs/revisit/CAMERA-EVIDENCE.json).


Current local checkpoint7October: required check195tests/typecheck PASS; expanded
house coverage163tests with93.43%lines/84.27%statements/77.47%branches. CameraB2
25focused units,8native cases and16matched images accepted locally. Five CI-native
flows and two maintained lifecycle/recovery/export journeys passed matchingChrome153.
Earlier busy-host lifecycle failures remain unconfirmed and retained; standalone
5sdiagnostics used a different deadline, corrected with a matched10sprobe. Three
other current house journeys passed; room/DIY feedback-selector recheck passed.
Human fit/value, physical phone/IME, deployed TLS/restart and authorised publication
remain separate. No personal student reflection is fabricated from these checks.


Local sustained acceptance7October: pacing-v3 L1/L2 PASS at165.160/169.031MiB,
1800.344/1800.367s,p95101.968/103.042ms; allsavedview deliveries and faultcycles
accounted,zeroinvalidnormalmotion/unexpectedtimeout. Currentlocal core is verified;
student authored writing,real-friend/device study and production release remain
separate. Reviewed code ea60440; maintainedverification5548bb1.

## Continuation after local core completion

Core implementation `ea60440`, native verification `5548bb1` and calibrated load
evidence `2c120a1` form the local candidate. The 43-row revisit and linked records
preserve individual findings, refinements and gaps. [Current handoff](docs/implementation/CURRENT-HANDOFF.md)
is the entry point for the next task; this PLAN remains authoritative for scope.

Use the [release runbook](docs/implementation/RELEASE-RUNBOOK.md) for production
verification and reversible data protection. Use [course alignment](docs/implementation/COURSE-ALIGNMENT.md)
and [PROCESS evidence](docs/implementation/PROCESS-EVIDENCE-MAP.md) for student
writing and Crit preparation. Physical-device and real-friend trials determine
experience/value before feature expansion. New rooms, furniture, themes and board
capabilities remain staged content/contract work, not implied first-version scope.

Current local app closeout: 411 tests/type/build, evidence and production audit pass.
Scoped native 7, painted-title 2 and strictly timed game 1 pass; CI collects 9 cases.
Board unit coverage remains 69.85% statements/67.67% branches with main.jsx 0%.
Resource failures are preserved; root owns actual CI/load/backup/deploy acceptance.
Original 4093 preview reuses .local/implementation-s1 without reseeding.
See docs/implementation/REDESIGN-VALIDATION.md and evaluation/redesign-closeout.results.json.
