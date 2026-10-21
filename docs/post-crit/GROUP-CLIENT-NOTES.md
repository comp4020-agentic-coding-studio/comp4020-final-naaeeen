# Picture-table client transport

22 October 2026. Client worker owns `public/house-client.js` and focused client specs.
This is the early integration contract; implementation checks are recorded below
when complete. The frozen wire contract remains [GROUP-API](GROUP-API.md).

## Direct participation API

`createHouseClient({ onPuzzleIntent })` accepts an optional callback receiving the
same cloned value as `client.pendingPuzzleIntent()`, or null. Notification occurs
when a send starts, becomes uncertain, is retried, settles, or is invalidated.

- `client.puzzleIntent(mode, roundId): Promise<PuzzleIntentSuccess>` creates a new
  deliberate `join` or `leave`, fresh request UUID and increasing connection sequence.
- `client.retryPuzzleIntent(): Promise<PuzzleIntentSuccess>` retries the exact last
  uncertain request body under its original connection and authority. Concurrent
  retries share its in-flight promise. No current pending request rejects with
  `PENDING_NOT_FOUND`; invalidated authority requires a fresh deliberate action.
- `client.pendingPuzzleIntent()` is synchronous and returns
  `{ requestId, intentSequence, mode, roundId, serverEpoch, accessGeneration,
  generation, zoneId: 'lounge', state: 'sending' | 'pending', canRetry } | null`.

A timeout rejects with `PENDING` and leaves this metadata. A definite domain
rejection clears it. A newer action supersedes the older local pending request;
late older ACKs reject as `STALE_INTENT` and cannot replace the newer request.
These events never enter session storage or automatic reconnect/flush. Offline
calls do not enqueue Socket.IO events. The counter resets only on a new socket
connection, including reconnect; changes of authority on that connection clear
retry state without resetting the counter.

ACKs describe the original direct outcome and never set participation or roster.
Render participants and the current self participation UUID only from accepted
`LiveSnapshot.puzzleRoster`. Opening/hiding a panel does not call these methods.
A leave may supersede a pending join without knowing its participation UUID.

## Durable commands and recovery

Keep the existing `client.command(intent)`, pending inspector and recovery APIs.
For a fresh non-destructive `puzzle.start` (empty/completed table), the client may
capture missing payload `authority` and `expectedRoster` from the accepted lounge
head. An unfinished reset with `confirmUnfinished: true` must already supply the
confirmation-time authority, roster, round and table revision; missing context is
rejected before queueing. The UI freezes this full payload when presenting its
confirmation, so later join/leave changes cannot be silently recaptured. The caller
supplies immutable illustration identity and the explicit confirmation flag.
For a fresh `puzzle.place`, the client captures a missing `participationId` from the
accepted self roster; the caller supplies round, piece and destination. Explicitly
supplied captured fields remain unchanged. A repeated pending UUID uses its original
captured defaults rather than today’s authority. Outbox retries always resend the
original command UUID/body. Neither Start nor a successful historical receipt Joins.

Puzzle commands have a separate cap of two pending entries per identity/house,
within the existing overall16 entries/32KiB UTF-8 budget. Only `puzzle.start` and
`puzzle.place` are durable puzzle command types; direct join/leave cannot be stored.
Pending rows gain a `label` for readable action copy, while retaining `type` and
original `command`; expiry, export, identity checks and discard behavior are unchanged.

## Ordering and privacy acceptance

Roster ordering is independent of durable sequence and binds server epoch,
identity, house, round and roster revision. Equal durable sequences can deliver a
newer roster. Cleared display retains ordering; old access, retired process,
wrong-round, private-zone and backwards roster data cannot restore participation.
Motion updates copy players only. Membership/version revocation clears private
cached projections. Connection/control/zone changes invalidate direct retry state.

## Verification status

Baseline behavior: **33 failed / 1 passed** among34 new cases, preserved in
`evidence/picture-client-red.json`. Initial implementation: **112/112** including
all78 existing client cases. Boundary self-review then added8 discriminating
cases: the refinement red had7 failures (semantic roster order, expected identity,
three invalid confirmation tuples, missing reset consent, restored puzzle scope/cap)
and35 passes; the UTF-8 budget negative control already passed. Final focused
and instrumented runs both passed **120/120**. These are mocked transport tests,
not running-service or native-browser evidence.

`evidence/picture-client-verification.json` records source hashes, reconstructed
baseline binding, actual runtime, first typecheck diagnostics, scoped coverage and
remaining gates. Scoped client coverage is92.27% statements,91.29% branches,
98.16% functions and97.90% lines. Full repository typecheck initially failed in
concurrently edited backend/UI/realtime fixtures, with no owned-file diagnostics;
parent must rerun it after integration.

| Subsection / user promise | Method and decision | Refinement and actual check |
| --- | --- | --- |
| Explicit consent and direct retry | Compared durable replay with connection-only captured intent against the same lost-ACK/newer-Leave task. Frozen contract disqualifies durable Join; bounded direct state chosen. | Tests cover superseding Leave, stale ACK, direct denial, exact retry, in-flight sharing, offline drop, reconnect and same-connection access/control changes. No ACK modifies roster. |
| Independent roster ordering/privacy | Compared durable-sequence-only acceptance with an independent epoch/identity/house/round/revision watermark. Equal-durable-sequence changes require the independent cursor. | Full reducer tests reject backwards/wrong/private/retired/access data through cleared display; motion only replaces players. Boundary red exposed order-sensitive equality; semantic member-set comparison passes. Revocation clears cached private projections. |
| Durable original intent and bounded recovery | Compared recapturing current context with preserving the initial UUID/body. Destructive confirmation must bind its original context; recapture is disqualified by Join/Leave ABA. | Red/green covers missing/malformed reset context, stale explicit context, original Start/Place capture through retries/new rounds, historical receipt without enrollment, expiry/inspection/export, two-entry scope cap and shared16/32KiB budget. Existing game/card/voice/update cases remain green. |

Parent owns fresh independent review, final integration, required repository
checks, native browser and resource acceptance. No commit, push, deployment,
agent, browser or service was created by this worker.


## Fresh review correction: authorized equal-roster recovery

Fresh Astra review reproduced a P1 liveness defect in the initial120-test candidate:
a visitor had already left picture participation by entering a bedroom, then room
access was revoked. The backend correctly returned a fresh authorized lounge head
with an unchanged empty roster revision; the client incorrectly rejected it solely
because revocation required a newer roster. Parent verified the finding and reopened
this subsection. The same issue affects an unchanged roster of other housemates.

Maintained regression tests fail both valid unchanged return cases before repair:
**2 failed /45 passed** in `picture-client-revocation-red.json`. Stale access/control,
older revision, contradictory equal member/round content and restoration of a former
self-participation UUID are passing negative controls. The first array-row fixture
error and a first repair syntax error remain separately labelled evidence.

The independent high-water now retains a normalized member-set comparison key and
a boolean recording former self participation. Materialized roster and participation
UUID caches are cleared on revocation. Equal-revision recovery requires the same
round/member set and, when the raw cache is absent, both old and incoming self
participation to be absent. The high-water key is comparison metadata only; it
never reconstructs a roster or authorizes mutation. The sorted key still retains
previously authorized member IDs. This is a bounded same-identity/house ordering
record, not a cryptographic fingerprint or a claim of total raw-data erasure. Current epoch/access/controller
checks and lower-revision rejection still precede acceptance.

Focused and instrumented checks pass **125/125** after repair. Scoped coverage is
92.29% statements,91.32% branches,98.18% functions and97.91% lines. Repository
`pnpm typecheck` now passes; prior concurrent fixture failures remain historical
in the initial verification record. Exact current source hashes, results, attempts
and scope are in `evidence/picture-client-revocation-verification.json`.
This is ready for the original reviewer's contextual recheck and the parent's
independent reproduction; native/browser/resource acceptance is still separate.


The owner required this retention limit to be explicit. Identity/house changes,
confirmed session loss, client close/version disposal, and a revoked connection
that closes before a new authorized head discard the comparison record. The wire
uses `FORBIDDEN` for both room access loss and membership loss; a room fallback
keeps its connection and sends a fresh head, while loss closes the revoked
connection. Network loss without revocation still preserves normal ordering.
No new wire field, crypto code, dependency or participation authority was added.

Two maintained terminal-disposal cases fail before this refinement and pass after
it; current focused and instrumented totals are **127/127**, with repository
typecheck passing. Current scoped coverage is92.45% statements,91.31% branches,
98.18% functions and97.96% lines. The prior125-test P1 repair remains separately
bound; `evidence/picture-client-disposal-verification.json` is the latest source
manifest and contains the actual additional red/green results. Contextual review
and parent reproduction remain open; no acceptance is inherited from earlier
source hashes.


## Contextual review closure

The fresh reviewer's follow-up recheck closes the equal-roster recovery finding on
client hash `a443a93a08c6c8b2312ace052d9da93598efd7368eabc37ab5f694c85be28511`.
Its unchanged four-case reproduction, aliased to the repaired source, passed 4/4;
the maintained client suite passed 127/127. Stale authority, lower or contradictory
rosters and restored old participation remain rejected. Terminal disposal and the
bounded retained member-set metadata were inspected explicitly.

The parent recomputed the current client/spec hashes and checked the refinement
record. The older source binding includes world version lounge-2; integration now
uses lounge-3. That version-only delta is not silently rewritten in the earlier
127-test record. The parent's full 1,037-test working-tree run covers the integrated
version. GROUP-API's subsequent opening-paragraph update reports implementation
status only; its payload contract is unchanged. Native and resource acceptance
remain separate. Earlier pending paragraphs retain their historical scope.
