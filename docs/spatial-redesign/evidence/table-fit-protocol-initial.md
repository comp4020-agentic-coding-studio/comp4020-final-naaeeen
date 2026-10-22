# Table-fit protocol v1 — frozen before execution

MECHANICAL STUDY. This spike asks whether capacity 2–6 game chairs fit around the
existing game table. It cannot decide the usefulness of any game or zone.

## Common condition and factor

Baseline is actual `createLayout(capacity, 'expanded')`, capacity 2 through 6.
Candidate changes only game chairs, their collision rectangles and approach targets.
Room remains 20 × 14 m. All other fixtures, doors, study/rest seats, spawn, board,
exit and original gameTarget stay byte-equivalent after JSON serialization.
Collision/routing remain imported production `validPosition`/`findRoute`.
Initial ring: centre (-6.2, 3.3), chair radius 1.55 m, approach radius 2.60 m;
angle pi/2 + i*2*pi/capacity, heading toward table centre. No tuning within a run.
The initial radii retain the original north/south chair spacing and target spacing.
If any physical/approach/route criterion fails, preserve it and declare at most
one radius revision, with reason, before a second execution. Stop afterward.

## Separate criteria

1. Game seat count equals house capacity; every seat ID is unique.
2. Full oriented lounge chair rectangles (.78 × .80 m, yaw heading+pi, centre
   shifted .035 m along yaw) are within room bounds and do not overlap another
   chair or non-chair fixture. Use separating-axis geometry; do not approximate
   chairs as points. Rest seats belong to sofas, not additional chair objects.
3. Every seat approach is production-valid and within the existing 1.5 m claim
   distance of its seat centre. Invalid seat targets cannot pass via routing.
4. Production findRoute returns a route from original spawn to every game,
   study/rest approach, board, each door target and exit; report every destination.
5. Candidate preserves all non-game geometry. Baseline is its own reference.

Also report the unchanged global gameTarget validity/route separately: it is not
one of the named seat-bound route gates, and may conflict with a ring chair.
The report must expose that conflict rather than imply all old UI anchors work.
`footprint` is imported and exercised for an existing bedroom chair control; it
only supports quarter-turn .8 × .8 bedroom catalogues and cannot replace the
actual lounge .78 × .80 arbitrarily oriented chair formula.

## Calibration and stopping

Known-valid baseline capacity 2 must pass every main criterion. Production
bedroomLayout([{id:'control-chair',kind:'chair',x:-3,z:0,rotation:0}]) plus
footprint must pass route/bounds checks. State-mutated negative controls must
reject: duplicate seat ID, target at game-table centre, out-of-bounds target,
and a valid target enclosed by four fixture walls (route must fail).
Controls are evaluated separately; candidate failure is useful evidence.
Run exit 0 only if controls and every candidate gate pass, else 1. Baseline
seat-count failures at capacities 3–6 are reported rather than hidden.

Record exact source, runner and protocol hashes; Node binary/version, command,
actual process exit, full raw JSON and SVG/HTML. No install, service, browser,
production edit, commit, performance comparison, pixel claim or human test.
Parent performs independent source/claim review before integrating conclusions.
