# Purposeful-house implementation acceptance

23 October 2026. **IN PROGRESS: resource and final native gates remain open.**
Canonical WSL Ubuntu checkout, local `post-crit-improvements` branch. No new release
is implied. This record supersedes implementation statuses in the earlier research
plan, while retaining their comparisons and human-value questions.

## Delivered behavior and evidence map

| User task | Current implementation and verification |
| --- | --- |
| Choose a useful room | A personal reference studio replaces the global work card as the room's primary object; [decision](ROOM-DECISION.md) explains comparison, costs and unresolved value. |
| Keep material ready | One bounded PNG and saved inspection crop; actual wall/desk image remains after closing the panel. Store/codec/export/preview and actual native checks are linked below. |
| Visit a friend | Named entry and pickable exit; owner material with visitor-local inspection and current door checks. Closed-room request403, URL cleanup and same-identity reload checked. |
| Study together | Real study chairs and voluntary huddle, existing independent collaborative board, companion chat and actual edit delivery. Current removal clears the open frame and membership UI. |
| Take a short shared break | Capacity-matched real game chairs, separate Join/Leave, cooperative picture table and existing short games; actual six-person current run pending. |
| Share something on the sofa | One intentional house-visible image copy; explicit presenter/follow/pointer, readable phone view, freeze and claim after departure. |
| Recover without accidental action | Audience-scoped drafts and explicit pending Retry after actual room/chair arrival; UUID/receipts preserve one effect. |

[Implementation](IMPLEMENTATION.md), [review reconciliation](evidence/implementation-reviews.md)
and [detailed subsection ledger](../revisit/REGISTER.md) retain requirement -> evidence
-> decision -> refinement -> verification per meaningful section.

## Current verification

- Required automated check:64 files /1,364 tests passed; build and typecheck passed,
  [source-bound record](evidence/required-current-pass.json). This is automated scope.
- [Native journeys](evidence/native-journeys.md), [native results](evidence/native-results.json)
  and [review](evidence/native-review.md) cover real separate identities, studio,
  sofa, board, phone emulation and scoped chat. Every record retains its own hashes;
  a preceding source scope is not silently reassigned to a later change.
- [Final-source native pending recovery](evidence/native-recovery-verification.md)
  verifies actual navigation/seat ACK and explicit retry, with readonly SQLite
  receipt counts. Recent-outbox setup is deliberately synthetic and disclosed.
- [Existing-data copy rehearsal](evidence/preview-copy-migration.json) preserves
  every original table digest and adds only four namespaced studio tables.
- Baseline bootstrap191.39MiB; mixed215.27MiB violates210MiB. Both are zero-second
  **CALIBRATION**, not sustained acceptance. Diagnostic instrumentation and fixed
  ABBA plan are in preparation. Full300s source-bound gates remain open.
- Current maintained browser selection, six-browser probe, final integrated review,
  final diff/secret/evidence checks and restored4093preview remain open.

## What these results cannot establish

Human room usefulness, contribution balance, preferred layout, acoustic quality and
physical-phone performance are untested. The controlled design comparisons and
fresh model reviews are not human A/B experiments. WSL service-process RSS is not
an actual Fly cgroup measurement. No new deployment, classmate trial or HD grade
is claimed. The user can judge the interaction in the local preview after closure.
