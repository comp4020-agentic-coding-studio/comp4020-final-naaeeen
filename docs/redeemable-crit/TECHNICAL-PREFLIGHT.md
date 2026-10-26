# Redeemable Crit technical preflight

26 October 2026. Local candidate `crit12-redeemable`, base `07d66fbdf46c838327dc2ac83f624333956efe6e`. **Fresh local technical preflight PASS.** This is a reviewable local proposal. No publication, commit, push, deployment, provider or credential operation is included.

## Scope and acceptance

The candidate keeps the accepted runtime, native tests, configuration and locked dependencies unchanged. The documentation update is checked with the original `pnpm check`, `pnpm check:evidence`, a fresh selected native owner-reference journey, and live `/readme/` integration after the documentation freeze. Acceptance requires recorded exits, source stability and actual screenshot inspection; human usefulness and physical-phone trials remain separate.

## Prepared environment

- Windows-to-WSL bridge: Ubuntu, Linux user `lizhi`; pinned Node `v24.21.0`, pnpm `11.9.0` through `/home/lizhi/.local/bin/mise exec`.
- Candidate directory: `/home/lizhi/comp4020/comp4020-final-naaeeen/.local/crit12-redeemable`. Shared Linux `node_modules` is a symlink to the canonical install; manifest/lock and runtime/test/config files match the base.
- Fresh synthetic SQLite data only: `.local/crit12-verify/data`; no real accounts, microphone input or external provider.
- Local port `4112` was free before launch. Retained foreground exec session `86366`, Node PID `1156`, source/launch/process readback recorded in `.local/crit12-verify/launch.json` and `runtime-source.json`. Health HTTP `200`. Existing ports `4093` and `4109` were not controlled.

## Current checks

| Requirement | Evidence | Status |
| --- | --- | --- |
| Original board build | `.local/crit12-verify/build.log` | PASS, Excalidraw 0.18.1 |
| Frozen resource registration | `.local/crit12-verify/resource-inspect.json`, `resource-readonly-binding.json` | READY; 53-file manifest `887b139a` matches current bytes |
| Full required `pnpm check` | `.local/crit12-verify/check.log`, `check-execution.json`, `final-verification.json` | PASS exit 0: board build, TypeScript, 73 files / 1,575 tests; command 72.85s, test phase 65.10s |
| `pnpm check:evidence` | `.local/crit12-verify/evidence.log`, `evidence-execution.json` | PASS exit 0; 10 PROCESS commit references resolve; historical reflection-name warning below |
| Native owner reference / saved crop / phone visitor / room return / access revocation | Existing `tests/e2e/spatial-places.spec.ts`, first case; `.local/crit12-verify/native-result.json`, `native-execution.json` | PASS 1/1 in 50.7s; actual 1920x1080 and 390x844, original 60s test bound, zero retries |
| Served README equals frozen source | `.local/crit12-verify/readme-integration.json`, `served-readme.html` | PASS HTTP 200; full rendered text equals final source, all three headings and links verified |

The initial ordinary pnpm build invocation triggered pnpm 11.9's linked-install dependency freshness action, which aborted at its non-TTY purge confirmation. The successful retry sets process-only `pnpm_config_verify_deps_before_run=false` to run the existing script against the already verified locked Linux dependencies. No package installation completed, and no repository config or global setting was changed. The aborted attempt is retained as a tool outcome; successful build output is in the log above.

The registered baseline/mixed resource source and protocol bindings are inspected without mutation. Historical 300-second results remain historical; no new load run or hosting qualification is claimed. The resource gate and original workload conditions are unchanged. Full CI/container/Fly verification and independent release approval are outside this local technical lane.

## Fresh run observations

The complete original check ran with process-only `VITEST_MAX_WORKERS=2`. A scoped disposable-file fsync probe on the candidate filesystem measured mean 1.57 ms and maximum 2.42 ms across 12 writes; no tmpfs or `TMPDIR` override was used. The live 4112 data stayed on disk. The first full command, which exposed the README-link regression below, took 77.16 seconds. All 198 bound runtime, build and test source files, and all three frozen draft documents, remained unchanged throughout that run.

The single failing assertion is `spec/house-http.test.ts:102`: the rewritten README removed pre-existing links to `docs/implementation/REDESIGN-VALIDATION.md`, `PLAN.md` and `/board/`. This is a real documentation-integration failure. The failed log is preserved and no tests or production code were changed to conceal it. The documentation writer restored useful, accurately labelled links. The original full `pnpm check` then passed on the frozen refined documents; the first failed outcome remains preserved in `first-check.log` and `first-check-execution.json`.

The native test used the repository's existing Chromium launch and unmodified test/configuration. It checks a real browser-encoded image, native file upload/export, saved crop, owner return, phone-local zoom, actual AudioContext start/stop, door revocation, revoked image URL and HTTP access, private chat scope and reload identity. It retained three original PNGs under `.local/crit12-verify/native-results/spatial-places-room-refere-c5f87--and-sound-when-access-ends/`: `room-studio-desktop.png`, `room-reference-world-after-close.png`, `room-visit-phone.png`. Worker inspected the phone frame at original resolution. The parent separately viewed all three original PNGs and confirmed clear owner controls/world reference plus the phone visitor controls and Close framing; that approval is appended separately in `native-post-source.json`. Post-run source hashes are stable, the native launcher exited, no Chromium process remained with the candidate cwd, and the retained synthetic-data service remained healthy. No physical-device, human preference or usefulness result is inferred.

The unchanged historical evidence checker warns that `reflections/redeemable-crit.md` is not one of its old Crit 8/9/10 filenames. Its exit 0 establishes the checked PROCESS commit references and existing historical files; it does not validate the new redeemable reflection's course-specific naming or submission eligibility. That boundary needs the parent's current course-source check.

## Final source and served-document reconciliation

The final full check and evidence check ran after the writer froze the refined documents. Final document SHA-256 values and the 198 bound runtime/build/test file hashes stayed unchanged before and after that full check. `final-verification.json` links the actual exits and source records. The selected native journey ran on the preceding prose draft; its 198 bound runtime/build/test files are byte-identical to the final candidate. It is therefore retained as current runtime evidence without repeating that unaffected feature journey. Final `/readme/` was checked against the refined source separately: HTTP 200, full rendered text equality (3,567 normalized characters), all three headings, direct `/board/`, current plan and accurately labelled earlier validation links.

No production source, test, configuration, dependency, existing user database or other preview was changed in this lane. Local service 4112 stays available with synthetic data for review. CI/container/hosting, publication and actual classroom/physical-device acceptance remain separate; the parent owns those decisions. No new coverage run is warranted for this documentation-only candidate.
