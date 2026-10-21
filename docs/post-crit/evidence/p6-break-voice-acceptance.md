# Maintained break and voice regression

Source `ff949bc987b36f915f0aac2e3c1e8e9a053d4744` on `post-crit-improvements`.
The maintained case passed against the real isolated loopback service with
independent 1280x800 owner and 390x844 peer contexts. Node 24.21.0/pnpm 11.9.0,
Playwright 1.63.0 and native Chromium 1243 used the unchanged sandbox-enabled
configuration and SwiftShader argument. No test or production repair was needed.

## Requirement, evidence and decision

The task is study -> voluntary shared break -> return to a saved next step, with
an owner-configured external voice destination. A focused native check verifies
visible controls and shared state; no competing implementation is selected here.

`p6-break-voice-native-first.json` records 1 passed, 0 failed, 0 skipped, 0 flaky,
exit 0; test 26.839s/runner 27.568s. It verifies independent admission, owner-only
voice configuration, safe shared link attributes, Watch without joining, explicit
Join/Ready, a shared move, the 42-cell phone board, visible phone controls,
next-step and Quiet preservation, neutral departure text and no page errors.
The 390x844 PNG was inspected at its native dimensions. The acceptance JSON binds
source, test and configuration hashes.

An earlier setup attempt had no 4108 listener and failed navigation with
ERR_CONNECTION_REFUSED before application behavior. Its report and local failure
artifacts remain in `p6-break-voice-first.json` and the separate first-results
directory. The healthy foreground service attempt followed without changing the
test. This is infrastructure recovery. Raw pnpm-prefixed reporter stdout remains
local; both tracked JSON reports retain all extracted reporter fields.

## Maintained integration and checks

The existing explicit CI browser list includes `tests/e2e/break-and-voice.spec.ts`.
Typecheck, `bash -n tools/ci-browser.sh` and `git diff --check` passed. Earlier core
and title cases and resource scenarios retain separate evidence and were not
repeated here. No production file, original 4093 data or resource criterion was
changed. The owned 4108 service received SIGTERM; its listener is absent, and the
runner closed both contexts and its browser.

This is native synthetic local acceptance. Discord was never opened and no media
permission was requested. Provider access, secure-cookie/Docker CI behavior,
physical phones, human preference and deployment remain outside this run.
