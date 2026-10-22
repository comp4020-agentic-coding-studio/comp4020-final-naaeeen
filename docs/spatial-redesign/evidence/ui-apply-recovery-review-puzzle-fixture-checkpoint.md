# Puzzle automatic-replay fixture calibration

23 October 2026. Only `spec/house-puzzle-client.test.ts` and this evidence were changed in this slice. Production source is unchanged. The parent full pnpm check reported1361 passing tests and two failures with build/typecheck passing. That full failure record is retained by the parent and was not modified here; the same two failures were independently reproduced in ui-apply-recovery-review-puzzle-fixture-red.txt.

Both tests expected automatic captured-command replay from a snapshot with `players: []`. Under the current seat contract, an automatic puzzle effect requires a current connected self game chair. The fixture contradicted that precondition; manual historical receipt replay remains possible while standing. No client behavior change was needed.

`head()` now has `seated = false` by default. Only the two automatic-capture/replay cases set it true on both initial and refreshed heads; those heads explicitly contain the connected self in `game-seat-1`. The tests still assert automatic command counts, captured original authority/roster, immutable UUID/body and original round/participation; no automatic test was changed into a manual test and no original assertion was removed.

One additional negative case seeds a recent picture placement while standing, confirms both initial connection and a newer head emit no automatic command, and then manually retrieves the simulated historical receipt with the exact original UUID/round/body. The current different round and null participation remain unchanged, and the acknowledged original is removed from the outbox. The separate real-service and recovery suites retain actual server authority coverage.

Checks: ui-apply-recovery-review-puzzle-fixture-green.txt records139/139 PASS across puzzle-client50, client79, callback recovery7 and real-service recovery3. Whole-checkout typecheck and the spec whitespace diff check pass. This is affected-scope verification; the parent owns the final full pnpm check rerun. No browser, persistent service, load or commit was performed. The test-run loopback service fixtures close in teardown.
