# Picture-table API and authority contract

22 October 2026. Reviewed authority contract with literal types below. The responsive
prototype was accepted before separate backend, client and UI implementation.
The authority and client now have reviewed local implementations; integrated native
and sustained resource acceptance remain separate gates.
All UUIDs/integers/enum keys are validated; identities come from existing sessions.

## Distinct state

`HouseSnapshot.puzzle` is `PuzzleTable | null`, null outside the lounge. PuzzleTable
has a monotonic `revision` and nullable current round. A round has server UUID `id`,
ruleset 1, immutable illustration ID/version/digest, up to24 placed pieces and a
completion flag. A placement records opaque piece ID, destination index and actor
UUID. Validate uniqueness, correct known mapping and matching immutable content.
No move history, timestamps, forced duration or participant list is saved there.
House schema5 adds the table; existing rows/receipts/archives remain unchanged.

`LiveSnapshot.puzzleRoster` is null outside the lounge. Otherwise it contains
`serverEpoch`, `houseId`, `roundId` (nullable), monotonic `revision`, at most6
`memberIds`, and the receiver's `selfParticipationId` or null. Only that person's
participation UUID is projected; identity and trusted controller context are still
required for authority, so this is not a bearer-token authentication scheme.
The realtime service owns bounded rosters and a process-global revision allocator.
A second process with independent memory is outside the current deployment contract.

The client keeps an independent roster high-water mark for server epoch/identity/
house, clears visible data on private/revoked state and rejects mismatched round
or backwards revision combinations. Preserve ordering across temporary cleared UI.
Do not merge roster from volatile motion, an old receipt or a wrong-access snapshot.

## Direct participation intent, no durable outbox

One direct Socket.IO event `house.puzzle.intent` carries:

```
{ generation, zoneId: 'lounge', serverEpoch, accessGeneration,
  intentSequence, requestId, roundId, mode: 'join' | 'leave' }
```

- The captured authority tuple must equal the current authenticated controlling
  context. Keep the same tuple/body on retry; do not rewrite with a fresh head.
- `intentSequence` is a safe nonnegative increasing counter per client connection.
  Assign it when the user acts, before awaiting any ACK. Retain only the highest
  sequence and that request hash/outcome in the connection context.
- Lower sequence is rejected as STALE_INTENT. Equal sequence/body returns the last
  outcome without changing participation; equal sequence/different body is rejected.
- A fresh Join requires current lounge membership, an unfinished current round and
  no held Four-in-a-row slot. A newer Join while already participating returns
  ALREADY_JOINED without changing UUID or roster. Otherwise Join allocates a fresh
  participation UUID and publishes roster.
  A new explicit Join after departure has a new sequence and UUID.
- A newer Leave targeting the same round clears participation and cancels any older
  unresolved Join, even without knowing its server UUID. An older delayed Join is
  then rejected by the high-water mark; an old-round Leave cannot remove a new-round
  participation. Wrong round/control errors never grant permission.
- An ACK identifies request/sequence and outcome, but never overwrites a newer local
  withdrawal intention or a newer authoritative roster. Opening a panel is read-only.
- After disconnect/restart or authority change, the client discards direct-event
  retry state and requires a fresh explicit Join. Authority changes on the same
  connection do not reset the intent counter; only a new connection starts it over. No automatic reconnect enrollment.

Direct events are socket-only, like the existing seat/stand interaction. Durable
start/place commands retain both authenticated HTTP and Socket.IO paths. The UI
must distinguish an uncertain direct Join from a saved durable placement; no
successful-save label is inferred from a transport timeout.

## Durable commands

`puzzle.start`: normal house command envelope with `houseId`, command UUID,
`expectedRevision` of the table and payload:

```
{ expectedRoundId: string | null, illustrationId, illustrationVersion,
  confirmUnfinished: boolean,
  authority: { serverEpoch, accessGeneration, generation },
  expectedRoster: { serverEpoch, revision } }
```

First execution checks current table identity/revision and current trusted authority.
Empty/completed rounds may be replaced by a current lounge controller. Unfinished
rounds require house owner, explicit confirmation, no other active participant,
and current roster epoch/revision. The store revalidates ownership/membership in
its synchronous transaction. A receipt replay returns the original receipt without
rechecking first-effect confirmation or clearing a current roster. After actual
round changes, synchronously reconcile the roster using internal transition facts
returned by the committing transaction; do not query SQLite again after commit.
A replay produces no transition effect and never clears a newer roster. Start never joins.

`puzzle.place`: normal command envelope with `houseId`, command UUID and payload:

```
{ roundId, participationId, pieceId, destination }
```

`expectedRevision` must be absent; placement has no global revision precondition. First effect requires trusted current
participation matching actor/context/round/UUID, valid unplaced piece and correct
destination. Concurrent different pieces can both commit. Duplicate success returns
its exact original response; same-piece contention and wrong destination produce
specific rejected/no-effect results. A former participation UUID cannot be replaced
with a newer one during automatic outbox retry.

Both commands: current identity/house/controller/zone validation -> exact UUID/hash
receipt lookup -> first-effect authority/rules -> state plus receipt transaction ->
nonthrowing synchronous memory reconciliation -> publish. Preserve the existing
no-reuse-of-UUID-with-another-body rule. Keep response JSON <=512 UTF-8 bytes.

## Lifecycle, exclusivity and ordering

Apply transient cleanup before unrelated game housekeeping that might throw.
Scope removals to the old controller/authority/participation, including disconnect,
successful same-zone takeover, explicit resubscription/zone departure, identity
revocation and member removal. A denied takeover and observer disconnect do nothing.
Each projection and first mutation also filters stale entries by current DB
membership, controller and round. Prune empty house maps when no connection remains;
new instances use fresh global revisions, not zero, to prevent ABA confirmations.

A new game.join checks the live puzzle roster only after exact receipt replay.
A puzzle Join checks the current durable game's actual players including paused
slots. Explicit Leave precedes switching; no silent withdrawal and no exception
for a pending newly executed game Join. Watching remains unrestricted for members.

## Required discriminating cases

- Join ACK lost -> newer Leave -> old Join retry cannot reenroll.
- Older Leave/placement after same-round rejoin cannot remove/use the new consent.
- Reconnect recovers durable progress while keeping participation empty.
- Disconnect/takeover while existing game housekeeping throws still clears matching
  transient consent; observer disconnect preserves the controller's participation.
- Owner confirms reset -> another joins then leaves -> old roster confirmation fails.
- Start commits -> participants join -> exact old Start replay preserves that roster.
- Old uncommitted reset cannot run under a new authority tuple.
- Pending game Join after puzzle Join cannot create simultaneous active commitments;
  successful historical game receipt may resolve without withdrawing the puzzle.
- Out-of-order roster snapshots with equal durable sequence cannot roll back consent;
  wrong round, private zone, identity, epoch and access-generation cases reject.
- Different-piece/same-piece placement races, wrong destination, restart/migration,
  foreign/member-removed/observer commands, and UI drafts/return remain covered.

## Literal version-1 types and outcomes

The initial immutable catalogue entry is `rainy-nook`, illustration version 1.
Its digest is computed from the accepted SVG bytes when the prototype is frozen.
Piece IDs are the24 literal IDs from that catalogue, never client-invented IDs:
ivy-bell, crescent-arch, paper-star, bird-string, shelf-leaves, honey-cap,
fern-rain, rain-roof, star-curtain, book-spines, red-teapot, lamp-shade,
teal-cup, cat-tail, cat-book, notebook, biscuits, lamp-base, rug-leaf,
chair-leg, desk-leg, slippers, yarn-coil and woven-basket.

```ts
type PuzzlePlacement = { pieceId: PuzzlePieceId; destination: number; actorId: string };
type PuzzleRound = {
  id: string;
  ruleset: 1;
  illustrationId: 'rainy-nook';
  illustrationVersion: 1;
  illustrationDigest: string;
  placements: PuzzlePlacement[];
  completed: boolean;
};
type PuzzleTable = { revision: number; current: PuzzleRound | null };
type PuzzleRoster = {
  serverEpoch: string; houseId: string; roundId: string | null; revision: number;
  memberIds: string[]; selfParticipationId: string | null;
};
type PuzzleIntentSuccess = {
  ok: true; requestId: string; intentSequence: number; mode: 'join' | 'leave';
  roundId: string; participationId: string | null; rosterRevision: number;
};
type PuzzleIntentFailure = {
  ok: false; requestId: string; intentSequence: number; code: string; message: string;
};
// HouseReceipt keeps its existing outer fields. Its result is exactly one of:
type PuzzleStartResult = { roundId: string; puzzleRevision: number };
type PuzzlePlaceResult = {
  roundId: string; puzzleRevision: number; pieceId: PuzzlePieceId;
  destination: number; completed: boolean;
};
```

Destination is an integer0–23. Revisions and intent sequences are safe nonnegative
integers. IDs are UUIDs except the closed piece/illustration catalogues. A completed
round has exactly24 distinct correct placements; fewer must have completed:false.
Keep a deterministic placement order in projection and validate the immutable art
mapping when restoring. Do not derive a piece description from its answer index.

Direct intent order: validate shape/session/member/socket/original authority/zone;
then compare sequence and request body. For a newer authorized well-formed intent,
perform domain checks and cache its sequence/hash/outcome even on domain rejection.
Malformed, unauthorized and rate-limited requests never advance the watermark.
Lower sequence and equal-sequence/different-body denials do not replace the cached
outcome. Thus a denied Join cannot become successful through retry after conditions
change. The user must make a new deliberate Join with a new sequence.

A newer Leave for the current round supersedes older unresolved intents on that
connection, including when no participation has been created yet. No target Join ID
field is needed. Old-round Leave is a cached domain denial and cannot remove current
participation. Cached direct ACKs describe their original outcome, never today's
roster. Shape/authority errors echo request identity only when it was validated.

Use existing identity/controller/zone/house/rate/storage error codes. New finite
codes are STALE_INTENT, INTENT_ID_REUSED, ALREADY_JOINED, ACTIVITY_ACTIVE,
PUZZLE_UNAVAILABLE, PUZZLE_COMPLETE, PUZZLE_STALE_ROUND, PUZZLE_NOT_JOINED,
PUZZLE_PIECE_TAKEN, PUZZLE_WRONG_PLACE and PUZZLE_RESET_CHANGED. Invalid enum/range
is INVALID_INPUT. Revision/reset races are rejected with current-state guidance;
no rejected placement creates a durable receipt or progress. Client copy explains
the action; transport/domain code names need not appear in the normal UI.

The final new committed placement marks completed:true and clears transient
participation once, advancing the roster revision. The completed image stays
viewable; Join returns PUZZLE_COMPLETE until a deliberate new Start. This releases
activity exclusivity without requiring an extra Leave. Replaying that final receipt
does not clear anyone in a later round or generate another completion effect.

Internal store outcome metadata, separate from the public receipt, distinguishes
new replacement/completion from historical replay. Postcommit cleanup uses only
these already-committed facts and in-memory operations, with no fallible database
read or awaited work. First-effect authority may query and fail before mutation.

Additional contract tests: cached domain denial; already-joined UUID stability;
same-connection sequence continuity after authority change; final-placement replay
after replacement/new Join; Leave arriving before its unresolved Join; and correct
nonthrowing postcommit effects. The contextual reviewer approved the architecture
conditional on these now-explicit details; implementation and UX acceptance remain
separate gates.
