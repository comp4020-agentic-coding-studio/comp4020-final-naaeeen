# Current P1 acceptance: centered B and unobscured avatars

Centered damped B is the default. Final source camera `b485dbd3`, world `b4e88e4b`
passes 168 focused tests and direct typecheck. Fresh Astra observer recheck is
ACCEPTED with no implementation blockers; the parent also inspected the original
controller and observer PNGs and accepted their body clarity/attribution.

Latest-source native checks cover actual no-self observers at portrait/landscape
and controller co-presence smoke. The preceding full B four-view/reduced/touch
results remain bound to world `aaafa3df`; no historical run is relabelled.
Read [P1-B-READABILITY.md](P1-B-READABILITY.md) and
[camera-source-manifest.json](camera-source-manifest.json) for current bindings.
The A checkpoints below are preserved history, not the current default or an
outstanding selection hold. Parent owns the local commit and P2 handoff.

# P1 camera repair and comparison

22 October 2026. Local, source-bound technical evidence. No physical-phone,
human preference, remote release or enjoyment claim is made.

## Requirement and implementation

The baseline primary drag over 6 CSS pixels entered persistent inspection. The
existing failing world regression was retained. Canvas drag now owns temporary
inspection; accepted keyboard, touch or routed walking intent resumes Follow
before displacement, including a blocked attempt. Explicit Look and Overview
remain deliberate. Position corrections, seat snapshots and controller-generation
changes do not count as walking intent. Editing stays fixed and exits to Follow.
Cancelled pointers release their capture/state. Bedroom chair clicks use the same
pathfinding and authoritative seat claim/stand callback as lounge seating.

Follow, Look and Overview are visible in the world HUD. Options retains the zoom,
comfort and camera controls. Transient camera state remains outside persistence.
The actual posed animated avatar mesh and ring still supply the framing envelope.

## Failed checks and evaluator refinement

- Before production edits, the scoped world/UI run preserved 9 failures and 119
  passes. Failures cover the retained drag bug, three walking-intent sources,
  editing exit, pointer capture, chair routing and visible recovery controls.
- The first implementation check preserved two old-contract assertion failures:
  editing used to restore Overview, and dragging Overview used to relabel it as
  inspection. The P1 contract deliberately replaces those rules. Assertions were
  updated while keeping their framing/render checks.
- Native attempt 1 timed out on a bedroom-chair click. Four real Three.js
  Raycaster tests, one per chair rotation, passed. Projection metadata updates on
  RAF after the immediate mode update; synchronizing two RAFs before picking
  allowed the exact desktop task to complete. No expanded pick radius or chair
  geometry change was made. The failed screenshot/log remain preserved.
- Attempt 2 exposed a case-sensitive save-status predicate. It could match a
  transient stale-preview message and miss the actual lowercase saved message.
  The predicate now requires saved state and rejects unsaved/preview/changed text.
- Attempt 3 reached the bedroom chair but clicked Return before the stand snapshot
  reached the page. The application explicitly requires standing first. The
  protocol now waits for the visible authoritative stand acknowledgement, as the
  lounge portion already did. Interrupted contexts remain ABORTED, not passes.

Raw logs and isolated databases stay under ignored `.local/post-crit-camera/` and
`.local/post-crit/p1-runtime/`. These calibration failures are separate from product
acceptance; the broader comparison's keyboard helper also forced canvas focus, so
it does not establish walking from focused HUD controls. Fresh review found that
missing boundary and the open-movement landscape overlay; direct native regressions
and their refinements are recorded with the final current-source checks below.

## Comparison conditions

The immutable runtime starts from `git archive d95055b` with only the five P1 public
files copied over and root Linux `node_modules` symlinked. It uses its own SQLite
data and loopback port 4101; the existing preview/data are untouched. Node 24.21.0,
pnpm 11.9.0, Playwright 1.63.0 and Chromium 153.0.8010.12 run through the verified
Windows-to-WSL bridge, with Chromium sandbox enabled and SwiftShader. The server
uses `--max-semi-space-size=12`. This is local native Chromium, not Fly or a phone.

`camera-browser.mjs` changes only the served camera module between candidates.
A uses repaired bounded follow. B sets both follow dead-zone widths to zero,
retaining damping/containment. C starts in room Overview and maps Follow recovery
to stable room framing; it has no 250 ms Follow-transition requirement. The same
admission, one controlled avatar, geometry, native keyboard/touch routes, physical
seat/board/chair clicks and room editing task run at 1920x1080, 390x844, 844x390
and 390x520. The last is a reduced-height simulation. All candidate fixtures start
with the same baseline room and add a single chair through the real editor.
Native resize runs on the portrait row. A separate production-A reduced-motion
condition covers recovery, actual mesh/ring containment and stationary drift.

Registered targets remain: A/B resume within 250 ms of intentional walking;
stationary drift <=1 CSS px over 2 s after settling; default portrait-phone actor
height >=64 CSS px; visible actor/actions, reachable recovery and complete task.
Camera travel is the summed screen-space world-framing displacement over the same
left/right/left route. It is a mechanical cost, not a comfort/preference score.

## Camera policy comparison

Initial camera hashes: A `52ff1371`, B `c796b582`, C `80e0c3d8` (full hashes in
camera-comparison.results.json). The initial world/UI/CSS binding and current
refined binding are separate in camera-source-manifest.json. The camera module
itself stayed unchanged during the input/HUD refinements.

| Policy | Common task | Portrait actor | 7 px drag then keyboard | Stationary drift | Sampled portrait framing travel |
| --- | --- | --- | --- | --- | --- |
| A bounded | 4/4 viewports | 72 px | 0.3–0.8 ms across views | 0 px | 46.2 px |
| B centered/damped | 4/4 viewports | 72 px | 0.3–0.5 ms across views | 0 px | 249 px |
| C stable room | 4/4 viewports | 21.24 px; 11.33 px at 390x520 | not applicable | 0 px | 0 px |

All twelve rows have actual initial mesh/ring containment, reachable closed-
movement HUD, native direction touch, input isolation, lounge seat, board, routed
room entry, stable editing, clicked bedroom chair and return to lounge. Portrait
rows also pass native landscape/portrait resize. C stays a viable deliberate
Overview, but fails the registered default-phone prominence target. A/B both pass
mechanical gates. Sampled travel is a single scripted local observation, not a
latency benchmark or comfort rating. Parent/backend checks briefly overlapped;
no failure is attributed to that overlap. The original helper intentionally
focuses the canvas, so the separate focused-HUD checks below are required.

At this earlier A handoff, A/B default selection was HELD for a fresh visual/task decision. The parent observed
that centered follow may anchor the avatar more clearly; low camera travel alone
cannot settle the owner's follow-camera request. No winner or human preference
is claimed here. Representative current A images and initial C portrait are saved
with verified native PNG dimensions. Initial B images remain under the ignored
native-comparison directory for the fresh review.

## Historical A input and HUD refinement checkpoint

The review identified two real boundaries missed by the initial task helper.
Ordinary HUD buttons kept focus after activation, but the blanket button-key guard
blocked walking from that focus. At 844x390 with coarse input, the movement window
at x22/y152/158x158 covered Follow at x17/y153/57.64x44. Native RED confirmed all
six focused walking observations had zero displacement and the landscape hit-test
found movement-controls over Follow.

The key guard now excludes chat/panel/board and editing controls while allowing
intentional walking from ordinary HUD focus. It does not force focus to the
canvas; native Enter/Space activation stays isolated. Short-height camera actions
move to the upper right. One primary pointer owns a gesture; secondary downs and
unrelated IDs cannot replace it. Cancellation releases capture, including pause.
The selected review regressions first failed 3 cases; the blocked-boundary walking
control passed. The final three-file suite passes 155 tests.

At that A checkpoint, production source was camera `52ff1371`, world `4d22ff77`, UI `93d9fa00`, HTML
`9037cc7e`, CSS `9d085778`; full hashes are in camera-source-manifest.json.
That A source passed the complete four-view task plus reduced motion, with zero page
errors and zero measured stationary drift. Direct native focused-key checks pass
all three main viewports without canvas.focus: both Follow and the restored pause
launcher allow walking while retaining keyboard focus. Open movement leaves Follow
clickable. The actual touch probe passes temporary canvas pan, held-touch Follow
recovery, direction cancellation, canvas cancellation/new touch, and actual posed
mesh/ring containment with movement controls open in all three views.

The first new-source focus run preserved one ambiguous desktop zero-distance
sample. A sampling-boundary explanation is supported by code inspection and the
unchanged-source two-RAF recheck; that single row does not isolate its exact cause.
Two RAFs before/after measurement provide synchronized visible coordinates; no production
change accompanied the successful recheck. The failed row remains in
camera-focus.results.json.

Coverage from the 155 scoped tests: 96.68% lines, 88.46% statements, 81.43% branches
and 85.01% functions across camera/world/UI. Camera lines 100%; world lines 97.23%;
UI lines 95.23%. UI branch coverage is 75.03% and function coverage 76.19%; these
are explicit scope gaps, not whole-app coverage. Typecheck and the owned diff
whitespace check pass. No additional test framework or dependency was installed.

## Reproduction and handoff

Use Linux mise/Node/pnpm in the canonical repository. The ignored runtime is a
checked git archive of d95055b with only the five owned public files copied in,
node_modules symlinked, and a separate data folder. Exact raw commands were:

- `mise exec -- pnpm exec vitest run --config vitest.house.config.ts spec/house-camera.test.ts spec/house-world.test.ts spec/house-ui.test.ts --coverage --coverage.include="public/house-{camera,world,ui}.js" --coverage.reportsDirectory=.local/post-crit-camera/coverage`
- `mise exec -- node --max-semi-space-size=12 docs/post-crit/evidence/camera-browser.mjs` for the initial matched comparison.
- `CAMERA_CANDIDATE=A mise exec -- node --max-semi-space-size=12 docs/post-crit/evidence/camera-browser.mjs` after the review refinements.
- `CAMERA_NATIVE_TOUCH=1 CAMERA_FOCUS_LABEL=touch-native-green mise exec -- node --max-semi-space-size=12 docs/post-crit/evidence/camera-focus-browser.mjs` for focused-key, hit-test and actual native touch/cancel checks.
- `mise exec -- pnpm typecheck` and `git diff --check` for the owned paths.

All owned browser processes and the isolated 4101 service closed. Existing 4093,
original data, frozen Crit8 and others' edits were preserved. Nothing was staged,
committed, pushed or deployed by this worker. The parent owns the A/B decision,
Astra recheck, current P2 integration and eventual focused local commit. If B is
selected, the existing comparison harness assumes bounded source as candidate A;
bind the chosen production camera factor explicitly before its affected native run.

Residual gaps: physical phone/keyboard behavior and human comfort/preference are
NOT RUN; no six-user native gathering or deployed resource acceptance is claimed.
P1 browser authority is the immutable baseline backend plus P1 static files; the
parent must integrate against the separately changed backend/client. The generic
bedroom chair backrest/heading alignment is an independently identified P2 renderer
issue; this P1 only changes click routing and preserves its geometry.
