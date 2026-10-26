# Redeemable Crit browser-case refinement

26 October 2026. This record covers the test-only break/voice case. CI wrapper
partitioning is a separate lane. Runtime, dependencies, graphics, sandbox, timeout,
worker and retry configuration are unchanged.

## Failed evidence and requirement

Actions run `40251378246`, job `121343836832`, tested candidate `9c9a4aa`.
Build and 1,575 specification tests passed. The maintained browser suite recorded
nine passes, one failed break case and three cases not run before its 300-second
global deadline. The break case independently exceeded its 60-second bound;
`browserContext.close` in `finally` obscured the interrupted assertion in the log.

The downloaded `browser-core` artifact's action trace shows the room-studio wait
started 42.526 seconds after test start. Only 17.474 seconds remained in the case,
although that existing assertion has a 30-second bound. Owner and peer native
chair-arrival waits had consumed 9.495 and 12.034 seconds serially. Voice settings
occupied only about 1.74 seconds. Both failure PNGs were inspected: the owner was
still in the lounge during its return, and the peer showed the round had ended
when a player left. This establishes an interrupted journey, not successful room
arrival or a confirmed application return defect.

All assertions before return passed: two live identities, owner-only external
voice settings, peer destination/new-tab/link isolation, saved authored card,
explicit game consent, shared token, 42 cells and phone geometry. The requirement
remains one complete authored-card -> shared break -> return -> saved-card journey,
with every original assertion and the existing 60s/300s/one-worker/zero-retry limits.

Private diagnostic files are under `.local/crit12-verify/ci-first-artifact/` and
`ci-first-timing.json`. They contain synthetic CI evidence and are not published.

## Alternatives and selected refinement

Splitting the voice task has little timing benefit in this trace. Concurrent
nearest-free-chair routing can race for the same chair, so it was rejected.
The reviewed refinement gives each identity an explicit distinct physical chair:
owner `game-seat-1`, peer `game-seat-2`. Both use the existing native Overview and
projected-target pointer helpers concurrently. There is no forced click, state
injection, teleport or API mutation. Each waits for its actual seated animation
and break chooser. Both then open Places and verify the exact visible occupancy
text before reopening Table choices. Explicit Join and Ready remain separate.

The case now covers deliberate projected chair selection rather than its former
Places -> nearest free game place path. Existing picture-table tests retain that
Places routing coverage. All original Watch, Join, Ready, token, phone-fit,
return/studio, authored-next-step, Quiet, peer-ended and page-error assertions
remain in the same case. Two additional exact chair-assignment assertions prevent
accidental same-chair routing from masquerading as successful concurrency.

## Actual scoped verification

The single revised native run used the retained synthetic-data service on 4112,
Linux Node/pnpm through mise, `CI=true`, fresh browser contexts, the unchanged
Playwright configuration, and trace recording. It passed 1/1 with zero skipped,
unexpected, flaky or global errors. Command elapsed time was 38.147 seconds;
Playwright reported 36.408 seconds. The room-studio assertion passed after 10.134
seconds, followed by all original saved-card, Quiet and ended-round assertions.
The retained 390x844 phone PNG was inspected at original resolution: the complete
board, turn/status, last move and Return control were visible within the viewport.
No Chromium or Playwright process remained after the run; the synthetic service
was retained for the parent.

Evidence: `.local/crit12-verify/distinct-chairs-1/execution.json`, `result.json`,
`results/**/trace.zip` and `shared-break-phone.png`. Tested spec SHA-256:
`71bbb7e9be55a66552b348633115e2ffa8a11d4739dae966fb6952506d0a7e33`.
`git diff --check` passed.

This is a local native-browser functional check, not a controlled performance A/B:
runner environment, native selection path and scheduling differ from the failed
CI execution. It does not establish CI-container success, a reliability rate,
physical-phone acceptance or human usefulness. The original failed CI result is
retained. The parent must obtain independent final review and current CI evidence
before accepting the release.
