# Pure rules checks and handoff

22 October 2026. Base HEAD `1671cec29429ebbb24752521e88c72f51ac456d2` on
`post-crit-improvements`, canonical Ubuntu/lizhi repository. No commit, push,
provider call, app/server/browser change or integration was made in this lane.
The final source/report identities are in `game-rules-manifest.json`.

## Requirement, decision and verification trail

| Subsection | Requirement and material choice | Evidence and refinement |
| --- | --- | --- |
| Waiting/consent | Two voluntary slots; fixed90s initial reservation; Ready at most60s. Use roster-bound Ready rather than requiring both people to race the same table revision. | Join conflict, opposite Ready order, readiness expiry, roster changes, churn and waiting expiry are deterministic cases. Leave binds actor+round so racing Join/Ready/Move cannot block own withdrawal. |
| Public play |42row-major cells with gravity; exact round/table revision and turn; no observer moves. | All four win axes, both winners, legal42move draw, legal row-boundary negative control, full/invalid columns and stale/role errors. |
| Recovery/departure | Preserve original identities; explicit joint Resume; earliest90s recovery and300s accepted-move idle deadline. | Neutral leave/removal/departure, wrong-round leave, disconnect, reverse Resume order, presence-at-commit and repeated restart. A concrete disconnect-consent regression failed before repair. |
| Housekeeping | Explicit cleanup, separately persisted before command; failed action cannot hide cleanup or extend time. | Boundary-time assertions and original-reference rejection assertions. Waiting expiry preserves the last completed result. No per-second state changes. |
| Immutability/size | Pure immutable transitions and one current+latest result, no ledger. | All accepted-action helper inputs are recursively frozen; explicit frozen event/cleanup inputs and projection-copy check.25rounds retain only latest result. Worst allowed escaped IDs yield3716bytes for current+latest42cell boards, below8192. |
| Authority boundary | Trusted member/controller/lounge facts; only current-controller lifecycle events. | Pure supplied-context denials and unrelated-event no-op are tested. Actual authentication, controller generation and observer subscription routing remain mandatory adapter checks. |

## Actual commands and results

Runtime: Windows-to-WSL bridge, Linux Node24.21.0 and pnpm11.9.0 via mise.
The focused command uses `vitest.house.config.ts`, the owned test only and
`--maxWorkers=1`, without browser or coverage work.

- Behavioral RED:41tests,0PASS/41FAIL, command exit1, `game-rules-red.json`.
  A no-op API stub produced intended behavioral assertions, not missing-import
  or syntax failures. Stub SHA256 was
  `dd74a2b8c4055c876c86fff499d869b9fbe12af2fe2aa9e6861c2ac3ae94afc5`.
- Initial GREEN:41/41PASS, exit0, `game-rules-green-initial.json`.
- Recovery regression RED:46/47PASS and1FAIL, exit1,
  `game-rules-recovery-red.json`. Restart -> A Resume -> B current controlling
  disconnect retained A's old consent. Removed persisted disconnect flags;
  every filtered controlling disconnect now invalidates both consents.
- Final focused run:48/48PASS,0pending, exit0, `game-rules-green.json`.
  Command: `/home/lizhi/.local/bin/mise exec -- pnpm exec vitest run --config
  vitest.house.config.ts spec/house-game-rules.test.ts --maxWorkers=1
  --reporter=json --outputFile=docs/post-crit/evidence/game-rules-green.json`.
- Global typecheck initially failed with tsc exit2 in the concurrent camera test
  at `spec/house-world.test.ts:755` (implicit-any parameters). No camera file was
  changed here. Later direct `/home/lizhi/.local/bin/mise exec -- pnpm typecheck`
  passed, exit0, after that other lane's fix.
- A direct WSL exec of bare `mise` failed before Node started because a non-login
  PATH omitted its directory (infrastructure exit1). The explicit Linux executable
  above resolved it. This was not a failed test result.
- Owned whitespace check found extra final blank lines in the two new public
  files. Normalize line endings and one final newline. No semantic changes or
  further green tests followed that formatting step, per parent's freeze request.
  The manifest verifier reconstructs the former bytes, checks their observed
  SHA256s exactly and proves LF normalization equals the final source bytes.
- `game-rules-inspect.mjs` reproduces report/source hashes, normalization attribution
  and the3716byte worst-ID projection; it does not start the app or authenticate.

The final48-test run used module `f1c1f5be55fab0e8c6d2174e1f502cd86a91f2d49e40ab0977a8d3cbe371f890`,
declaration `d4d524b8e458a3bb792c1b805de32b3bc3fc97ea0d802339786afe257c566dcb`
and test `9b73613b07da191ad7cad4d99a9e7cae174f835bf35fb7882525473bae26d33a`.
Their canonical final-LF hashes differ; the manifest's explicit normalization proof
reconciles this attribution. No current-format test run is claimed.

## Integration handoff and limits

Exports: `emptyGameTable`, `advanceGameTime`, `applyGameAction`, `applyGameEvent`,
`projectGame`, dimensions/time constants and `.d.ts` interfaces. The module creates
no UUID, session, actor, authentication result, receipt or persisted row.
`GameTable` has revision, rosterRevision, current round or null, latest result or
null. The current round has the42cells, two identities, turn/last move, explicit
Ready/Resume consent and fixed waiting/recovery/idle timestamps. Pause and consent
are game history; connection truth remains external.

The adapter must strictly validate restored state and canonical command schemas,
guarantee fresh new-round IDs, derive all authority from current session/controller
state, and supply current controlling lounge identities at atomic Start/Resume.
Persist `advanceGameTime` before trying an action/event; rejection returns the
original state with no cleanup. Generic command rollback must not undo expiry.
Use one captured server timestamp for that transaction boundary. Integrate trusted
departure/removal with membership/movement atomically. Filter duplicate/stale
controller callbacks before domain events; raw observers cannot send them.

Keep existing receipt/UUID/pending outbox scope and transaction+ACK rules. An old
accepted command replays its receipt in the store; an unaccepted old-round command
cannot affect a new round. New IDs and Join/Ready consent are integration duties.
The pure module does not establish SQLite restart/commit-ACK behavior, actual
sessions, multiple clients, six-member/four-watcher enforcement, UI/Return-to-work,
keyboard/touch/visible feedback, resource limits or user enjoyment. Coverage was
NOT RUN in this lane at the parent's request while native camera work was active;
no percentage is claimed. This is a reviewed pure P4 foundation, not complete P4.

Parent next: inspect the frozen diff and actual rules, reproduce selected
checks, record the fresh-review boundary and make its separately scoped local
foundation commit. Store/realtime/client/UI integration and its maintained tests
remain parent-owned. Only the assigned module/declaration/test and game-rules
records were changed here; existing camera and other workers' files were preserved.
