# Crit 9 research verification

Runtime baseline: dea0b7a2f352cc93fd2d9c88d0287607a9d8d304.
Ubuntu WSL via Windows-to-WSL bridge; all project evidence is in WSL.

## Completed at report draft

- Current official C9/final-project/rubric read; obsolete C9 title excluded.
- Actual README/CLAUDE/store/client/UI/tests and referenced history inspected.
- Two fresh candidate reviews, matched packet and reversed order.
- Frozen policy comparison: 43 records, zero expectation mismatches, exit 0.
- Fresh evaluator audit: hashes/deltas/results checked; no actionable defect or rerun.
- Current unit checks: house-store 22, board-store/client 57; exit 0.
- Whitelisted source-derived comparison artifacts preserved.
- Limited boolean credential-marker check, not a guarantee against all secrets;
  raw inspection output and secret overrides excluded.

## Current browser check

Existing tests/e2e/house.spec.ts:271, “two authors save independent cards, retain
drafts, and retrieve active next steps”, passed: one test, test exit 0, owned
loopback server exit 0 and stopped. Current source, fresh private data, sandboxed
Chromium1243, actual 1920×1080 and emulated 390×844 screenshots.

The test showed both cards, live authored nextStep delivery, preserved peer draft,
active Question open state after save, and both own steps after page reload.
It does not measure one-second latency, verify HTTP peer-close denial, server
restart, physical phone, deployment or human usability.

First invocation matched no tests due anchored title grep: infrastructure failure,
browser NOT RUN, preserved. A corrected unanchored direct installed-Node
Playwright invocation passed. The failed pnpm exec also ran its existing prepare
hook automatically; no source change observed, no unowned config reverted.
Future focused runs should use the installed CLI when dependency preparation is
outside the trial's scope.

[Full result](evidence/browser-result.json),
[first attempt](evidence/browser-first-attempt.json).
Native captures are visual artifacts, not subjective evaluation:
[desktop](evidence/house-desktop-board.png), [emulated phone](evidence/house-phone-board.png).

## Final review and refinement

A further reviewer started without previous chat history or earlier verdicts and
checked actual source, the recorded comparison, maintained browser assertions and
the proposed argument. It found no new card-authority defect. It confirmed the
README recovery overclaim and the legitimate cost of agreed delegation.

Parent verified the recovery branch again, corrected only that factual README
statement, and explicitly added the stronger all-shared alternative with truthful
editor attribution. This is a refinement of the written argument, not new runtime
behavior. Author control/visibility, closure/learning and convergence/agreement
remain separate. Contextual recheck after this correction is distinct from a
new fresh trial.

Reproduction preparation ran and matched every original frozen hash; no evaluator
change required a rerun. JSON/native Python syntax, local Markdown links and
Git commit citations passed. Native course check:evidence passed on crit-8 and
four PROCESS links; it does NOT establish C9 readiness.

The immutable evaluator originally has a final blank line. Full staged diff-check
reported this one formatting warning; original bytes were retained to preserve
its preregistered hash. No other whitespace finding was accepted or hidden.
Final targeted contextual recheck found the factual correction resolved and no
remaining material wording contradiction. Reviewer did not rerun tests.
[Review record](evidence/final-review.json). Main report links/cited commits/JSON/
Python syntax validated again after refinement; changed documentation diff-check
passed. Runtime source hashes still match the tested baseline.

Two focused local commits preserve method/evidence followed by reviewed reasoning
and correction. No remote push or CI/Fly release was initiated by this research task.

## Student/submission follow-up

- reflections/crit-9.md is not written by this research task.
- Student rewrites PROCESS and integrates the argument/sources into their own README.
- README recovery wording was corrected; the student's wider argument/source
  integration and personal account are still their own work.
- No current Fly release or WAN/sub-second check asserted here.
- Generic check:evidence may pass on crit-8; it does not prove C9 reflection readiness.

## Observed credential-handling correction

A subagent mistakenly read a local runtime credential override, exposing a Fly
token in private tool output. Further override inspection/provider calls stopped; raw output
was excluded from public artifacts. No rotation/provider action followed.

The harness routes version checks to public tracked config and explicit installed
tool commands. Never read mise.local.toml/.env/secret overrides for versions.
Credential rotation is an owner/issuer action needing scoped authorization,
not a hidden research operation.
