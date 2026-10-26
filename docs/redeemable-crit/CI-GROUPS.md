# Bounded maintained-browser groups

26 October 2026. This changes CI orchestration, not application behaviour or the
registered resource workload. The release candidate still needs a completed CI
run and deployed-site verification after publication.

## Failure and comparison

Run `40251378246`, head `9c9a4aa`, discovered thirteen maintained browser cases in
one process. Nine passed; the combined break/voice case exceeded its per-case
deadline, and three cases did not run before the shared 300-second suite deadline.
The sanitized run log and timing analysis are retained locally in
`.local/crit12-verify/ci-first-failed.log` and `ci-first-timing.json`. The log does
not prove that the uncompleted product paths work. A separate focused test change
addresses the long combined case; this orchestration change cannot fix it.

The common task is to execute every case discovered from the existing seven-file
maintained inventory, preserving security checks and all existing time bounds.
The compared factor is suite partitioning; tests, workers, retries, service flags
and sandbox requirements remain fixed. Acceptance is exact discovered-identity
coverage, separate diagnostics, bounded sequential execution and failure gates.

| Alternative | Evidence and decision |
| --- | --- |
| Keep one maintained suite | Actual run exhausted its 300-second budget; it left three cases unrun. |
| Two sequential complete groups | Selected: gives each bounded group its own existing suite/step budget, without concurrent browsers or omitting cases. Completion remains to be measured. |
| Increase timeouts or reduce coverage | Rejected by owner constraints; no such change is included. |

Planning estimates are approximately 210 seconds for A and 195 for B, including
case caps under the planning assumptions. Together with roughly 146 seconds of
observed setup and the existing eight-minute resource step, these fit the
20-minute job in that estimate. These are not measured group durations or a
worst-case guarantee: setup, teardown and unrelated steps also consume time, and
the two five-minute browser steps plus eight-minute resource cap alone total
eighteen minutes. The existing 20-minute outer cutoff still applies.

## Inventory, outputs and gates

| Group | Maintained files |
| --- | --- |
| A | `ci-core.spec.ts`, `first-night.spec.ts`, `picture-table.spec.ts` |
| B | `board.spec.ts`, `board-receipt-recovery.spec.ts`, `break-and-voice.spec.ts`, `title-dialog.spec.ts` |

`tools/ci-browser-sandbox.mjs` keeps the original seven-file inventory separate
from the group map. It asserts unique inventory entries and disjoint, complete
file membership. Before each group, actual Playwright `--list --reporter=json`
discovery runs for the full inventory, A and B. The checker compares sorted full
identities, including Playwright spec ID, source location, title and project,
against the disjoint union. It also requires cases from every listed file. This
does not depend on a fixed case count, so splitting a long case remains covered.

Only enum values `A` and `B` are accepted. The enum derives these output paths:

| Artifact | Path |
| --- | --- |
| Test results | `.local/browser-results/<group>/run` |
| HTML report | `.local/browser-report/<group>/html` |
| Host inspection, discovery and container sandbox evidence | `.local/browser-environment/<group>/` |

The host inspector checks the group's container environment and output paths.
The container preflight checks the same resolved Playwright paths. The existing
artifact upload roots include both groups. The original non-root user, pinned
browser/Node versions, seccomp profile/hash, default AppArmor, private IPC,
shared-memory limit, capability restrictions, renderer process discovery,
namespace and additional seccomp assertions remain required.

A and B each retain a five-minute workflow step, a 300-second suite limit,
60-second test limit, one worker and zero retries. B follows A after success or
failure unless cancelled; a skipped A does not trigger B. Neither step masks a
failure. The registered resource step explicitly requires both to succeed;
deployment still requires the successful check job. The job remains twenty
minutes and the resource step remains eight minutes. App startup, production
cookie protection, quality checks and deployment settings are unchanged.

## Local verification and limits

Browser-free verification passed through the Windows-to-Ubuntu bridge using the
installed mise-managed Linux toolchain:

- `bash -n tools/ci-browser.sh` and Node syntax checking.
- Actual full/A/B Playwright JSON discovery with exact identity equality.
- Native YAML parsing and assertions for order, conditions, budgets, retained
  artifact roots and deployment dependency.
- Eight invalid/missing-group controls; all reject before any Docker/browser run.
- Six existing renderer PID controls; these are fixture validation only.
- `git diff --check`.

The initial discovery found A=7 and B=6, full=13. These are a snapshot, not an
acceptance count. Local inspectable records are `ci-group-discovery.json`,
`ci-group-check.py` and `ci-group-check.json` under `.local/crit12-verify/`.

Both current resource protocols still match all 53 bound source files and manifest
`887b139aaeb7311c4416743affbf6f15c8d70e4790d872ba74b50a38a6cc4338`.
The CI harness files are outside those manifests; the registered resource source,
instrument and protocols are not edited by this change.

No local browser group, fresh CI run, performance trial or deployment result is
claimed by these checks. Independent source review and completed CI remain the
release verification gates.
