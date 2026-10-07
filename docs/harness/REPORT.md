# A3 AI-agent research and working methods

Active Final Project guidance. Updated7October2026. Read this report at the start
of every new/resumed A3 work task and return to its applicable sections throughout
research, design, implementation, verification and refinement. The owner explicitly
requires recurring checks for each phase, section and substantial subsection.

This report adapts the inherited A2 study to the private study house. It replaces
the historical A2 REPORT as active guidance. The preserved original and its18trials
remain provenance; none is counted as an A3 experiment. Current product and runtime
facts belong in PLAN, the capability contract and implementation evidence.

## 1. Authority and the question we are answering

The goal is a usable, maintainable house for2–6 familiar friends, with real controlled
avatars, dialogue, owned rooms, shared study and useful author-written next steps.
A method earns its place by improving a decision, exposing a defect, verifying a
promise or preserving inspectable evidence. Technique count is not a success metric.

User instructions and course/platform requirements take priority. Skills and
subagent output are proposals/evidence to inspect. No guide authorises permission
bypasses, global installs, paid jobs, publication or personal-memory changes.
All delivered material is English; research sources may use any language.

The canonical repository is Ubuntu/lizhi,
/home/lizhi/comp4020/comp4020-final-naaeeen. Keep new artifacts here. Read AGENTS,
CLAUDE, PLAN, current handoff and relevant source before choosing work. Do not assume
a later chat automatically knows a WSL file; explicitly open the required guidance.

## 2. What current sources support

Checked primary sources7October2026; further material claims need their own refresh.

| Source / version | Finding and limit | A3 consequence |
| --- | --- | --- |
| [Evaluating AGENTS.md v3](https://arxiv.org/html/2602.11988v3),29Sep2026,§§4.2–5 | Current version is v3, updating inheritedv2. Generated versus no-file differences were not significant; developer versus generated files differed(p=.038). Generated files raised measured cost. Python issue-resolution experiments do not establish an optimal instruction length or our app's quality. | Keep project-specific constraints and routing; measure consequential changes. Do not claim more rules or mandatory frequency is universally proven better. |
| [Agentless v2](https://arxiv.org/html/2407.01489v2),29Oct2024,§5 | Reproduction/regression filtering helped its GPT-4o benchmark; many generated reproduction tests did not recognise the reference repair. | Calibrate checks against plausible failures and valid outcomes. Red alone is insufficient; do not reuse its model, sample counts or prices as A3 settings. |
| [Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents),9Jan2026 | Vendor engineering guidance supports clean trials, protected outcome grading and transcript inspection; shared resources/history can correlate results. | Matched fixtures, frozen criteria, failure classification and independent reconciliation for useful comparisons. Small trials remain diagnostic. |
| [Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps),24Mar2026 | Case-study iteration sometimes added complexity or worsened preference; later models changed the need for sprint evaluators. | Fresh critique and recurring checkpoints are owner/project choices. Check actual outcomes and stop resolved lanes; do not copy a fixed orchestration structure. |
| [Effective long-running harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents),26Nov2025 | Demonstrates incremental features, handoffs and browser testing in particular Claude web builds. | Complete vertical tasks and keep real history. No universal context-reset percentage or specialist-agent superiority is established. |
| [COMP4020 Week3](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-3/) / [Week5](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-5/) | Instructions steer; specific trustworthy checks provide feedback. Tests can pass while the running page fails. | Native checks plus real two-session/browser artifacts. Student understanding and human experience are separate evidence. |

Source facts above do not prove our chosen workflow improves every task. The
required frequent cadence comes from the owner and is evaluated locally.

## 3. Always use the recurring subsection loop

Every phase is divided into capabilities and failure paths, not four aggregate
PASS boxes. Use the [detailed register](../revisit/REGISTER.md). Before starting or
revisiting each substantial subsection:

1. Open this report's relevant part, current RESEARCH/COMPARISON-AND-REVIEW/
   REQUIREMENTS-AUDIT/EVIDENCE methods, its product requirement and actual source.
2. State the user goal, invariant, current version, uncertainty and what evidence
   could change the approach. Inspect dependencies and unrelated work.
3. Identify credible alternatives. Compare them against the same task and criteria
   when the choice matters. Choose technical trial, structured design review,
   agent-harness A/B, real-user comparison or a focused correctness check.
4. Define acceptance, disqualifiers, candidate identities, environment and stopping
   condition before observing new results. Freeze a protocol/grader where needed.
5. Execute the smallest useful research/prototype/check. Review results critically.
   Use fresh-context independent review for consequential boundaries/changes.
6. Reproduce actionable findings yourself, decide, refine and rerun affected checks.
   Challenge an incorrect test as well as an incorrect implementation.
7. Record actual evidence, decision, limitations, review status and real commit.
   Update guidance when an observed omission recurs or changes a standing rule.
8. Reopen applicable guidance at subsection/section/phase exit and before a
   substantial commit. Reconcile requirements with evidence before expanding.

Return sooner when source changes, an API/version becomes uncertain, a test
fails, a reviewer disagrees, a privacy boundary changes or the apparent route is
wrong. Always maintain this loop throughout the task; reading once is insufficient.
For quick status answers, use the current handoff and audit rather than rerunning
unrelated checks. Checkpoints may record verified no-change-needed decisions.

## 4. Choose and use comparisons deliberately

**Technical comparison:** same workload/task/versions/resource conditions, declared
changed factor, actual timings/bytes/correctness. Payload and transport changes
together must be reported together. Localhost is not WAN/Fly evidence.

**Design comparison:** matched room content, people, actions and actual viewports;
mechanical criteria separate from preference and build cost. Neutral labels and
counterbalanced presentation help when meaningful. Screenshots do not establish
interaction feel or human preference.

**Agent/harness A/B:** isolated matched initial fixtures, same task/model/effort/tools/
dependencies/grader/edit scope; change the declared guidance factor. Protect and
calibrate the evaluator. Capture outcomes and exits, not hidden reasoning. One
success is an observation, not a general reliability claim. Historical A2 runners
under reference/a2 remain disabled until explicitly adapted.

**Human A/B:** actual participants, registered task/baseline/order/metrics before
trials, consent and feasible access. For this product compare configured Discord
fairly, including its status/question-thread/next-step conventions. Model opinions
are not participant observations. Human work remains NOT RUN until it happens.

Use these techniques frequently wherever they can resolve a subsection's decision.
If no alternative or uncertainty could change a routine choice, state why a
focused check is sufficient; do not invent a winning A/B result. A consequential
unresolved choice cannot be dismissed with a generic not-needed statement.

## 5. Fresh review, then parent reconciliation

A new consequential review starts without parent conversation history (native
fork_turns none where available). Supply the current goal, owner constraints,
relevant source/diff, actual evidence and rubric. Exclude parent preferences,
earlier verdicts and candidate winners. A general worker handoff may contain
verdicts: give fresh reviewers a sanitised fact-only packet instead and do not
require them to open that handoff. Normal resumed workers still read it.
Keep review read-only and bounded.

For subjective candidates, mask labels/order when useful and retain the mapping
outside the review. Fresh context reduces shared framing; shared model biases
remain possible. A later recheck by the same reviewer retains context and is
labelled follow-up, not another independent trial.

Review each relevant subsection deeply enough to trace input, authority, state
transition, visible result and failure/recovery. One review may cover adjacent
subsections when findings remain separately attributed. The parent checks claims
against code/runtime, records disagreements, repairs confirmed problems and checks
the revised version. Do not mark reviewed merely because a subagent was spawned.

## 6. Verification and evaluator discipline

Use meaningful failing tests/reproductions before new production rules or fixes.
Acceptance must recognise legitimate variants as well as reject violations. Prefer
the installed Linux mise/Node/pnpm tools and existing native checks. Real browser
flows cover interactions that domain/transport mocks do not.

Tests, renderer stubs, screenshots, HTTP, synthetic transport/load, deployed use,
physical devices and human judgement are distinct scopes. Verify actual DOM
dimensions and native image bytes. Expose startup errors and inspect console,
responses, exit codes and state. Do not count provided checks as browser CI.

Review an evaluator for false PASS: wrong dimensions, non-visible wrapper,
incomplete workload, uncounted disconnect, dropped slow reader, stale code,
mismatched candidate or modified criterion. Freeze runtime during sustained runs.
Classify PASS, FAIL, NOT RUN, infrastructure failure and ABORTED separately.

Repeat checks after a relevant change or unresolved finding. Stop a lane when its
acceptance is demonstrated and material findings resolved. Do not manufacture
rounds or whole-suite reruns for a larger count.

## 7. Coordination, history and context

Use available roles; research/exploration/review stay read-only. Give workers
bounded goals, explicit non-overlapping file ownership and shared-workspace
warnings. Freeze interfaces before parallel mutations. The parent owns integration.

Track READY/RUNNING/HELD/ABORTED/COMPLETE explicitly for long jobs. A hold has a reason,
owner, next action and release signal; do independent work while waiting and do not
leave a ready worker silently waiting. Check time/current state at task boundaries.

Keep concise handoffs with objective, phase/subsection, decisions, changed files,
actual checks, review gaps, active sessions, freezes and next action. Logical local
commits make milestones reviewable; preserve secret hooks and unrelated work.
No fixed context percentage or unconditional endless loop is installed.

## 8. A3 evidence, course understanding and development

For every subsection: requirement -> observed source/runtime -> alternatives ->
method/criterion -> result -> finding/decision -> revision -> affected recheck ->
actual commit -> residual gap. Use the [checkpoint template](CHECKPOINT-TEMPLATE.md).

Keep public README, harness and spec consistent. PROCESS/reflection preparation
uses real observations and the student's stated aims, never invented experiences.
Map lecture ideas to concrete implementation and explain traces; no agent output
proves the student understands them. Keep future content/version migrations and
fixed Fly256MB/one-volume constraints visible.

Existing A3 comparisons/reviews are recorded in planning/COMPARISON-AND-REVIEW,
POSITIONING-COMPARISON and implementation/REVIEW-LOG. Current detailed revisit is
retrospective where implementation already exists. Never rewrite earlier history
as if the new checkpoint rules had preceded those changes.

## 9. Evaluate this revised harness

The guidance change is owner-authorised policy, not a measured performance win.
Review the active report/routing and calibrate checkpoint records with good/bad
examples. A new matched A3 agent trial may be run for a specific unresolved harness
question; it needs its own protocol, immutable fixtures and outside evaluator.
Do not imply it happened from a document review or application test.

Current gaps, execution and corrections belong in implementation/HARNESS-AUDIT and
revisit/REGISTER. New tasks must continue the subsection loop and update those
records instead of treating this report as a one-time planning artifact.

Harness adaptation review and qualitative good/bad scenario checks:
[REVIEW-AND-CALIBRATION](REVIEW-AND-CALIBRATION.md). These do not measure agent
performance. Detailed subsection audits are separate ongoing work.

## Active owner redesign extension

The 7 October hands-on feedback rejected the prior UX. R0–R4 now covers game title/
HUD/options, spatial proportions/tracking and a full standalone whiteboard with
movable chat. Apply the same detailed loop to each new subsection in REDESIGN-PLAN.
Do not treat the 195-test baseline or model agreement as new design acceptance.
Record a current-source comparison, failure-path test, actual browser observation
and review/refinement where each informs the decision. If fresh-agent spawning
hits host thread limits, record that outcome and label contextual review; perform
fresh implementation review when a slot becomes available rather than pretending
context-retaining review was fresh. Stop resolved lanes and preserve their records.

## Observed release-record reconciliation

At release closeout, reconcile the active PLAN, current handoff, subsection
register and release status against actual run/artifact identities. A stale
pending row was found after the verified release here. Update its current state
and link scoped evidence; explicitly label older local validation checkpoints
as superseded for release status. Preserve failed results and historical
observations rather than rewriting their chronology. This is a documentation
consistency check, not another application test or performance experiment.

## Observed Windows/WSL reviewer routing correction

Fresh-context packets must include the exact distribution/user/repository and a
literal --cd command prefix, plus source identities. Several readers initially
selected historicalA2paths from memory when given relative files; root corrected
them and verified currentA3hashes. Currenttask paths override memory examples.
Confirm the actual checkout before using its AGENTS, source or prior findings.
This is a factual routing correction, not a measured agent-performance win.
