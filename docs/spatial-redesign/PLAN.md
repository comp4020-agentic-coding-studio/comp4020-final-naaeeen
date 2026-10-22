# A house whose places do useful things

Status: local implementation in progress, authorized23 October2026. See
[implementation checkpoint](IMPLEMENTATION.md) for slice ownership and current gates.
The previous acceptance belongs to fb363cf runtime source. This plan replaces the spatial
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
| Stand/walk/seat switch | Revoke new-action eligibility immediately; release active role. | Stop following/control. An accepted handoff may continue; otherwise freeze the current item until a willing seated viewer explicitly takes control. | Leave the live inspection; do not change the owner's saved reference. |
| Disconnect | No fresh effects; active picture consent clears. Chair alone may be visibly reserved for the existing30s lease. | Clear transient follow/pointer; handoff only to an explicitly willing remaining viewer. | End owner's shared follow session; saved owner context and existing door setting remain. |
| Reconnect | Reserved physical pose does not re-enroll. Show Watch/Join and current progress. | Show current item, ask before following again. | Owner resumes saved context; visitors recheck current room access. |
| Late arrival | Join a running cooperative toy only if legal actions remain; otherwise offer a clearly new round. | See current item and choose Follow; no history/queue obligation. | Door-open visitors may inspect selected material; no selected-person privacy claim. |
| Bedroom closes | Do not change an otherwise authorized lounge member's game eligibility. | Do not remove an otherwise authorized house member from sofa viewing. | Revoke unauthorized room reference reads/live delivery and clear transient views; past copies cannot be recalled. |
| House member removed | Revoke that identity's seat, participation and activity access. | Revoke that identity's participation, material reads and live delivery. | Revoke current room/reference access, preserving only separately authorized own-export behavior. |
| All viewers leave | Keep promised durable game progress; no active participation. | End transient presenting/following; keep a shared item only under an explicit saved-content contract. | Keep owner-selected reference/bookmark; close ephemeral pointers. |

### The study huddle has a separate, small lifecycle

A huddle is a transient choice to explain a problem on the existing board, not a
focus-management system. A resident claims a study seat, then chooses Join huddle.
Someone explicitly chooses Share my view; others choose Follow the huddle. Free
inspection and independent board editing remain available to authorized members.
Closing the huddle view leaves huddle/following but keeps the ordinary seat. Reopen
from that seat offers Join again. Stand, walking, room change, disconnect or control
takeover removes huddle membership/following; reconnect never auto-follows.

A presenter can offer a handoff, completed only after a willing seated member
accepts it. If the presenter leaves/closes without an accepted handoff, freeze the
last shared viewport and release control; existing members may inspect it locally
or explicitly claim Share my view. Do not pick an automatic successor. Use this
same freeze/explicit-claim rule at the sofa. A new leader is visibly identified.
Leaving either shared view does not revoke independent board access or alter Quiet.
The huddle's smaller Close/Leave action is distinct from a game's Look around
button, which retains game consent while seated; label the consequence clearly.

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

R0 uses one existing PNG diagram/image in both candidates, including the same
saved view and audience controls. The first production representation is one
bounded PNG, with no playlist or revision history. A text-only experiment can test
conversation but cannot validate image selection, crop/zoom or image retrieval.
No arbitrary PDF/website renderer, live screen sharing, full desktop capture or
rich document manager. A sofa item is explicitly house-visible; a room desk uses the existing
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

Before image-upload implementation, freeze bytes/pixels/count, authenticated byte
retrieval, withdrawal/export and migration behavior. Keep the existing16KiB inbound
request limit; inspect its current bounded upload/chunking pattern instead of
assuming a large JSON image request is allowed. Existing board image handling can
inform the work but does not supply room-private authorization. An isolated PNG
prototype can test interaction before a second asset system exists; production
image support remains gated on the real authorization/resource contract.

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

Video, extra games, focus-block orchestration, general uploads and per-person room
invites are already excluded; they are not contingency capacity. Real reductions
within Delta are: one PNG instead of multiple reference types; one currently shared
item instead of a queue; fit-image plus normalized pointer before synchronized
pan/zoom; freeze/explicit-claim control before proposed multi-step handoff UI; and
the existing map/camera with a capacity-correct table before an extensive visual
rebuild. Preserve the owner's saved view in the room comparison even when shared
viewport following is reduced.

Do not cut seat/consent recovery, useful room/rest tasks, accessibility or preserved
data to show more furniture. If this minimum useful slice still exceeds the
allowance, extend/replan the schedule rather than reporting the excluded features
as savings. If selected-reference tasks fail their user comparison, change the place
before spending the remaining budget on polish.

## What this pass can accept

It can accept source facts, a bounded mechanical fit result and a research-backed
prototype plan after review. It cannot accept that friends enjoy these roles,
that the bedroom beats a toolbar, or that a new production build is complete.
Those are distinct next checks. [Review record](REVIEW-AND-REFINEMENT.md) preserves
initial criticism, parent decisions, refinements and remaining gates.
