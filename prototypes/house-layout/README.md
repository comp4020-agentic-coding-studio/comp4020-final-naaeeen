# The Common Room: local house-layout spike

Isolated browser prototype for the parent-owned layout comparison in
`evaluation/shared-house-planning.protocol.json`. This is not the production
application. The root application, runtime manifest and deployment configuration
are unchanged. No production database, session, token or remote service is used.

Run from the repository in Ubuntu as lizhi:

```sh
mise exec -- node prototypes/house-layout/server.mjs
# default http://127.0.0.1:4092 ; optional PORT=4093
mise exec -- node --test prototypes/house-layout/model.test.mjs prototypes/house-layout/server.test.mjs
```

Requires the already installed Three 0.186.1. The server binds only 127.0.0.1
and serves a fixed allowlist of prototype files and Three's two build modules.
It has no arbitrary filesystem route. Do not add this prototype to a production
server or deployment. The local server has no persistence or multiplayer.

## Comparison controls

A has all bedroom doors on the rear wall. B splits doors across rear and left
walls. Capacity 2 through 6 gives exactly that many labelled lounge doors,
armchairs and distinguishable procedural avatar fixtures. Palette, shell,
furniture, members, lighting, orthographic camera and tasks are the same for A/B
at each capacity. The phone camera uses a fixed framing shared by both layouts.
The right and front walls are cut away; the door arrangements are research
candidates, not approved product designs.

## Try the tasks

Choose layout/capacity in native labelled selectors. Select a door or chair
and press Walk, or click it in the scene. WASD and arrow keys move You; the touch
pad supports pointer hold or keyboard activation. Furniture uses circle vs
axis-aligned rectangle collision, no avatar blocking and no hard navmesh.
Walk to a chair then Sit; Stand returns to its clear approach point. Enter my room
opens a small bed/desk room, and Return returns beside your own door.
Other members' rooms are identified but cannot be entered. Whiteboard opens a
local sticky-note form. Send puts text on your avatar and in a local transcript.
Typing and native control keys do not move the avatar.

Visible Layout diagnostics disclose layout/capacity, lounge fixture counts,
room and avatar coordinates for browser checks. The pure model exports counts,
collision and grid routes. Native Node tests cover every A/B capacity and target, endpoint routing,
solid furniture collision and the real HTTP allowlist.
Tests are mechanical checks, not human preference or physical-device evidence.

## Limits

Other avatars are visibly described as simulated layout fixtures, not online
users. Chat has one local sender, no reciprocal transport, no cross-user delivery
and no save. The room is a layout preview, not a verified privacy contract or DIY
editor. Refresh resets everything. Sticky notes are local and accessible through
the form; there is no board synchronization or CRDT. Touch/browser checks need
actual parent verification at 1920x1080 and 390x844. Grid routes use 0.25-unit
cells and an avatar radius of 0.24. Model chair colliders enclose the actual
turned chair footprint; endpoint route connectors are sampled for collision. Shadows/rendering are device-dependent; physical
phone performance is unmeasured.
