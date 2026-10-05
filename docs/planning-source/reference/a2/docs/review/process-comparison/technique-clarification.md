# Research-to-instructions clarification — 28 September 2026

The student asked the opening paragraphs to name where the agent-practice research
was saved, explain which rules were compared and show how selected findings guided
later work. They also rejected an apparently exhaustive three-practice list and
allowed the account to approach 600 words.

The current PROCESS is 594 whitespace-delimited words with Markdown destinations
removed. It names the research folder, defines CLAUDE.md as the agent's working
instructions, explains retained/added/removed directions, and describes the
AGENTS.md reading requirement. The workflow covers controlled instruction-file
comparison, label-hidden review, checking the evaluator, separate file ownership,
same-content design comparison, a representative teaching unit, maintained context
and the later editorial comparisons. It remains one course-specific narrative.

The parent and a separate read-only auditor checked:

- [Protocol](../../harness-research/eval/protocol.json): only root CLAUDE.md content was intentionally varied; source/configuration and pair task conditions were fixed.
- [Report](../../harness-research/REPORT.md): model/effort were held fixed. No reasoning-effort or chain-of-thought A/B is recorded.
- [Runner](../../harness-research/eval/run_trials.py): judging files were outside trials and hash-checked; reasoning text was discarded. Token-usage metadata is not a comparison of reasoning strategies.
- Original versus revised guidance: the baseline requires check plus another build; v3 removes the duplicate cycle and explicitly adds independent review.
- Agent-behaviour tasks cover preserved edits, read-only requests and truthful reporting. The final text says evaluation, since honest-reporting judgements also required semantic review rather than the automatic grader alone.

The course brief and rubric were reopened: the account should explain course
decisions, why a choice was made, how it was checked and which judgements stay with
the student. The source gives 400–600 words as guidance. The English and Chinese
copies are synchronized. Earlier A/B candidates and their results remain unchanged;
this is a subsequent user-directed revision, not a newly claimed experiment.
