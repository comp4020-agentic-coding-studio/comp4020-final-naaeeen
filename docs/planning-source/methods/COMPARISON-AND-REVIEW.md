# Comparison and review method

Active A3 procedure, revised7October2026. Read with repository docs/harness/REPORT.md.
ALWAYS return to applicable sections at each phase, section and substantial
subsection; record actual evidence, comparisons, reviews and refinements in
docs/revisit/REGISTER.md. Historical references below do not supply current results.

Define the question, candidate identities, common input, acceptance tasks, grading
criteria, presentation order, environment, trial count and stopping condition
before evaluating. Store a hashed protocol in `evaluation/`. Report whether the
study is a technical experiment, a qualitative model comparison or human A/B test.

For a visual/interaction comparison, give each candidate the same room contents,
social actions, viewport and task script. Separate preference judgements from
mechanical outcomes, performance and implementation cost. Alternative renderers
need not share internals; make different assets or instrumentation explicit.

For agent-harness comparisons, each run starts from a separate matched fixture.
Keep tasks, model/effort, dependencies, evaluator and allowed edits fixed; vary the
declared instruction factor only. Do not rerun the historical A2 benchmark merely
to produce a larger count. Run a bounded new trial only when its result could
change an A3 decision.

Calibrate deterministic checks with valid outcomes and plausible failures.
Protect the rubric/grader from candidate edits. Capture actual exits, outputs and
state, and label infrastructure failure, behavioural failure, timeout and not-run
separately. Do not collect hidden reasoning or credential/configuration contents.

Give fresh reviewers only the current brief, candidate artifact/evidence and
rubric, without the conversation, prior preference or other reviews. Use neutral
labels for candidate comparison, record the mapping separately, and reverse order
for a second reviewer where useful. Fresh context reduces shared framing; it does
not establish independence from shared model biases or replace actual users.

The parent verifies actionable findings against evidence, resolves differences
and records the revision. Obtain independent review of substantive prototype code
and final design. Repeat affected checks after a change. Stop when acceptance is
shown and material issues are resolved; do not manufacture review cycles.

Reference-only A2 files under `../reference/a2/docs/harness-research/eval/` are
disabled until adapted. They contain A2 paths/cases and must never run unchanged.
Historical 18-run outcomes and model editorial comparisons are not A3 results.

Primary methodological reference:
[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

## Corrections from this project

Verify the actual DOM viewport after setting a requested size; the browser override
may apply to a different active tab. Reject mismatched samples rather than relabel
them as mobile. Validate a complete native screenshot before distributing cropped
review evidence. Incorrect native crops here produced false visual rankings;
retain them as rejected artifacts, withdraw those rankings, and disclose that a
corrective full-image pass is unmasked and retains reviewer context. Do not count
repeated SVG diagnostics as independent rolling samples when the renderer reports
one aggregate. Preserve raw observations and explicit deviations.

## Apply inside every A3 subsection

Every consequential subsection decision gets explicit alternatives and a chosen
comparison/review method. Specify common task/input/version/environment, criteria,
failure disqualifiers, reviewer context and stopping condition before new trials.
Use technical A/B, design contrast, agent-harness trial and human evaluation
where each can inform the actual choice. A focused correctness check is sufficient
only with a decision-specific explanation; no generic bypass for an unresolved
choice. Existing decisions revisited now are retrospective, not pre-registered wins.

Fresh initial reviewer: current goal/source/constraints/evidence/rubric, no parent
conversation, preference or earlier verdict. Give adjacent subsections together
only when each receives separate findings. Verify the evaluator as well as the
candidate, reconcile source/runtime findings, refine and rerun affected cases.
A contextual recheck and a new independent trial are labelled separately.

Current source refresh: docs/harness/REPORT.md records Evaluating AGENTS.mdv3,
29September2026; the inherited A2v2citation remains historical.
