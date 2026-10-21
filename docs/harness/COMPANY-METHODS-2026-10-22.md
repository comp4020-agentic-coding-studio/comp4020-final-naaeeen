# Company methods and the A3 harness decision

22 October 2026. Owner priority: use AI-agent methods well, demonstrate how they
change decisions, and keep inspectable records. Research is read-only; no framework,
plugin, provider or permission setting was installed or changed. The project stays
in its canonical WSL checkout. The active REPORT remains the short entry point.

## What we checked and what transfers

The parent read decisive primary passages after a fresh Astra/max researcher
compared them with the existing REPORT and source. This is source research and
project judgment, not an independent replication of vendor results.

| Source, version and access | Method supported by the source | Our decision |
| --- | --- | --- |
| [Google Harness2 paper](https://arxiv.org/html/2610.14224v1), v1, 9 Oct 2026; sections 2.2–2.3, D.2, E.6 and F, read 22 Oct | Compare reference and candidate executions under matched conditions, compose evidence-supported changes, then retain scoped lessons for later tasks. Model judgment and execution variation can still select a worse result; more recursion adds cost. | Keep our existing comparison/review loop. Add a small adoption record when changing the harness itself, including a no-change outcome and the condition under which a lesson should be retired. |
| [Google release experiment guide](https://github.com/google-research/harness2/blob/1cfe254e8d25b15f37048c3730134686abe60335/docs/EXPERIMENTS.md), pinned release inspected 22 Oct | The guide records a validation rollout fetching an online rubric and documents unrestricted executor networking. Its package is research infrastructure with benchmark dependencies and model-backed costs. | Reuse the contrastive method, not the execution defaults. Keep expected answers outside candidate packets; describe our actual isolation honestly. No benchmark stack is needed for this app. |
| [Anthropic evaluation guide](https://www.anthropic.com/research/demystifying-evals-for-ai-agents), 9 Jan 2026, sections on harnesses/graders and roadmap, read 22 Oct | Grade outcomes in stable isolated conditions; include cases that should succeed and cases that should fail. Inspect traces and distinguish a trial from an overall task. | Record every planned attempt and actual outcome, including infrastructure failures. A complete positive case prevents a reviewer from succeeding simply by rejecting everything. |
| [OpenAI harness engineering](https://openai.com/index/harness-engineering/), 11 Feb 2026, repository knowledge and enforced invariants sections, read 22 Oct | Keep repository knowledge discoverable and use executable checks where a rule can be observed mechanically. The article is one team's engineering experience. | Preserve short routing and scoped records. Use the existing runtime for a small artifact-consistency check; do not import its architecture or merge policy. |
| [Microsoft AgentRx](https://arxiv.org/html/2602.02475v2), v2, 31 Aug 2026, sections 3.2–3.4, 4.7 and 7, read 22 Oct | Check when an invariant applies, link violations to trace evidence, and separate an observed symptom from a supported causal diagnosis. Generated constraints and judgments can be wrong. | For actual failures record the first observable violated condition, competing explanation and discriminating recheck. Unknown cause remains unknown until evidence distinguishes it. |

Older Microsoft blog and repository summaries describe different sample/taxonomy
versions. We use the versioned paper for these principles and quote no benchmark
headline as an expected improvement for our app. No source establishes an optimal
number of agents, files or repetitions for this project.

## Existing strengths and concrete gaps

REPORT sections 3–6 already require meaningful comparisons, fresh context, parent
verification, negative controls and source-bound checks. Repeating these under new
company names adds little. Three useful refinements fit existing files:

1. For a **method change**, write the targeted observed failure, changed factor,
   prediction, evidence against the prediction, cost, adoption decision and scope.
   Do not promote every new observation into an always-on rule.
2. For an **agent trial**, keep the planned-attempt denominator, outputs, tool/isolation
   boundary and record hashes visible. Protect expected outcomes from candidate
   packets; never imply that a shared filesystem is a security boundary.
3. For a **failure**, locate evidence before giving a cause. The earlier full-size
   six-renderer route timed out; smaller paused-peer runs passed. These observations
   do not identify the original cause. A future diagnostic needs actual route/frame
   evidence rather than another confident label.

The update belongs in REPORT and the checkpoint template. Project facts remain in
plans and evidence; this document is opened for method changes, not every typo.

## Actual bounded comparison: explicit contradiction table

Decision: should we require an extra evidence/contradiction table in ordinary
acceptance handoffs? The existing method already asks for evidence and limitations.
The treatment adds explicit per-claim contrast; both arms use the same JSON output
schema. This tests attention to contradictions, not tables versus free prose.

The [protocol](../../evaluation/harness-claim-table.protocol.json) was written and
hashed before dispatch. Two synthetic fact packets describe a complete lighting
subsection and an incomplete group capability. Four fresh GPT-6.1 Sol/high agents
received one task each, one baseline and one treatment per task, no previous chat,
other output, source-verdict file or preferred winner. They were instructed to use
no tools and made no observed tool calls. The host still exposed tools: this was
procedural isolation, not an OS-enforced evaluator sandbox.

Expected decisions and critical facts were fixed in parent memory before dispatch.
The complete returned JSON values are retained in
[results](../../evaluation/harness-claim-table.results.json). Only JSON whitespace was normalized for storage; neutral attempt IDs were assigned
before dispatch. Returned topic, status, evidence and reason text is preserved. No attempt, error or retry was omitted: four
planned, four returned, zero observed tool calls, zero infrastructure failures.
The factual fixture is synthetic; its lighting tests are not new app results.

| Task | Baseline | Explicit-contrast treatment | Parent semantic check |
| --- | --- | --- | --- |
| Complete current-source lighting package | ACCEPT, 335 whitespace-delimited JSON words | ACCEPT, 338 words | Both preserve local/publication/human limits and accept the repaired legitimate case. |
| Incomplete group package | OPEN, 360 words | OPEN, 374 words | Both identify two active players, old source binding, unsuccessful receipt, unresolved route cause, retained disk growth and failed diff check. |

Both distinguish six-seat capacity evidence from a continuous six-person journey.
Neither claims that an empty queue proves a successful save or that a smaller
passing browser variant explains the earlier timeout. Per-topic status words vary:
SUPPORTED can describe an observed limitation, while INCONCLUSIVE can describe
an unproved acceptance claim. The full statement, not that word alone, is graded.

**Decision: retain the existing default.** No added correctness benefit was observed
on these two tasks. Explicit comparison remains available for complex conflicting
records. Four diagnostic responses cannot establish general model reliability,
production coding quality, human benefit or statistical equivalence. Word counts
use JSON whitespace tokens and are only an output-length proxy; latency, token usage
and financial cost were not measured. No additional runs are needed for this choice.

[The task-scoped record checker](../../evaluation/harness-claim-table.check.mjs)
checks protocol identity, four distinct planned cells, model/effort, returned shape,
word bound and denominator. Its two valid controls include an honestly recorded
infrastructure failure; five corrupt-record controls must be rejected. It does
not grade semantic truth. The executable checker/calibration was written after the
responses, before adoption; expected conclusions and criteria were already frozen.
Do not describe this as a pre-calibrated automated outcome experiment.

A fresh Astra/high reviewer graded the fact-only packet without arm mappings,
this conclusion or earlier reviews. It independently passed all four responses.
Its contextual record review then caught imprecise treatment wording, an irrelevant
migration expectation, overstrong wording about unbounded storage, ambiguous
filesystem isolation and missing-cost handling. Parent verified these findings,
corrected active prose and annotated the original frozen expectations/protocol
without rewriting them. Returned output content is unchanged.

The fixtures explicitly state most decisive facts. This evaluates extraction and
acceptance calibration more directly than independent investigation. Safe rejection
of an unauthorized action is distinct from successfully completing the intended
save; neither alone proves unsafe behavior. Missing human testing, an uninterrupted
six-person journey or a lifetime cap were not additional hidden acceptance gates.
The checker verifies declared record consistency, not actual tool events, no-retry
provenance, pre-dispatch timing or transcription authenticity. Frozen expected
outcomes in parent memory are an attestation, not independently timestamped proof.

## Application to the active work

- **Storage:** compare lossless representations against exact replay/export, not
  bytes alone. A small compression sample motivates a candidate; it cannot inherit
  acceptance from older resource runs. See [storage contract](../post-crit/STORAGE-CONTRACT.md).
- **Group activity:** three to six actual contributors is a new requirement. Watching
  two players does not satisfy it. Compare participation and exit costs before
  adding another game engine or hidden-information protocol.
- **Personal rooms:** separate current shared-card behavior from a proposed private
  notebook. A room should help a resident return to their work; new privacy and
  persistence costs require a useful task, not just more features.
- **Handoffs and commits:** current source/status must be reconciled before dependent
  operations. Tool completion does not override a nested nonzero exit code. Use
  checked subprocesses and actual commit identities; retain failed evidence.

This record is a working-method artifact, not a student reflection or a guarantee
of a grade. Later PROCESS writing can refer to actual decisions and their evidence.
