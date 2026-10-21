# P1 camera comparison protocol

Registered before candidate implementation, 22 October 2026. Technical comparison only; no human preference or physical-phone claim.

Requirement: a temporary primary canvas drag must recover Follow within 250 ms of intentional movement. Explicit Look and Overview remain intentional. Recenter remains reachable in the normal world HUD. Editing remains stable; actual posed avatar mesh and ring stay framed, with no typing/panel/chat gesture movement.

Baseline: `spec/house-world.test.ts` test `resumes follow on intentional walking after a temporary primary drag` failed against unchanged production modules: a 7 CSS pixel drag followed by directional movement and a 100 ms RAF still returned inspection instead of play. Node 24.21.0, pnpm 11.9.0, Vitest 5.0.1, isolated house config; exit 1. This is a renderer-stub integration reproduction, not browser evidence. Existing camera ownership spec intentionally preserves inspection during walking and must be explicitly revised for temporary drag versus explicit Look.

Compare identical geometry, route, avatar and HUD for A repaired bounded follow, B centered damped follow and C stable overview. Change only camera policy. Use viewports 1920x1080, 390x844, 844x390, and keyboard-height 390x520, plus visual-viewport offset/shrink and reduced motion. Exercise 0/5/7 px primary drags, walking, reversals, doors/seats/board, chat drag/collapse, typing, zoom and resize. Preserve failed candidate outcomes.

Mechanical targets registered by the plan: Follow resumes within 250 ms; stationary camera drift no greater than 1 CSS pixel across 2 seconds after settling; default phone avatar height at least 64 CSS pixels. Report target failures openly rather than changing thresholds. For a room overview, evaluate the same prominence criterion and report its expected scale cost. Measure actual animated mesh/ring containment, not a symmetric nominal actor rectangle. Separate emulated keyboard viewport from a physical mobile keyboard.

Selection: reject authority/input/containment failures; among mechanically viable candidates compare camera travel, reversals and implementation complexity. Screenshots/model judgement cannot establish user comfort. Stop resolved checks after affected regressions and fresh review are addressed.

Registration status before implementation: production edits were held pending parent GO after fresh plan review; no browser comparison had yet run. The parent supplied GO before the production edits recorded below.


## Executed results and scope

The initial source-bound comparison completed 12 common-task rows plus a separate
A reduced-motion condition. A and B meet the registered mechanical targets. C
completes the task and stays stable but its portrait actor is 21.24 CSS px, and
11.33 px in the reduced-height view, below the unchanged 64 px phone target. C
is not penalized for lacking a Follow transition.

Fresh review then exposed focused-HUD keyboard blocking and an open-movement
landscape overlap. Direct native RED results are preserved. The revised candidate
passes 155 focused unit/integration tests, current-A four-view complete tasks,
reduced motion, focused HUD keys without forced canvas focus, open-movement hit
targets, actual CDP canvas touch pan/cancellation, and posed mesh/ring containment
with movement controls open. Exact source, commands, calibration failures and
coverage scope are in P1-CAMERA.md and the three result JSON files.

At the earlier A checkpoint, A/B selection remained open for fresh visual/task review; the subsequent final refinement below selected B.
Lower framing travel alone does not establish a better game-follow experience.
The native runs use emulated viewports/touch and a baseline server with P1 files;
physical phones, people, current P2 integration and a remote release remain separate.


Final refinement: the parent subsequently selected centered B by fresh design
judgment, with explicit motion cost and no human preference claim. The original
comparison source/results remain frozen. P1-B-READABILITY-PROTOCOL.md registered
the additional actual-body clearance criteria; P1-B-READABILITY.md records the
RED/refinement/current observer checks and exact source boundaries. No historical
A result is relabelled as current B.
