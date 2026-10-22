# Completion and activated-Start refinement

The prior 519f4537 UI / e2ce3918 CSS candidate is preserved byte-for-byte under
.local/picture-phone-six-activation-before/, with the original spec and hashes in
picture-phone-six-activation-preimages.json. CSS and layout are unchanged in this
repair.

The same-round completion regression now distinguishes inferred local Join history
from an actual uncertain participation request. Completion clears the former's
pending cue and menu alert; a real pendingDirect request retains original Retry.

The activation tests actually call the Start button's handler with a deferred send,
assert the puzzle.start request, and cover both snapshot-before-ACK and
ACK-before-snapshot ordering. Before disabling Start, the component captures its
current context/round and focuses the existing exposed Players & options summary.
The new round hands focus to an exposed action only while that same waiting focus
is still owned. Focus changes, pointer/click/key choices, opening options,
Chat/Reference, Leave, control/context changes and definitive Start rejection
cancel the intent. Listeners are removed on disposal. No control is activated by
the handoff and Join remains a separate deliberate action.

## Evidence

- picture-phone-six-activation-red.txt: **5 failures** and 5 passing negative/control
  cases on the preserved candidate.
- picture-phone-six-activation-first-green.txt and activation-green.txt:
  **57/57 component tests PASS**, including all 47 earlier cases.
- Scoped UI coverage: **94.97% statements, 91.32% branches, 89.70% functions,
  98.88% lines**.
- picture-phone-six-activation-typecheck.txt: project typecheck PASS.
- Node syntax and scoped git diff checks PASS. Final source diff against the
  preserved candidate is retained as picture-phone-six-activation.diff and was
  inspected.

The unit activation invokes the real component handler in JSDOM; it does not claim
native Enter/default-action behavior. The parent-owned preflight still needs to
press Enter, observe the request and project the new round. No browser, service,
native suite, load test, full suite or commit was run by this lane.

Production source is frozen again for final contextual review and native preflight.
