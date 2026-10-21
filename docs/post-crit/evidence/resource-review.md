# Resource instrument review and reconciliation

Execution closure is recorded in [resource acceptance](resource-acceptance.md).
The preparation/review states below retain their original checkpoint scope.

22 October 2026. Fresh no-history read-only GPT-6 Astra/high review of the
post-Crit resource adaptation. Reviewer: resource_instrument_review. Fact packet
contained canonical WSL path, exact runtime budget, sources/protocol/specs,
required preserved criteria and review rubric; no prior verdict-bearing handoff.
No runtime edits, heavy workload, browser, commit, push or provider work occurred.

## Initial review

Reviewed instrument SHA256:
`f9019a30549b7bbf9863ed31e207030597466a585a950e60a21783cb05ba60ec`.

One confirmed P2 finding: `gradeGameEvidence` compared action and observed hashes
only for equality. Extracting the actual grader against the complete124-action,
733-target fixture returned true for valid hashes, every hash deleted, and every
hash set to malformed. The live `rememberGameProjection` collector computes SHA256;
the finding is incomplete recorded-evidence false acceptance, not a demonstrated
live-run false PASS.

Parent reproduced it as a meaningful failing test; see
`resource-game-hash-red.json`. The refinement requires a lowercase64-character
hex action hash before equality comparisons. Thus every matching observed hash
also has the required shape. Controls reject all missing, null or malformed hashes
and still accept the complete valid fixture.

No other actionable issue was found after full adaptation diff, root-only auth,
fixed schedule/player identities, real Join/Ready/Move/Leave authority semantics,
projection/revision/roster model, job cancellation/cleanup, aggregate child storage
queries, source freeze and exact original-gate preservation review.

## Related parent integration finding

The parent's first full suite reported two failures in the extracted fork-call
fixture: the legitimate new child `protocolPath` dependency was absent from its
Function bindings. The resource worker now passes that selected path and tests
both default and explicitly selected combined protocol routing. Existing immutable
server-budget, copied-argument, actual Node child and environment assertions remain.
This is a test capture update, not a runtime budget change.

## Contextual follow-up

Reviewed instrument SHA256:
`7584bce6e3814ea0d5da7e967cf44e9ce6d10a5dd6483788c3faa18ea37cd517`.

The same reviewer verified the sole finding is fixed, all observed hash shape
checks follow from strict equality, and protocol selection plus budget/environment
assertions remain intact. No new findings. This is contextual recheck, not a second
fresh review. The parent worker's focused22 tests pass in
`resource-grader-runtime-green.json`; the reviewer independently passed the same22
via installed Vitest with explicit two-file include and no global setup. Its first
default-config attempt did not reach tests because localhost8080 was absent; it
exited, then the isolated focused run passed. Do not count that infrastructure
attempt as an application failure or test execution.

Both exact-protocol `--inspect` commands returned READY to reviewer and worker.
Self/checkpoint controls and scoped syntax/diff checks passed. Full original and
combined300s integration remain NOT RUN pending parent GO. The first actual
combined run must verify live orchestration/ACK/projection/storage behavior;
unit extraction and source review do not establish that integration. Abort cleanup
has source review and existing drift controls, not a new sustained abort experiment.
