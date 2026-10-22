# Picture phone six: bounded refinement

The first matched production-wrapper preflight passed portrait and desktop. Its
landscape image showed the count/self status squeezed into a narrow vertical
strip. All 24 cells, 12 tray pieces and pager targets passed the landscape bounds,
44px and target-hit checks; the separate board-container corner diagnostic is
owned by the parent/native lane. This refinement makes no new browser fit claim.

Candidate and first-preflight bytes were copied before edits into
.local/picture-phone-six-refinement-before/; hashes are retained in
picture-phone-six-refinement-preimages.json. Earlier failed six-browser and
first-candidate records remain unchanged.

## Decision and changes

The common task remains inspecting a 24-piece picture with six long player
names, reaching the full board, 12-piece tray and paging, and leaving deliberately.
Wrapping the existing status and toolbar as readable units preserves the
candidate's control layout and 44px targets. A new outer side rail would change
more of the wrapper; shrinking status text or targets would compromise the task.
The bounded wrap is chosen for the next matched preflight, without a fit claim
from source alone.

The focused primary Start now hands focus to an exposed enabled action when a
fresh round moves Start into closed Players & options. An available Join receives
focus; otherwise the summary does. This never activates Join. Ordinary disclosure
updates and Escape behavior remain covered.

A sending or uncertain Join exposes one primary **Cancel joining** action and a
visible **Join pending** cue, while keeping watching status until the authoritative
roster arrives. Original Retry stays in labelled options and calls the existing
retry callback. Keyboard focus moves from hidden Join to Cancel and returns to
Join on a definitive rejection. Durable drafts show **Save pending**, retain Leave
and labelled inspection/Return, and block further placement. No automatic retry,
new command, or participation inference was added.

## Verification and remaining boundary

- picture-phone-six-refinement-red.txt: six failing regressions on the archived
  candidate before production changes.
- picture-phone-six-refinement-pending-focus-red.txt: one additional regression
  exposing keyboard focus left on hidden Join during sending.
- picture-phone-six-refinement-green.txt: **47/47** focused component tests pass.
  Scoped UI coverage: **94.31% statements, 89.50% branches, 85.71% functions,
  98.82% lines**.
- picture-phone-six-refinement-typecheck.txt: project typecheck passes.
- node --check public/house-puzzle-ui.js and scoped git diff --check pass.
- Final diff inspected against the archived candidate and current Git base.
  Only the owned component, picture-specific CSS and focused spec were changed.

Production source is frozen for fresh contextual review and matched preflight 2.
No browser, service, native suite, load test, full suite or commit was run by this
lane. Recovery-state reachability and focus will be measured in that preflight;
the full puzzle is not claimed to fit during a blocked recovery state.
