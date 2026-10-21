# P2 client own-work ordering foundation

22 October 2026. Worktree `post-crit-improvements`, starting at `d95055b` over
`8cdad6a`; canonical Ubuntu/lizhi checkout. This lane changes only
`public/house-client.js`, `spec/house-client.test.ts` and this evidence family.
Camera/world/UI, store/contract/realtime and shared content are other workers' files.
No commit, push, UI integration, browser or workload run was made by this worker.

## Requirement and source

The P2 contract in `../PLAN.md` adds `durable.ownWork` to every authorized snapshot:
`{streamId: lounge:<houseId>, sequence, card: own active card or null}`. It is the
existing canonical card, projected independently of the selected bedroom cursor.
Bedroom `cards` remains empty on the server.

The inspected `HouseStore.snapshot` reads room sequence, lounge sequence and the
authenticated author's active card inside one transaction. `house.subscribe` in
`src/house-realtime.ts` assigns a fresh, increasing access generation before
projecting the selected room. The controller generation can change independently.
These sources support retaining authority during a temporary null display and
requiring a newer access generation for a same-epoch identity or house change.
Source and real Socket.IO delivery tests are the backend lane's responsibility.

## Decisions, alternatives and refinement

A room-only cursor cannot protect own work across room selection. A second task
store or persisted client copy would duplicate authority/private data. The chosen
foundation keeps one in-memory work projection and cursor, scoped by the accepted
server epoch, identity and house. It replaces that projection only for a strictly
newer lounge cursor. Equal cursors preserve the first accepted projection.

`selectZone` and connection `clear` still emit null immediately. They retain the
same scope's work high-water and last accepted authority, including while visible
`current` is null. Revocation clears the work projection. A newly accepted epoch,
identity or house starts its own cursor; epochs already retired remain rejected.
No private cache is written to browser storage. The outbox and controller send
paths are unchanged.

Older room envelopes retain their existing rejection rule before authority/cache
mutation. A proposed extension to accept older-room/newer-work combinations was
rejected before implementation: both durable cursors are read transactionally and
monotonic within an epoch/room, so that combination is not a reachable newer
server snapshot. Mixing incoming control metadata with older room/players would
add an unnecessary contract. Its synthetic negative control verifies rejection
cannot poison the accepted work cursor.

The reducer rejects a supplied malformed projection as a whole snapshot before
any mutation: stream must match this house, sequence must be a nonnegative safe
integer, and a non-null card must be a plain active card with a bounded ID and
this identity's author ID. Projection copies separate callback edits from cache.

Existing fixtures that omit `ownWork` are explicitly tolerated as room-only:
they neither derive work from `cards` nor populate/advance its cursor. Once an
accepted same-scope projection exists, a room-only fixture preserves it. This is
fixture tolerance, **not deployment compatibility evidence**. The new server
contract still requires `ownWork`; protocol/version compatibility is not settled
by these tests.

## RED evidence

Before production edits, the 22 newly added own-work cases were selected with:

```text
mise exec -- pnpm exec vitest run --config vitest.house.config.ts spec/house-client.test.ts -t "own-work projection"
```

Exit 1: **17 failed, 5 passed, 43 excluded by the name filter**. Failures showed
card rollback at newer bedroom sequences, resurrection after close, loss of work
ordering across zone/null states, stale generation acceptance after clearing,
cross-scope acceptance, malformed projection acceptance and loss of room-only
cached projection. Existing epoch, equal-room delivery, older-room rejection,
stale authority and zone-bound retry controls already passed.

`work-projection-red.json` binds the exact baseline client/test/patch hashes and
command/result. `work-projection-red-tests.patch` preserves the exact added test
source at RED against `d95055b`. Applying that patch to an isolated baseline
reconstructs the red fixture without needing raw private logs. The raw synthetic
local output remains ignored at `.local/work-projection-red.log`.

One existing movement fixture was later corrected to give a legitimate identity
change a newer access generation. Equal-access identity replacement is now a
negative authority case rather than an accepted movement fixture.

## Verification by subsection

| Requirement | Evidence | Decision / verification |
| --- | --- | --- |
| Bedroom cursor independent of work | Equal bedroom/new work; newer bedroom/older work; equal work conflicting card | New work appears; older/equal work cannot replace high-water |
| Zone and connection ordering | Reducer exit/reentry/null tests; real client subscribe/disconnect/reconnect callbacks with a mocked socket | Clear visible state; preserve same-scope cursor and authority |
| Card lifecycle | Null -> first card -> null -> replacement with delayed predecessors | No first-card resurrection or replacement loss |
| Scope and epoch | Identity/house switches while null, access/generation delays, epoch reset/retirement and revocation | Reject stale scope before mutation; new legitimate scope starts fresh |
| Malformed projection | Seven stream/cursor/author/state/shape negative cases with high access/cursor | Rejection does not advance authority or high-water |
| Observer and draft boundary | Observer receives work; save denied; new controller flushes original draft | Projection never grants write authority |
| Pending card scope | Pending lounge card, bedroom work projection, denied bedroom retry, return to lounge | UUID/payload/identity/house/zone stay original |
| Legacy fixture tolerance | Missing additive field and unrelated `cards` | Never invent work from shared cards |
| Cache isolation | Callback modifies emitted cursor/card, later lower cursor arrives | Private high-water/card remain unchanged |

Full focused file: **65/65 passed**, zero skipped, exit 0, 620 ms total reported
Vitest duration. This includes 22 new cases and all 43 existing client cases.

A single client-only V8 coverage run also passed 65/65, exit 0, 587 ms reported
duration: lines **97.70%** (256/262), statements **92.45%** (441/477), branches
**89.09%** (343/385), functions **95.29%** (81/85). These percentages cover the whole
`public/house-client.js` file under this test file, not full application coverage.
`git diff --check` on the owned tracked change set returned 0. Source hashes,
commands, counts and coverage totals are in `work-projection-verification.json`.

Checks used Linux Node 24.21.0, pnpm 11.9.0 and Vitest 5.0.1 via the
Windows-to-WSL bridge. No browser/load was started; further checks were held while
the camera worker used the native timing slot.

## Review and acceptance boundary

Self-review checked stale validation before mutation, scope resets, detached cache
copies, no storage calls in the reducer, and the unchanged outgoing command/outbox
paths. Independent review is pending the parent's fresh Astra review; this worker
does not label self-review as independent review.

This is client foundation only. Parent integration must verify required server
projection delivery/permissions and run the affected broader checks. UI acceptance
still needs direct My work access in both zones, desk behavior including a visitor's
own card, house-visible labeling, observer read-only controls, delayed receipt/newer
draft behavior and real two-user close/recovery flows at the target viewports.
Physical devices and human experience remain separate evidence. The broader P2
milestone and release acceptance remain open.
