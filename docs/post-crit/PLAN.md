# Post-Crit improvement plan

Reviewed implementation contract, 22 October 2026. Baseline 8cdad6a; branch
post-crit-improvements. Root PLAN.md is the project index. Earlier Crit evidence
retains its original scope. Production edits follow fresh review of this plan. See REVIEW-AND-REFINEMENT.md
for the initial findings and their reconciliation. The contracts below govern P1/P2.

## Active extension and acceptance reopening

The [owner addendum](OWNER-FEEDBACK.md#group-participation-and-personal-room-clarification-22-october)
requires three to six active participants in a shared break activity. Reopen the
choice described below: the implemented two-player game plus spectators is a
completed earlier slice, not acceptance of this addition. Research and independently
review a bounded group interaction before changing its domain, authority and UI.
Revisit the personal room's distinct value without calling the existing shared
study card private or inferring willingness from room location.

The full original and combined resource trials now pass their registered gates.
Their [acceptance record](evidence/resource-acceptance.md) also exposes substantial
board receipt disk growth. Treat storage as an open subsection: preserve exact
replay and personal exports while comparing a lower-cost representation and an
explicit lifetime policy. Do not lower visual quality to solve a receipt problem.
Production changes invalidate the affected resource source binding and require
new affected checks. Existing accepted artifacts remain historical evidence.

The owner makes AI-agent practice a primary process outcome. Research Google
Harness2 and other primary company methods, compare with our active REPORT, then
apply only changes with a stated prediction, bounded check and adoption decision.
Fresh independent review and parent verification remain required; benchmark claims
and method counts cannot substitute for project results.

## Purpose and complete task

A personal study house for 2–6 familiar friends: choose a place, work or ask for
help voluntarily, take an optional shared break, and return to your own next step.
Personalization is a valid experiential goal; do not invent productivity benefits.

Two independent users create/join, receive different furnished rooms, use a desk,
chair, light and their existing study card; visit only permitted rooms; meet in a
roomier lounge; rest or play one shared activity; leave immediately and recover
work. Reload/restart retain arrangements and durable state. Six residents can
circulate and understand playing/watching at 1920x1080 and 390x844.

## Current evidence and budgets

A Node diagnostic reproduces pan→walk at 390x844 leaving the actor at x577.65.
A primary drag over 6px enters persistent inspection, while recovery controls are
hidden in Options. Existing tests explicitly preserve this mode; revise the
contract openly rather than weakening tests. Bedroom chair clicks are ignored
outside editing although nearby E can sit. New bedrooms receive [] placements.
Lounge 16x11 is only 1.26 times bedroom 14x10 floor area.

Read-only live, 22 Oct 00:12 Sydney: 256 MB configured RAM, idle RSS 97.19 MiB/high-water
100.78 MiB. /data uses 7.25 MiB with about 900 MiB available; live SQLite files total
about 1.09 MiB logical and 13 backup directories occupy 6.03 MiB. Public files 24.86 MiB
and production dependencies 30.53 MiB are allocated disk, not runtime RAM or client
GPU memory. Overlay usage is not compressed image size. No disk deletion or visual
quality reduction follows from this snapshot. Concurrent whiteboard RAM is the
real concern: preserve the existing 300s/RSS<=210 MiB/p95<=1000ms gate. Historical
CI 196.59 MiB is evidence of that old run, not new acceptance.

## Criteria and camera comparison

Priority: preserve data/permissions; finish the task on both viewports; voluntary
participation; recognizable interaction value; measured resource fit; student
maintainability. Human comfort/preferences remain separate from technical results.

Use identical content, geometry, users and scripted routes for three candidates:
A repaired bounded follow; B centered damped follow; C stable room framing plus
explicit inspection. Test 0/5/7px drags then movement, reversals, every door/seat/
board, chat drag/collapse, typing, zoom, resize,844x390 landscape and reduced motion.
Project targets before comparison: follow candidates return to Follow within 250ms of intentional
walking after temporary inspection; stable framing is judged by actor/control visibility,
orientation and task completion, not by adopting a Follow mode; <=1 CSS px stationary drift over 2s after settling;
phone default actor height >=64 CSS px. These are design targets, not external standards.
Preserve actual animated mesh/ring containment and visualViewport offsets.

Normal walking resumes Follow after temporary inspection; explicitly locked Look
may remain fixed. Always-reachable Follow/Recenter provides recovery; editing stays
stable. Typing, tool/chat drags and UI controls cannot move avatars. Do not add
free orbit without a demonstrated task advantage. Stop once mechanical acceptance
and actionable fresh-review findings are resolved; do not repeat green trials.

### P1 mode contract

- Follow is the normal walking mode. A primary/touch drag over the threshold enters
  temporary inspection. The next intentional keyboard, touch or routed movement
  resumes Follow, including a blocked walking attempt.
- Selecting Look explicitly locks inspection. Intentional movement does not unlock
  it. Overview stays deliberate until Follow/Recenter is selected.
- Editing owns a stable view. Leaving editing returns to Follow; a room transition
  also resets to Follow. Follow/Recenter exits temporary, locked or overview modes.
- Snapshot position corrections, remote motion, sitting and controller takeover
  are not walking intent. Cancelled pointers release drag state. Typing, chat and
  tool dragging must not send walking intent. Preserve reduced-motion behavior.
- Common comparison gates are visible actor/actions, reachable recovery and complete
  task. The 250 ms Follow target applies to A/B. Candidate C is a real stable-frame
  alternative, not a failure merely because it has no Follow transition.

## Furnished rooms and useful objects

Six curated stable-ID/versioned presets selected by permanent slot use 5–8 of the
existing six kinds within the 10-piece limit. Each includes bed/desk/chair/lamp;
vary positions, counts, orientations, shelving/plants and palette. Validate real
collision, chair approaches, doors and actual server arrival anchors. Allocate
once inside create/join; never regenerate on reload.

Keep existing rooms exactly, even if empty. Owner-only preview and Apply starter
layout must describe replacement and use current revision. An empty room is not
proof that its owner wants backfill. Preserve archives. Keep bedroom dimensions
and old furniture footprints stable during this release.

Desk opens My work: an explicit current-user projection of the SINGLE existing
house-visible author-owned study card. Label visibility; do not expose the whole
lounge snapshot or create a second task system. A direct accessible My work entry
remains available without walking. Chairs and rest seats use authoritative
approach/sit/stand/occupancy. Lamp changes one bounded owner-controlled saved
setting, visible to authorized visitors. Shelf/archive shortcut is stretch.
Entering a room, sitting, resting and playing never silently change availability,
door permission or task completion.

### P2 persistence and My work contract

Database migration v1 -> v2 adds room-wide lighting (`standard`, `cosy`, `dim`),
nullable origin preset ID and nullable origin preset version. `standard` preserves
legacy rendered illumination. New slots use six version-1 presets, each with a
stable catalogue ID and stable item keys; allocation assigns UUID placement IDs.
Origin metadata records the starting template and survives later manual edits.
Existing placements, palette, door access and archived JSON remain unchanged.
Current exports include new settings; old archives retain their original fields.

`room.starter` accepts only `{roomId, presetId}`, expected room revision and normal
house/command identity. It replaces placements, palette and lighting atomically,
keeps door openness, and records the preset version. Preview must show all three
replacement fields before Apply. `room.light` changes only the bounded lighting
value. Both are owner-only revisioned room commands using existing receipts and
access checks. Existing `room.configure` and `room.placements` keep their payloads.
No light toggle can overwrite an unsaved furniture draft.

Every authorized snapshot adds `ownWork: {streamId, sequence, card}`. The stream is
`lounge:<houseId>` and the sequence is its current durable sequence; `card` is only
this authenticated identity's current active card in this house, or null. This
reuses the canonical card and lounge cursor, with no second task database/stream.
Bedroom `cards` stays empty. Card changes already refresh subscribed snapshots;
verify delivery and authorization with the real Socket.IO authority.

The client keeps a separate own-work high-water mark scoped to server epoch,
identity and house. It must merge that projection independently of bedroom cursor:
a newer room snapshot with an older own-work cursor may update the room but cannot
roll back work. Equal room sequence cannot hide newer work. Zone selection retains
only the same identity/house's ordering; membership/identity revocation clears the
projection, and old access generations/epochs remain rejected. Delayed receipts
must preserve newer drafts. No card -> create -> close -> new card is covered.
Visiting another desk still opens the visitor's own work, labelled house-visible.
Observer tabs may read but cannot save. Pending card drafts retain their original
identity/house/zone and use existing explicit retry rules; do not silently move
an uncertain command to a new room. Direct My work access works in either zone.

P2 backend can prepare presets, migration, commands and own-work projection while
P1 owns the renderer/UI. Client ordering, desk/light interaction and adoption UI
wait for that ownership handoff. This foundation alone is not P2 acceptance.

## Lounge and one shared break game

Compare 16x11 and 20x14 lounge candidates with SAME functional objects, users and
camera scale. 20x14 is a prototype, not an unquestioned requirement. Evaluate
circulation, readable avatars/controls, panel occlusion and six-person gathering.
Organize study/board, rest seating and one game table. A short Places menu uses
existing pathfinding. Doors/seats/anchors remain reachable for capacities 2–6,
occupied seats and crossings. Zones are social cues, not private chat or proximity
voice. Preserve independent full Excalidraw. Explicit interaction inventory: study seats
and rest seats are available to members through the same occupancy authority;
board opens the shared canvas; game table opens Join/Watch; bedroom desk opens own
work; lamp changes lighting only for its owner. Other furniture stays decoration.
Before release, version geometry/protocol compatibility so an already-open old
client is asked to reload before sending movement against changed geometry.

Common game task: voluntary 3–6 minute pause with immediate exit and return to work.
Compare four-in-a-row, 3+0 chess and Crazy Eights through small matched desktop/phone
prototypes and a state/projection spike before selecting ONE production table.
Four-in-a-row: 42 move maximum, public state, seven large input targets, low recovery
cost. Chess: strategic depth, but 8x8 touch selection, promotions, full move history
and authoritative clocks. Crazy Eights: all 2–6 active, but hidden hands, shuffle,
private projections and departure rules. Two-player choices leave four spectators;
explain that. If all-six active play becomes core, revisit the choice.

42 moves/card hand is not an elapsed guarantee. 3+0 chess allows 6 minutes combined
running clocks. A break cue and immediate Leave/Return are core; a hard deadline
needs an explicit unfinished-round policy. No forced study-before-play, streaks,
XP, compulsory timers, matchmaking or economy. A finite public-information table
is the initial recommendation; select chess if its prototype and group preference
justify clock/UI complexity. Do not build two production games merely to avoid choice.

## Architecture and migration

Keep Node 24/SQLite/Socket.IO, vanilla Three/DOM and the React/Excalidraw island.
Pure shared geometry/catalogue define stable footprints/action anchors. Camera is
client-local. Room edits keep UUID/revision/member/owner and transaction/receipt
rules. Saved content contains no executable scripts or arbitrary remote asset URLs.
Game rules are pure state/action code, independent of sockets/DOM/database. One
bounded current session per house stores session ID/revision/participants/state/
terminal reason. Commands require membership, controller, lounge scope, correct
session/revision, participant identity and legal action; spectators cannot move.
Reuse lounge cursor refresh, not per-frame broadcasts/per-second writes. Preserve
pending command UUID/payload. Disconnect preserves state; explicit leave/removal
ends participation appropriately. New rounds require explicit consent. Proposed
limits: 1 KiB command/8 KiB public state, verified by serialization. No full-state copy
in each receipt or ad hoc consumed-ID deletion. Chess needs history beyond FEN.

Additive transactional house.sqlite migrations must distinguish DB/wire/content
versions. Test version 1 customized/empty/archived rooms, cards/receipts, repeat
startup, injected-failure rollback and future-schema rejection. Never reseed old
content. Revisit 96 prepared-statement bound. Old binaries may reject migrated data;
backup is not proof of lossless rollback after new writes. Preserve all 3 DBs/Crit 8.

## Voice route

Core optional route: owner-configured existing Discord HTTPS destination, labelled
Open Discord. Its membership/microphone/mute stay independent of house and Quiet.
No fictitious joined status, automatic capture or OAuth/bot/webhook secrets.
Validate supported destinations; provide a usable no-link state.
In-app audio is conditional. Native Discord Social SDK is not standalone webvoice;
Activities host our app inside Discord. Six-user mesh needs 15 peer connections
and credible TURN. Managed LiveKit/Daily carry media off Fly but require provider/
course eligibility, cost policy, scoped tokens, strict revocation and real device/
network checks. Do not co-host SFU/TURN on 256 MB or save audio in SQLite. Explicit
join/leave, muted entry, stop-capture, permission-denial recovery and no recording
are essential. No paid provider is provisioned. Silent use survives voice failure.

## Milestones and file ownership

P0: brief/source/resource/research comparison, fresh Astra plan review and records.
P1: camera semantics/chair clicks; red reproductions, matched camera task, native
portrait/landscape/desktop, independent review and focused local commit.
P2: seeded rooms, safe adoption, My work/light/rest; migration/ownership/stale/restart,
two-user visit/close/recovery, review and local commit.
P3: lounge comparison/layout/destinations; capacities 2–6 paths, six-person browser
scenario, independent review and local commit.
P4: before production, freeze ready/start consent, panel close versus resignation,
leaving lounge, disconnect/abandonment, replacement/rejoin and restart. A lost ACK
must not trap someone at the table. Keep the original round/UUID intent; leaving
the lounge withdraws server-side and retries retain their original lounge scope.
Return to the lounge to resolve an uncertain original command; do not rebase it
onto a new round or block navigation. Record precise terminal
reasons and a bounded way to release abandoned tables. Then game spike/selection
and complete authority/UI; concurrent/duplicate/stale/
observer/disconnect/restart/removal/return-to-work, review and local commit.
P5: Discord owner configuration, safe external opening and phone/no-link flows.
P6: integrated study→break→return, required/evidence/browser checks, original 300s
resource workload plus separately declared combined workload, final fresh review.

Freeze interfaces before parallel edits. Camera/world/UI owner finishes before
later renderer/UI work; backend room/store/contracts may proceed independently
once reviewed. Parent owns integration/shared geometry/protocol binding. Game
modules can be isolated; realtime/client integration stays sequential. Workers
preserve others; research/review roles stay read-only.

Target integration by 2 November; reserve the following week for real-friend and
physicalphone feedback, refinement/writing and separately authorized release before
9 November noon. This is a planning assumption, not a completion guarantee.

### Effort and scheduling

Use GPT-6.1 Sol at high through ultra for execution, and GPT-6 Astra at high through
max for decisions/fresh review. Use higher effort for uncertain cross-module rules,
permissions and persistence, rather than assigning every small task maximum effort.

Planning allocation for one student with agent assistance: P1 one day; P2 two days;
P3 one day; P4 comparison half a day then implementation two days; P5 half a day;
integration, debugging and evidence two days. These are planning allowances, not
observed rates or promises. Freeze game choice after the bounded prototype session;
if no candidate passes, refine one candidate before expanding features. Target
integration by 2 November; reserve the following week for people/devices, writing
and an authorized release. Re-estimate after P2; cut enhancements before core quality.

## Acceptance and continuation

Verify complete task, legacy/new data, independent identities, 6 residents, denied/
private/observer/stale/pending commands, keyboard/touch/reduced motion and restart.
Preserve every original resource criterion and failure, including delivery,
input cadence, skipped work, pending/errors and disconnects, not only RSS/p95.
Where feasible add a one-CPU/256 MiB constrained rehearsal with OOM/memory accounting;
otherwise report that Fly enforcement is outside the local evaluator. Measure
repeated-round receipt/storage growth: a bounded current game does not bound receipts. A separately frozen combined
board+new-actions workload supplements rather than replaces the old gate. Report
server RSS/cgroup/persistent disk/transfer/client rendering separately. Physical phone
and HCI preference need real devices/people. No fake human A/B or benchmark quota.
Each subsection records requirement→evidence→alternatives→decision→refinement→checks.
Fresh Astra review receives facts/source/rubric without prior verdicts; parent
reproduces findings, refines and rechecks before acceptance/commit.


## Current implementation decisions

P1 camera is committed1699d44; P2 persistence1671cec and integrated room UI8b7e425.
Centered Follow keeps the player anchor while posed-body exclusions keep name/chat
labels off the models. Seeded rooms, safe starter adoption, meaningful desk/chair/
light actions and canonical My work are implemented. See source-bound evidence in
P1-CAMERA.md, P1-B-READABILITY.md and P2-ROOM-UI.md under evidence/.

P3 expanded lounge is committedf11eb13. Both layouts passed the same renderer task;
expanded separates study/rest/game areas and increases walking. Follow keeps the
same actor size; optional phone Overview is distant in both. Places and direct
My work support orientation. Geometry/source acceptance is separate from final
six-person integrated acceptance. See [lounge contract](LOUNGE-CONTRACT.md) and
evidence/lounge-comparison.md.

P4 pure rules/spike are committed16404ea; real SQLite authority and game UI are
implemented and independently reviewed. Native two-client Join/Ready/play/Resume/
return-to-work passed three viewports on its recorded source. Later voice/update
UI additions have their own verification. The [game contract](GAME-CONTRACT.md)
and [exact API](GAME-API.md) preserve voluntary departure and original UUIDs.

P5 stores an owner-configured Discord destination and uses an explicit external
link, with schema4 after game schema3. No media provider or capture is created.
See [voice contract](VOICE-CONTRACT.md). Source review and parent regressions cover
owner/control/revision/pending/identity boundaries; current native UI acceptance
and the maintained break/voice task are recorded in local commit 8b22fa4.

P6 for the earlier slice is recorded in local commit 8b22fa4: full required tests,
maintained native core/break/voice, six-resident bounded cases, original and combined
300-second workloads and fresh validation review. New storage and group production
changes must obtain their own affected acceptance. No new publication occurred.

The [storage contract](STORAGE-CONTRACT.md) is implemented and independently
reviewed in local commit `64f619c`; current native and sustained acceptance is open.
The [group/room extension](GROUP-ACTIVITY-CONTRACT.md) has completed the responsive
prototype comparison and backend/client/UI implementation. Authority and client
review findings are repaired. The first integrated native task exposed short-
landscape chat occlusion and clipping, now under affected repair/recheck. Three/six
browser contributors and current workload acceptance remain required.
The [company-method record](../harness/COMPANY-METHODS-2026-10-22.md) explains the
actual diagnostic and why an extra universal instruction was not adopted.
