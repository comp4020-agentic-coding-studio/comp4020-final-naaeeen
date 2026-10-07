# Incremental world startup refinement

7 October2026. The d693d06 release remains verified and deployed, but later main
CI37581974214 and37582431626 failed only peer join's unchanged10-second guard at
16.288s and11.539s. All other eight cases passed; downstream resource/deploy steps
were skipped. These failures reopen final publication acceptance, not erase the
earlier version's success. No retries or deadline extension were added.

## Source, alternatives and comparison

Actual source rebuilt the whole existing owner's lounge after resident metadata
changed, disposing/recreating geometry, shadow targets, avatars and labels while
the peer started its renderer. Alternative1 retains that work; alternative2 keeps
static geometry and updates resident decoration/avatars. The latter needs correct
names, colours, open/vacant labels, raycast/projected targets and private lifecycle
invalidation. Shadow/FPS/resolution changes were excluded from this bounded trial.

The installed Three0.186.1 geometry disposal path removes attributes and binding
states; the versioned [primary source](https://raw.githubusercontent.com/mrdoob/three.js/r186/src/renderers/webgl/WebGLGeometries.js)
confirms resource cleanup, not the cause of our particular16-second delay. The old
manual cleanup URL returned404; no unsupported manual claim was retained.

A real local baseline reproduced11.253s before WSL restarted. The matched pair
was then run on the current host: same two-person task/names, desktop1920x1080 and
touch390x844 contexts, renderer settings, origin/data and unchanged startup guard.
A fresh browser was used per candidate. Order was baseline then candidate, one
pair only; cache/host variation remains possible. Baseline create378ms/join8204ms;
candidate create243ms/join4951ms. Owner rebuilds fell from three to two. Actual
parent-inspected images retain room/furniture/light/avatars; label placement varies.
This is technical diagnostic evidence, not a reliability rate or human preference.

## Correctness, review and refinement

Actual-module tests first produced seven failures with sixteen passes. Only the
renderer is mocked; Three geometry/materials are real. The candidate retains
static geometry for metadata, updates shared target references, swaps cached
material references without recolouring other meshes, refreshes speech names and
still rebuilds for house/self/epoch/access/generation/stream/room/capacity changes.
Own-room dirty previews remain when still authorised; identity/zone/null changes
clear them. The source/contract review rejected blanket draft deletion.

A separate audit confirmed a pre-existing queued visit could follow a replaced
occupant by slot. Two regression cases dispatched the old destination; the same
resident's name/colour/open changes correctly completed their route. The narrow
fix cancels only a queued door whose chosen bedroom differs from the current one.
It leaves manual input and legitimate drafts intact.

Fresh-context review found no actionable issue and reran33world tests. The later
route-only contextual recheck found none; worker36tests passed. Parent checked
exact final hashes, inspected the diff/images and ran the existing strict game
core30.6s and seat/room/DIY/access48.8s: both pass. All454required tests in27files,
board build and typecheck pass. Criteria and app appearance stay unchanged.

[Exact scoped results](../../evaluation/startup-refinement.results.json) bind both
trial and final source versions. The final route guard is after the timed trial;
its actual behavior is covered by final tests/native flows. Raw private diagnostic
files and screenshots remain under.local/redesign-closeout. The registered server
resource protocol/manifest/instrument is unchanged; new full local load is not
claimed. Refined-world remote CI/deploy/live source verification remains pending.
