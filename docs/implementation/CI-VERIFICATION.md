# Maintained browser CI and production-cookie verification

7 October 2026. S4.I6h, with the origin/cookie boundary of S4.I6i.
This is a local verification record and a concrete workflow change. No GitHub
Actions run, Docker build, push or Fly deployment is claimed here.

## Requirement and chosen scope

Maintain real browser feedback for the saved house core against the same production
Dockerfile that CI builds for the supplied course checks. Preserve the original
course spec, process-evidence check, both pinned secret scans, private-repository
conditions and deploy job. Keep Fly's fixed shared CPU / 256 MB / one-volume shape.

The former workflow only ran `pnpm check` against its image. Screenshot files and
separately run Playwright tests did not make those interactions CI coverage. The
legacy browser suite also still visited `/`, which now serves the house; its former
window UI remains at `/legacy/`.

Alternatives were an unbounded full-browser run, a mocked smoke check, or a bounded
real core plus the retained legacy suite. The chosen lane uses two independent real
Chromium contexts at 1920x1080 and 390x844, real HTTP/Socket.IO and SQLite, and five
explicit tests. It covers admission, live willingness/movement, literal-text chat,
an author-saved next step, and return with the same identity. The four legacy tests
retain lights, saved return, withdrawal, changed-cookie recovery and an ACK lost
after a real commit. The longer room/DIY/touch/readability suites remain separately
maintained local coverage; this lane does not claim that all browser behavior is CI.

Acceptance rejects missing independent identities, wrong DOM dimensions/overflow,
failed live connection or remote movement, interpreted chat markup, absent saved
return/card fields, and browser page errors. In the CI lane both initial identities
and the returning context must retain `house_session` with Secure, HttpOnly and
SameSite=Lax metadata. Cookie values and storage-state files are never printed or
written by the test. Browser traces may contain disposable test sessions; the
container's throwaway data and sessions disappear when cleanup removes it.

## Concrete workflow

`checks.yml` installs Chromium through the locked Playwright 1.63.0 CLI, builds the
existing production image, and starts it with throwaway tmpfs `/data`. It binds
only `127.0.0.1:8080` and passes `PUBLIC_ORIGIN=http://localhost:8080`, matching the
browser's Origin exactly. NODE_ENV=production and Secure cookies remain enabled.
The browser test explicitly verifies the actual browser cookie metadata; it does
not assume a plain HTTP URL permits a session. This localhost arrangement is a
Chromium loopback rehearsal, not proof for an arbitrary HTTP domain or deployed TLS.

A `/healthz` readiness loop has an outer 60-second wall-clock timeout and each
curl attempt has a one-second connection / two-second total timeout. The browser install and test
steps each have a five-minute limit; Playwright has one worker, no retries, a
five-minute global CI bound, 60-second per-test defaults, ten-second actions/assertions
and 15-second navigation. A retry cannot hide a flaky result. The check job retains
its existing 20-minute overall limit.

The maintained command is:

```sh
APP_URL=http://localhost:8080 EXPECT_SECURE_COOKIES=true \
  pnpm exec playwright test tests/e2e/ci-core.spec.ts tests/e2e/first-night.spec.ts
```

It lists exactly five tests in two files. Do not add `--` between the pnpm script
name and file selectors: the observed `pnpm test:browser -- tests/...` invocation
selected the whole suite instead. The workflow uses the explicit local CLI to
avoid that false boundedness.

HTML reports and failure screenshots/traces are uploaded from only
`.local/browser-report/` and `.local/browser-results/`, with hidden-file inclusion
because the parent directory is hidden, seven-day retention, and a non-cancelled
condition. No databases, local proof exports or broad `.local/` directory are
included. Failure-only app logs are retained and container removal runs with
`always()` after the original evidence/secret steps. A browser failure gates the
existing deploy dependency.

`PW_OUTPUT_DIR` and `PW_REPORT_DIR` allow concurrent local checks to keep their
artifacts separate. `PW_EXECUTABLE` remains an explicit local override; CI does not
set it and therefore uses the browser matching the locked runner.

## Actual local execution and evaluator correction

All commands used the Windows-to-WSL bridge, Ubuntu/lizhi, Linux Node 24.21.0 and
pnpm 11.9.0. Native typecheck passed; `git diff --check` passed. PyYAML parsed the
workflow, all check-job shell scripts passed `bash -n`, and structural checks
confirmed the original spec, evidence, two secret scans and deploy dependency.
These are syntax/contract checks, not execution of GitHub Actions.

Docker is not available through WSL integration: `docker info` returned the Docker
Desktop shim's integration-unavailable message. The actual image build/start and
production entrypoint's mounted `/data` verification are NOT RUN locally. That
entrypoint correctly rejects an ordinary local directory as production `/data`.
No Docker service/integration or system mount was enabled for this task.

For the cookie/origin/browser contract, an ignored isolated native fixture on
`http://localhost:4096` called the real `createService` with `secureCookies:true`,
that exact configured origin, NODE_ENV=production and a fresh local SQLite folder.
This exercises the real service and browser session but deliberately does not
stand in for the Docker entrypoint or tmpfs mount.

The initial default browser attempt was an infrastructure failure because the
Playwright 1.63.0 Chromium 1243 bundle was missing. The existing Chromium 1234 was
then selected explicitly. The legacy route reproduction failed at missing
`#save-window` on `/`; after `/legacy/` correction all four legacy tests passed.
The first new core attempt reached secure independent sessions, live movement and
chat, then falsely rejected the legitimate bold author-name nodes in the transcript.
The evaluator was corrected to inspect only the message span and require its exact
literal `<b>...` text. No application vulnerability was inferred from that mistake.
The affected core passed in 22.1 seconds; those four legacy tests were not repeated
merely to increase a result count.

The matching Chromium 1243 / Chrome for Testing 153.0.8010.12 bundle was installed
through the repository-pinned Playwright CLI. An actual matching-browser page GET
and subsequent browser fetch on localhost returned the same identity, with Secure,
HttpOnly and SameSite=Lax metadata: PASS on Chrome 153.0.8010.12. No cookie value
was printed. The initial five-test renderer/UI replay hold awaited a stable
UI/world checkpoint and the parent's release signal. The parent subsequently
released that hold; the final matching-browser replay is recorded below.
Fresh independent review found the original readiness curl could hang despite an
attempt count. The outer deadline and per-request bounds above are the correction;
the contextual recheck confirmed it resolved with no new actionable issue.
Affected native YAML/shell checks passed. A stalled ephemeral HTTP endpoint made
the exact curl flags exit 28 within two seconds; the same readiness shell with a
shortened three-second outer deadline exited 1 near that deadline. The workflow
retains its 60-second value. This calibrates the timeout mechanism rather than
claiming a Docker failure trial. Final image CI,
Fly TLS, production load, physical phones and human value remain unverified by this
bounded local lane.

## Final frozen native replay

The parent released the final UI/world source checkpoint after the current required
project checks. Port 4096 had no listener at preflight, so no old process was killed.
A fresh ignored SQLite directory and the latest imported server/static allowlist
started through the owned `createService` fixture with NODE_ENV=production,
`secureCookies:true` and `origin:http://localhost:4096`. Port 4097 and the frozen
load backend were untouched.

The exact selected five-test command ran with the matching Chromium revision 1243,
Chrome 153.0.8010.12, Playwright 1.63.0, Node 24.21.0 and pnpm 11.9.0. No executable
override remained after mise; this was checked without printing environment values.
It loaded the current served camera directly, with no baseline-camera route override.
The legacy lost-ACK test still uses its declared real-commit response fault.

```sh
env -u PW_EXECUTABLE CI=true APP_URL=http://localhost:4096 \
  EXPECT_SECURE_COOKIES=true PW_OUTPUT_DIR=.local/ci-browser-final \
  PW_REPORT_DIR=.local/ci-browser-final-report \
  mise exec -- pnpm exec playwright test \
    tests/e2e/ci-core.spec.ts tests/e2e/first-night.spec.ts
```

Result: **5 passed, 0 failed, 0 skipped, 0 retries; exit 0; runner total 1.7 minutes.**
The reported individual durations were 46.9, 30.9, 12.6, 7.5 and 5.3 seconds.
The house flow verified independent Secure-cookie sessions, actual DOM viewports,
live willingness/movement and plain-text conversation, an author-saved next step,
and return with the same identity. Four legacy flows verified their retained
behavior at `/legacy/`. Browser page-error assertions passed. These are bounded
interaction checks, not complete visual, lifecycle, physical-device or human-value
acceptance.

All 38 recorded backend/static/test/config file hashes matched before and after,
including the frozen UI, house-world and camera modules. All eleven entries in the
parent's separate load-source manifest also matched. The sanitized
[final source/result record](CI-BROWSER-FINAL-HASHES.json) retains the complete
before/after hashes, runtime, counts, durations and limitations. The test data,
sessions and raw logs stay ignored. Reports are `.local/ci-browser-final-report/`;
outputs are `.local/ci-browser-final/`. These separate paths avoid clearing another
worker's browser artifacts. The verified owned fixture was then shut down
gracefully, and port 4096 was confirmed released; no other process was targeted.

The independent CI/config review and contextual readiness recheck preceded this
final replay. No application or test repair was needed during it. Actual Docker
image build/start, production entrypoint/mounted `/data`, GitHub Actions, Fly TLS,
resource cgroups/WAN and physical-phone/human verification remain NOT RUN. The
matching native result verifies the real service/browser contract while preserving
those distinct deployment boundaries.

## Sources and recurring method checkpoint

The scoped work reopens the active A3 REPORT's verification/evaluator and fresh-review
sections, current RESEARCH/COMPARISON-AND-REVIEW/EVIDENCE methods and the actual
workflow/test/source contracts. A focused technical check resolves the existing route
and cookie contract; no human A/B or agent-performance win is claimed. Parent
integration owns the detailed register/HARNESS-AUDIT updates and final source freeze.

Current primary documentation checked 7 October 2026:
[Playwright CI setup](https://playwright.dev/docs/ci) supports installed browsers and
a single worker; [recording options](https://playwright.dev/docs/test-use-options#recording-options)
define retained failure traces/screenshots; [upload-artifact v5](https://github.com/actions/upload-artifact/blob/v5/README.md)
defines hidden-file inclusion and retention. Installed CLI behavior, actual test
selection and actual Secure-cookie acceptance were checked in the native runtime.
