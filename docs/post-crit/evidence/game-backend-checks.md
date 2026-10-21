# P4 backend: authority, persistence and lifecycle evidence

22 October 2026. Canonical Ubuntu/lizhi WSL checkout, local
post-crit-improvements at baseline 8b7e425. This lane changed only the store,
realtime authority, shared contract, focused backend specs, GAME-API and these
game-backend records. It made no commit, push, deployment, provider change or
production-data edit. Other workers' files were preserved.

## Conditions and source binding

[Manifest](game-backend-manifest.json) records exact SHA-256 hashes, Node24.21.0,
pnpm11.9.0, result counts and measured coverage. The final binding is before the
parent's full world-version authorization gate; later edits require affected
verification. Earlier JSON checkpoints retain their actual outcomes but have no
separate complete source manifest. They must not be presented as tests of the
final hash. Tests use temporary native SQLite files and real independent Socket.IO
clients through the Windows-to-WSL bridge. They are not native browser clients.

| Requirement | Evidence and decision | Refinement / verification |
| --- | --- | --- |
| Preserve existing data | DB3 adds game_tables and its deadline index after room v2. Existing native v1 fixture preserves custom/empty/archived room bytes, sessions, cards and old receipts. A v2 reopen preserves the prior roster and accepted receipt. | Existing room-migration specs now expect DB3. No live database opened. |
| One current table / latest result | One row per house with explicit ruleset1; public game state exists only in authorized lounge snapshots and is null in bedrooms. | Twelve completed rounds leave one table row; final public projection under4096B. Receipts retain the existing long-lived linear policy; this is not bounded receipt history. |
| Trusted authority | Compare server-derived live lease/session/membership facts against client assertions under the same Join/Ready/Move task. Body actor or control flags are never accepted. | Independent sockets cover watcher, observer, outsider, wrong HTTP token, wrong zone, takeover and stale controller. |
| Atomic commands and receipts | Existing SQLite authority keeps state and receipt together. Injecting a receipt failure must roll back a move. | Native trigger failure leaves cells unchanged; retry succeeds exactly once. Changed-payload UUID fails; an accepted old move returns its original receipt after terminal/new round/restart. |
| Fixed lifecycle deadlines | Compare persisted per-second clocks with event/deadline state under the same expiry requirement. Deadline housekeeping avoids writes while no transition is due. | Inactivity expiry survives rejected command rollback. No-op sweeps leave total_changes unchanged. Restart retains earliest recovery deadline and clears partial resume consent. |
| Voluntary departure | Actor+round Leave avoids revision traps; controlling zone departure and membership departure transition durably. Observers cannot emit those facts. | Real sockets cover observer bedroom subscription, stale-controller disconnect, current lounge departure, waiting release, active pause, explicit two-player resume and membership removal. |
| Server round identity | Fresh review reproduced recycling an old client UUID after a newer round. | Empty Join now requires null and generates a server UUID. Regression fails before fix, passes after it. |
| Session lifecycle | Fresh review reproduced lease pruning before pause on session expiry. | Queue and persist controlling disconnect before removing the lease; actual-socket regression fails before fix, passes after it. |
| Recovered persistence | Contextual review reproduced a stored pause without a new idle-client snapshot after transient SQLite failure. | Queue refresh on a successfully retried lifecycle change; trigger-backed socket regression fails before fix, passes after it. |
| Consistent operation time | Self-review identified maintenance/action clock crossing at an exact deadline. | One captured timestamp flows through maintenance, action/event, membership departure and restart; boundary regression fails before fix, passes after it. |
| Existing budget | Constant SQL call sites69 and hard prepared-plan cap96 remain. No per-second game writes or receipt-history projection. | Source-bound prepared-map assertion and no-op SQLite change-count test pass. Original sustained resource gates unchanged and NOT RUN by this lane. |

The alternatives above are source/design comparisons and controlled technical
failure-path tests. They are not human A/B studies or evidence of enjoyment.

## Runs and observed failures

- Initial valid RED:0/7passed. One earlier Windows UNC file-write attempt failed
  before the test file existed; it supplies no product result.
- Initial native adapter GREEN:7/7.
- First wider integration:53passed/8failed. Five old lounge-arrival assertions
  expected z3.3 after shared geometry changed to z4.65; three actual-client cases
  required worldVersion before it was added to server envelopes. Bedroom arrival
  formula remains unchanged by parent instruction.
- Initial game sockets:11passed/1failed. A global five-minute Date.now jump
  invalidated Socket.IO heartbeat timing. The timer-broadcast case now puts a
  valid already-due position into its isolated SQLite fixture without jumping
  the transport clock. This is not five minutes of real elapsed play.
- First corrected integration:66/66. Coverage run retained separately.
- Review regressions RED:12passed/3failed (round identity, session expiry,
  maintenance/action time); corrected69/69.
- Storage-recovery RED:6passed/1failed; final70/70passed, no pending/skipped tests.
  The fresh contextual reviewer separately ran that one recovery regression,
  with six other socket cases intentionally not selected.

Final measured coverage over src/house-store.ts + src/house-realtime.ts:
91.35% statements,87.36% branches,98.73% functions,97.34% lines. Store95.2%
statements/92.23% branches; realtime86.25%/80.51%. This is the declared two-module
scope, not repository or browser coverage.

Final scoped command: mise exec -- pnpm exec vitest run --config
vitest.house.config.ts spec/house-game-backend.test.ts
spec/house-game-realtime.test.ts spec/house-store.test.ts
spec/house-room-migration.test.ts spec/house-realtime.test.ts, with v8 coverage
restricted to the two backend modules. The final pnpm typecheck and git diff
--check passed. Earlier transient parallel world/server/UI type errors were read
and communicated; they were not waived.

## Review and ownership

[Review record](game-backend-review.md) preserves the independent findings and
bounded contextual verification. Source ownership was released to the parent
after the final review. This lane owns no running server/browser or heavy
workload. The UI worker's separate native journey and later parent cutover
checks have their own source bindings.

Remaining integration gates: complete UI navigation/focus/outbox behavior, the
parent world-version authorization gate, original resource gates plus separately
declared combined game workload, parent reproduction and broader required
checks. Browser, physical-phone and real-friend trials were NOT RUN by this
backend lane. No deployed or human acceptance is claimed.

