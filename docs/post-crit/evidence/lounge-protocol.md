# P3 lounge comparison protocol

22 October 2026. Before implementation and native browser observation.

Requirement: keep bedroom dimensions/placement meaning, membership capacity 2–6,
centered Follow controls, collision authority and voluntary state unchanged while
providing study, rest and game places in the common lounge.

Candidates: compact 16x11 and expanded 20x14 use the same fixed fixtures, capacity
study chairs, six 0.4m sofa cushions, two game chairs, avatar scale, lighting count,
512 shadow map, camera defaults and UI. Coordinates are from LOUNGE-CONTRACT.md;
area and arrangement change together. Production has no geometry picker.

Mechanical gates: shared arrivals, every arrival-to-door/seat/board/game/exit route,
every stand anchor, footprint alignment from heading, stable seat/fixture IDs,
purpose-specific counts, pickable individual cushions, game action separate from
seat, unchanged bedroom anchors, and no body/label/camera regression. Test sparse
permanent slots and capacities 2–6. Native GPU runs are serialized by the parent.

Matched native tasks at 1920x1080, 390x844 and 844x390: six residents arrive, take a
study chair, stand, visit each door, take each sofa cushion/game chair, open board
and game, cross paths, and return to own room. Measure legibility/default actor
height >=64 CSS px, reachable actions, panels/body overlap, overview distance,
route success and errors. Preserve native artifacts and exact source hashes.
Compare same tasks, capacity, camera, zoom and lighting. One meaningful geometry
refinement is allowed, followed by affected re-evaluation; then stop this lane.

Choose expanded only if routes/circulation and differentiated places pass while
phone Follow stays readable and overview remains an explicit navigation aid.
Longer paths are a cost, measured separately. Automated/renderer/native checks
are technical evidence; model review is judgement. Human preference, enjoyment
and physical-phone performance remain NOT RUN without actual participants/device.
