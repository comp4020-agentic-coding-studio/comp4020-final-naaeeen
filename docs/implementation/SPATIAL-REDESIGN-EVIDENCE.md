# Spatial and camera redesign evidence, 7 October 2026

This lane implements the owner room/proportion/camera corrections in the authorized local WSL repository. The parent owns integrated browser acceptance, publication and the overall requirement register. Historical camera/browser checks are not relabelled as this candidate's acceptance.

## Declared comparison, before the new technical trial

Common inputs: current six-chair/table/cabinet/board scene; the same grid resolution and avatar radius; phone 390 x 844 and desktop 1920 x 1080; the same 462 projected route samples generated from expanded lounge spawn to each door, seat approach and board; a separate HUD probe (0,0) then (3,0); one simulated movable companion rectangle; 300 frames of stationary settling. The geometric trial retains seat coordinates/spawn and compares the old 12 x 8 room with the new 16 x 11 lounge. Bedroom comparison retains every saved transform from the six-piece default and adds four pieces without implicit relocation.

Changed factors: room dimensions/peripheral fixture placement for spatial comparison; camera centre ownership/follow implementation for camera comparison. The geometry trial samples walkable floor at a common 0.25 m resolution. The camera trial compares current original follow, a stationary close-view negative control and revised explicit follow. Avatar height and zoom are held constant at the same declared inputs. This is a deterministic technical comparison, not a human preference or device performance experiment.

Acceptance: all 90 bidirectional lounge destination queries remain clear; default and declared ten-piece bedroom transforms validate with arrival/exit/chair routes; enlarged floor yields useful additional walkable space without reducing play avatar pixels. In both camera viewports: HUD motion yields zero centre jump/scale change, followed route stays inside its actual free play rectangle after settling, stationary frames cease drift, selected overview stays stationary and manual inspection remains owned until recenter. A close stationary negative control must expose offscreen loss on the same route. Stop after one deterministic matched trial and focused regressions, unless a failure changes the choice. Runtime exit/output and actual source hashes are retained in .local/spatial-redesign; an independent code review and parent browser task supplement these checks.

## Authority and observed defects

The active AGENTS/CLAUDE/REPORT, owner redesign brief and redesign plan were read at lane entry. Existing camera configure reset on every HUD geometry update; the renderer swapped camera orientation at 700 px; movement forced overview back to play; pointerdown immediately invoked approach. These source observations informed reproductions instead of a general camera rewrite.

Authoritative shared geometry now exports 16 x 11 lounge and 14 x 10 bedroom dimensions. Existing 0.5 m grid, furniture footprints, saved bedroom transforms and (0,3) bedroom spawn stay compatible. A compact arrival/exit aperture plus actual exit/chair route checks replaces the full-room centre prohibition. Peripheral lounge fixtures and renderer derive the same shared anchors; no server geometry copy was introduced. Furniture mesh extents were corrected to fit their catalogue footprint, chair seat height is 0.4 m, table top 0.735 m and desk top 0.75 m against the unchanged 1.46 m standing avatar. The seated pose bends knees rather than rendering both entire legs horizontally.

## Transient camera/UI contract

setCameraZoom(number) accepts finite values, clamps 0.65-1.8 and returns success; getCameraZoom() returns the multiplier, default 1. setCameraMode('play' | 'overview' | 'inspection') selects explicit ownership, with getCameraMode() exposing it. recenterCamera() enters play and centres the controlled actor. setReducedMotion(boolean) changes follow easing/bob/peer interpolation dynamically. setSuspended(boolean) cancels animation, clears gesture/movement input and resumes from the retained camera state; networking stays owned by UI/client. Snapshots continue updating authorization while suspended.

Play uses a fixed orientation and a smooth viewport scale rule independent of movable HUD dimensions. Overview remains selected during walking; explicitly choosing Overview resets zoom to 1 and fits the room, while later manual zoom is an intentional change. Dragging the canvas beyond 6 px pans and enters inspection; a simple click retains destination approach/DIY selection. Wheel listening belongs only to the canvas, so companion chat/settings scroll does not zoom. Keyboard and touch direction inputs follow the stable screen orientation. Editing enters inspection and restores its prior camera mode on exit.

## Verification log

Initial attempted red command omitted --config vitest.house.config.ts, reached the inherited HTTP global setup and failed because port 8080 was absent. This is infrastructure failure, not a failing behavior test. A second such attempt was interrupted after that cause was identified. Native scoped configuration then executed 30 tests: geometry/world passed; two camera assertions required intentional mode/floating-point updates. Actual original-source negative control results and post-repair checks will follow below.

## Limits and follow-up

Mocked Three renderer/JSDOM tests verify mechanics, not WebGL appearance, physical phone performance or enjoyment. Actual parent browser tasks must check 1920 x 1080 and 390 x 844, scene proportions, six residents, ten saved pieces, picking, drag vs click, chat dragging/scrolling, zoom/pan/recenter, modal suspension/return, keyboard and reduced motion. No human A/B or paid/public operation occurred in this lane. Source-supported product interaction references are maintained by the parent research lane; these checks do not infer demand from those references.

## Source-to-decision checkpoints

| Subsection | Source/requirement | Alternatives and check | Decision/refinement | Remaining acceptance |
| --- | --- | --- | --- | --- |
| R2.space | Owner rejected crowding/proportions and requests future content; shared geometry is imported by server | Old 12 x 8 versus 16 x 11 lounge with same actor radius/central seats/spawn and 0.25 m sampling; old versus additive 14 x 10 bedroom with six saved plus four new pieces | More circulation without a smaller actor. Retain stored transforms/catalogue/grid; shared anchors drive wall/door/board/cabinet meshes. Check all 90 bidirectional routes. | Native six-friend and ten-piece visual task; no human preference claim |
| R2.proportions | Unchanged avatar height 1.46 m; exact furniture collision catalogue | Maintain footprints, adjust chair/desk heights and seated knees; exact Three mesh vertices for six kinds x four rotations | Chair top 0.4 m, desk 0.75 m, table 0.735 m. Independent plant overshoot finding reproduced red then repaired without increasing its footprint. | GPU rendered pose/overlap and actual touch picking |
| R2.follow | Owner tracking complaint; source configure reset and responsive pose threshold | Original follow, stationary close negative control and revised explicit follow over matched route/scale/HUD | Keep fixed pose plus bounded follow; HUD moves own no camera centre. Actual viewport resize receives minimum safe correction. Zoom visibility and Overview-after-zoom failures received focused red/green repairs. | Native drag/resize/zoom feel; phone keyboard |
| R2.input/modal | Explicit user camera control; foreground full board must stop background play | Thresholded canvas pan versus click; typing focus, observer, composition, suspend/resume tests | Canvas drag enters inspection, click preserves approach/selection, wheel belongs only to canvas. Deliberate canvas gesture can regain chat focus. Suspension cancels RAF/input and resumes retained camera state; UI keeps transport. | Native click/drag/touch, board/options return and authoritative session |

[gogh official operations](https://gogh.zendesk.com/hc/ja/articles/55293951004569-Operation-Guide) informs distinct editing/pose/pan/zoom controls; [Gather Classic movement](https://support.gather.town/articles/1285650718-looking-moving-around-the-office) informs explicit inspection/return and spatial navigation. These are source-informed design choices, not borrowed camera algorithms or measured game experience. Parent source records and broader protocol are [research](../research/2026-10-07-game-and-board-redesign.md) and [protocol](../../evaluation/redesign-comparison.protocol.json). Installed Three 0.186.1 supplies the actual orthographic and mesh-bound behavior used by checks.

## Actual matched technical results

The frozen pretrial protocol hash is ccbb7780ecb575898b55e2ddd5259fdaf09addc66632ee674efe1b7c5edb7b75. The initial document protocol included a synthetic route description; the executed same-geometry route is the stronger actual 462-sample destination-path workload recorded above. This description correction is disclosed; no result was changed. Common input/criteria and the original text remain in .local/spatial-redesign/protocol.md. The comparison reran once after focused zoom fixes changed the camera source; its outcomes stayed the same.

| Measure | Original | Revised |
| --- | --- | --- |
| Lounge walkable samples at 0.25 m spacing, six seats | 1,021 | 2,263 |
| Clear bidirectional destination routes, capacities 2-6 | 90/90 | 90/90 |
| Six saved bedroom placement transforms | Valid | Identical and valid |
| Declared ten-piece arrangement | Invalid in old bounds | Valid, exit/chair routes clear |
| Portrait HUD motion camera jump | 37.91 px | 0 px |
| Desktop HUD motion camera jump | 631.21 px | 0 px |
| Matched portrait/desktop upright avatar projection | 72/128 px | 72/128 px |
| Follow route out-of-safe-area samples | 0/462 at both sizes | 0/462 at both sizes |
| Close stationary negative-control losses | 231/462 portrait, 34/462 desktop | Same fixed-view control |
| Stationary settling drift and HUD scale change | 0 | 0 |

The larger sampled floor is circulation capacity, not human crowding/enjoyment evidence. Revised follow wins the declared HUD continuity property while retaining the original follow's offscreen and settling properties. The stationary close view fails the path visibility criterion. Whole-room Overview supplies an explicitly chosen stationary alternative.

Final comparison source hashes:
- Original camera: 0ec4197a1deee892c09129d7b4a2887043b567ac125e708e853229863a5fb0ba
- Revised camera: e46c9c7032111f6f3f2813af13e53f79991e6f48eeff1b4c4a673db088b3f220
- Original geometry: 7dc28ad3eae9c8874c6ae9cb352d38ecc94f3630f8426a85d4e5b57c1544dc53
- Revised geometry: b42e0f7f7787b344739823a430614d0158365b6caf8574893114f4eb9b7e6cdd
- Renderer at lane exit: 1df4b0712f6e72df65ddab96f88c29f8955778550dbf5efc46053cb2a45fb079

## Independent review, reconciliation and final checks

A fork_turns none read-only reviewer inspected this lane without prior chat or preference verdicts. It independently reproduced the actual viewport-shrink actor visibility regression and first deliberate canvas gesture after chat focus. The author reproduced both with meaningful failing native tests, repaired them and reran the affected tests. The same reviewer contextually rechecked both repairs. Its low-severity plant foliage overshoot was then reproduced using exact actual vertices, repaired and contextually rechecked. No remaining P1/P2 or actionable footprint defect was reported. The last zoom/Overview edge refinements were author-tested after that independent review; parent integration remains responsible for those native user flows.

Observed red/green details: resize upper actor edge 119.4 px against required new area top 186 px; typing-focus drag remained play instead of inspection; plant x-min 1.654873 against footprint minimum 1.699; zoomed stationary actor upper edge 168.92 px against HUD-free top 216 px; explicit Overview after 1.8 zoom projected a room edge at -120 px instead of inside the area. Each affected check passed after its focused fix.

Native WSL bridge verification:
- The complete house suite ran with actual Linux mise/pnpm: 11 files, 188 tests PASS; native typecheck PASS. This snapshot preceded the last two camera zoom tests and other workers' later board/package edits, so it is not current full integration acceptance.
- Final spatial affected suite: 3 files, 35 tests PASS (camera 12, geometry 9, world 14). The final run used mise Node directly with the already installed Vitest entry because a concurrently changed parent package install hit ERR_PNPM_IGNORED_BUILDS for @parcel/watcher; no dependency build policy or security hook was bypassed.
- Affected module coverage: 87.52% statements, 93.30% lines, 80.27% branches, 87.57% functions. Camera 97.98% statements; geometry 96.66%; world 84.57%. World branch coverage is 74.82%, with interaction/route/selection native-browser gaps explicitly retained.
- Matching comparison PASS after the latest camera change. Final source diff reviewed; no credentials or unintended files in this lane. Diff whitespace check PASS before final evidence append; parent final diff owns shared-workspace reconciliation.
- No code commits or publication from this worker.

The lane returns ready for parent integration. Required native WebGL tasks, landscape/soft-keyboard/physical-phone behavior, real-human preference and deployed WAN/Fly evidence remain unverified here. No additional green repetitions are warranted until a browser/review finding or relevant change justifies them.

## Native integration correction: Options and posed mesh framing

The parent native suite later ran the previously required actual WebGL interaction. It passed 12 of 15 cases and retained three failures on unchanged source after the same 10-second pixel poll: portrait 390 x 844 Overview upper edge 83.34 px against required 128 px, landscape 844 x 390 actual self mesh bottom 276.467 px against 272.5 px, reduced-height 390 x 520 actual mesh right 401.995 px against 383 px. The author inspected the saved portrait PNG: the world was fitted into the HUD region and the full canvas was dark. These native observations supersede the earlier pure-test readiness; the failure artifacts remain in .local/e2e-adapter-native-results and .local/e2e-adapter-frame-results.

Two source mechanisms were discriminated. Options was collected as a world occluder even though that sheet pauses the renderer; choosing Overview cached a fit under that modal and closing it retained that incorrect framing. The game-shell worker independently added a real nonzero geometry UI test before the runtime patch: Options emitted a 400 x 660 rectangle where no modal rectangle belonged in world framing, while the same owned-room editor still had to emit that rectangle. The author changed only the queueSafeArea collection predicate for panel[data-tool=options]. Chat, ordinary HUD, notices, takeover and the room editor remain collected. The worker reports the repaired 57 UI plus seven shell cases pass cleanly; a fixture pagehide teardown cancels queued safe-area work rather than hiding the DOM timer error.

Separately, the camera used a symmetric upright-height approximation and fixed horizontal allowance while the actual posed limbs and self ring occupied asymmetric extents. New meaningful red tests exposed an asymmetric-envelope lower edge 251.922 px against 250.001 px and an actual Three animated landscape mesh lower edge 250.707 px against 250.001 px. Explicit Recenter before movement also failed, lower edge 249.470 px against 238.001 px. The correction measures exact self mesh vertices, including the ring, after the frame's pose update in camera-view coordinates. Its safe envelope additionally includes the unchanged semantic upright head/foot diagnostic. Camera point limits derive from those asymmetric extents; easing and explicit recenter are constrained afterward. This is measured geometry rather than an enlarged arbitrary pad. The same vertex pass supplies the existing actual mesh diagnostic, avoiding a second hot-path traversal. It changes no room/player authority or server collision geometry.

Movable HUD continuity is retained: an idle camera's settled/following area remains owned until actual self movement, viewport change or manual zoom requests new framing. The existing HUD-drag continuity, chosen stationary Overview, manual inspection/zoom, resize and reduced-motion checks remain unchanged. No browser pixel tolerance, authoritative room dimension or failed native assertion was weakened.

After repair, native mise Node/Vitest executed 29 camera/world tests PASS; actual native TypeScript noEmit PASS. The final frozen runtime hashes for the authorized three-case native recheck are camera 50be370d5798ab01912761e31d27c080b1e0d2b292dc6297ee0d8c31ad85cdd0, world d3ddac73904adf6140a9332eb45b9ef19c0e2f7b6581d5fee87a490933857964 and UI 7c18ce9c5fc2e75152e1aa9618e7189563237662b279ee33ace0b2279473a41c. The parent authorized the targeted GPU run after the separate board native lane closed. This record does not yet claim that targeted native recheck passed; its actual outcome and contextual peer recheck follow when available.

## Follow-up native boundary: editor restoration and visual viewport

The first targeted frozen GPU repair run closed all contexts and exited with landscape 844 x 390 full flow PASS, while 390 x 844 and 390 x 520 reached the final room-editor close and failed there after the unchanged 10-second pixel wait. Tall portrait upright/mesh upper edges were 55.29/51.0525 px against required 128 px; short portrait upright/mesh lower edges were 544.44/554.102 px against 404 px. Earlier Overview, following, actual seat picking and DIY checks passed before these new final-boundary failures. Artifacts remain in .local/e2e-adapter-camera-repair-results; they are retained failures, not relabelled as overall acceptance.

Source tracing confirmed that closePanel restores editing=false before the queued HUD measurement removes the room editor. The camera explicitly restored play against that old panel area, then correctly treated the next ordinary HUD-only update as centre-preserving. The correction marks the explicit editor ownership handoff and refits restored play/overview once when that next HUD report arrives. Restored manual inspection keeps its camera centre/zoom; the marker clears on new zone/control/revocation and cannot be triggered by ordinary chat dragging. A new actual-world test reproduced mesh upper edge 109.265 px against 127.999 px before repair, then passed for both portrait sizes and play/overview restoration. An initial local patch missed the flag declaration; all world tests immediately caught the ReferenceError, and it was corrected before any native dispatch. TypeScript alone did not catch that JavaScript runtime mistake.

The original fresh spatial reviewer also found an independent visualViewport-only Overview cache boundary during its contextual repair review. A 390 x 844 fixed container projected the room at y297-547; shrinking only the visible viewport bottom to 420 left it clipped indefinitely. The author reproduced the original source in an immutable .local copy and in a meaningful new camera test, then included actual viewport geometry in Overview cache invalidation. SafeRects-only HUD motion still preserves the chosen view. The reviewer contextually rechecked the new source: the room now projects at y89-339 inside y8-420, with no other actionable finding. This is pure/source evidence for that boundary, not physical-phone soft-keyboard acceptance.

After both repairs, 31 focused camera/world tests PASS, and the relevant TypeScript contract check PASS. Diff whitespace check PASS. New frozen candidate hashes: camera a6159242e0978e5f24ed38a4d71efc9feafd8f44bb39f3908323fcd0e2dca1d5, world bdb1b85357b407756b5388f97366dababf7bbf34e6b0c638dc4ffb739d0f5363; UI predicate hash remains 7c18ce9c5fc2e75152e1aa9618e7189563237662b279ee33ace0b2279473a41c. Contextual independent repair review reports no remaining actionable issue. The parent owns the next unchanged strict native run and final acceptance; its outcome has not yet been claimed here.

## Final targeted native acceptance

The game-shell test owner ran the three unchanged strict native cases serially against the final frozen hashes above. All three PASS: 390 x 844 in 29.6 seconds, 844 x 390 in 30.4 seconds and 390 x 520 reduced-height simulation in 28.2 seconds. The runner exited 0, all contexts closed, and the GPU lane was released to the parent. Startup hashes matched exactly. Numeric finiteness checks, actual mesh/upright framing bounds, grading tolerances and pixel wait timeouts remained unchanged. These are native WebGL Playwright task observations; the reduced-height case is a simulation, not an actual soft keyboard or physical device.

Artifacts are retained under .local/e2e-adapter-lifecycle-repair-results and its report. The author opened the final portrait bedroom PNG and verified that the room and avatar render visibly after editor close, in contrast to the earlier dark-canvas failure. The parent received the source hashes/results and owns overall integration/resource/submission acceptance. Earlier failed native rounds remain part of the record.

Final affected pure/source checks remain 31 camera/world tests PASS, final TypeScript noEmit PASS and scoped diff check PASS. Contextual peer repair review found no remaining actionable camera/extent/editor/viewport issue. The previous 87.52% statement / 93.30% line coverage measurement belongs to the earlier candidate and is not restated as coverage of this repair. This worker changed camera/world and their tests, the explicitly authorized Options-only HUD predicate and this evidence record; no server/store/geometry/UI identity/draft/permission logic changed in the native repair.

The final PNG also exposes a separate UI boundary: the synthetic 40-W room header wraps into four lines and its background intersects the availability row. This was reported to the parent as a UI-owned observation; the camera framing tests do not grade overlap among controls. Physical phone/IME/soft-keyboard behavior, human preference/value and deployed WAN/Fly evidence remain separate gaps. This lane stops after the verified source-bound native task instead of repeating green checks for their count.

## Reproducible comparison closeout

The [source-fenced snapshot](../../evaluation/spatial-redesign/README.md) preserves
the exact original instrument/protocol/result and before-modules. It also includes
the final camera/geometry bytes for a separately labelled replay. The historical
e46c9c70 after-camera bytes were not separately retained before native repairs;
this provenance gap is explicit. The replay cannot overwrite the historical
result or turn the earlier candidate into final native acceptance.
