# Picture-table backend implementation and review handoff

22 October 2026. Local work in Ubuntu/lizhi, `/home/lizhi/comp4020/comp4020-final-naaeeen`, branch `post-crit-improvements`. These are automated backend observations. Native browser, sustained resource, physical-device and real-friend acceptance remain with the parent. No backend-worker commit, push, deployment, paid job or service was started.

## Scope and exact integration

The reviewed [GROUP-API](GROUP-API.md) remains the wire contract. Source identities are in [the binding](evidence/picture-backend-source-binding.json). The parent owns `public/house-puzzle-content.js` and the immutable SVG; both were read-only throughout this lane.

- `public/house-puzzle-rules.js`: independent immutable start/place transitions and strict restored-table validation; exports JSDoc `PuzzleTable`, `PuzzleRound`, `PuzzlePlacement` and `PuzzlePieceId` types. Canonical projection order is destination ascending. Piece/actor identity, mapping, immutable art version/digest, completion consistency, revision safety, exact fields and 24-piece bound are checked before restored state reaches a projection.
- `src/house-puzzle-presence.ts`: process-memory-only participation. Houses are retained only for current subscribed contexts, with at most six participants each and a process-global monotonic roster allocation. Recreated maps receive fresh revisions. Each connection holds only its latest direct-intent sequence, body hash and outcome. No Join/Leave receipt, selection, pointer, animation or move history is stored in SQLite.
- `src/house-store.ts`: additive schema 5 creates `puzzle_tables`, leaving all old tables/receipts/archives in place. Empty state is synthesized until a deliberate Start. `execute()` still returns `HouseReceipt`; additive internal `executeWithEffects()` returns `{ receipt, effect }`. `effect` is null for every exact historical receipt replay and every ordinary placement; a newly committed replacement/start or final placement yields `{ houseId, roundId, completed }`.
- `src/house-realtime.ts`: both durable transports call the same store authority, then immediately reconcile committed effects using memory only. Direct `house.puzzle.intent` follows original authority and connection sequence rules; valid domain denials are cached. Malformed, unauthorized, storage-failed and rate-limited attempts do not consume that sequence. A new Leave for the current round supersedes a Join even if the Join has not arrived. A second deliberate Join while already joined returns `ALREADY_JOINED` without rotating the participation UUID.
- `src/house-contract.ts`: additive required `HouseSnapshot.puzzle` and `LiveSnapshot.puzzleRoster` fields; nullable in private zones. Public wire schema remains 2. `HouseGameControl.puzzle` contains trusted connection authority, round, roster revision/members and actor's participation UUID. It is adapter-only, never taken from a client command.
- `src/server.ts`: static mappings for puzzle content/rules/UI, plus finite exact HTTP 409 mappings for `ACTIVITY_ACTIVE`, `PUZZLE_UNAVAILABLE`, `PUZZLE_COMPLETE`, `PUZZLE_STALE_ROUND`, `PUZZLE_NOT_JOINED`, `PUZZLE_PIECE_TAKEN`, `PUZZLE_WRONG_PLACE` and `PUZZLE_RESET_CHANGED`. Existing invalid/rate/auth/storage handling remains in force.

Start never enrolls its author. First execution of unfinished replacement checks owner, explicit confirmation, original authority, current durable round/revision and roster epoch/revision with no other participant. Current identity/house/controller/zone checks precede receipt lookup; replacement confirmation and participation apply only on first effect. Place forbids `expectedRevision`, retains the original participation UUID and allows correct different pieces to compose. Accepted picture receipts are checked against the 512-byte maximum inside the state/receipt transaction.

Lifecycle cleanup is socket/generation scoped. It runs before fallible game housekeeping on disconnect, actual takeover, resubscription, zone exit and revocation. Observer/denied-takeover paths do not clear the controller. Completion clears participation once; replaying old Start/final Place never clears a later roster. Four-in-a-row players, including paused slots, cannot newly join the picture table, and a current picture participant cannot newly execute `game.join`. Historical game receipts still resolve safely.

## Requirement and evidence trail

The architecture comparison was already resolved in the reviewed API before this worker's GO. This lane used discriminating behavioral tests to compare allowed and forbidden transitions under the same source/runtime; it did not reopen unrelated activity choices or perform a human A/B trial. The parent owns fresh independent review and the global register.

| Requirement / uncertainty | Method and actual evidence | Decision / refinement | Result and limit |
| --- | --- | --- | --- |
| Explicit saved Start, no enrollment, bounded/private state | Real store test before production implementation: [initial RED](evidence/picture-backend-red.json), `Unknown house action`; [final verification](evidence/picture-backend-verification.json) | Separate pure module and schema-5 row; no roster in durable state | PASS locally. Plain `mise` first failed PATH lookup; explicit installed mise then ran the behavioral RED. |
| Migration, restart and atomic receipts | v4 fixture drops only the new puzzle table and keeps members/chat/receipt; rollback trigger rejects receipt insert; restart restores all 24 placements | Reuse existing synchronous SQLite transaction; preserve receipt-only API with internal effects | PASS. Old v2 downgrade fixtures outside worker ownership were reconciled by parent to drop puzzle table and expect schema 5. |
| Three to six contributors and composition | Real Socket.IO clients: three then six explicit Joins, six successful distinct actors, different-piece concurrency, same-piece loser and wrong destination | No global revision on Place; strict unplaced-piece mapping | PASS capability. These clients are automated, not a claim of equal contribution or enjoyment. |
| Intent ordering, cached denials and original consent | Join success whose ACK is treated as lost, newer Leave, prearrival Join, duplicate/body mismatch, domain rejection followed by changed conditions, already-joined stability, rate/auth/shape negatives | One latest sequence/hash/outcome per connection; explicit new Join after authority/disconnect; no automatic enrollment | PASS for exercised counterexamples. Latest cached outcomes describe their original event, not today's roster. |
| Reset ABA and historical replay | Owner confirmation followed by another Join/Leave; old Start replay after new participants; final Place replay after new round and Join | Roster epoch/revision confirmation and internal first-commit effect metadata | PASS. First test attempt captured an old empty roster before Leave publication; corrected to wait for actual acknowledged roster revision, preserving [first run](evidence/picture-backend-group-first.json). |
| Lost consent survives unrelated housekeeping failure | Observer vs real controller, valid vs denied takeover, failing zone departure/disconnect, session expiry/removal | Memory clears before game housekeeping. Conditional removal now queues a roster publication immediately | PASS after reproduced refinement below. |
| No fallible postcommit query | Real socket store wrapper makes `snapshot`, `session` and `me` throw immediately after the committing call returns | Memory reconciliation consumes only the returned effect, with no authority/database read | PASS; committed receipt still ACKed. This is a targeted fault-injection control, not proof against every runtime failure. |
| Existing house/game behavior | 14 relevant test files, including store, game backend/realtime/clock, HTTP, permissions, migration, operations, voice and logging | Preserve original controller and game semantics alongside additive puzzle capability | 201/201 PASS, zero skips. Parent owns required whole-project and native/resource gates. |

## Reproduced refinement: failure-path roster publication

Source self-review identified that a valid takeover could remove participation and then fail in unrelated game housekeeping without queueing peers' roster refresh. A first undercontrolled test passed because an observer subscription had already queued a snapshot; [that diagnostic](evidence/picture-backend-failing-lifecycle-publication-red.json) is not a RED result.

The corrected test registered and drained that earlier publication before injecting the failure. [The behavioral RED](evidence/picture-backend-failing-lifecycle-publication-red-v2.json) then failed because an idle peer retained the removed participant. `PuzzlePresence.clearConnection()` now returns whether consent changed; realtime queues publication immediately when it does. [The affected green](evidence/picture-backend-failing-lifecycle-publication-green.json) and the broader final run passed. This distinguishes actual lost consent from its timely delivery; it does not claim a broader causal performance result.

## Actual verification

Windows PowerShell to WSL2 bridge, Linux Node 24.21.0 / pnpm 11.9.0 / SQLite 3.53.4. Use `/home/lizhi/.local/bin/mise exec -- ...`; plain `--exec mise` does not resolve in this Windows-to-WSL PATH.

- `pnpm typecheck`: PASS, exit 0 after all current integration edits.
- `pnpm test:house` with 14 selected backend-related files and V8 coverage: PASS, 201/201 tests, zero skipped. [JSON result](evidence/picture-backend-verification.json).
- [Scoped coverage](evidence/picture-backend-coverage-final/coverage-summary.json): 97.93% lines, 89.49% branches, 92.24% statements, 98.97% functions. Pure puzzle rules and transient presence each 100% across these metrics. Shared realtime: 95.33% lines / 83.73% branches; shared store: 99.56% lines / 92.77% branches. The initial puzzle-only coverage measured lower shared-file coverage and is preserved separately; the broader run supplies the final scope.
- `git diff --check`: PASS. Scoped secret-pattern filename search reported no matches in owned source/new specs. No dependencies were introduced; no dependency update/audit, commit hook or remote CI was run by this worker.
- Frozen illustration remains 8,445 bytes, SHA-256 `08af5570490c5c32b1b684a33e14a5b78f65274239b8156774394da50ab9bca6`; content module remains 4,547 bytes, SHA-256 `42f123b13a6139e3774cd0c41b3719e081a3452d1ab6ba8e41c966163bb117dc`.

Independent implementation review: pending parent. Native browser/device interaction, bounded RAM/disk/WAL/receipt measurements under sustained group workload and human contribution/enjoyment/return-to-work acceptance: NOT RUN by this worker. No source-bound resource acceptance is inherited. The public compatibility version remains parent-owned and must be bumped at integration.

## Continuation

Review the six owned production paths and three new puzzle specs against GROUP-API. Preserve all parallel client/UI/codec edits. Parent reconciles other-owned fixture updates, global handoff/register, compatibility version, native interactions and resource gates. If review changes a boundary, reproduce it with a targeted behavioral counterexample, refine and rebind affected source/check artifacts. Retain failed and diagnostic runs above.
## Fresh-review access refinement, 22 October

The independent reviewer supplied a concrete P2 counterexample: A's controller joins the picture in the lounge; A's observer enters B's open bedroom; B closes it; the observer's Takeover returns `FORBIDDEN`, yet the lounge controller's next correct Place returns `PUZZLE_NOT_JOINED`. The worker reproduced that exact real room-access revocation in the maintained wire suite. [The RED](evidence/picture-backend-access-preflight-red.json) also records malformed takeover input being accepted rather than denied. The earlier `NOT_SUBSCRIBED` negative did not cover actual revoked zone access.

`HouseStore.authorizeZone()` now provides a narrow read-only identity/membership/zone access preflight, separate from game maintenance. Realtime validates shape, session, subscription and current requested access before withdrawing consent. It then clears valid lost-control participation and queues publication before calling the ordinary snapshot/game housekeeping that can fail. Existing custom/fake authority adapters without this optional internal method use their ordinary authorized snapshot before cleanup; the production store implements the independent preflight. No wire fields changed.

The same preflight protects denied current-controller resubscription. A focused additional [shape RED](evidence/picture-backend-subscribe-shape-red.json) showed that a trailing-newline token or extra resubscription field could pass the older loose parser and clear consent. Subscribe now accepts exactly its two existing fields with exact 36-character UUIDs; Takeover retains its supported empty-body fallback, validates an optional exact UUID token and rejects other fields. Tests cover actual revoked-bedroom denial, malformed takeover/resubscribe, forbidden resubscribe, valid takeover with injected game failure, immediate removal publication and ordinary observer disconnect. [Initial focused green](evidence/picture-backend-access-preflight-green.json).

The first wider affected run after tightening shape recorded 71 passes and one overly specific test assertion in [its preserved result](evidence/picture-backend-access-refinement-green.json): a removed member's HTTP retry returned `NOT_CONTROLLER` once its lease had already been pruned, while the test required `FORBIDDEN`. Both orders deny before receipt/effect. The test now checks a denied outcome with either existing authority code and unchanged durable state. No production error ordering was changed for that observation.

Current refinement verification supersedes the earlier source-bound count above: [203/203 tests, zero skipped](evidence/picture-backend-verification-v3.json) across the same 14 backend-related files. [Coverage](evidence/picture-backend-coverage-v3/coverage-summary.json): 97.95% lines / 89.88% branches overall; new pure/presence modules remain 100%; realtime 95.4% lines / 84.74% branches; store 99.57% lines / 92.81% branches. Current source identities are [binding v3](evidence/picture-backend-source-binding-v3.json); preserve the original binding and earlier results as history. Typecheck and diff checks pass. The parent owns reviewer reconciliation and remaining native/resource acceptance.

## Contextual review closure

The original independent reviewer rechecked the final access-preflight/shape changes
on realtime hash `e38f011490663ca31fbb8f8c3efead0a3d8b5b245826ee14663709608030966c`.
Four targeted cases passed, covering malformed resubscription, denied takeover,
failing housekeeping and removed-member HTTP denial. The legitimate denial can
precede or follow lease pruning; the regression still requires no effect and
unchanged durable state. No actionable finding remained in this review scope.

Parent recomputed all 12 entries in source-binding-v3: every current byte hash
matches. The parent also inspected access preflight, first-effect cleanup and the
integrated required result. This closes authority review for a local foundation
commit. Native UI and sustained resource/growth acceptance remain open. Earlier
pending paragraphs describe their original checkpoints.
