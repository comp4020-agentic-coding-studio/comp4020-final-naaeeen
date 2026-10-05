# Independent review 2: evaluation controls

The independent reviewer accepted explicit equal loading of AGENTS/CLAUDE as a
control for text effects; default loading must be tested and reported separately.
The trace read heuristic is not proof that a whole file was read or obeyed.

Three pre-trial issues were identified:

1. Grading must not fix the number or names of tests. Legitimate repairs can add
   tests; positive and negative contract mutations are the outcome criteria.
2. Configuration and candidates must match the round's frozen hashes before and
   after every trial, not merely remain constant within each individual trial.
   Grading should use an integrity-checked external manifest.
3. Deleting or corrupting an allowed task file is a task failure, not grader
   infrastructure failure. Timeouts must not hide independently confirmed damage.

The fixture/grader owner corrected item 1 and item 3 and added targeted controls.
The parent corrected item 2 and preserves both run_status and artifact grading.
Calibration failures are part of grader development, not A/B model outcomes.
No scored trial had run before these corrections.

Native tool smoke: Codex read README under the normal sandbox and returned the
requested sentence (exit 0, 11.46 seconds). A separate mise lookup inside the
fixture returned pnpm 11.9.0 without adding any trust entry. These are environment
checks, not evidence of candidate superiority.
