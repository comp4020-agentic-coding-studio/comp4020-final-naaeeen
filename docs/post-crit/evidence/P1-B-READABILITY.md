# P1 final centered Follow and unobscured avatar labels

22 October 2026. Parent selected centered damped B as the default after fresh
Astra/max source/image review, because it anchors the player for the requested
game-follow experience. More camera travel is an explicit cost. This is design
judgment, not human preference or comfort evidence. Deliberate Look/Overview and
all temporary-drag, editing, authority and input contracts remain intact.

## Requirement, evidence and refinement

| Requirement | Evidence and decision | Verification and limit |
| --- | --- | --- |
| Centered default | A/B both passed prior mechanics; C phone height 21.24/11.33 px failed the unchanged 64 px target. Parent chose B for player anchoring. | New default small-displacement test failed before factor 0; then passes with existing damping and reduced motion. Original A/B/C source bytes/results are frozen separately. |
| Unobscured bodies | Prior names covered actual heads/torsos despite 72 px nominal height. Two-/six-actor actual-vertex frame regressions failed before the fix. | Same-frame posed/interpolated mesh/ring rectangles now seed the existing packer's safe rectangles, including each label owner. Context joins that packer; fixed labels hide over bodies. Moving/pose bounds invalidate the 100 ms idle throttle. Conservative leader bounds avoid body crossings. |
| Attribution and fallback | Visible rectangles must avoid every body; hidden labels retain source text and full identities/messages stay in existing roster/chat. | Real independent identities choose actual Sage/Blue colours and Can chat, join, walk/sit/stand and send real messages. Full roster/transcript and a visible attributed bubble pass. Long shared-prefix names remain an explicit ellipsis challenge; Robin/Taylor gives a distinct visual association check. |
| Observer with no rendered self | Source inspection confirmed an observer subscription can remain in lounge while its controller enters a bedroom. Shared measurement incorrectly returned before measuring the peer. | New RED got 0 exclusions for 2 actual fixture peers; shared measurement now precedes optional self diagnostics. Latest actual observer tabs at portrait/landscape show only the authorized Taylor peer, no stale self mesh, and clear moving/seated/bubble labels. |
| Current-source checks | Final typed tests and observer reorder are bound independently from prior full B checks. | 168 tests/4 files and direct typecheck exit 0. Parent-relayed TS7006 rect/index annotations were fixed. Full B four-view/reduced/touch checks remain bound to their exact preceding world hash. |

No new label system or production packer algorithm was added. The existing
`layoutLabels` obstacle/hidden behavior was sufficient. Production changes stay
within camera/world; earlier P1 UI/HTML/CSS changes remain. Geometry/client/store
and P2 features were untouched. Measurement reuses the self camera pass and scans
at most five other authorized posed avatars, with no retained per-frame history.

## Exact source and native scope

- Camera `b485dbd3`: reviewed centered factor 0, unchanged damping/containment.
- Full B workflow world `aaafa3df`: 1920x1080, 390x844, 844x390 and 390x520 complete
  seat/board/room/edit/chair/return tasks; separate reduced motion; native focused
  HUD/touch/cancel at the three main viewports; zero page errors.
- Final world `b4e88e4b`: only shared-measurement ordering changed for no-self
  observers. Current 168-test suite/typecheck pass. Actual observer portrait and
  landscape each pass 12 frame audits including latest controller co-presence,
  then a lounge observer with self's controller in a bedroom, moving/seated peer,
  actual attributed speech and full roster/chat. No label/body intersections or
  page errors occurred. The old full run was not relabelled as this source.
- UI `93d9fa00`, HTML `9037cc7e`, CSS `9d085778`, label packer `133d69f6` are unchanged
  during the centered/readability refinement. Full hashes/helper/spec bindings are
  in camera-b-final-source-manifest.json and camera-b-final-freeze.json.

The earlier two-controller contexts used two separate authority identities. Each
portrait/landscape variant recorded 21 same-frame audits; both long shared-prefix
and short-name variants passed numeric body clearance and visible attributed
speech. Parent inspected the original Robin/Taylor portrait and accepted its
unobscured bodies, distinct names/bubble and player anchoring for that source.
Final observer screenshots were inspected at original resolution by this worker:
Taylor's head/torso remain clear and the readonly observer role is visible.

Coverage checkpoint before the observer-only reorder: 167 tests, 96.85% lines,
82.23% branches, 88.96% statements, 86.14% functions across camera/world/UI/packer.
UI branches 75.03% and functions 76.19% remain explicit gaps. These percentages are
bound to that checkpoint; final coverage was not silently re-inherited. The final
168-test functional suite covers the newly found observer path. Direct typecheck,
owned diff whitespace checks and helper parse checks pass.

## Reproduction, artifacts and handoff

The isolated runtime is still d95055b plus the bounded P1 public files, its own
SQLite directory, Linux Node 24.21.0 / pnpm 11.9.0, Playwright 1.63.0 and sandboxed
Chromium 153.0.8010.12 / SwiftShader on loopback 4101. Original 4093/data stay intact.

- `CAMERA_CANDIDATE=B mise exec -- node --max-semi-space-size=12 docs/post-crit/evidence/camera-browser.mjs`
- `CAMERA_NATIVE_TOUCH=1 CAMERA_FOCUS_LABEL=b-touch-native-green mise exec -- node --max-semi-space-size=12 docs/post-crit/evidence/camera-focus-browser.mjs`
- `CAMERA_COPRESENCE_SHORT_NAMES=1 mise exec -- node --max-semi-space-size=12 docs/post-crit/evidence/camera-copresence-browser.mjs`
- Latest affected native path: `CAMERA_OBSERVER_PROBE=1 CAMERA_COPRESENCE_SHORT_NAMES=1 mise exec -- node --max-semi-space-size=12 docs/post-crit/evidence/camera-copresence-browser.mjs`.

The original comparison script and exact A/B/C camera modules plus original
world/UI/HTML/CSS bytes are preserved in camera-comparison-source/, verified against
all originally recorded hashes. New factor binding explicitly asserts candidate B
is the actual production camera source. Historical A results and PNGs remain as
historical A. Raw failures/aborted samples and source hashes remain preserved.

All owned browsers and the 4101 service closed. No commit, staging, push or deploy
was performed. Final fresh Astra observer recheck is ACCEPTED with no implementation blockers;
the parent also accepted original controller/observer images. Parent owns the P1
local commit and P2 UI ownership handoff. Physical phones, six simultaneous native users, human comfort,
deployed resource acceptance and integration with separately changed P2 backend
remain outside these scoped local results. The previously identified bedroom
chair-backrest/heading geometry issue remains P2 work, separate from P1 routing.
