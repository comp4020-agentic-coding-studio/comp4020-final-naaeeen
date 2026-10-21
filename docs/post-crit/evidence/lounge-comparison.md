# P3 matched spatial comparison

Protocol: lounge-protocol.md. Source/runner bindings: lounge-source-manifest.json,
lounge-browser.json. Compact16x11 and expanded20x14 share all fixtures, capacity,
avatars, default camera, zoom, light count and fixed512 shadow map. This changes
area and arrangement together. It is a technical renderer comparison and parent
design judgement, not a human A/B or a measured enjoyment/productivity result.

| Viewport | Follow actor, both | Compact Overview | Expanded Overview |
| --- | ---: | ---: | ---: |
| 1920x1080 | 128px | 90.25px | 74.35px |
| 390x844 | 72px | 21.24px | 16.93px |
| 844x390 | 78px | 27.22px | 22.43px |

All six corrected native cases pass actual viewport, default posed mesh framing,
all22 projected Overview targets, representative native seat/game/board selection
and six rest poses. Desktop tests all14 individual seats; phone/landscape test a
study chair, both sofa orientations and a game chair. Sitting emits only seat
control; game activation emits kind:game. Six-rest snapshots retain72px portrait
and78px landscape self scale. Browser errors: zero. SwiftShader is the rendering
backend; these are real Chromium pixels, not physical GPU/device performance.

Deterministic capacity-six longest spawn-to-target routes are13.662m compact and
17.900m expanded, measured with unchanged shared pathfinding (lounge-route-metrics).
Across capacities2–6,800 arrival-to-target and120 stand-to-spawn routes pass in the
new focused tests; the updated legacy regression covers another170 routes. Native
route callbacks use synthetic ACKs and do not establish real server authority.

The parent inspected original desktop Overviews and portrait Follow and selected
expanded: distinct study/rest/game places and wider circulation meet the owner's
roomier-house request while Follow retains actor scale. The smaller optional
Overview and longer walks are acknowledged costs. Both phone Overviews are distant
miniatures with dense labels; target visibility alone does not prove readable
navigation. Places/Follow and actual shell integration must carry that task.
No geometry refinement was needed/consumed. No production geometry selector was
added. Full shell overlap/multiplayer authority stays in the parent integration
and P6 gates; human preference remains NOT RUN.
