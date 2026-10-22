# Seat authority: fresh review refinements

This supplements the earlier seat-core records rather than relabelling their source as accepted. Parent fresh review found that Stand still requested a full snapshot before release, and exact activity retries still reached maintenance through both realtime gameControl and HouseStore before UUID lookup.

## Reproduction and correction

Four new real HTTP/Socket cases first failed. They cover Stand and an accepted picture receipt when maintainGames throws, plus exact game receipt replay when a valid due game transition hits a real SQLite UPDATE abort trigger. The first SQL test draft mismatched next_due_at and failed restored-state validation; the calibrated rerun matches the deadline and fails the actual write. The original and corrected runs are retained in the structured record.

- Stand now gets authorized geometry from HouseStore.seatLayout, which reads current membership/room admission and the lounge or bedroom layout without game maintenance or game/puzzle state. It releases pose and picture consent before fallible queued lifecycle reconciliation.
- Realtime supplies minimal current controller facts and a deferred prepareActivity callback. HouseStore atomically checks identity, current activity house/control, exact payload hash, retained room access and original receipt before any maintenance. Fresh effects then perform maintenance and build full activity facts before their transaction. The existing transaction helper uses BEGIN IMMEDIATE; the added receipt/auth transaction has only read queries. Its operational cost belongs to the unchanged parent resource exercise.
- The expanded combined run exposed a periodic projection race: a maintenance storage error closed an otherwise authorized controller before its HTTP retry. The strengthened reproducer crosses a real120ms projection tick. STORAGE_UNAVAILABLE now keeps a pending projection only after narrow current session, zone admission and membership checks succeed. No cached private state is sent; no repeated failure notification is emitted. Permission/identity/member failures retain revocation/disconnection. A negative regression removes membership during maintenance failure and verifies actual disconnect.
- Player now projects seatGeneration so delayed gathering requests can bind the observed seat epoch. authorizeRoomHttp accepts optional expectedAccessGeneration and strictly compares a provided value with current admission generation. Parent HTTP routes require and parse that header.
- The old lounge geometry spec now asserts capacity-matched game IDs/count, capacity study IDs and six sofa places across both layouts; its route and full chair-bound checks remain. The geometry-reset fixture now changes the authoritative layout input, confirms seatLayout sees it, supplies the required profile revision to trigger projection, and restores the original input after checking seat/consent revocation. No data is removed.

## Bounded closure

The final owned selection passes **163/163 tests in ten suites**, with no skipped tests: generic realtime, new seat authority, game rules/backend/clock/realtime, puzzle backend/realtime, shared geometry and both lounge variants. This includes current real HTTP and Socket.IO ingress coverage, the five fresh-review regressions, original receipt/round behavior, consent, epoch and geometry cases.

A complete pnpm typecheck passed after the production refinements. The next attempt encountered only the concurrent new spec/house-studio-preview.test.ts argument-count diagnostic; no owned-file diagnostic appeared. Scoped git diff --check passed. Source hashes and all original failure/refinement exits are in seat-core-review-refinement.json. Raw logs remain ignored under .local.

Production files are frozen and released to the parent. No worker commits, persistent services, native browser or resource workload were run. The parent owns contextual independent review, whole-project checks, unchanged resource validation and final local commits. Prior coverage numbers retain their earlier source scope.
