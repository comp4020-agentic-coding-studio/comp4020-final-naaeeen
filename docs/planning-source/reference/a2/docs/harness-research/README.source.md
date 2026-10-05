# A2 harness research and evaluation

Completed 2026-09-27. The reviewed final v3 is installed as the repository's
CLAUDE.md. Start with [REPORT.md](REPORT.md) for sources, decisions, outcomes
and limits; [results-summary.json](results-summary.json) records measured runs.

Evidence includes the original baseline, three candidate revisions, independent
content/method reviews, masked-output reviews, the frozen fixture/grader protocol,
and two transparent control amendments. Eighteen scored native Codex runs passed
mechanical artifact checks. Semantic review found a missed edge case in one
baseline-generated test; mechanical pass is not a universal correctness claim.

Raw trial logs and environment bookkeeping remain local and are ignored by Git.
The evaluator imports source HEAD 148cd779e18c365957c343f7e54f4e3671951896 into
fresh temporary fixtures; it must not be run against the working source tree.
No course content or PROCESS.md was authored as part of this research.
