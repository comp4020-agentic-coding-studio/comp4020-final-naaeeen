# Movable avatars and a shared study room: feasibility assessment

Assessed 6 October 2026. Research proposal for development after Crit 8; no new
gameplay or networking has been implemented. The frozen crit-8 tag remains at
6dc79c5ec6cc5610a867d653892d2b827ee94536.

## Decision

Keep the topic. A simplified combination of personal room-making, embodied
conversation and shared studying is credible within the owner's approximately
two-week budget. This is a conditional engineering judgement, not a delivery
guarantee. Movement, actual avatar dialogue and felt co-presence are mandatory minimum
experience requirements, including any 2D fallback. Shared studying is core; the
earlier plan deferred walking and therefore no longer represents the intended
final experience.

Borrow the social room and letter interaction from
[Kind Words 2](https://store.steampowered.com/app/2118120/Kind_Words_2_lofi_city_pop/)
and the avatar, room-building and shared focus experience from
[gogh](https://store.steampowered.com/app/3213850/gogh_Focus_with_Your_Avatar/).
These references establish inspiration, not access to their source or a reusable
Steam game API.

## Existing foundation and actual gaps

Current dependencies are Three.js 0.186.1 and marked 17.0.3; Socket.IO and
Colyseus are not installed. The actual repository, not the imported prototype,
is authoritative.

- src/store.ts:49-53,76-108 already provides persisted identity, sessions,
  personal furniture and command receipts. Published neighbours are saved
  visitors, not online friends. No circle, membership or shared study room exists.
- src/server.ts:85-99,120-138 implements HTTP commands and full-state SSE
  snapshots. Commands have a 90-per-minute limit and persistent execution.
  This path must not be reused for continuously writing avatar coordinates.
- public/render-three.js:126-140,399-434,599-607 has a fixed procedural resident,
  one furniture projection and drawing loop, not movement or multi-avatar presence.
- Furniture ownership, placement rules, save acknowledgement and deployment can
  be retained. Scene layers and transitions, membership, avatar state, input,
  animations, text conversation and focus sessions need substantive new work.

## A complete but bounded experience

A user customises a small personal room, walks through a door/uses an accessible
door action, joins an invited study room, greets a friend, selects a desk, focuses
together, and talks during a break. A small persistent note can connect the next
visit to the previous session.

Initial scope: one personal-room shell and one shared-study-room template;
4-8 people as a target to test; one compatible avatar rig with a few presets;
idle/walk/sit/wave; 10-15 furniture catalogue types with a bounded placement count;
room text chat with avatar bubbles and readable history; one shared focus timer.
Use fixed orthographic 3D with movement on a horizontal plane. Start with keyboard
and touch movement plus simple furniture blocking. Click-to-walk adds pathfinding,
so it is not automatically the cheapest input option.

A useful distinctive interaction is a quiet desk area and a social break corner.
Quiet mode changes intrusive presentation, not whether messages reach the user.
This is a design hypothesis requiring friends' feedback, not a proven benefit.

## Tools that remove work

[Three.js AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html)
plays model animation clips. [Raycaster](https://threejs.org/docs/pages/Raycaster.html)
provides picking, not obstacle navigation.
[RenderPixelatedPass](https://threejs.org/docs/pages/RenderPixelatedPass.html)
offers a pixelated render effect; warm lighting, colour direction and readable
HTML text remain our design responsibility.

[KayKit Adventurers](https://kaylousberg.itch.io/kaykit-adventurers) provides
rigged/animated glTF characters under CC0. Its fantasy appearance is suitable for
a technical spike, not evidence of the final modern-student visual style.
[KayKit Character Animations](https://kaylousberg.itch.io/kaykit-character-animations)
includes walking, sitting and waving, with compatible rig families and CC0 terms.
[KayKit Furniture Bits](https://kaylousberg.itch.io/furniture-bits) provides
50+ low-poly furniture models in OBJ/FBX/glTF under CC0.
Select a small set; do not ship an entire catalogue merely because it is available.
Verify the downloaded license, model scale, pivots, skeleton and seat alignment.

[Socket.IO 4](https://socket.io/docs/v4/server-initialization/) can attach to the
existing Node HTTP server. Its [rooms](https://socket.io/docs/v4/rooms/) are
broadcast channels, not furnished game spaces or permission systems.
Use it as the preferred incremental networking option; implement authorised
membership, bounded presence, movement validation and client interpolation.

[Colyseus](https://docs.colyseus.io/room) is a credible alternative with room
lifecycle and [automatic schema synchronization](https://docs.colyseus.io/state).
Choose it instead of Socket.IO if a bounded integration trial demonstrates a
clear advantage. Do not install both to solve the same problem.
Its [official Three.js example](https://github.com/colyseus/realtime-tanks-demo/tree/master/web-threejs)
has an [MIT license](https://raw.githubusercontent.com/colyseus/realtime-tanks-demo/master/LICENSE);
the [manifest](https://raw.githubusercontent.com/colyseus/realtime-tanks-demo/master/web-threejs/package.json)
uses older Three.js and SDK ranges. Borrow a verified pattern, not a whole
version-mismatched starter.

## State and maintenance

SQLite retains identity, room layouts, membership, avatar appearance, chosen
persistent notes and focus-session timestamps. Memory retains connections,
position, heading and short-lived bubbles. Seats require atomic server ownership:
one occupant per seat, a bounded reconnect reservation, and a clear release rule.
After process restart rebuild presence without resurrecting absent occupants.
Persist focus deadlines and rejoin membership. Authorise every room transition
and message using server-resolved identity; display text safely.

Retain HTTP commands for durable mutations. During migration existing SSE may remain
for compatible saved updates. Define one authoritative durable snapshot/revision
source before the shared-room prototype, so the two transports cannot disagree. Movement should not create SQLite
receipts per frame.

[Socket.IO delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/)
do not imply exactly-once saving. [Connection recovery](https://socket.io/docs/v4/connection-state-recovery/)
can fail; a full rejoin snapshot and the existing receipt approach still matter.
[Fly supports WebSockets](https://fly.io/blog/websockets-and-fly/), but this
does not prove our 256MB machine handles the proposed workload. Measure it.
Keep catalogue IDs/versioned transforms separate from models, avatar identity
separate from connection IDs, and room state separate from rendering.

## Two-week sequence and decision gates

This is a proposed budget allocation, not measured effort:

1. Days 1-2: one shared scene, two real browsers, animated movement, correctly
   attributed text bubbles and sitting. Begin real paired-use feedback immediately.
   This first gate demonstrates the embodied loop, not complete reliability.
2. Days 3-5: stable movement, disconnect/multiple-tab handling, invitation
   membership and rejoin snapshots; freeze the network choice. Check rejected
   non-member joins, simultaneous claims for one seat, consistent durable layout
   snapshots, and up to eight clients' memory/latency. Check restart behaviour
   again when focus sessions exist.
3. Days 6-8: personal-room editing and avatar presets, persist/reload and room
   transitions. Preserve existing saved data through explicit migration.
4. Days 9-11: shared focus endpoint timestamps, quiet/break interaction and
   deliberate persistent notes.
5. Days 12-14: real friends' trials, keyboard and 390x844 checks, slow network,
   restart/redeploy persistence, fixes and current course evidence.

Spike acceptance targets: visible updates within about one second; no duplicate
avatars on rejoin; bounded eight-client workload below the machine memory limit;
usable rendering target of at least 30 FPS on an identified ordinary laptop.
These are unverified targets. Never infer frame rate from headless checks.

Classify a failed gate before changing topic. If rendering is the blocker, use
simpler procedural avatars or 2D while keeping shared studying and conversation.
If networking/identity is the blocker, switching to 2D will not solve it.
Defer advanced avatar sliders, arbitrary model uploads, user-shaped room shells,
voice/video, a city map and a public social platform. Add catalogue packs and
shared-room templates after the tested core loop works.

## Evidence boundary

Three independent read-only passes investigated assets, transport and current
code. The parent checked decisive primary pages and actual source excerpts.
A fresh scope critique identified underestimated invitation, seat-ownership,
restart and two-transport consistency costs; the proposal above was revised.
Minimum first-use gates are encounter, comfortable movement, readable reciprocal
conversation and visible shared studying. A typed W/A/S/D must not move an avatar;
touch controls must remain usable with chat open. The critique is not a user study.
No new browser prototype, load test, asset integration, deployment or human
preference test was performed for this assessment.

The current [Final Project brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/)
requires distinguishable users, visible real-time shared changes and persistence.
This concept fits that contract when those properties are demonstrated.
