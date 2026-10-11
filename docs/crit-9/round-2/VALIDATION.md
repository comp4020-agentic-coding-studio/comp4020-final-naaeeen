# Round 2 validation and evidence limits

Baseline runtime3c91f53f6ed052af617fc1555c16929d1ec06921.
Parallel HEAD14702d3 added research only; original runtime hashes still match.
Windows-to-Ubuntu-WSL bridge, installed Node24.21.0, no provider/production changes.

## Current submitted-board-chat failure check

[Accepted v2 results](evidence/delivery-probe/accepted-v2-before-safety-amendment/results.json)
come from current BoardClient with real createService HTTP/SQLite authority.
Fresh private two-identity fixture per case, loopback only, polling/Socket.IO disabled.

| Case | Authority before retry | Sender after first attempt | Recovery/outcome |
| --- | --- | --- | --- |
| Normal acknowledgement | One effect/receipt | Saved, no queued pending | Peer snapshot/receipt/reopen retained one. |
| Authority committed, reply lost | One effect/receipt | Error plus one pending original | Same serialized body/ID retry; original receipt, no second effect. |
| Request not dispatched | Zero effects/receipts | Error plus one pending original | Same original retry produced one effect/receipt. |
| Delayed acknowledgement during newer composition | One effect/receipt | Pending while held | Newer composer remained after old reply; original message persisted. |

The actual error UI label is “Save needs attention”, not a definite failure claim.
Peer evidence is an authorized HTTP snapshot, not live browser observation.
Read-only SQLite reopen demonstrates tested persistence, not crash/power-failure
or current Fly deployment. No global exactly-once, WAN, physical phone, sub-second,
Socket.IO or human-comprehension claim.

## Evaluator correction and safety amendment

Original first run observed the four cases, but calibration only changed derived
check booleans. That weak control was not accepted as outcome-level calibration.
[Initial version](evidence/delivery-probe/first-run-precomputed-calibration/results.json)
and original source/hash are preserved.

v2 recomputes meaningful outcomes from trace fields. Status-only grading accepted
two explicitly synthetic bad traces; outcome/draft grading rejected them:
no durable effect/peer record, and lost newer composer. These are synthetic
trace controls, not defective production-code variants or matched agent/harness A/B.

Fresh independent review then found that awaiting the delayed-response hold
could hang if the request failed first. The one-correction stop had been used;
a [narrow safety amendment](evidence/delivery-probe/safety-amendment.json) was
registered before a further evaluator-only change. This protects bounded failure
recording, not a search for more product passes.

v3 races hold, save settlement and a1000ms timer, then releases/aborts/closes its
owned resources. Only affected checks ran:

- [Early-failure control](evidence/delivery-probe/early-failure-control.results.json):
  expected exit1, recorded error,263ms under5000ms acceptance, owned server closed.
- [Delayed success sanity](evidence/delivery-probe/delayed-sanity.results.json):
  exit0, all declared checks passed,315ms, owned server closed.
- [Run provenance](evidence/delivery-probe/safety-run-record.json).
  v3 full-suite rerun NOT RUN; four-case acceptance belongs to preserved v2.
  Timer-expiry branch has no separate executed control.

Contextual reviewer recheck found the hang repaired, no new actionable issue
in the inspected scope; it did not rerun tests.

## Historical source versus fresh results

SOURCE-AUDIT.json identifies inspected code hashes, actual feature commits and
the records for earlier red/refinement loops. Those records are worker-authored
same-day documentation, not independently replayed raw red outputs. Corrections
were often consolidated into larger feature commits. Do not invent personal
authorship or granular commit history.

The legacy first-night lost-ACK browser case does not establish current-board
failure integration. Prior round's current two-browser card journey remains
historical evidence for its own scope and was not needlessly rerun.
The new check is module/HTTP/SQLite, not a replacement for a native fault-path
browser rehearsal or deployed C9 propagation.

## Confirmed product gaps not repaired here

- Unsent/newer board-chat composer is outside submitted pending commands.
  Failed storage keeps it in memory, may leave a Saved header plus visible error,
  and available exports omit that text. Closing/reloading can lose it.
- Save-details wording says cursor/selection/zoom stay local, but pointer and
  selected-object awareness are broadcast. Local editing state is different
  from what peers can see.
- Board queue entries beyond24hours block explicit Retry too; house has a
  separate inspected-expiry retry. This is a limit, not general exactly-once recovery.

These actual findings are scoped implementation follow-up. Research does not
waive them, repair runtime or claim release readiness.

## Reproduce safely

    python3 docs/crit-9/round-2/prepare-delivery-replay.py
    node .local/crit9-round2-replay-<printed-id>/delivery-probe/probe.mjs --delayed-sanity
    node .local/crit9-round2-replay-<printed-id>/delivery-probe/probe.mjs --early-failure-control

Use installed Linux Node24.21.0 from repository root. Preparation checks exact
runtime/evaluator hashes and copies only v3 into a fresh ignored directory.
Expected early-control exit is1. A new replay is not the retained historical result.
No databases, credentials or raw inspection output are included in the public packet.

## Final argument review

A clean no-history reviewer received the sanitized draft and exact factual
artifacts, not previous scores. It found no new actionable defect and recommended
nonexpired submitted-board-message/current-authorization scope, applied by parent.
It inspected results but ran no tests. The earlier partly contaminated review is
retained separately; it does not count as clean independent confirmation.
[Review record](FINAL-REVIEWS.json).

## Final document checks

Parent verified JSON, Python/nativeJS syntax, local links, original protocol hash,
versioned evaluator hashes and unchanged runtime source. Replay preparation
reconstructed the exact v3 script/private directory; comparison was not rerun.
Final native evaluator JS syntax exit0 and course check:evidence exit0
(reflections/crit-8.md plus four resolving PROCESS commit links). JSON/local
links/Python syntax/replay preparation and protocol/runtime hashes passed.
Staged documentation diff and scoped secret-marker checks passed before commit;
required Git secret hook stayed enabled. No remote push/deployment initiated.

Native course check:evidence can pass on crit8 alone; it does not establish
reflections/crit-9.md or student understanding. Student PROCESS/reflection,
user trials and current deployment remain separate.

## Byte provenance and finalization correction

Git proposed CRLF-to-LF normalization of the historical v1 evaluator. The parent
added a narrow .gitattributes rule and restaged that file with --renormalize,
then checked v1/v2/v3 script/protocol SHA256 from the actual Git index against
their freezes. Original archived bytes are preserved; no global Git setting changed.

A finalization orchestration incorrectly continued to goal-complete after its
nested shell command returned exit1, before the final commit existed. The parent
continued authorized work, corrected the archived-byte staging and verified the
real commit/clean worktree before the final response. Future dependent steps must
inspect exit_code/result invariants, not treat a returned tool call as success.
