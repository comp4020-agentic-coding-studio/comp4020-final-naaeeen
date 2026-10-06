# Camera and foreground implementation evidence

7 October 2026. Local implementation and technical/design checks, not human A/B.
Canonical workspace: Ubuntu/lizhi `/home/lizhi/comp4020/comp4020-final-naaeeen`.
Parent owns acceptance, register updates and the actual local commit.

## Result and boundary

The canvas already occupied the full viewport. Whole-room fitting made the avatar
83.20px upright on desktop, 32.91px in portrait, 13.06px in landscape and 12.64px
in the reduced-height simulation. Fixed-angle orthographic close play now projects
128px upright on desktop, 72px in portrait/520-height simulation and 78px in
landscape. Room edges may extend offscreen. Overview provides whole-room context;
Recenter snaps the view around the actual controlled avatar. Movement returns
Overview to play. Editing forces a stationary room overview.

`house-camera.js` computes only transient view framing. The camera preserves the
existing orientation at each breakpoint, follows outside a dead zone, eases over
140ms unless reduced motion is selected, and settles subpixel movement. Actual
HUD/control rectangles choose a clear play region. The same server-owned world,
capacity, positions, routes/collision, movement cap, input generations, room
privacy and saved state remain. Enlarging server geometry alone would be fitted
into the same old frustum and would not fix apparent size.

Foreground names have a bounded ellipsis name line plus separate availability,
with the entire name retained in DOM text, title and accessible label. Phone
nameplates are at most 100px. Speech is 184px/13px phone and 224px/14px desktop,
with an attributed header and one clipped body line. Unicode 80-codepoint/max3/
one-member/four-monotonic-second/Quiet/history/privacy rules remain unchanged.
Offscreen tags/previews are suppressed; roster, Overview and native Chat retain
all authorised context. This is a camera-plus-label package, not a pure-camera
explanation of every readability change.

## Declared comparison and source identities

[Initial protocol](../../evaluation/house-camera.protocol.json) was frozen before
camera implementation; SHA256 8182b9dd4f29fa15790818c22bd4f517186580edbaa76c33997d33bd9e5ff66d.
[B2 protocol](../../evaluation/house-camera-B2.protocol.json) was frozen before the
renewed package trial; SHA256 29890ddef4d1090a0cfb3ec0ad6d930a2ec4d0f565d33b41aed02bdf2d4682b0.
The same two/six independent local browser identities, server spawn geometry,
normal names, chosen Can chat and conversation text were used at 1920x1080,
390x844, 844x390 and 390x520. The final fixture waits for the initial notice and
server-projected willingness. The last viewport is a layout-height simulation;
it is not a physical keyboard/IME observation.

A2 is A's frozen camera source under the current common HUD. B2 is the implemented
package. Initial 16 A/B samples are retained separately; final 16 use A2/B2 filenames.
The runner hashes all loaded house JS/CSS/HTML before/after, and those identities
are unchanged. PNG signatures and exact IHDR dimensions were checked separately
from DOM/mesh geometry. [Sanitised results and manifest](../revisit/CAMERA-EVIDENCE.json)
contain every source hash, size, sample and PNG SHA256. No cookies/proofs were saved
in canonical evidence.

[Exact frozen baseline](../revisit/camera-baseline-A.js) SHA256:
`2bcafa78de12bdf84385e0dcb88edb63014c452ee71e65d26a8bafbf1717f38f`.
[Exact executed grader](../revisit/camera-native-grader.mjs) is retained with the
source SHA256 recorded in the manifest. It uses the task scratch baseline at
`.local/camera-comparison/A-house-world.js`; restoring that byte-identical file
from the canonical baseline is the only fixture-copy requirement before replay.
The grader uses the existing loopback 4093 runtime, installed Playwright/Chromium
and task font configuration; it is not an automatic CI or production benchmark.

## Final observed B2 snapshots

Upright head/foot points and actual mesh vertices including the self selection
ring are different measures. Only B2 has the mesh diagnostic. Camera play regions
are computed against HUD rectangles padded by 6px. All B2 actual mesh bounds remain
inside that 6px safety envelope and the real browser viewport; the largest excess
outside the already padded region is 0.361px in the six-person 520 simulation, still
clear of the original controls. No person/speech label overlaps, glyph leaks,
control intersections or border clips were recorded in any final sample.

| Contexts | Actual DOM/PNG viewport | Upright avatar px | Actual mesh height px | Visible names | Visible bubbles | Label violations |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | 1920x1080 | 128.00 | 148.39 | 2 | 1 | 0 |
| 2 | 390x844 | 72.00 | 84.44 | 2 | 2 | 0 |
| 2 | 844x390 | 78.00 | 90.43 | 2 | 1 | 0 |
| 2 | 390x520 | 72.00 | 84.44 | 2 | 0 | 0 |
| 6 | 1920x1080 | 128.00 | 148.39 | 6 | 3 | 0 |
| 6 | 390x844 | 72.00 | 84.44 | 5 | 3 | 0 |
| 6 | 844x390 | 78.00 | 90.43 | 2 | 0 | 0 |
| 6 | 390x520 | 72.00 | 84.44 | 1 | 0 | 0 |

Six-person portrait play retains five visible names because a distant person is
outside the close view. Landscape/compressed HUD space may show fewer tags or
suppress speech; the 520 sample has one visible tag, while roster lists all six.
This is disclosed cropping/space pressure, not a claim that every person is always
onscreen. A2's six-person 520 baseline has one approximate upright/control
intersection with availability; that baseline failure is preserved. Actual B2
vertices, rather than the baseline's approximate upright box, qualify self clearance.

## Checks and independent review

The forty-unbroken-W native regression failed before repair at all three tested
sizes, then passed. Its fixture explicitly widens the lobby's 24-character input
only to admit the server's valid 40-character boundary through the real form.
Missing full-name access and painted overflow caused the original red results.
Later compressed-height/camera-control pressure caused the bounded nameplate
refinement. Observer takeover and camera buttons are included in the grader.

Final native detailed suite: 8/8 PASS, 3.7 minutes, unique output
`.local/camera-browser-final`. Three cases cover 40W bounds/access/observer takeover;
four cover close play, real Recenter pan, physical mesh raycast/seat authority,
sit/stand, owned-room entry, stable editor and return at the four viewports; one
covers actual reduced-motion startup/follow/Overview. These are native browser
flows with actual server identity/state, not renderer-stub or human observations.
25 focused unit tests and native typecheck pass. The parent owns complete required
checks, final expanded coverage and CI evidence; matching-current-browser CI 5/5
was independently reported with identical frozen sources in
[CI source proof](CI-BROWSER-FINAL-HASHES.json).

One fresh read-only review found the desktop 600->599 scale discontinuity. Its
context-retaining follow-up found responsive styles missing on stable-container
joins/rebuilds. Both have meaningful red->green regressions and scoped repairs.
The final follow-up ran 17 camera/world unit tests PASS, inspected the 8-test native
log and frozen source manifest, confirmed both P2 repairs and close-play picking,
and found no new actionable correctness/privacy problem. These rechecks are not
counted as independent trials. The parent still reconciles and accepts delivery.

Earlier native failures also identified evaluator timing: wait for updated
projection after mode changes, notice/panel geometry before idle comparison, and
an authorised rendered mesh after immediate scene/privacy clearing. These are
preserved calibration outcomes, not retroactively labelled product PASSes.

Coverage before the final style-helper refinement: camera 98.95% statements,
98.36% branches; world 85.19% statements/72% branches; label 98.92% statements/
90.78% branches. The world branch result is below 80% and browser tasks are not
converted into unit coverage. See the parent's final expanded coverage for the
current full candidate. No physical-phone performance, actual keyboard/IME,
WAN/Fly gameplay, human preference or enjoyment result is established.

## Hashes recorded at the camera comparison checkpoint

| File | SHA256 |
| --- | --- |
| public/house-world.js | 0bbf9a2ada8eb547275fee674c12bf95a99036cfb7c3203023b34abb3f15c8ff |
| public/house-camera.js | 0ec4197a1deee892c09129d7b4a2887043b567ac125e708e853229863a5fb0ba |
| public/house-label-layout.js | 133d69f632f0a784599f1fc3e262e83aa42a9f9eb41b5695af51478baafbe0ba |
| spec/house-world.test.ts | c02995284daa9e536c9e4442ab320c688b92a932cb616cc04e9e90d092713d82 |
| spec/house-camera.test.ts | aa736143d002736db5bcc6f4a4c180fbd864aaf568f88ddcef8186501ad3afa8 |
| spec/house-label-layout.test.ts | bd8917cc57a3eb2fad9f8a940b3887dc3ba841a6339c3c8647a14345bdb7edc5 |
| tests/e2e/house-world-readability.spec.ts | 0262995eb12e4715a5af1f4553a28c54314456654414569ad9ae70073e0d7c3a |

Exit methods reopened: REPORT comparison/review/evaluator/evidence sections and
Comparison/Review's calibration and recurring subsection guidance. Status: ACCEPTED LOCAL production framing and native checks. No worker commit, push, publication or backend-byte change.

## Parent source reconciliation

The production world, camera and label modules still match the recorded hashes.
The retained manifest's label-test hash `bd8917cc57a3eb2fad9f8a940b3887dc3ba841a6339c3c8647a14345bdb7edc5`
is a historical checkpoint, not the current file hash. The current test is
`1023c6460b1bf6c0901113bd6bf7e37da71641edb7672548910ae41b28a2a745`.
The original measured test bytes are not preserved here, so the precise intervening
difference is unverified. The current test passed the 195-test required and
163-test expanded checks. The images and native framing evidence remain bound to
the matching production modules; do not claim every manifest entry matches the
later checkout. The [original recorded manifest](../revisit/CAMERA-EVIDENCE.recorded.json) is
preserved byte-for-byte. The main manifest adds an explicit closeout reconciliation
without altering recorded hashes or measurements.
