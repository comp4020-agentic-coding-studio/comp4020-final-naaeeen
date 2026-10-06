# Shared Study House capability contract

6 October 2026. Reviewed planning contract; implementation pending. The [owner brief](OWNER-BRIEF-2026-10-06.md)
is authoritative. This document specifies future production behaviour; local
prototype results do not establish that the deployed application has these features.

## Capability and definition of good

Two to six existing friends share a persistent house. Each owns a bedroom; doors
connect them to a common lounge. Residents control avatars, converse, sit together,
study and use a board for intentions, questions and useful resources. Returning
reveals their actual saved work. Good means recognisable ownership, easy reciprocal
conversation, truthful presence and voluntary shared focus with little setup.
Warmth, movement feel and willingness to return need human judgement.

A house is the whole space, not a bedroom or a socket channel. Capacity counts
permanent residents, including offline people. A zone is a lounge or bedroom and
also a read/push permission boundary. A space owner administers membership; a
resident edits their own bedroom; a visitor there does not gain editing rights.
An extra browser tab is neither another member nor another avatar.

## Requirements and traceability

All H01-H20 are selected production promises. H01-H09 and useful board H10
preserve owner requirements. A shared timer,goal stages and pen strokes are our
chosen implementation mechanisms,not verbatim owner mandates; their simplest
forms may be substituted with an ADR while retaining shared study and a useful
collaborative board. H21-H25 govern planning and growth.
See the implementation plan for tests and the results record for actual status.

| ID | Owner source | Promise and acceptance |
| --- | --- | --- |
| H01 | section1 | Create a house with integer capacity2-6; creator claims one slot |
| H02 | section1 | A unique code joins the house; collisions cannot create partial houses |
| H03 | section1 | One bedroom per member; going offline never frees their membership |
| H04 | section1 | Identifiable doors route to own/authorised friend rooms |
| H05 | section2 | Keyboard and touch control the avatar with immediate feedback |
| H06 | section2 | Real remote people move smoothly; saved profiles are not presence |
| H07 | section2 | Actual reciprocal text, correctly attributed bubbles and transcript |
| H08 | section2 | Sit/stand and voluntarily participate in a consistent shared focus session |
| H09 | section2 | Meaningful room DIY is saved and recognisable on return |
| H10 | section1 | Collaborative whiteboard supports useful goals, notes, links and pen marks |
| H11 | section4 | Last-slot joins are atomic; an extra person cannot take a full house |
| H12 | section4 | Reconnect and multiple tabs do not duplicate the avatar |
| H13 | section4 | Furniture blocks sensibly; door/spawn/seat routes cannot be trapped |
| H14 | section4 | Idle/walk/sit/stand and seat feedback match the actual state |
| H15 | section4 | Bubbles are readable; typing/IME never drives the avatar |
| H16 | section4 | Quiet mode reduces interruption without losing conversation |
| H17 | section4 | Desktop1920x1080,phone390x844,resize,keyboard,touch and reduced motion work |
| H18 | section4 | Membership/bedroom access protects reads,writes,pushes and later attachments |
| H19 | section4 | Concurrent edits preserve independent work and losing drafts |
| H20 | section4 | Identity,rooms,board and other promised durable actions survive restart/redeploy |
| H21 | sections3/6 | Decisions have primary sources and predeclared comparison evidence |
| H22 | sections5/6 | Fresh reviewers and parent verification challenge harness and agent claims |
| H23 | section7 | A bounded two-week plan preserves all core interactions when simplified |
| H24 | section7 | Catalogue/template/schema versions allow safe continued development |
| H25 | section8 | One authoritative root PLAN.md links coherent supporting documents |

Prototype coverage and future production acceptance are reported separately.
The original requirement never granted permission to drop movement or real dialogue.

## Recommended product policies

These are explicit proposed defaults, not facts dictated by the owner.

Capacity is immutable initially. An unclaimed bedroom door says Vacant; it does
not display an invented person. Use a cryptographically random8-character
Crockford Base32 code, displayed XXXX-XXXX, with a database UNIQUE constraint.
The40-bit code is an invitation capability, not returning identity proof or a
public room directory. Sharing it is deliberate; no automatic code in URL queries
or logs. Future code rotation preserves the internal house UUID.

Support one active house per identity in the first release. A pasted new code does
not silently replace home; joining another requires explicit departure. The space
owner transfers administration before leaving when another member remains.
A sole/last resident may confirm Archive house and leave: disable its join code,
end shared focus,archive rooms/board,release membership and allow a new house. Departure archives the old bedroom
privately; a new occupant receives a new room ID and fresh content, never another
resident's private furniture or conversation. The original identity can read/export
its archived bedroom independently of current house membership,never other rooms.
Archives remain read-only until explicit owner deletion; new members cannot read
them. Former house members retain no access to the old lounge after departure.

Use the existing opaque cookie identity and a deliberate export/recovery proof
in P1/P2 before promising next-day continuity. Store only digests and support revocation.
The house code cannot reclaim somebody else's room. Recovery replaces prior
sessions/controllers; loss of all proofs cannot be magically repaired. An available owner
can assist a fresh membership without impersonating the lost identity. If the sole
owner loses both proofs,existing residents keep ordinary access but cannot claim
administration; they may create a new house after leaving. Explain this boundary
at recovery setup rather than invent an unauthorised recovery mechanism.

Bedroom doors default closed. The resident can open to house members. Closing
revokes subscriptions, clears visitor scene data and moves visitors to the lounge.
Door ownership/availability is shared; layout and bedroom chat are private to
currently authorised viewers. Opening explains what recent room history becomes
visible. A knock/request flow can follow this tested policy.

One controller and one additional observer tab per member. Take control here
increments a generation and rejects old inputs. Observers have an explicit status.
A space owner can close new joins or remove a member; removal revokes all room and
asset access while preserving others' contributions. In the same transaction,
rotate the join code and mark that stable identity removed; it cannot rejoin until
explicit owner reinstatement. New codes still act as shared invitations,not
proof that a newly created identity is a different human.

## Presence, seats and study

Connected, reconnecting, offline and voluntarily focusing are different states.
Focusing is not a claim of real attention. Proposed heartbeat10seconds, expiry
30seconds; background throttling may change connection status. Unexpected drop
briefly reserves a seat, but permanent membership has no online expiry.

Seats are transient, single-occupant, atomic claims bound to member/controller
generation. Standing, room transition, takeover, removal or lease expiry releases
the seat. Process restart clears all seat/control/presence leases; clients rejoin
at a safe spawn and claim seats again. Restart never creates ghost occupants.

One active group focus session per lounge. Members opt in/out independently; the
starter controls pause/end and the space owner can take over. Default25/5minutes
with a simple duration choice. Persist deadlines or paused remaining time, not
a countdown every second. No users online and restart do not automatically pause
time. The first release is one work phase then one optional break,not automatic
repeat: derive both original deadlines at creation. On resume at/after work end,
show the remaining original break; at/after break end,show ended. Never grant a
new break merely because the server restarted. Repeated reads are idempotent.

## Conversation, board and DIY

Plain chat is zone-scoped, with suggested280-codepoint messages. Persist up to200
messages per zone for7days, page50; disclose expiry instead of claiming a permanent
archive. Short bubbles accompany a readable transcript. Quiet mode suppresses
intrusive presentation only. A pending ACK is uncertain, not saved or failed.
A bounded reload-safe UUID outbox stays attached to its original zone. Automatic
retry stops after24hours and asks the user to inspect current history/state;
initial active-house receipts retain metadata for the project lifetime,so receipt
GC cannot silently turn an old successful command into a new send.

New members can read retained lounge messages and the current board,including
content posted before they joined. State this before posting and on join preview.
Bedroom opening explicitly shares its retained history; closing cannot erase
copies already seen. Unread markers count delivered messages without forcing a
bubble. Show at most one4-second bubble/member and three visible bubbles globally;
new text replaces that member's preview,full content stays in transcript. Limit
a bubble to two lines/about80codepoints with an expand hint. Stack/shift bubbles
away from active controls and clamp to the safe viewport. Quiet mode suppresses
bubbles but retains unread count/transcript. Test six senders,long Chinese and
phone soft-keyboard states.

The useful first board has note, resource-link and goal cards plus short freehand
marks. A goal can identify its author and progress enum(todo/doing/done) plus a separate helpNeeded boolean.
Today/Stuck/Useful/Done are filtered views,not extra storage statuses. A drag
changes board coordinates only; explicit progress/help actions change fields.
Stuck filters helpNeeded,Useful filters resource cards,Done filters completed goals.
Cards have
individual revisions; conflicts preserve the losing draft. Drag preview is
transient; release commits once. Strokes have unique IDs and are immutable after
commit; deletion/undo is an author/current-state checked inverse, not whole-board
replacement.

Proposed bounds:60active cards,100strokes,400points/stroke,300characters/card,
five pen colours and bounded board coordinates. Notes/list view provides a
keyboard/phone alternative. Images remain open to a tested first-release
enhancement: add server decode, storage quotas and authorised reads first.

Bedroom DIY starts with10-12catalogue types, at most16placed pieces, half-grid
positions, quarter-turns and limited palette/wall/floor choices. Protect the door
aisle and safe spawn. Show gentle collision preview; provide nudge/rotate/remove,
undo and safe reset. Save on release/confirmation, not every pointer frame.

## Human acceptance and remaining adaptable choices

Two real friends should join without coaching, recognise one another, greet, walk
to seats, post a goal/link, visit an opened room and return the next day. Include
actual phone input when available. Record failures and whether people know what
the other person is doing; do not claim improved wellbeing from passing tests.

Cosmetic direction, exact catalogue, default door policy and image timing can be
revised with evidence or owner feedback. Core H01-H10 must not be silently demoted.
