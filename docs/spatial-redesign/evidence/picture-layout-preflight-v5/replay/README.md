# Replaying the V5 component check

This package preserves the exact evaluator, fixture, guards, protocol and binding.
Every old production input is pinned to Git commit
`fbdc853fe48d655bad47383d67f2f802d5b8a957`; current inputs are pinned to
`41ae6536c021d4321b868b0d6c4f36a287c5603b`. The materializer verifies every blob
against the actual V5 hash and restores a fresh isolated workspace under ignored
`.local`, leaving production files and earlier evidence untouched. No ignored
helper or captured input from the original session is required.

From this canonical repository with those Git objects and the recorded locked
dependencies installed:

```sh
mise exec -- node docs/spatial-redesign/evidence/picture-layout-preflight-v5/replay/materialize.mjs --label fresh-label
```

This only writes replay inputs and prints the isolated working directory and an
optional command. It starts no browser, service or network request. The printed
command requires separate authorization; use its isolated working directory and
a fresh label. It uses the same90-second bound, six component contexts, native
negative/restoration, recovery, blocked-send and Start-focus checks.

The recorded runtime is Linux Node24.21.0, pnpm11.9.0 and Playwright1.63.0, using
the installed Chromium1243 executable at
`/home/lizhi/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`, with sandbox
enabled and SwiftShader. A different runtime needs its own reviewed registration;
do not disable the sandbox to replay. Dependencies and the browser binary are
provided by the repository installation, rather than duplicated in evidence.

The isolated historical `result.json` is only the original six-run source-hash
subset needed by the evaluator's baseline verifier, clearly sourced from
`baseline-source-map.json`; it is not a fabricated test result. The global house
controller is captured for provenance but is not booted by the component fixture.
The fixture uses scripted people and callback projections, rather than real
authenticated friends or persistence. Raw bodies, logs and original screenshots
are excluded. This package does not accept a six-user task, physical device,
human preference, accessibility audit or resource budget.
