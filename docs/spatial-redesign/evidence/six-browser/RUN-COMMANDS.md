# Current browser commands

Run from Ubuntu/lizhi at /home/lizhi/comp4020/comp4020-final-naaeeen.
No command below changes the existing60-second default or300-second CI global
budget, introduces a retry, or starts/stops a service. max-failures=1 stops at a
first failure; it does not exempt a missing result from acceptance.

Maintained13 cases, exactly the seven files selected by tools/ci-browser.sh:

```sh
APP_URL=http://127.0.0.1:4108 CI=true PW_OUTPUT_DIR=.local/spatial-maintained-ui-freeze-1/results PW_REPORT_DIR=.local/spatial-maintained-ui-freeze-1/report mise exec -- pnpm exec playwright test tests/e2e/ci-core.spec.ts tests/e2e/first-night.spec.ts tests/e2e/board.spec.ts tests/e2e/title-dialog.spec.ts tests/e2e/break-and-voice.spec.ts tests/e2e/picture-table.spec.ts tests/e2e/board-receipt-recovery.spec.ts --max-failures=1
```

Current four place cases:

```sh
APP_URL=http://127.0.0.1:4108 CI=true PW_OUTPUT_DIR=.local/spatial-native-ui-freeze-1/results PW_REPORT_DIR=.local/spatial-native-ui-freeze-1/report mise exec -- pnpm exec playwright test tests/e2e/spatial-places.spec.ts --max-failures=1
```

Both commands were executed once under root's explicit GO after the UI/source
freeze:4/4 and13/13 passed, each in2.7minutes, followed by source/launch and closed
browser checks. These directories contain those actual attempts; a future
authorized attempt needs a fresh output label. Their metadata and approved PNG
copies are described in ../native-current-verification.md.

Six-browser inspection/calibration remains separate and does not launch a browser:

```sh
mise exec -- node docs/spatial-redesign/evidence/six-browser/runner.mjs --inspect
```

Do not invoke --run until root gives the separate six-browser GO with exact
current protocol/runner/source hashes after its intervening checks. The fixed
prospective native task bound is240seconds. The prior four/13 passes do not
substitute for that new attempt.
