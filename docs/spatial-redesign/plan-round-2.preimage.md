# A house whose places do useful things

Status: research and design refinement; production redesign NOT IMPLEMENTED.
The existing app remains at fb363cf runtime source. This plan replaces the spatial
purpose assumptions of the previous post-Crit plan; its technical evidence remains
historical and valid for the source it actually checked. Start with
[owner brief](BRIEF.md), [research](RESEARCH-NOTES.md), [source audit](SOURCE-AUDIT.md)
and [alternatives](ALTERNATIVES.md).

## Product direction and what is still a hypothesis

Build toward an after-class common room for two to six familiar friends: work on
real tasks, explain something together, share a short break, or withdraw to one's
own place without ending the visit. No daily goal form is the price of entry.
The primary proposed benefit is less coordination when friends want different
things at the same time. That benefit and the value of bedrooms require observation
with the intended friends; neither avatars nor passed tests establish it.

The next prototype should use **Delta**, the minimum coherent version of North.
East's media-first evening and West's critique club are genuine alternatives, but
they change the main practice and add dependencies. We should not combine their
complete scopes. A separate focus timer is optional until comparison shows it adds
something beyond the board huddle and ordinary external work.

The change is substantial: replace global activity launches with physical
participation, remove the task-card loop from the primary room/HUD, give public
viewing and personal inspection explicit owners/audiences, and reorganize the map
around those activities. Preserve existing data and the independent whiteboard.

## One ordinary visit

Alex enters while Blair and Casey work. Alex sits at the activity table; its
surface wakes and offers Join or Watch. Drew and Ellis sit and explicitly join the
same puzzle. Casey can continue working without an invitation covering the screen.
Fin arrives and can see the table's occupants and current round before choosing.

Later Blair asks for help with a diagram. People who want to help sit at the study
table and open the same canvas explanation; others keep their current activity.
On a break, someone shares one funny picture or an illustration at the sofa,
passes presenting control, and people can point at the same thing. Nothing plays
automatically elsewhere in the house.

Alex returns to their room and reopens the reference at the previous inspection
position. Opening the door deliberately makes that chosen desk material available
to house visitors; closing it returns to owner-only access. A visitor sees Alex's
material and room conversation, not the visitor's unrelated global work card.
This scenario is a proposed walkthrough, not an observed session.

## Distinct place contracts

| Place | Useful task and why gather there | What it does not silently imply |
| --- | --- | --- |
| Study table | Explain or work through something on the existing shared canvas, with an explicit local huddle/follow choice and visible participants. Editing is different from passive viewing. | Sitting does not prove work, force a timer, change Quiet, or revoke standalone board access. |
| Activity table | Two to six physical places match the house; a whole-group activity gives willing residents an active role. Seat ownership plus explicit consent enables fresh game effects. | A spare observer is not counted as a player. One fast person solving a puzzle is not evidence of satisfying six people. |
| Sofa and screen | Follow one intentionally shared item, point, discuss, and hand over the presenter. A brief shared look is different from editing or competing. | No remote pop-up, automatic audio, screen capture, external-site embedding or compulsory reaction. |
| Personal room/desk | Resume an owner-selected reference/crop and host an open-door visit around it. Room context belongs to its owner; a guest cannot overwrite it. | No mandatory note, visitor-own-card redirect, new private notebook promise, or claim of invite-only privacy under an open door. |
| Decorative furniture | Establish atmosphere, orientation and personal expression. | Every plant need not become a chore, button or another modal to justify existing. |

The room's functional hypothesis is continuity plus controlled audience. If the
same task is easier from a toolbar and visitors get no benefit from the room, the
room interaction must change. Walking is not a benefit on its own.

## Map and interface

Keep study, play and rest simultaneously usable. Whole-house mode switching would
break the mixed-intention task. Test a clear three-area arrangement with a visible
route to the bedrooms; the current20x14 footprint is a candidate, not a sacred limit.

A [mechanical ring study](evidence/table-fit-result.md) finds capacity-matched
chairs/approaches possible without moving other fixtures. It also finds the old
global gameTarget blocked for capacities4/5. This is a reason to replace that
entry path with the intended seat route, not drop the diagnostic or ship the
geometry as finished. Rendered six-person readability, circulation under occupancy,
phone framing and simultaneous motion remain implementation checks.

Use large, readable local prompts: Go to table -> Sit -> Choose Join or Watch.
The HUD can navigate to a free place; it cannot grant remote participation. Once
seated, a small contextual strip returns to that surface. Closing a panel means
Look around while seated; Stand/Leave is separately labelled and immediately
reachable. Moving from world controls requests Stand/Leave; typing in a field
never walks. Keyboard/list/touch routes use the same authoritative seat claim.
Show occupied and reconnect-reserved seats consistently in the world and Places.
Keep chat, board, settings and recovery accessible as appropriate independent tools.

## Participation and shared-view lifecycle

| Event | Activity table | Sofa/shared inspection | Personal room |
| --- | --- | --- | --- |
| Approach | Show place/occupancy; no mutation authority. | Preview a shared item's identity; do not auto-follow. | Show owner and actual door access. |
| Sit | Claim one real place and open choices; not automatically Join. | Ordinary sitting remains possible; Follow is explicit. | Owner/guest can sit without opening a task form. |
| Explicit Join/Follow | Server validates current seat, connection, generation and consent. | Follow current presenter/item; local mute and stop-follow remain local. | Owner explicitly starts shared inspection; visitors opt in. |
| Close panel | Stay seated; show how to reopen. | Stop following the shared viewport; show the world. | Retain owner's last confirmed local inspection position. |
| Stand/walk/seat switch | Revoke new-action eligibility immediately; release active role. | Stop following and presenter control; others continue if a presenter remains. | Leave the live inspection; do not change the owner's saved reference. |
| Disconnect | No fresh effects; active picture consent clears. Chair alone may be visibly reserved for the existing30s lease. | Clear transient follow/pointer; handoff only to an explicitly willing remaining viewer. | End owner's shared follow session; saved owner context and existing door setting remain. |
| Reconnect | Reserved physical pose does not re-enroll. Show Watch/Join and current progress. | Show current item, ask before following again. | Owner resumes saved context; visitors recheck current room access. |
| Late arrival | Join a running cooperative toy only if legal actions remain; otherwise offer a clearly new round. | See current item and choose Follow; no history/queue obligation. | Door-open visitors may inspect selected material; no selected-person privacy claim. |
| Room closes/member removed | Existing generation/access revocation clears participation and private material. | House membership still governs public content. | Revoke current/new reference reads and live delivery; past copies cannot be recalled. |
| All viewers leave | Keep promised durable game progress; no active participation. | End transient presenting/following; keep a shared item only under an explicit saved-content contract. | Keep owner-selected reference/bookmark; close ephemeral pointers. |

For Four-in-a-row, retain its recorded pause/expiry/withdrawal rules during migration;
new seat loss must have its own honest lifecycle event. It is not the whole-group
headline. Remove its primary-table prominence before inventing a tournament to
explain four spectators; keep existing saved rounds inspectable.

## Does the picture actually work for six people?

Current rules permit one identity to complete all24 placements, and earlier scripted
six-person attribution allocated four moves each. That allocation is not a product
rule or human contribution balance. The puzzle is a candidate cooperative toy,
not an accepted six-person experience merely because its roster limit is six.

Walk through a round with one fast player, a hesitant person, one late arrival and
several people choosing the same piece. Distinct free pieces must remain discoverable,
stale/conflicting placement must preserve selection and show the updated state,
and a newcomer must have a useful next action. No compulsory four-piece quota,
forced turn or reward penalty should manufacture participation. If people want to
solve different clusters, prototype visual highlighting/request/assist affordances
before adding private hands or a new rules engine. If a round ends before someone
can contribute, show that honestly and offer an optional new round.

The group-toy choice remains a value gate: if willing participants spend the session
waiting, lack meaningful choices, or see no reason to continue, compare a small
simultaneous-contribution alternative under a separate scope. Do not add a second
production game while bedroom/rest utility remains unverified.

## One bounded inspection component, two audience contracts

Prototype with an existing image/diagram or a selected text reference. No arbitrary
PDF/website renderer, live screen sharing, full desktop capture or rich document
manager. A sofa item is explicitly house-visible; a room desk uses the existing
open-to-house/closed-owner admission meaning. Per-person invitations and private
uploaded-media permissions are a later separate design, not hidden MVP assumptions.
External source links retain their original access rules.

Owner reference selection and a last confirmed crop/position are durable, bounded
state. Pointers, follow membership and presenter control are transient. A guest
may inspect independently but cannot change an owner's saved bookmark or content.
Shared following applies only after explicit consent. A departing owner ends live
presenting; it does not publish other material or rewrite the saved door policy.
Display whose material it is, who can currently see it and whether the current
view is shared. Do not call an image presenter the original author automatically.

Before an image-upload implementation, choose explicit format/size/count limits,
authenticated byte retrieval, withdrawal/export and migration behavior. Existing
board image handling can inform that work, but it must not be assumed to provide
room-private authorization. A text/reference-only prototype can test interaction
without prematurely adding a second asset system.

## Server and data boundaries

Retain Three/DOM, Socket.IO, SQLite and the Excalidraw island. Rendering packages
cannot decide what a room is for. Existing room chat, geometry, controller leases,
receipts and board surface are reuse candidates, not complete new features.

- Both Socket.IO and HTTP durable activity commands require trusted server-derived
  seat facts. Check fresh-effect eligibility after the existing accepted-receipt
  lookup, preserving exact authorized replay. Fresh unaccepted UUIDs require the
  current seat; Leave/reconciliation remains possible after standing.
- Picture intents have a separate cache. A historical Join ACK resolves that request
  without restoring revoked consent. New Join requires current seat eligibility.
- Cover stand, seat switch, zone change, takeover, disconnect, geometry reset and
  membership revocation. UI-only disabling is insufficient.
- Apply the existing room access generation to selected-reference data AND byte
  retrieval/delivery. Keep independent board read/export authorization separate.
- Bound pointers/presence and do not write a timer/pointer every frame to SQLite.
  Existing work cards stay retained and inspectable/exportable when removed from
  the primary UI; never delete old work to make the redesign simpler.
- A geometry/interaction version change needs the existing old-client update
  boundary. Preserve original preview/backup; rehearse migrations on copies.

## Sections, dependencies and acceptance

The following is a conditional ten-focused-day allowance for one student using
agents, not a completion guarantee. Re-estimate after the first integrated slice.

| Stage | Complete slice | Acceptance before moving on |
| --- | --- | --- |
| R0: research/prototypes | Compare Delta with North and the toolbar/chat counterfactual. Use a real reference; compare study huddle with/without a timer. | Owner/friend task observations distinguish useful audience/continuity from extra walking. Unknown preference stays unknown. |
| R1: days1–2 | Navigate -> seat -> explicit Join -> contribute -> Stand/Leave. Include real capacity2–6 and reserved-seat display. | Both ingress paths, concurrent claim, denied remote/new effects, exact retry after stand, takeover/reconnect, six independent clients, keyboard/touch. |
| R2: days3–4 | One inspection component: presenter/item/pointer/follow. Make sofa task complete with deliberate sharing and immediate exit. | No forced modal/audio on nonparticipants, independent local view, host departure, late entry, phone fit, no unauthorized material retrieval. |
| R3: days5–6 | Owned reference and resume position; visitor sees owner's selected content under existing door policy. | Solo reopen, shared visit, guest cannot overwrite owner state, close/revoke clears stale delivery, source access/withdrawal/export explicit. |
| R4: day7 | Study-table board huddle and primary HUD/room flow. Remove redundant card prompts, preserve legacy data. | Explain a concrete problem together; board remains usable independently; two friends can keep working while others break. |
| R5: days8–10 | Integrate map/camera/panels, then review/refine and validate. | Required checks, six-client complete visit, physical-phone/friend tasks when available, backup/restart/revocation, unchanged resource workload plus declared new actions, focused commits. |

If scope does not fit, cut video, extra games, focus-block orchestration, general
uploads and per-person room invites first. Do not cut seat/consent recovery,
meaningful room task, the rest task, accessibility or preserved user data to show
more furniture. If the selected-reference task fails its user comparison, redesign
that place before spending the remaining budget on polish.

## What this pass can accept

It can accept source facts, a bounded mechanical fit result and a research-backed
prototype plan after review. It cannot accept that friends enjoy these roles,
that the bedroom beats a toolbar, or that a new production build is complete.
Those are distinct next checks. [Review record](REVIEW-AND-REFINEMENT.md) preserves
initial criticism, parent decisions, refinements and remaining gates.
