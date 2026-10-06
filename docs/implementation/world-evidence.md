# World and shared geometry evidence

6 October 2026. Local implementation evidence; no human enjoyment, physical-phone,
production-load or deployment result is claimed here. The Windows-to-Ubuntu bridge
was used, with Node 24.21.0 / pnpm 11.9.0 through the repository's mise toolchain.

## Implemented boundaries

`public/house-geometry.js` contains no browser globals. The browser renderer and
server import the same 12 × 8 metre footprints, radius 0.24 collision, substepped
sliding, stable door slots, seat anchors and placement validation. Capacity 2–4
uses rear doors; 5–6 uses rear/left banks from the reviewed prototype. The lounge
spawn is (0, 2.85). The table, chairs, cabinet, shelf, couch, lamp base, plant pot
and board have collision footprints. Avatars do not block other avatars.

Bedrooms use the same shell, spawn (0, 3), a bottom arrival band beginning at
z = 2.5, and a full-depth central corridor |x| ≤ 0.65. Furniture is bounded to ten
pieces, six kinds and six colours, a half-metre grid and quarter-turn rotations.
The validator checks kind, colour, unique IDs, finite transforms, grid, bounds,
protected routes, furniture clearance and a clear route to each chair approach.
Rotated chairs near a wall choose another valid approach rather than an anchor
outside the floor. Catalogue footprints are desk 2 × 1, chair .8 × .8, bed 2 × 3,
shelf 1.5 × .5, plant .6 × .6 and lamp .5 × .5.

`public/house-world.js` renders only connected players in the authorised current
zone; permanent resident names remain on occupied bedroom doors when offline.
Original procedural figures have coloured bodies, expressive faces, animated
limbs and idle/walk/sit poses. Local motion is predicted, remote motion interpolated;
server room/seat/controller state remains authoritative. Quiet residents receive
no intrusive peer bubbles. Recent actual same-zone chat can appear for six seconds
as plain DOM text, with a bounded length. Door and availability states are separate.

The canvas fills its container. Orthographic framing changes for the narrow
viewport, retaining a mostly frontal oblique view instead of shrinking the whole
world to a wide desktop ratio. Camera-facing walls remain cut away. Procedural
assets require no downloads. The parent owns HUD, native controls, save/recovery,
server static delivery and integration verification.

## Renderer API

`createHouseWorld(container, {onMove, onInteract, onSelectPlacement, onHint})`
returns `update(live|null)`, `setInputEnabled(bool)`, `setDirection(x,z)`,
`setEditing(bool)`, `setRoomPreview(placements|null)`, `approach(target)`,
`interact()`, `getPosition()`, `resize()` and `dispose()`.

Movement is collision constrained and emitted at most ten times per second,
only by a controller. Keyboard/touch directions, blur, typing and IME composition
are isolated. `approach` follows quarter-metre BFS routes with sampled clear
connectors; it never teleports. Clicked native world targets use that same route.
Interactions name a door slot/room, seat UUID, shared board or lounge exit and
require proximity. Seated movement asks the parent to stand, then waits for the
authoritative standing anchor. Editing raycasts call back a placement UUID;
preview state does not invent a durable revision. `update(null)` clears private
furniture, avatars and movement immediately. Dispose removes handlers, observers,
DOM nodes and GPU resources.

`#house-world` exposes actual predicted self x/z, zone and animation attributes.
Visible `.house-avatar-name` elements expose actual player IDs, names,
interpolated x/z, availability and connection state for browser assertions.
These are observable presentation state, not teleport or mutation test hooks.

## Checks and refinements

The initial geometry suite failed because the production module did not exist.
After implementation its seven tests passed. A further regression reproduced a
legal rotated chair with an approach outside the room; the anchor selection was
fixed and its test now passes. Eight focused tests pass in Vitest 5.0.1, including
90 spawn-to-target and target-to-spawn route queries over capacities 2–6 with
sampled connectors, off-grid corner routing, solid collisions, tunnelling,
wall sliding, invalid numbers, supported transforms, protected routes and DIY
collisions. Focused V8 coverage: 96.45% statements, 94.54% branches, 100% functions,
100% lines for `public/house-geometry.js`. This measures geometry only.

`node --check public/house-world.js` passed. The first repository typecheck run
reported only unfinished client-worker test/export errors; the parent owns the
final integrated typecheck. A standalone renderer does not verify browser/server
integration. Parent acceptance must cover actual 1920 × 1080 and 390 × 844 DOM
viewports, two identities, native keyboard/Dpad movement, typing/IME, seat/door
transitions, DIY preview/save, bubbles/quiet state, resize and revocation.
A fresh independent integrated review is still required; a worker review spawn
was attempted but the session agent limit was reached.

Implementation consulted the installed Three 0.186.1 package and existing
reviewed prototype, alongside the official [Three documentation](https://threejs.org/docs/)
for renderer, orthographic camera and raycaster interfaces. Prototype member
fixtures were deliberately excluded from production presence.

## Visual refinement verified in Chromium

The parent identified rear-wall/header and floor/toolbelt overlap in the actual
six-slot desktop scene. A local Chromium check reproduced Room 4's door label
at y = 54–92 behind the header at 1920 × 1080. The scene also extended beyond
the top of the viewport. The fixed viewing angle is retained, but orthographic
frustum size and centre now fit actual mesh bounds into the usable HUD area.
Label edge clamping uses the rendered label width. The narrow viewport uses
compact numbered seat badges and a concise conversation label; door names,
avatar names and explicit availability remain legible DOM text.

After refinement, actual 1920 × 1080 DOM viewport measurements put mesh bounds
at x = 448.9–1471.1, y = 192–908. All six door-label rectangles were visible,
with y = 245.9–440.8, inside the requested y = 180–920 usable area. Actual
390 × 844 measurements put mesh bounds at x = 8–382, y = 258.9–486.1. The
six door labels were visible at y = 248.7–376, inside y = 185–560; side labels
had spacing rather than the earlier stacked overlap. Both screenshots were
visually inspected after capture and reported no page errors. The browser was
resized from desktop to phone within the same local creation flow.

The outer scene background is muted navy. Lower ambient and directional light,
warmer illumination and an additional small lamp on the existing tea cabinet
create a night setting while retaining the cosy wood/fabric materials. Neither
lamp adds point-light shadows. This is an implemented visual direction, not a
human preference or enjoyment result.

The in-app browser reported no available session during this refinement, so
the installed Chromium executable was used with the repository's sandboxed
Playwright launch settings, against the parent's unchanged localhost:4093
server. Screenshots are task scratch captures `/tmp/world-after-1920.png` and
`/tmp/world-after-390.png`; the parent owns retained acceptance screenshots.
Syntax and whitespace diagnostics passed after the refinement. This visual check
covers a real local identity in a six-slot house with five vacant doors, not six
human users, physical-phone performance, production load or deployed gameplay.

## Confirmed renderer defects and recovery

The browser worker reproduced two consequential input/navigation failures: a
canvas without tabindex could not take focus after the availability radio,
and an unclamped route stride could oscillate across a short waypoint instead
of arriving at a door. The canvas is now keyboard focusable. Deliberate canvas
pointer input and nonzero enabled-controller Dpad input focus it; typing and IME
composition still suppress held keyboard motion. Automatic walking caps each
stride at the remaining waypoint distance.

Fresh independent review reproduced another defect with actual Three geometry
and a stub renderer: a DIY preview rebuild cleared all avatars until another
network snapshot. Scene rebuild now synchronously restores only connected
players from the current authorised zone. `update(null)` continues to clear
private furniture/presence and does not repopulate anything.

A focused real local Chromium UI check verified the fixes: after selecting
Can chat, focusing the canvas and holding D moved the actual avatar by 0.26
metres; Walk to my room reached the bedroom zone. The rendered avatar count
remained one immediately through opening the DIY panel, adding a plant,
resetting the draft and closing preview. There were no page errors. The browser
worker independently confirmed keyboard/chat/return and actual bedroom arrival;
its stale location-header finding belongs to parent UI/subscription integration,
not a route failure. These are local scripted checks, not physical-phone or
human usability observations.

## A3 readability revisit, 7 October 2026

The earlier six-second/110UTF16 speech behavior is superseded. The new pure
`house-label-layout.js` packs cached name/bubble rectangles without changing actor
coordinates and enforces fresh-delivery history baselines, one four-second
preview/member, most recent three globally,80-codepoint body, two visual lines,
explicit speaker/Chat hint and Quiet suppression including self. Private preview
state clears on revocation/dispose. `setLabelSafeArea` accepts the UI's batched
visual viewport/control rectangles; static occluded labels also suppress.

Fourteen focused tests and native typecheck/diff checks pass. Six actual native
samples with two/six independent browser contexts at1920×1080,390×844 and390×520
reduced-height simulation have all real names visible, zero label/control/border
violations and at most three speech previews. Chinese/emoji PNGs use an explicitly
local Windows-font discovery configuration; earlier tofu baselines are unmatched
for glyph/readability comparison. Detailed red failures, fixes, source hashes,
coverage gaps, PNG conditions and per-subsection review status are recorded in
[WORLD-READABILITY](../revisit/WORLD-READABILITY.md). Fresh parent review and full
integration acceptance remain pending; no human/device/performance claim is made.
