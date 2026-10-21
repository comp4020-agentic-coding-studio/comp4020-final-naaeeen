# P3 lounge and compatibility contract candidate

22 October 2026. Contextual Astra/max decision work, reconciled by the parent.
This extends [PLAN.md](PLAN.md). It is not independent implementation acceptance.
The camera and bedroom foundations finish their reviewed ownership lanes first.

## Matched spatial alternatives

Use the same fixtures, avatar/model scale, default camera zoom and lighting count
in 16x11 and 20x14 lounges. Bedrooms remain 14x10. Coordinates differ explicitly;
this is a layout comparison, not an experiment isolating area alone.

| Fixture | Size w x d | Compact x,z | Expanded x,z |
| --- | --- | --- | --- |
| table | 2.5 x 1.8 | -0.6,-1.3 | -1,-2 |
| game-table | 1.8 x 1.4 | -5.1,2.35 | -6.2,3.3 |
| rest-sofa-a | 3.3 x 1 | 4.8,4.1 | 5.8,5 |
| rest-sofa-b | 1 x 3.3 | 6.95,1.5 | 7.95,2.4 |
| rest-table | 1.3 x 0.8 | 4.55,1.5 | 5.55,2.4 |
| tea-cabinet | 1.78 x 0.65 | -7,4.85 | -8.6,5.8 |
| bookcase | 1.5 x 0.62 | 6.7,-3.55 | 8.6,-4.7 |
| rear-pot | 0.6 x 0.6 | -7.25,-4.7 | -9.2,-6.2 |
| rest-lamp | 0.5 x 0.5 | 2.65,4.8 | 3.65,5.7 |
| board | 0.3 x 2 | 7.8,-1.1 | 9.8,-1.7 |

Study seat count equals permanent capacity; retain seat-1 through seat-capacity.
Use the current radial offsets about the new table centre, not world origin.
Derive chair footprint orientation from seat heading + pi so translation does not
change its collision rectangle. Add six rest seats and two game chairs: total
seats are capacity + 8. Sitting does not join a game.

Compact rest seats (x,z / heading / approach):

- rest-seat-1: 3.8,4 / pi / 3.4,3.05
- rest-seat-2: 4.8,4 / pi / 4.5,3.05
- rest-seat-3: 5.8,4 / pi / 5.6,3.2
- rest-seat-4: 6.8,0.5 / -pi/2 / 5.65,0.5
- rest-seat-5: 6.8,1.5 / -pi/2 / 5.65,1.5
- rest-seat-6: 6.8,2.5 / -pi/2 / 5.65,2.5

Expanded rest positions and approaches add (1,0.9). Render two L-shaped sofas
once, with individually pickable seats and 0.4m cushion height. No duplicate chair
obstacles on sofa seats. Keep one Rest corner label. Game chairs are at game-table
centre + (0,+/-1.55); their approaches use (0,+/-2.60). The table interaction point
is centre + (1.45,0). Decor remains labelled as decor rather than fake actions.

All doors use the rear wall. X=(slot-(capacity-1)/2)*spacing, with spacing 2.3 for
compact and 2.8 for expanded; z=-depth/2+0.04 and approach z=-depth/2+1.05.
Compact/expanded spawn z=3.3/4.65, slot arrival x=0.65*(slot-(capacity-1)/2).
Board approaches are (6.85,-1.1)/(8.85,-1.7); exit targets (0,4.7)/(0,6.2).

The decision lead ran a read-only coordinate probe through existing geometry and
reported 230 target checks per candidate passing across capacities 2–6. Parent has
not independently rerun that disposable probe: treat it as a lead diagnostic,
not the reproducible acceptance result. Reported capacity-six longest routes were
13.66m and 17.90m. The expanded layout adds walking; direct My work access and the
Places routing menu preserve quick access without shrinking the world.

## Shared interfaces and integration

Add Seat.purpose (study/rest/game/bedroom), optional Seat.fixtureId for sofa seats,
optional Layout.arrivals and Layout.gameTarget. Keep stable obstacle IDs and all
geometry in the shared module. Server and world must use the same validated lounge
arrival; bedroom arrivals remain unchanged. Study shortcuts filter study seats.
Places routes to study/rest/game using existing pathfinding. Translate study table,
props and rug together. Fit shadow frustum to extents while retaining the 512 map.
No persisted lounge builder, avatar-collision engine or extra database is needed.

Six residents must arrive, visit their doors, sit at study and rest seats, stand,
cross paths, use the game/board, and return to their rooms. Test occupied-seat
rejection, all arrival-to-target and stand-anchor routes, closed-room revocation,
all capacities and the three native viewports. Quiet, doors and task state remain
explicit choices. Compare legibility, task completion and panel overlap; choose
expanded only if zoning improves without a distant phone overview. Human preference
is still untested. One bounded layout refinement is allowed before re-evaluation.

## Version compatibility: open decision with a narrow candidate

A geometry change affects pages already open with old JavaScript, even though
server source uses no-cache for local modules. A version value must describe the
loaded client/world, not merely echo the newest server value. Proposed identifier:
HOUSE_WORLD_VERSION='lounge-2', sent in Socket.IO auth and snapshots. New clients
validate it before accepting poses or flushing pending commands. Never auto-reload.
Version checks supplement identity, controller, membership and collision checks.

The decision lead verified that old UI disconnect handling clears visible forms
but keeps unsent chat/card in module memory and furniture in roomDraft. A same-zone
observer snapshot restores those drafts. Reload destroys unsent module-only drafts;
submitted uncertain commands survive in the existing sessionStorage outbox.
Therefore a hard connection rejection alone cannot promise draft recovery.

Candidate: known missing-version clients receive a narrowly authorized, same-zone,
read-only recovery projection with controller:false, without acquiring or moving a
lease. Reject movement, seats, takeover, availability and durable house commands.
Do not send fabricated/new-world positions to an old renderer; the exact player
projection requires a fresh review and frozen-old-client browser trial. Preserve
normal membership/private-room checks and limits. Current new clients remain live.
Unknown declared versions get an explicit update rejection; no silent capability
upgrade. Standalone board, recovery/export and legacy application routes retain
independent policies.

Old code retains pending entries on NOT_CONTROLLER but discards unrecognized
terminal command errors. Legacy mutation denial therefore uses NOT_CONTROLLER
with an update/recovery message. A new CLIENT_UPDATE_REQUIRED code is safe for a
direct takeover request, not an old outbox command. New clients explicitly retain
pending intent on update errors. Old UI cannot show a newly invented unsolicited
banner; its normal takeover attempt can show the update message. Do not claim an
immediate modern update banner on an already-loaded old page.

Parent refinement: the lead proposed a blanket HTTP world-version mutation header.
Before adopting that, distinguish geometry-independent lobby create/join/profile
from controlled house operations. The existing HTTP route already restricts active
house operations. Avoid changing unrelated contracts or every raw test fixture
without an actual compatibility need. Freeze the smallest sufficient gate after
checking the source and fresh review; this part is not implementation-ready yet.

Use an actual frozen 8cdad6a UI/client fixture, not current code with auth removed.
Check unsent chat/card/layout/settings plus lost-ACK commands, same-zone restoration,
Pending export/manual reload, denied old actions, unknown-version cleanup, no ghost
controller, identity/removal/door revocation and independent board behavior. If
recovery mode cannot support ordinary draft copying/retention safely, prepare a
separate compatibility release for later authorization. No release has occurred.

## Next gate

Fresh review must resolve the old-client projection and HTTP scope before P3
compatibility production edits. Coordinate/rendering prototypes can proceed in
isolation. Existing generator changes must declare a new source binding while
preserving every original workload, duration, cadence and acceptance criterion.


## Fresh review reconciliation

A history-free Astra/high review checked frozen 8cdad6a, current source and this
candidate. It confirmed the narrow same-zone recovery route, with `players: []`
(not connected people lacking coordinates, which the old renderer would fabricate
at spawn), no lease acquisition/project-side reconciliation and no old mutations.
It also confirmed that a blanket HTTP version header is unnecessary: keep allowed
lobby/recovery/export routes and gate house control at its namespace/context.
Standalone board authority remains independent.

Full recovery of every old unsent draft is not established: an unsent lounge card
can be retained but hidden after entering a bedroom, while changing recovery zone
clears that room's draft. Save-to-Pending is an intended queued mutation that can
retry after reload, not a neutral export. An old observer also labels peers offline
and says another tab controls; only its existing takeover response can explain an
update. These limitations must appear in the actual cutover plan. Never auto-reload
or describe the fallback as lossless. A preparatory compatibility release is the
recommended path if complete legacy draft recovery is required; it cannot
retroactively update tabs that never reload. Production release is still separate.

Before P3 code, fix three integration details in the candidate: branch lounge
arrivals explicitly while preserving bedroom arrivals; replace old couch/rear-lamp
fixture IDs and renderer lookups atomically; use purpose-specific seats and bounded
colour selection rather than indexing six colours across capacity+8 seats. Current
player/member capacity stays six. Frozen-old-client and native sofa/seat checks
remain required, not satisfied by route-target probes.

## Implementation decision after source reconciliation

The Astra/max decision review chose the enlarged lounge with the narrow read-only
legacy fallback. Release is separate; no preliminary release is required for the
local work. Preserve persisted records and submitted pending commands; recover
only unsent drafts still available in the old tab. Do not promise universal old
multi-zone draft recovery or reload automatically.

A static `house-version.js` defines `HOUSE_WORLD_VERSION='lounge-2'` and is
re-exported by the shared geometry module. Loaded clients send that value in
Socket.IO auth. Exact matches receive current authority; absent versions receive
read-only authorized subscriptions and `players:[]`; all declared unsupported or
malformed values are rejected before registration. The authorized recovery zone
comes from the old client's subscription; do not add a new pinning protocol.
Legacy projections return before lease reconciliation. Every controlled mutation
returns NOT_CONTROLLER, which the old outbox retains; explicit takeover can show
CLIENT_UPDATE_REQUIRED. Room/session/member revocation still clears private data.

New snapshots and motion envelopes carry the source version. The new client must
accept a matching authorized head before sends/retries/flush. A mismatch latches
an update state, disconnects transport without closing draft inspection, retains
pending intents and never installs mismatched poses. Persistent UI offers a neutral
local-draft download, Pending inspection and deliberate reload, with the actual
unsent-data consequence explained. Existing controlled HTTP authority is sufficient;
no blanket HTTP version header or changes to independent board authority.

Acceptance: version classes and unsupported cleanup, every denied legacy mutation,
no lease/pose effects from recovery reads, room/session/member revocation, controlled
HTTP and independent board regressions, no pre-head flush, retained pending intents,
and one frozen8cdad6a browser trial with same-zone drafts/lost ACK/export/reload.
Model reconciliation is not implementation acceptance; tests are still to run.
