# Scope-control amendment before r1b

The first D1 task prompt did not restrict implementation to a single existing
file, but its grader did. The baseline pilot added relevant spec helpers/tests
and updated PLAN, as the inherited harness permits for cross-file work. Calling
that unauthorized was an evaluator mistake, not an established agent defect.

Independent review agreed to allow a relevant PLAN update and new direct
spec/*.ts helpers/tests for D1, while preserving all other existing spec files,
course content, platform and user work. File count is not a correctness metric;
whether a helper is justified belongs in the masked qualitative review.

The original pilot manifest and grade remain unchanged. A separate updated
manifest was used to calibrate the corrected grader against that artifact:
production build/typecheck passed, both valid-link variants passed 25 tests, and
all five invalid-input contract mutations were rejected. This is mechanical
calibration, not a scored comparative win or a completed semantic review.

The complete r1b round starts only after the corrected protocol and grader are
frozen. Other tasks with explicit narrow edit/read-only scopes retain them.
