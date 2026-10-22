# Studio upload cancellation review refinement — 23 October 2026

Fresh Astra UI review identified two P2 races. This lane changed only
public/house-studio-ui.js, spec/house-studio-ui.test.ts and studio-ui evidence.
The existing authority/context and original UUID retry contracts remain in place.

## P2a — late chunk failure revived a cancelled action

Requirement: Cancel during staging must immediately end that upload's local
continuation. A later accepted/error/timeout reply cannot restore its pending retry,
overwrite feedback, lock new saves or discard a newer local inspection draft.

Reproduction: defer an actual command callback for a chunk; Cancel; pan locally;
reject that deferred callback with TIMEOUT. Initial result: cancelled upload
reappeared as a pending retry. The context epoch was unchanged, so attempt's
epoch-only check admitted a result after uploadSequence cancellation.

Refinement: every upload command supplies its captured operation guard to attempt.
Attempt checks current authority epoch AND the captured upload generation before
dispatch, after settlement, in catch, and before rendering. Pending retry retains
that same guard and original immutable command/UUID. Cancellation increments the
upload generation; late original or retried transport results reject internally
as stale and cannot recreate pending state. Normal non-upload saves retain their
existing authority guard.

Verification includes both an original deferred chunk and a deferred second retry
timing out after Cancel; neither restores pending nor sends commit. The first
reproduction also preserves a newer unsaved local view and proves a later explicit
Save this view is admitted. Cancel is available during initial staging/begin;
late begin acceptance cannot continue the abandoned upload. Server temporary bytes
still expire under its existing bound if the cancelled begin's uploadId was unknown.

## P2b — cancellation after commit dispatch implied a rollback

Requirement: once final commit can have applied, the UI cannot promise that
cancelling preserves the old reference or that an abort rolls back the commit.

Controlled callback reproduction: the commit adapter first changes its durable
state fixture to the new reference, then holds the ACK. Previously Cancel remained
enabled. It sent abort and ignored the later committed ACK while claiming the old
reference stayed saved. This is a callback-level committed-state reproduction;
it is not a new real SQLite, HTTP or native browser run.

Alternatives considered:
- Continue offering Cancel and issue abort: cannot roll back a completed atomic
  commit; rejected.
- Expose a new server rollback transaction: expands authority/state semantics
  beyond this review repair; rejected for this task.
- Stop offering cancellation once final save is dispatched, retain exact retry,
  and reread current durable state if its reply is uncertain: selected.

Refinement: an explicit staging/committing phase disables Cancel before the commit
request can leave. The feedback states final save cannot be cancelled. An uncertain
commit reports that the new reference may already be saved, preserves its original
UUID retry, and refreshes current authenticated state. The user can close/reopen to
inspect current state; close is not represented as a rollback. Accepted ACK then
refreshes the current committed reference.

Verification: callback commit applies before a deferred ACK; Cancel is disabled,
no abort is sent, and ACK loads the new current reference. A TIMEOUT after applying
the fixture commit keeps Cancel disabled, reads the committed image, and retries
the exact same final command. Revocation before a late commit TIMEOUT suppresses
both new private reads and pending retry restoration.

## Actual evidence and remaining boundary

- studio-ui-review-cancellation-red.txt: 3 failures with 40 previous tests passing.
- studio-ui-review-cancellation-first-green.txt: first 43/43 focused UI pass.
- studio-ui-review-cancellation-green.txt: final 69/69 focused pass
  (46 UI, 23 unchanged ambience).
- Targeted V8 UI coverage: 92.77% statements, 83.63% branches, 93.05% functions,
  99.57% lines. Ambience remains 94.80/87.64/95.23/95.79.
- studio-ui-review-cancellation-typecheck.txt: scoped TypeScript check passed.
- node --check and scoped git diff --check passed.
- studio-ui-review-cancellation-source-sha256.txt binds the refined module/spec.

The original review is independent. This repair and its verification are contextual
worker checks; root owns independent contextual recheck and native browser acceptance.
No backend/server/main UI change, server start, full suite, commit, push or release
was run in this refinement lane.

