# What the current house actually does

Baseline fb363cf. A fresh-context Sol/high audit traced the current source; the
parent independently inspected the shared geometry, interaction dispatcher,
activity control and receipt-ordering paths. No production change or application
suite rerun is claimed here.

| Place or action | Current behavior | Source |
| --- | --- | --- |
| Study table |2–6 seats, matching house capacity. Sitting changes pose/occupancy; it starts no distinct study task. The tabletop is rectangular; chairs form an ellipse. | public/house-geometry.js:45–48; public/house-world.js:148–152 |
| Rest corner | Two three-cushion sofas, six seats. Same sit/stand mechanism as other chairs. | public/house-geometry.js:50–60 |
| Game area | Exactly two chairs at every capacity, while picture participation allows six. | public/house-geometry.js:54; src/house-realtime.ts:442–446 |
| Sit versus use table | Sitting only claims a seat. Separate table interaction opens Watch. E while seated stands. A test deliberately preserves this old design. | public/house-world.js:304–336; spec/house-world.test.ts:830 |
| Remote activity | Reopen opens the panel from the lounge. Closing it retains participation and permits walking. Server control requires the lounge, not a table seat. | public/house-ui.js:115–118,663,695; src/house-realtime.ts:126–149 |
| Shared board | Physical board entry and global toolbelt entry coexist. Its service uses house membership independently of avatar seat/zone. | public/house-ui.js:38,154–156,540; src/board-service.ts:136–141,285–297,462–470 |
| Bedroom desk | Every desk opens the visitor's own global house-visible work card. My room repeats that card's goal/next step. | public/house-ui.js:149–150,252–292 |
| Bedroom privacy | Authorized room visitors get room chat and furniture. Owner controls furniture, lighting, palette and open/closed access. Existing access is not a selected-reference invitation system. | src/house-store.ts:255–258,585–634 |
| Seats and reconnect | Server validates distance/occupancy and retains disconnected seat reservations for30 seconds. Places ignores disconnected occupants, so it can suggest a reserved seat. | src/house-realtime.ts:272–283,393–410; public/house-world.js:339–341 |

## Design diagnosis

Physical furniture, logical activity participation and global work cards are
largely parallel systems. Their individual tests can pass while the combined
experience communicates contradictory things. The owner's criticism is a product
counterexample, not proof that every previous technical test was wrong.

Adding four chairs addresses capacity but not the remote-activation rule, the
meaning of the other places, or why a bedroom is worth visiting. Giving each sofa
a copy of the same menu would preserve the same underlying problem.

## All activity mutation paths

Durable game.join/ready/move/resume/leave and puzzle.start/place enter through
Socket.IO house.command OR HTTP POST /api/house/command. Both converge on trusted
server control and HouseStore.executeWithEffects. The normal client uses Socket.IO
for these actions, but the HTTP route remains directly callable with valid control
headers. Hiding a button cannot establish seat eligibility.

Picture Join/Leave instead use house.puzzle.intent and transient PuzzlePresence.
They are not durable puzzle.join/leave commands. Server leases own physical seat
facts. Clients must not supply their own trusted eligibility.

Relevant source: src/server.ts:188–204; src/house-realtime.ts:159–167,412–455,478–489;
src/house-contract.ts:17–19; src/house-puzzle-presence.ts:18–48.

## Preserve exact retry before checking a new effect

The store currently checks current identity/controller/lounge/house, then returns
an existing accepted receipt before applying a new action
(src/house-store.ts:437–459). Standing does not change generation. Consequently an
otherwise authorized replay after standing can return its original receipt without
changing the game. A new seat guard placed before that receipt lookup would break
this recovery behavior.

Future trusted seat facts should be constructed in gameControl and enforced on
first-effect mutation paths after receipt lookup. A fresh UUID with no receipt
must satisfy the current seat/participation rules. Leave/reconciliation must remain
possible after seat loss. Picture intent cache hits likewise resolve their original
request without re-enrolling a former participant; accepted snapshots own current
membership (public/house-client.js:454–455).

Revocation must cover stand, seat switch, walking's stand request, zone change,
controller takeover, geometry reconciliation, disconnect, session/member revocation
and expiry. Four-in-a-row currently distinguishes disconnect and left_lounge;
seat loss needs an honest new lifecycle meaning. Offline reserved seats are not
connected participants. Read/export and the independent board keep their own
access boundaries.

## Runtime observation

A temporary native in-app-browser tab opened the existing localhost preview,
continued the saved home and inspected Follow/Overview. The two-chair activity
area and separate sofa/study furniture were visible. The tab was then closed,
releasing its live presence. No message, game move, furniture edit or content share
was sent. This was one visual audit, not a human usability trial or a six-renderer
performance check; no private screenshot or identity is published in this record.
