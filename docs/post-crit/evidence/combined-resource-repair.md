# Combined command binding repair

Execution closure is recorded in [resource acceptance](resource-acceptance.md).
The repair and GO state below retain their pre-execution checkpoint scope.

22 October 2026. First combined attempt is retained as FAIL:
`combined-resource.first-fail.results.json`, exact protocol4af229e0 and instrument
7584bce6. The original300.001s baseline passed all21 gates under that same7584
instrument and6e8140f8 original protocol; its exact bytes are separately preserved
in `resource-original-pass.*` and `resource-measured-instrument.mjs`.

## Failure and bounded cause

Both houses rejected their first scheduled Join with INVALID_INPUT. The server
correctly requires every game command's houseId to match the actor's active home.
The instrument omitted it. The first run saved132 board patches/four scheduled
chats without skipped work or rejected normal board/motion inputs before stopping;
none of that short run qualifies sustained combined acceptance. ABORT_ERR is the
secondary cancellation of the scheduled slow-reader job after the primary failure.

The sole instrument edit adds `houseId:h.id` to the command inside playGameRound.
That function is invoked only under p.gameScenario. No production source, default
workload path, timing, capacity, source manifest, gate, game schedule, target set
or threshold changes. The current default protocol binding is prospective to the
new instrument; the old original PASS retains its measured protocol/instrument
scope rather than claiming a second original run. A byte-equality regression
proves this one-field source scope; combined gameScenario equals its failed
registration byte-for-JSON-value.

## Reproduce, refine and verify

`resource-game-house-binding-red.json` is an INVALID test-extraction attempt:
the new fixture omitted the actual payload binding and threw ReferenceError.
It is retained as fixture evidence, not counted as a meaningful missing-house RED.
After extracting the whole real payload/command construction,
`resource-game-house-binding-real-red.json` reproduces both the absent destination
and a rejected real Socket.IO Join. The one-field repair then passes25 focused
tests in `resource-game-house-binding-green.json`. Four actual clients in two
isolated houses exercise missing/foreign destination denial, one complete win,
one neutral active withdrawal, both clients' actual snapshot revisions, original
receipt replay and exactly22 house receipts including four bootstrap writes.
These small live authority cases do not substitute for concurrent board pressure.
Typecheck, self/checkpoint controls, scoped diff and both inspections pass.

## Fresh targeted review

A new no-history read-only GPT-6 Astra/high reviewer,
combined_binding_repair_review, independently verified the exact one-field diff,
real authority regression, retained original fields/gates and unchanged124-action,
733-target registration. It independently passed25 focused tests and diff check,
with no actionable findings. This is a fresh targeted review of the newly observed
measurement defect; it does not replace the earlier broader instrument review.

Reviewed candidate instrument:
`8dd77f0717121776839aa1a8cb4ad69cd28b87154dcdae4ffd1135064e37c6d1`.
Common production manifest:
`5abf0f71155ed7648547dda309886f1136caf542fc06b9cd2549941e8236a01b`.
Revised combined protocol:
`741d4783ec461c2fe559d9cff2bb09269b7bc47489913871d39725509bc136c8`.

The repaired full300s combined attempt is HELD for a new explicit parent GO.
No automatic retry, production edit or threshold relaxation occurred. The early
failed process exited before numeric PID capture; process inventory and tool exit
confirmed no remaining resource process. That capture gap is explicit in
`resource-runtime-closures.json`; the next launch will capture owned PIDs before
waiting for its result.
