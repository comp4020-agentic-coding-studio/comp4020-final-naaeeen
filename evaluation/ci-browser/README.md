# CI browser environment

The browser lane uses the official Playwright v1.63.0 Noble image, the runner's
Node 24.21.0 binary and existing locked project package. The image provides browser
revision 1243 / Chromium 153.0.8010.12 and dependencies, not the project test package.
Ubuntu 24.04 is explicit for both jobs. The app remains localhost:8080 with Secure
cookies; host networking gives this browser access without publishing a new port.
The container uses the actual non-root runner UID/GID, Docker's default AppArmor
and capability set, and private 1 GiB shared memory. Code/Node mounts are read-only;
only browser diagnostics, sanitized environment evidence and private HOME are writable.
The production Fly machine/volume and all existing test/resource budgets are unchanged.

The complete seccomp profile is copied byte-for-byte from
[https://raw.githubusercontent.com/microsoft/playwright/v1.63.0/utils/docker/seccomp_profile.json](https://raw.githubusercontent.com/microsoft/playwright/v1.63.0/utils/docker/seccomp_profile.json). Its SHA256 is `cc3e61cabda6bbc1e53e54d27ba4d55a9d3be829b6dd1a596f4a7b31b1cc7849` (12997 bytes).
It retains default `SCMP_ACT_ERRNO` plus upstream clone/setns/unshare permissions.
Upstream Playwright is copyright Microsoft Corporation and licensed under
Apache 2.0; the upstream LICENSE is retained here. The original profile is retained unchanged.
See [official Docker guidance](https://playwright.dev/docs/docker).

Preflight verifies the actual container configuration and default confinement,
then launches the configured sandboxed browser. It verifies actual renderer
user/PID namespace isolation, NoNewPrivs and additional Seccomp-BPF filters using
Linux `/proc`, rather than assuming the default headless-shell offers full Chromium's
`chrome://sandbox` WebUI. The localhost-only temporary Playwright connection and
process arguments are never printed/saved. Artifacts contain only derived sandbox
checks, versions, runner UID/GID, image ID/digests and the unchanged host restriction.
Preflight PASS is separate from the nine application cases. Both have to succeed.

The previous CI run 37575162606 failed all nine browser launches with NoUsableSandbox
after Docker build and 411 spec checks passed. This is an environment repair, not an
application or acceptance-criterion change. Local Docker execution is unavailable;
syntax, profile integrity, workflow invariants and nine-case collection can be
checked locally. Actual container sandbox/application evidence awaits the approved
CI run; no browser, resource or deployment PASS is inferred from these local checks.

The fresh read-only review identified two create-time metadata blockers: Docker
serializes the seccomp profile as JSON and selects default AppArmor at startup.
Both were repaired; the in-container check still requires actual default AppArmor
enforcement. Shell/Node syntax, YAML, byte/hash equality to the upstream profile,
unchanged workflow-step/deploy/budget invariants and nine-case collection passed.
No local application checks or resource runs were repeated for this CI-only change.

## Node startup compatibility refinement

The original profile has no clone3 rule, so its default denial returns EPERM.
A matched isolated native probe on glibc 2.39 with the existing Node 24.21.0 denied
only clone3: EPERM caused SIGABRT before JavaScript with a uv_thread_create assertion;
ENOSYS returned exit0 and STARTED. Each child set NoNewPrivs, disabled core dumps
and used a minimal non-secret environment. No host setting changed. The result is
in clone3-denial.results.json; clone3-denial.control.py reproduces one control using
`python3 evaluation/ci-browser/clone3-denial.control.py ERRNO NODE_ABSOLUTE_PATH`.
The private raw failure stack remains under .local/browser-environment-review.

The effective `seccomp-playwright-v1.63.0-node24.json` preserves every original
rule and adds exactly `{"names":["clone3"],"action":"SCMP_ACT_ERRNO","errnoRet":38}`.
clone3 stays blocked; ENOSYS permits glibc's existing clone fallback. Its SHA256 is
`aa9c681c7e5eb6c58e89200d10c3c7bc4a608a3f498272ce39dc67937f8a31bd`. The shell verifies both file hashes, and preflight asserts this exact
structural delta and compares Docker's profile content against the effective file.

[glibc primary source](https://raw.githubusercontent.com/bminor/glibc/master/sysdeps/unix/sysv/linux/clone-internal.c)
uses the clone fallback only for ENOSYS.
[Moby's current default profile](https://raw.githubusercontent.com/moby/profiles/main/seccomp/default.json)
also denies clone3 with errno38 when SYS_ADMIN is absent. This local one-rule
compatibility derivation does not add a syscall allowance or a capability.
The control does not establish full-profile or Docker/Chromium execution success.

A new fresh-context read-only review checked the control, both hashes, complete
base-rule preservation, sole denial delta and effective-profile wiring. It found
no actionable defect. The reviewer inspected the sanitized native results rather
than rerunning them; Docker/Chromium/application execution remains pending CI.
