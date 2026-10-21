# P7 evaluator review repairs — ready, execution still held

22 October 2026. This is the current controlled-repair handoff. The earlier
preparation note/manifest retain their pre-review scope. No service, browser,
load, production mutation or production source binding occurred in this repair.
Instrument/helper/spec/protocol bytes are now frozen for contextual recheck.

## Review scope and disclosure

The initial Astra review had no parent conversation history, but it encountered
historical verdict material during inspection. It was NOT blind. Its three P2
findings are evaluator defects, not application vulnerabilities. Parent reproduced
the incomplete-source and raw-frame counterexamples in
`p7-resource-parent-review-probe.json`. The same reviewer's next examination is a
contextual recheck, not another fresh or blind trial.

Exact pre-repair instrument/helper/spec/protocol/preparation-manifest bytes were
preserved first in `p7-resource-review-preimage-manifest.json`. The original P6
preimages and prior resource failures remain unchanged.

## Requirement, reproduction and bounded fix

| Finding | Preserved RED observation | Repair and positive control |
| --- | --- | --- |
| Complete source identity | A self-consistent empty sourceHashes map reported READY despite25 required files; missing/extra declarations could escape the expected list. | Require a nonempty unique canonical relative sourceFiles list; exact plain-object key equality, well-formed SHA256 identities and manifest/instrument hashes. Actual inspect rejects25/0. A complete identity map still validates; explicit legitimate pending bindings still report HELD. No production hashes populated. |
| Admitted observation authority | Raw generation/accessGeneration/controller/ruleset changes were accepted; incoming data could supply the comparison epoch. | Capture immutable scalar authority only from successful house.subscribe ACK. Ignore frames before admission, reset optional picture cache on new connection, and replace admission only after new successful subscription. Preserve and compare actual authority fields and ruleset in normalized observations against captured current per-view admissions. Raw and actual-capture negative controls reject wrong generation/access/controller/ruleset, while legitimate admission and reconnect prefix remain valid. |
| Strict persisted picture state | Closed-table comparison accepted ruleset999 in both the row column and embedded round. | Select column ruleset, require1, and use production validPuzzleTable before expected final-state comparison. Projection normalization uses that same strict validator. Native read-only closed-fixture tests preserve a valid two-house completion and reject both corrupted ruleset variants. |

The reconnect cache reset prevents an old empty-table frame from conflicting with
a new legitimately admitted generation after the original slow-reader fault.
It occurs only for a new picture connection, before the picture phase. It does
not alter original motion/board/recovery accounting or any scheduled target.

## Actual verification

`p7-resource-review-red.json`:39 passed,5 failed,1 held service case. Failures were
actual acceptance counterexamples, including the real CLI inspection and extracted
capture path, rather than unrelated setup errors.

`p7-resource-review-green.json`:46 passed,1 held service case,0 failed. This includes
all preserved raw-state/ACK/storage controls plus valid source binding, immutable
successful-subscription wiring, authority mutations, reconnect reset and both
persisted ruleset corruptions. Typecheck, executable self/checkpoint controls and
scoped diff check passed. Both prospective protocol inspections remain HELD /
SOURCE_BINDING_REQUIRED as intended. The old network-service calibration remains
excluded during native work; no service or heavy acceptance was inferred.

The exact original21-gate executable line and all original workload/criterion
fields remain unchanged. Game124 actions/733 targets, picture62 actions/372 targets,
absolute cadence/deadlines, receipt replay and16MiB growth gates are unchanged.
Only evaluator admission/binding/state checks and protocol instrument identity
were refined. No app implementation, renderer, ownership rule or budget changed.

## Handoff and remaining uncertainty

Current identities are recorded by `p7-resource-review-repair-manifest.json`.
Production source maps/manifests remain null until the parent confirms runtime
freeze after native completion. The parent owns contextual review and binding,
then explicit sequential resource GO. Actual live P7 orchestration, full post-close
ledger verification and sustained resource outcomes remain NOT RUN. No automatic
retry or extra experiment is scheduled.
