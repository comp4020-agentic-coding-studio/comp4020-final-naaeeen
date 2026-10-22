# Table-fit result — initial mechanical study

The declared 1.55 m chair ring and 2.60 m approach ring fit capacities 2–6 under
the named physical and seat-bound route criteria. **This is not a production-ready
layout**: its unchanged global gameTarget is blocked at capacities 4 and 5. There
was one execution, no radius search, no geometry refinement and no browser/human test.

| House capacity | Baseline seats / full result | Ring seats / named criteria | Ring's unchanged gameTarget |
| --- | --- | --- | --- |
| 2 | 2 / PASS | 2 / PASS | valid + routed |
| 3 | 2 / FAIL: count | 3 / PASS | valid + routed |
| 4 | 2 / FAIL: count | 4 / PASS | BLOCKED |
| 5 | 2 / FAIL: count | 5 / PASS | BLOCKED |
| 6 | 2 / FAIL: count | 6 / PASS | valid + routed |

Every ring case separately passes: count, unique seat IDs, full oriented chair
bounds, chair non-overlap, valid approaches, 1.5 m claim range, game-seat routes,
study/rest routes, board route, all door routes, exit route and fixed non-game
geometry. The baseline retains two game chairs at every capacity and fails only
the capacity criterion at 3–6. Full destinations, coordinates and individual
booleans are in [the raw result](table-fit-initial.json).

All six calibration controls pass: known-valid expanded capacity 2, production
bedroom footprint/route, rejected duplicate seat ID, rejected approach inside a
fixture, rejected out-of-bounds approach, and rejected enclosed destination even
though production validPosition accepts that destination itself. The enclosure
control therefore distinguishes point validity from actual reachability.

## Binding and reproduction

- Source HEAD: `fb363cfee37be556f14b0c7a567d020719305517`, branch
  `post-crit-improvements`. Production source hashes are in the raw JSON and
  [pre-execution freeze](table-fit-freeze-initial.json).
- [Protocol v1](table-fit-protocol-initial.md) was frozen before grading;
  SHA-256 `0167f45ccc1f29366234556bc66831966d7f006dd1ef63b2c4d507e8ff8cae03`.
- Runner SHA-256 `34bf77747b758dd129705116aac1f8e8f0c78e61f91ae537baa3ca65f78f012d`.
- Runtime: `/home/lizhi/.local/share/mise/installs/node/24.21.0/bin/node`,
  actual version `v24.21.0`. [Execution record](table-fit-initial.execution.json)
  records actual Node exit **0**; stdout was preserved as raw JSON and stderr is empty.
- Windows PowerShell to WSL bridge, explicit Ubuntu/lizhi and canonical Linux path.
  No dependency installation, full application suite, service or commit was run.

From the canonical repository in WSL:

```text
/home/lizhi/.local/share/mise/installs/node/24.21.0/bin/node prototypes/spatial-table-fit/runner.mjs initial 1.55 2.60 docs/spatial-redesign/evidence/table-fit-protocol-initial.md
```

The runner prints JSON and rewrites only its same-named standalone SVG/HTML figure.
To preserve an original attempt, use a new label and an explicitly declared protocol.

## Figure and interpretation

Open [the standalone HTML](table-fit-initial.html) or [SVG](table-fit-initial.svg).
The figure uses actual six-capacity geometry coordinates, full chair rectangles,
seat centres, approaches, fixtures, zones, door markers, spawn, board and exit.
The SVG parsed successfully with required labels present; it was not rendered or
checked for browser pixels. It is labelled MECHANICAL STUDY, not a finished 3D design.

The production `validPosition` and `findRoute` use existing conservative collision
rectangles unchanged. Oriented lounge-chair geometry uses the existing renderer's
bounding rectangle (.78 × .80 m at yaw heading+pi and .035 m centre offset), tested
against other chair rectangles and fixture rectangles. `footprint` is only suited
to quarter-turn bedroom catalogue placements; its positive control does not claim
to grade arbitrary lounge orientation.

The question settled is narrow: six chairs and reachable claimable seat approaches
are physically possible around this fixed table under present geometry. It does
not settle simultaneous avatar movement/occupancy, contention, table visibility,
readability, phone input, comfort, consent, seat eligibility, game participation,
value, network behavior, performance, accessibility or real-user enjoyment.
The existing global gameTarget conflict must be resolved explicitly if any later
product design keeps that activation path. No existing game or interaction policy
has been implemented or accepted by this spike. Independent review belongs to the
parent's integration step and is not claimed by this result.
