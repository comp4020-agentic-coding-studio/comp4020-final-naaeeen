# Crit 9 comparisons, reviews and refinements

## Frozen selection

[Protocol](DECISION-SELECTION-PROTOCOL.json), frozen 2026-10-11T13:19:26Z
(12 October locally), SHA256
7077b48d6b7c8529366b87db908f17e5d13f631798515a8d2534d8a2422d4f92.
Fit/value/evidence/alternatives/demo weights: 30/20/25/15/10, fixed 0–3 anchors,
two sensitivity profiles, eight candidates. No post-result score upgrade.

| Candidate | Reviewer 1 | Reviewer 2 | Reasoning |
| --- | --- | --- | --- |
| A Element collaboration/recovery | 81.67 | 85.00 | Clear task; limited same-object intention/undo/recovery. |
| B Explicit willingness | 91.67 | 91.67 | Strong tied option; Quiet is not a messaging consent gate. |
| C Shared canvas / personal-card authority | 91.67 | 91.67 | Selected qualitatively: purpose -> server authority -> visible state. |
| D Persistent members / browser connections | 85.00 | 75.00 | Useful invariant; less depth about learning interaction. |
| E Room access/history / decoration | 85.00 | 85.00 | Real privacy tradeoff; opening exposes retained chat. |
| F Pending / committed | 60.00 | 66.67 | Reliability support, less distinctive purpose argument. |
| G Target narrowing | 43.33 | 58.33 | Context, insufficient alone as C9 behavior. |
| H Resource/harness optimization | 41.67 | 33.33 | Process support; indirectly answers behavior. |

Ordinal model judgments normalized by weighted sum, not empirical precision.
B/C remain tied under both alternative profiles.
[Raw ratings/orders/scores](evidence/candidate-reviews.json).
Two model judgments are not human samples. Reversed presentation is a bias check,
not randomized human A/B or population preference evidence.

## Controlled technical comparison

[Protocol](evidence/protocol.json), SHA256
d3b6a89af9a8d41f8ba7a60726abffe4607fea09773dc15976189129fee3b11a.
Evaluator frozen before execution:
a4c666ff03dca135f700cf04f0f95e97e2c4e487c332ad66f00c7914e9d88681.
[Results](evidence/results.json), SHA256
55fed6b6d2d2910154de68c640627228145465c711d84751973638640dfd9b2b.

S is exact current source. P removes two card-author predicates. O adds the
original-author guard for existing canvas objects. All keep house boundaries,
revisions, receipts and lifecycle; P retains creator attribution.
[Exact deltas](evidence/deltas.diff).

Fresh SQLite pairs for every case/order: 14 records per policy plus one synthetic
calibration, 43 total. All matched **policy-specific** expectations. Denial and
admission can both pass; counts cannot rank policies.

| Task | S current | P all shared | O existing objects author-only |
| --- | --- | --- | --- |
| Peer changes existing diagram | Allowed | Allowed | Denied |
| Peer rewrites/closes individual's card | Denied | Allowed | Denied |
| Agreed edit/closure of genuine team task | Denied | Allowed | Denied |
| Own next-step save | Active | Active | Active |
| Distinct objects, AB/BA | Both retained | Both retained | Both retained |
| Same object/equal version, AB/BA | Lower nonce winner | Same | Peer denied |
| Stale own-card revision | Denied | Denied | Denied |
| Cross-house outsider under declared layers | Denied | Denied | Denied |
| SQLite reopen / exact replay | Persists / one effect | Same | Same |

The team task gives P a real benefit. Agreement is stipulated, not detected.
P is an ACL prototype, not a complete shared-task UX: responsibility labels need
further design. A richer all-shared model could visibly attribute the latest editor
without restricting edits; the tested P variant does not stand for every such design. O also rejects unchanged peer objects in an incoming patch, so
singleton packets do not prove compatibility with the real editor.

Board membership is a common fixture wrapper, not BoardStore auth or cookie/
session testing. HouseStore also receives a trusted identity ID. AB/BA are
serialized delivery permutations, not threads/network timing/exhaustive schedules.
Calibration rejects a synthetic last-patch-only array, not a defective store.
No preference, learning, uniqueness or speed claim follows.

## Reproduce from pinned public source

Original evaluator/protocols/manifests/deltas/results are public; private databases,
credentials and raw inspection transcripts are excluded.

    python3 docs/crit-9/prepare-policy-replay.py
    mise exec -- node .local/crit9-policy-replay-<printed-run-id>/evaluate.mjs

Preparation restores public source from the pinned Git commit, recreates variants,
checks frozen hashes and prints a fresh ignored directory. It never changes
runtime source or old fixtures. Evaluator aborts if production source differs
from baseline; use that baseline checkout for future replay. New replay is not
the retained original result.

## Review/refinement trail

| Cycle / part | Independent input | Parent action |
| --- | --- | --- |
| 1: candidate/code audit | Two no-history reviewers, reversed orders; source explorers. | Retained C/B tie; qualitative choice. Checked SQL, labels, merge logic and history. |
| 1: claim precision | Overbroad draft recovery; historical continuity described as current. | Narrowed claims, then applied the factual README correction after final review; separated historical/current results. |
| 1: interpretation | Closure is not learning; personal cards visible. | Added authority/confidentiality and closure distinctions; checked owner guards and labels. |
| 2: evaluator | Fresh no-history review of hashes/deltas/results/logs, no rerun; no defect. | Parent checked script/SQL and executed 79 actual store/client tests; kept wrapper/auth/editor limits. |
| 2: research countercase | Original paper favors fluid negotiation. | Limited hard rule to personal statements; explicit delegation/shared-task countercase and falsifier. |
| 2: final argument | Fresh skeptical recommendation review. | Verified recovery overclaim; corrected factual README wording and included truthful-editor-attribution alternative. Contextual recheck/results in verification. |

[Human comparison proposal](FUTURE-HUMAN-TRIAL.md): NOT RUN.
