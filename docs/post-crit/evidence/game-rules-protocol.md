# Pure Four-in-a-row rules protocol

22 October 2026; branch `post-crit-improvements`, initial HEAD `1671cec`.
This lane owns only the pure rules module/declaration, focused domain tests and
`game-rules*` evidence. Store, transport, UI, browser, SQLite and receipts are
outside its acceptance. The parent owns integration and a fresh implementation
review. Existing camera/native work continues independently; tests here use one
Vitest worker and no coverage or browser workload.

## Frozen requirements and decisions before tests

- One current table, two voluntary identities and at most one latest completed
  result. Watchers do not mutate the pure state. New round IDs come from the
  adapter; rules never create IDs, receipts, authentication or command ledgers.
- A round's waiting reservation expires 90 seconds after its first Join. The
  deadline never moves with roster churn, Ready, watch or reconnect. Each Ready
  expires at the earlier of 60 seconds after consent or that fixed deadline.
  Expired waiting tables release seats without replacing the latest result.
  This is the parent's explicit housekeeping policy, not measured user preference.
- Waiting Join binds table revision. Leave binds only the round and actor in every
  phase. Ready binds round and roster revision
  so both simultaneous consents compose. Any roster change clears both consents.
- Active Move binds round and table revision, role, turn and legal column. Leave
  binds round and actor but does not fail because a racing Join, Ready or Move
  changed table revision. The UI can exit immediately; uncertainty handling stays outside.
- Active controlling disconnect pauses, reserves the two original identities and
  keeps the earliest recovery deadline (90 seconds) and idle deadline (300 seconds
  since start/last accepted move). Both identities explicitly resume against the
  same recovery revision while currently controlled in the lounge. Reconnect alone
  never resumes. Repeated disconnect/restart cannot extend either deadline.
- Waiting controlling disconnect/departure releases that slot immediately. Active
  leave, controlling lounge departure and membership removal end neutrally. An
  observer subscription cannot emit a trusted departure event.
- Maintenance is explicit: `advanceGameTime` computes cleanup; rejected actions
  never return hidden cleanup. The adapter must persist maintenance before trying
  a command and must not roll cleanup back when the command rejects.
- Server restart clears waiting readiness, pauses a surviving active round and
  requires new explicit resume consent; earliest deadlines remain. Terminal seats
  release, and new Join/Ready consent is required. No resign, ratings or rematch.

## Observable acceptance and method

Write failing observable tests before production behavior; a temporary no-op
module may expose the intended API solely to produce behavioral RED rather than
an import error. Preserve actual exits. Test explicit timing boundaries, failure
paths and reference identity; fixed server time avoids sleeps. Cover all four win
axes, draw, seven columns/six rows/42 cells, role/turn/stale errors, immutable input,
concurrent Ready order, joint Resume, roster churn, observer versus controller
inputs, departure and restart. A complete legal draw sequence and won/neutral
results must retain bounded 42-cell projections. Check JSON UTF-8 bytes below
8 KiB with bounded IDs and both a current round and latest result.

The material alternatives are revision-bound Ready versus roster-bound Ready,
implicit cleanup-on-rejection versus explicit persisted maintenance, and renewable
versus fixed waiting/recovery deadlines. Common criteria are commuting independent
consent, no expired play, no hidden rollback loss and bounded abandoned occupancy.
Focused deterministic tests discriminate these alternatives; model judgment and
pure-domain checks do not establish multiplayer/UI acceptance.

Run with the explicit Linux Node 24.21.0 / pnpm 11.9.0 mise runtime and isolated
`vitest.house.config.ts`, filtered to the owned test with one worker. Run TypeScript
checking and inspect only owned diffs/hashes. Fresh review and parent reproduction
remain required before integration; no complete P4 or production claim follows.


## Recovery refinement before acceptance

The initial implementation used a persisted per-player disconnect marker to
ignore duplicate disconnect events. A deterministic counterexample failed:
restart -> player A explicitly resumes -> player B regains control and disconnects
before pressing Resume. A's old consent survived because B was still marked
unavailable. `game-rules-recovery-red.json` preserves 46 PASS / 1 FAIL.

Remove those transient connection flags. Every trusted controlling disconnect
clears both consents and increments `resumeRevision`. The realtime adapter must
filter old controller generations and duplicate disconnect callbacks BEFORE
emitting this event. Pure repeated events never extend deadlines; repeating a
restart intentionally invalidates consent again. No per-event receipt ledger or
connection authority is added to the rules. Explicit Resume completes one pause
episode; a later genuine disconnect starts a new90-second recovery window, still
bounded by the last accepted move's unchanged300-second inactivity deadline.

Mandatory integration proof: a real current-controller disconnect callback emits
exactly one domain event after `contexts.delete`/matching `lease.socketId` and
controller generation checks. An observer, stale socket and duplicate callback
must not emit it. This pure lane does not establish that realtime test. The rules
intentionally treat repeated already-filtered disconnect events conservatively:
clear consent and increment recovery revision, preserving board and deadlines;
these events are not claimed duplicate-idempotent.
