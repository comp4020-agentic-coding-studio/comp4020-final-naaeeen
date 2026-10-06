# House browser acceptance

**Final combined result: PASS — 4 tests passed, 0 failed, 0 skipped, 0 retries, approximately 1.8 minutes.**

7 October 2026, Australia/Sydney. The tested local working-tree candidate was
based on `a7f596adeccd359141b2924479e324e903f2c971`; implementation changes were
present during verification. This is local browser evidence, not a release record.

## Environment and reproduction

Windows Codex used the explicit Ubuntu WSL bridge with Linux user `lizhi` and
repository `/home/lizhi/comp4020/comp4020-final-naaeeen`. Verified runtime versions:
Node 24.21.0, pnpm 11.9.0, Playwright 1.63.0 and Chrome for Testing 151.0.7922.34.
The browser used SwiftShader software rendering and the isolated localhost server
at port 4093. Run from the repository in its existing Linux login environment:

```sh
APP_URL=http://127.0.0.1:4093 \
PW_EXECUTABLE=/home/lizhi/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome \
HOUSE_EVIDENCE_DIR=docs/implementation/screenshots \
mise exec -- pnpm exec playwright test tests/e2e/house.spec.ts
```

`HOUSE_EVIDENCE_DIR` is optional: ordinary runs write browser output under the
ignored `.local/browser-results/`; the explicit evidence run also saves the PNGs
linked below. The suite uses one worker and disables retries, traces and videos.

## Verified journeys

| Maintained journey | Actual browser result | Final duration |
| --- | --- | --- |
| Independent residents meet, converse and return | Actual lobby create/join; chosen Quiet/Can chat; native keyboard movement witnessed through the peer's visible rendered avatar and roster; typing isolation; plain-text chat; same identity, code and messages return in a new context | PASS, 21.0 s |
| Native touch and resize | Real held Chromium touch on the Dpad; peer rendered motion; typing isolation; five controls at least 44×44 CSS pixels; actual 390×844 and 1920×1080 DOM viewports and resize without horizontal overflow | PASS, 16.4 s |
| Independent study cards | Two real authors save through the board UI; both cards update live; an unrelated author's update preserves the peer's draft; next steps and explicit help choice return after reload; the question remains open after saving a next step | PASS, 17.4 s |
| Seat, owned room and permitted visit | Native E sit/stand with peer animation; actual walking to the door; palette and exact plant identity/type/placement persist after reload; avatars remain visible through DIY preview/add/rotate/remove/reset; guest keyboard walking and E entry; editing controls hidden for the visitor; closing access returns the visitor to the lounge and clears the owner avatar there | PASS, 52.9 s |

Each journey creates two isolated browser identities through the real lobby. The
phone context has native touch enabled at 390×844; it is an emulated desktop
Chromium context. All writes use actual UI actions. API reads are limited to
sanitized identity/home metadata when setup fails; no API relocation, room/card
writes, mocked snapshots or injected player state are used as UI evidence.
Browser identity is held only in memory for the saved-return check. No storage
state file, session token or recovery proof is an evidence artifact.

## Observed failures and refinements

Early test defects were corrected against the actual browser: nested select
labels needed combobox role selectors; the fixed-position HUD's boxless wrapper
could not be used as a visibility assertion; native touch cancellation must only
cancel an active gesture. Readiness now waits for the actual command response,
hidden lobby, visible enabled availability control, live connection and canvas.

Real runtime failures prompted separate implementation fixes: the canvas became
focusable for native keyboard input; mobile movement targets grew from 35 pixels
to at least 44; route steps were clamped to prevent waypoint overshoot; DIY scene
rebuilds retained the current real avatars. An independent read-only review also
identified that roster motion alone did not verify rendering, so the suite now
checks visible renderer-written peer coordinates as well as transport state.
The final bounded review also found that a crashed page could interrupt failure
diagnostics before cleanup; per-page diagnostic guards and a finally block now
attempt to close both contexts while retaining the original failure as the cause.
A targeted real-Chromium closed-page probe executed that actual updated catch
block, confirmed both contexts closed and the original cause survived; the final
failure-only refinement also passed the installed TypeScript check.

Earlier runs also had intermittent post-join readiness timeouts after a successful
saved command. The final combined run passed with retries disabled, but this
single pass does not establish a reliability rate or isolate every earlier timing
cause. Sanitized diagnostics now preserve DOM status, page errors, persisted-home
presence and session-cookie presence before failed contexts are closed.

Final measured desktop walks to the owned room took 10.119 and 10.197 seconds;
earlier affected runs took approximately 15.6–19.6 seconds. The final guest's
forward keyboard leg took 2.352 seconds after its separate walk around the table.
These are software-renderer timings. The 30-second route gate is a bounded
technical completion check, not an acceptable physical-device performance target.

## Native screenshots and visual inspection

All eight files were inspected at original resolution and verified from their
PNG signatures/IHDR dimensions: four 1920×1080 and four 390×844. They show the
actual scripted browser state, including authored test text and drafts.

| View | Desktop | Phone |
| --- | --- | --- |
| Shared world | [World, 1920×1080](screenshots/house-desktop-world.png) | [World, 390×844](screenshots/house-phone-world.png) |
| Persistent chat | [Chat, 1920×1080](screenshots/house-desktop-chat.png) | [Chat, 390×844](screenshots/house-phone-chat.png) |
| Current cards and next steps | [Board, 1920×1080](screenshots/house-desktop-board.png) | [Board, 390×844](screenshots/house-phone-board.png) |
| Owned and permitted bedroom | [Saved owned room, 1920×1080](screenshots/house-desktop-owned-room.png) | [Allowed visit, 390×844](screenshots/house-phone-allowed-visit.png) |

The world and HUD fit both captured viewports, and the transcript/cards remain
readable. Avatar nameplates and bubbles can overlap when residents share an
arrival position; this remains a visible presentation limitation. The roster
provides readable identity/status, but it does not establish that this overlap is
comfortable or self-explanatory for people.

## Remaining evidence boundaries

This suite does not cover conflicting revisions on the same card, recovery,
departure/removal/export, denied entry to a closed door, server restart, slow-network
fault recovery or the specified production load/resource shape. Other tests may
cover some domain boundaries; their results must be recorded separately.
Physical-phone rendering/input, real IME composition, uncoached friend use,
next-day voluntary return and the value comparison with configured Discord remain
unverified here. Scripted Chromium success and screenshots do not establish
product demand, enjoyable use, academic benefit or a grade.
