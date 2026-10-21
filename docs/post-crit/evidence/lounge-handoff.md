# P3 lounge lane handoff

State: COMPLETE for assigned geometry/rendering scope, source ownership RELEASED.
No commit, push, deploy or lingering browser/server/process. Native slot released
to game UI. Canonical Ubuntu/lizhi repo, branch post-crit-improvements.

Changed source: public/house-geometry.js + new .d.ts; public/house-world.js;
spec/house-geometry.test.ts, new house-lounge-geometry.test.ts, house-world.test.ts.
All evidence is lounge-* in this directory. Other agents' source was preserved.

Expanded20x14 is production default, compact16x11 remains test/comparison API only.
Bedrooms remain14x10, existing placements/seat facing and fallbackx0,z3 unchanged;
parent chose to retain actual server bedroom arrivals independently. Stable study
seat IDs, six rest cushions, two game chairs, fixture association and shared
arrivals/gameTarget are implemented. Geometry re-exports parent's static
HOUSE_WORLD_VERSION from house-version.js. Shadowmap stays512 with fitted bounds.

Integration interfaces:
- createLayout(capacity, variant='expanded') -> Layout, arrivals[permanentSlot].
- Seat.purpose study/rest/game/bedroom, optional fixtureId for sofa cushions.
- world.routeTo('study'|'rest'|'game'|'board'|'room') -> boolean, lounge only.
- Seated/observer/disabled/unavailable route requests return false. Study/rest
  select nearest unoccupied purposeful seat. Own-room uses permanent resident slot.
- Existing seat/board/door/exit callbacks retain type. Game arrival emits only
  {kind:'game'}; game-chair sitting emits only {type:'seat',seatId}. Never Join.
- UI may explicitly exit a bedroom then retry a deliberate Places request after
  the authoritative lounge snapshot. No state/availability/task choice changes.

Verification:115 focused tests PASS with94.15% statements,88.39% branches,94.41%
functions,98.36% lines across the two owned production JS files. Native renderer
6/6 matched cases PASS at1920x1080/390x844/844x390; current source hashes match its
manifest. Typecheck and git diff --check PASS. Fresh Astra/high review found oneP2
optional peer/observer arrival issue; red reproduction, shared-resolver fix and
contextual4-test recheck resolve it. See lounge-review.md for exact scope/failed
attempts; lounge-comparison.md for candidate costs and parent's selection.

Residual parent gates: real Socket.IO arrivals/occupied rejection/stand authority,
closed-room revocation, native shell panels/Places/game lifecycle, preserved old
client cutover, full required suite/resource/deployment. The isolated native
fixture uses immutable synthetic snapshots/ACKs, not multiplayer authority.
Phone Overview is intentionally distant in both candidates; default Follow keeps
72px actor scale. Human preference/physical-phone performance remain NOT RUN.
No geometry refinement was consumed. Do not repeat this passing renderer run
unless source or a concrete unresolved concern changes.
