# Essential and extended CI coverage

26 October 2026. The owner requests necessary default CI checks without rerunning
all long browser journeys and load trials on every push. No test code is removed.
This changes orchestration; it does not establish that previously failing cases
now pass or repair application behaviour.

## Common task and comparison

The task is to retain fast unit/service/build/type/evidence/security checks and a
small native browser release gate, preserve all extended cases for explicit runs,
and reject stale resource evidence rather than silently skipping its checks.
Acceptance requires exact discovery coverage, explicit opt-in, secure bounded
execution, source-bound evidence and failure propagation to deployment.

| Alternative | Evidence and decision |
| --- | --- |
| All journeys and load on every push | Rejected for default use by the owner. Run `40251378246` exhausted the shared 300-second suite budget: nine passed, one failed and three did not run. |
| Essential default; explicit extended run | Selected. Six essential browser cases supplement the unchanged full `pnpm check`; the full browser inventory and registered workload remain available through manual dispatch. |
| Drop cases or raise deadlines | Rejected. No case code, timeout, worker count or retry bound is changed here. |

Run40253618276 subsequently passed all six B cases, including the repaired
break/voice journey. Its A group passed six cases and timed out during solo
picture completion at17of24 pieces. That extended result remains unresolved;
changing default selection does not turn it into a pass. Full thirteen-case
success is not claimed.

## Coverage and execution

| Mode/group | Maintained files | Discovery snapshot |
| --- | --- | --- |
| Default `core` | `ci-core.spec.ts`, `board.spec.ts`, `board-receipt-recovery.spec.ts`, `title-dialog.spec.ts` | 6 cases |
| Extended A | `ci-core.spec.ts`, `first-night.spec.ts`, `picture-table.spec.ts` | 7 cases |
| Extended B | `board.spec.ts`, `board-receipt-recovery.spec.ts`, `break-and-voice.spec.ts`, `title-dialog.spec.ts` | 6 cases |

Pushes, pull requests and ordinary manual dispatch run `core`. The boolean manual
dispatch input `extended_checks` defaults to false. Selecting true replaces core
with sequential A/B and enables the registered 300-second load workload. The
unchanged `pnpm check` still covers the provided checks, board build, typecheck
and full fast unit/service suite. Process-evidence and both secret scans remain.

The resource-evidence checker runs as a required fast gate in both modes. On
extended runs, the actual workload executes first, so its newly generated result
is checked rather than blocking regeneration on an older result. Default runs
check retained source-bound evidence directly. A missing, stale, failed or invalid
required result must fail the gate; it must never become a successful skip.

The seven-file maintained inventory is separate from the group map. Assertions
require unique entries and disjoint, complete A/B file membership. Actual
Playwright `--list --reporter=json` discovery runs for the full inventory and all
three groups. The full identities (spec ID, source location, title and project)
must equal the disjoint A/B union; core identities must be a subset of that full
discovery. Every listed file must discover cases. Counts are descriptive snapshots,
not substitutes for identity checks.

Only enum values `core`, `A` and `B` are accepted. Each derives separate paths:

| Artifact | Path |
| --- | --- |
| Test results | `.local/browser-results/<group>/run` |
| HTML report | `.local/browser-report/<group>/html` |
| Host inspection, discovery and container sandbox evidence | `.local/browser-environment/<group>/` |

Host inspection validates the container's group/output environment. The container
preflight validates the resolved Playwright output paths. Existing upload roots
include all groups. Original non-root identity, pinned browser/Node versions,
seccomp hashes/profile, AppArmor, private IPC, memory size, capability restrictions,
renderer discovery, namespaces and additional seccomp assertions remain mandatory.

Each selected browser group retains its five-minute workflow step, 300-second
suite limit, 60-second test limit, one worker and zero retries. In extended mode,
B follows A after success or failure unless cancelled; skipped A does not trigger
B. Neither failure is masked. The actual load step requires both groups to pass.
The check job remains twenty minutes, load step eight minutes, and deployment
requires the successful check job. App startup, secure cookies, service/quality
flags and deployment configuration remain unchanged.

Approximate extended planning estimates of A=210 seconds, B=195 seconds and
146 seconds observed setup, plus the eight-minute load step, fit the twenty-minute
job only under those assumptions. They are not measured group durations or a
worst-case guarantee; the two five-minute browser caps and eight-minute load cap
alone total eighteen minutes. The outer job cutoff remains authoritative.

## Verification boundaries

Browser-free checks use the installed mise-managed Linux toolchain through the
Windows-to-Ubuntu bridge: Bash/Node syntax, actual full/core/A/B JSON discovery,
YAML/input/selection/gate assertions, invalid enum/argument controls, existing
renderer PID fixtures and final diff whitespace checking. Inspectable local
records are `ci-group-check.py`, `ci-group-check.json` and
`ci-group-discovery.json` under `.local/crit12-verify/`.

Both current resource protocols retain their 53 source bindings and manifest
`887b139aaeb7311c4416743affbf6f15c8d70e4790d872ba74b50a38a6cc4338`.
CI harness files are outside those manifests. This orchestration change does not
edit registered resource sources, instruments or protocols.

This record does not claim a completed browser group, new load trial, fresh CI
success, deployed-site verification or human acceptance. Independent source
review and the actual selected-mode CI result remain release gates.
