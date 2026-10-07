# Spatial and camera redesign evidence, 7 October 2026

This lane implements the owner room/proportion/camera corrections in the authorized local WSL repository. The parent owns integrated browser acceptance, publication and the overall requirement register. Historical camera/browser checks are not relabelled as this candidate's acceptance.

## Declared comparison, before the new technical trial

Common inputs: current six-chair/table/cabinet/board scene; the same grid resolution and avatar radius; phone 390 x 844 and desktop 1920 x 1080; camera route points (0,0), (3,0), (5.5,3.5), return to (0,0); one simulated movable companion rectangle; 300 frames of stationary settling. The geometric trial retains seat coordinates/spawn and compares the old 12 x 8 room with the new 16 x 11 lounge. Bedroom comparison retains every saved transform from the six-piece default and adds four pieces without implicit relocation.

Changed factors: room dimensions/peripheral fixture placement for spatial comparison; camera centre ownership/follow implementation for camera comparison. The geometry trial samples walkable floor at a common 0.25 m resolution. The camera trial compares current original follow, a stationary close-view negative control and revised explicit follow. Avatar height and zoom are held constant at the same declared inputs. This is a deterministic technical comparison, not a human preference or device performance experiment.

Acceptance: all 90 bidirectional lounge destination queries remain clear; default and declared ten-piece bedroom transforms validate with arrival/exit/chair routes; enlarged floor yields useful additional walkable space without reducing play avatar pixels. In both camera viewports: HUD motion yields zero centre jump/scale change, followed route stays inside its actual free play rectangle after settling, stationary frames cease drift, selected overview stays stationary and manual inspection remains owned until recenter. A close stationary negative control must expose offscreen loss on the same route. Stop after one deterministic matched trial and focused regressions, unless a failure changes the choice. Runtime exit/output and actual source hashes are retained in .local/spatial-redesign; an independent code review and parent browser task supplement these checks.

## Authority and observed defects

The active AGENTS/CLAUDE/REPORT, owner redesign brief and redesign plan were read at lane entry. Existing camera configure reset on every HUD geometry update; the renderer swapped camera orientation at 700 px; movement forced overview back to play; pointerdown immediately invoked approach. These source observations informed reproductions instead of a general camera rewrite.

Authoritative shared geometry now exports 16 x 11 lounge and 14 x 10 bedroom dimensions. Existing 0.5 m grid, furniture footprints, saved bedroom transforms and (0,3) bedroom spawn stay compatible. A compact arrival/exit aperture plus actual exit/chair route checks replaces the full-room centre prohibition. Peripheral lounge fixtures and renderer derive the same shared anchors; no server geometry copy was introduced. Furniture mesh extents were corrected to fit their catalogue footprint, chair seat height is 0.4 m, table top 0.735 m and desk top 0.75 m against the unchanged 1.46 m standing avatar. The seated pose bends knees rather than rendering both entire legs horizontally.

## Transient camera/UI contract

setCameraZoom(number) accepts finite values, clamps 0.65-1.8 and returns success; getCameraZoom() returns the multiplier, default 1. setCameraMode('play' | 'overview' | 'inspection') selects explicit ownership, with getCameraMode() exposing it. recenterCamera() enters play and centres the controlled actor. setReducedMotion(boolean) changes follow easing/bob/peer interpolation dynamically. setSuspended(boolean) cancels animation, clears gesture/movement input and resumes from the retained camera state; networking stays owned by UI/client. Snapshots continue updating authorization while suspended.

Play uses a fixed orientation and a smooth viewport scale rule independent of movable HUD dimensions. Overview remains selected during walking. Dragging the canvas beyond 6 px pans and enters inspection; a simple click retains destination approach/DIY selection. Wheel listening belongs only to the canvas, so companion chat/settings scroll does not zoom. Keyboard and touch direction inputs follow the stable screen orientation. Editing enters inspection and restores its prior camera mode on exit.

## Verification log

Initial attempted red command omitted --config vitest.house.config.ts, reached the inherited HTTP global setup and failed because port 8080 was absent. This is infrastructure failure, not a failing behavior test. A second such attempt was interrupted after that cause was identified. Native scoped configuration then executed 30 tests: geometry/world passed; two camera assertions required intentional mode/floating-point updates. Actual original-source negative control results and post-repair checks will follow below.

## Limits and follow-up

Mocked Three renderer/JSDOM tests verify mechanics, not WebGL appearance, physical phone performance or enjoyment. Actual parent browser tasks must check 1920 x 1080 and 390 x 844, scene proportions, six residents, ten saved pieces, picking, drag vs click, chat dragging/scrolling, zoom/pan/recenter, modal suspension/return, keyboard and reduced motion. No human A/B or paid/public operation occurred in this lane. Source-supported product interaction references are maintained by the parent research lane; these checks do not infer demand from those references.
