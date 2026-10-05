# PROCESS writing comparison — 28 September 2026

The student said the current account was too abstract and asked for plain writing,
actual agent practices and multiple A/B comparisons. The final English account is
520 words, with a synchronized Chinese review copy. This record preserves the
editorial comparisons; it is separate from the earlier 18-run harness experiment.

## Fixed conditions

The existing PROCESS at dea0fe5 is saved verbatim as baseline.PROCESS.txt. Before drafting, the
parent saved evidence.md and protocol.json: shared facts, length/format constraints,
six 0–3 editorial criteria and factual disqualifiers. Protocol SHA256:
`b187f1eeea10cc9327c1208af5d980577240bd47e69d43a5f8bfda6a00d3ad94`.
Two fresh writers inherited the selected model without overrides and owned separate
candidate files. Four fresh reviewers evaluated anonymous labels, with presentation
order reversed within each round. Reviews were read-only; the parent wrote the
results files from their returned findings. Scores are ordinal editing notes, not
a predicted grade, a statistical result or evidence of human preference.

The calibration sentence in criteria.json deliberately contains three unsupported
claims. All four reviewers identified them. It is a reviewer check, not a claimed
project failure. The parent independently checked quotations and supporting history.

## Round 1

| Candidate | Reading label | Main strength | Necessary repair |
| --- | --- | --- | --- |
| round-1-a.md | Y | Concrete link-check explanation and historical-course correction | Course purpose arrives late; ending is crowded |
| round-1-b.md | X | Immediate student need and more natural opening | Omits the strongest coordinated teaching correction |

Both reviewers preferred Y/A as the factual/narrative basis. Both drafts omitted
Crit 5 reuse and used descriptive labels instead of the required commit hashes.
Those common repairs were applied to the preferred control before round 2.
The parent verified that B's pinned dea0fe5 URLs were valid; the reviewer's
uncertainty was due to the limited packet, not an actual false link.
See [the first-round checks](round-1-checks.json) and [review results](round-1-results.json).

## Round 2

M is the corrected A control; N is the parent synthesis. Both reviewers preferred M
for grounding and found N easier to read. They flaggedN's personal-motivation
sentence and a development sequence not established in their packet. The parent
checked git:4fc9cde created the representative Week 2 unit before 1c27051 expanded the
course. The final version retains that sequence with a direct citation. The
motivation sentence was removed in favour of the actual teaching activity.
An intended pre-review text replacement had failed to match; the final correction
was applied with an explicit assertion rather than silently assuming it succeeded.

The final version combines M's verified plan→rule→content chain with N's plain course
introduction, concrete link example and short document explanations. It names three
practices through actions: consult sources for uncertain choices, plan coordinated
changes and split file ownership with a separate verification step. 'Same output'
was also narrowed to the actual harness requirement: connect preparation and class
activity to assessment. See [the second-round results](round-2-results.json) and [final text](final.md).

## Final verification and rule change

The parent checked real commit targets, source chronology, document paths and the
translation. A separate final reviewer found no material factual/translation issue.
The evidence gate is run on the final root PROCESS, not on rejected candidates.
No website code changed. A small CLAUDE.md writing rule now asks for an actual
request, observation and resulting change, with technical terms explained through
the example. This responds to the user's repeated feedback about abstract prose.
The student still reviews and approves the account.

## Subsequent student clarification

The comparison above produced the 520-word checkpoint committed in 9bc8a25. The
student subsequently asked for the research location, the meaning of the tested
rules and the way selected findings guided later agents to be explicit. The current
root PROCESS is a 594-word revision; the comparison samples and final.md remain
the actual earlier artifacts. See [the clarification audit](technique-clarification.md).

## Later scope and language choice

The student subsequently replaced the account's paragraph about its own writing
with a reference-led Aincrad implementation example and required an English-only
submission tree. The current PROCESS is 598 words. These comparison artifacts remain
the actual earlier drafts and reviews; translated convenience copies now reside
outside the repository. See [the review index](../README.md).
