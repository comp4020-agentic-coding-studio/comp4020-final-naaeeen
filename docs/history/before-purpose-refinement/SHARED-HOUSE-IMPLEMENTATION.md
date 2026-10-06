# Shared-house implementation and lifecycle design

6 October 2026. Reviewed planning contract; implementation pending. Proposed production design; the
deployed app remains the Crit8 window/lamp slice. Policies are in the
[capability contract](../product/SHARED-HOUSE-CONTRACT.md); actual evidence is in
[comparison and review](../planning/COMPARISON-AND-REVIEW.md).

## Stack decision and module boundaries

Retain native Node24 HTTP, SQLite, Three.js0.186.1 and DOM controls. Socket.IO4.8.4
is the leading incremental option, pending its isolated measured comparison.
It attaches to the [existing HTTP server](https://socket.io/docs/v4/server-initialization/).
One process, one256MB Fly machine and one /data volume remain fixed constraints.

SSE+POST can meet low-frequency shared updates; motion requires a separate
transient path rather than the current durable full projection.
[Colyseus0.18](https://docs.colyseus.io/migrating/0.18) offers schema/lifecycle and
prediction primitives but changes the room/state integration model. maxClients
does not define permanent membership. Plain ws leaves room/ACK/recovery machinery
to us. A technical transport-plus-payload comparison cannot rank every framework.

Proposed modules: identity/recovery; pure house rules and service; SQLite store
with migrations; presence/control/seat leases; realtime adapters; one client
reducer/outbox; world shell/avatars/furniture/picking; UI lobby/chat/board/editor.
These are responsibilities, not already-created production files. Keep domain
state independent of models and avoid a generic ECS/plugin layer without need.
No React rewrite, Redis or external database is necessary initially.

## Data and lifecycle

| Record | Constraints and retained meaning |
| --- | --- |
| identities/sessions | Stable public UUID; random cookie/recovery digests; expiry and revocation |
| houses | UUID,unique normalized join code,capacity2..6,owner,join status,template version |
| members | Unique active house/identity and house/slot; role/status; offline still active |
| bedrooms | UUID,house,owner membership,slot,visibility,revision; archive on departure |
| placements | UUID,bedroom,catalogue/version,transform/variant,revision |
| board cards/strokes | House,UUID,type,payload/geometry,author,revision/tombstone |
| chat | UUID,zone,author,text,stream seq,time; explicit bounded retention |
| focus | House/session UUID,status,phase,deadline/remaining,starter,revision,participants |
| receipts | Unique actor/command UUID,canonical hash,result; replay without second effect |
| durable events | Stream ID,persisted seq,type,entity/version,commit time; bounded replay |
| assets (later) | House/owner,random path,mime,dimensions,bytes,reference count |

Use foreign keys, prepared statements and short transactions. Active-slot partial
indexes or separate archived records preserve former bedrooms without duplicate
slot constraints. Verify actual SQL against migrations rather than copying this
table as executable schema.

Only memory holds avatar position/heading/animation, connections, control
generation, seat leases, typing and drag/pen previews. Camera/selection is local.
Do not write motion per frame or label saved residents as online.

Create/join uses one BEGIN IMMEDIATE transaction: authenticate, validate active
home/code/capacity, allocate slot and room, write receipt/event, COMMIT, then ACK
and broadcast. Code collisions retry without partial rows. A repeated join for
an existing member returns their membership. Two last-slot requests yield one
new resident. Deliberate departure is separate from disconnection.

## Identity, codes and permissions

The8-character code invites a new member; it cannot restore an old identity.
Throttle lookups with bounded buckets. Trust proxy IP headers only under the
actual Fly proxy contract; never accept arbitrary forwarded headers as authority.
Keep code/session/recovery proofs out of query strings and logs.

Keep HttpOnly and production Secure cookies. Authenticate handshake and every
mutation; recheck membership/bedroom access on subscriptions and asset reads.
Recovery rotates sessions, invalidates old control leases and closes revoked
connections. Implement basic recovery export/import alongside P1/P2 identity,
including return to a full house without another member claim. Display names and connection IDs never authorise actions.

One active house per identity initially. Closed bedroom layouts/chat are owner
only; opening shares with current house members. Closing unsubscribes visitors,
clears their bedroom scene and returns them to the lounge. A per-member
permissionEpoch and per-zone access generation form a revocation barrier: stamp
snapshots/events,increment on close/removal/recovery,abort old requests and reject
responses tagged with older access generation. Server delivery rechecks current
access; client reducer cannot restore an old private scene after the barrier. Removed members lose
read/write/push/asset access. New residents never inherit former private content. Removal transaction rotates
the code and retains a removed-identity guard; reinstatement is an owner command.
Newly issued codes are still shareable capabilities,not a guaranteed human ban.

## One durable authority and ordered visibility

All HTTP/socket intents use the same validator/transaction function. Retain
current UUID receipts, canonical payload hashes and expected revisions.
[Socket.IO delivery](https://socket.io/docs/v4/delivery-guarantees/) defaults to
at-most-once; ACK/recovery alone is not persistence.

Use separate persisted streams: lounge:houseId for shared member/board/focus/chat,
bedroom:bedroomId for private layout/chat. A public cursor must not expose gaps
from hidden room edits. Only authorised viewers subscribe.

Envelope: schemaVersion,serverEpoch,streamId,seq,type,entityId,entityVersion,payload.
Snapshot supplies authorised state,stream cursor,permissionEpoch/access generation
and serverTime. A membership/control permission channel on the same connection
orders grant/revoke barriers; all zone projections carry the issued access token's
generation. Client zone request generation invalidates outstanding HTTP responses
on revocation/switch. Re-grant requires a fresh authorised snapshot.
Subscribe/buffer, obtain a consistent snapshot, apply newer queued events.
Duplicates ignore; a real gap requests resynchronisation. Process epoch changes
clear transient state, not persisted sequence. An HTTP response enters the same
reducer as its later event, deduplicated by stream/seq/command UUID.

Permission validation precedes returning any private receipt. Receipt replay must
not mutate state even after lease expiry. New writes require current control
generation where applicable; identity bootstrap/create/join happen before a
movement controller exists and have separate authorisation.

## Proposed interfaces

| Boundary | Input/result and checks |
| --- | --- |
| GET /api/me | Own identity/home reference; no published presence |
| POST /api/houses | capacity,command UUID; one active-home guard |
| POST /api/houses/join | normalized code,command UUID; atomic membership |
| GET /api/houses/:id/snapshot | Member-scoped lounge projection |
| GET /api/bedrooms/:id/snapshot | Owner or open same-house visitor |
| POST /api/command | Durable chat/board/door/placement/focus intent; revision/receipt |
| socket subscribe/snapshot | Cookie,member,zone; one controller plus one observer |
| socket input | Controller generation,motion sequence,input/target; transient |
| socket seat.claim/stand | Current zone/controller; single occupant and expiry |
| socket preview | Bounded typing/drag/pen; no save claim |
| recovery export/import/revoke | Explicit proof flow; no proof in URL/log |
| GET /api/archives/bedrooms/:id | Original identity only,read-only/export; independent of active membership |
| upload/read later | Membership,quota,decode and metadata guards |

Errors: INVALID_INPUT,FORBIDDEN,SPACE_FULL,ALREADY_MEMBER,REVISION_CONFLICT,
COMMAND_ID_REUSED,CONTROL_MOVED,SEAT_TAKEN,RATE_LIMITED,STORAGE_UNAVAILABLE.
Timeout means uncertainty. Preserve pending UUID/draft until current authorised
state or receipt resolves it. First release does not GC active-house receipt keys:
retain actor/UUID/hash and outcome metadata without private message text for the
project lifetime. Limit new writes and track receipt size. Outbox auto-retry lasts
24hours; older entries require inspect/confirm,not silent resubmission. A future
GC design must define a server-verifiable command expiry and keep consumed-ID
protection; do not delete receipts first and hope the client never replays. Zone change never redirects a queued message.

## Movement, seating and input

Target10Hz network updates with locally interpolated rendering. Local control
predicts simple ground-plane movement; server validates allowed zone,finite
coordinates,speed,footprints,motion sequence and generation. This is proposed
behaviour, not a measured WAN guarantee. Do not reuse the90/min saved-edit limit.

Use circle-vs-AABB footprints, sliding collision and protected spawn/door aisles.
Lounge geometry is fixed; private DIY protects walkable routes. Avatars pass one
another. Clear held keys on blur/zone change, and suppress movement during text,
board/editor focus and Chinese IME composition. Mobile has persistent reachable
movement/action controls; click-to-walk needs validated routes, not only raycasting.

Seats bind member/generation to a30-second reconnect lease. Atomic claim rejects
another occupant. Stand/zone switch/takeover/removal/expiry releases; restart
clears occupancy and clients reclaim after spawn. No ghost avatars or seats.

One controller may explicitly move between tabs; older generations reject input.
Observer status is visible. Application heartbeat proposed10seconds/expiry30;
background throttling changes connection status, not inferred attention.
Volatile motion is never replayed from offline queues.

## Focus and board

Persist deadline or paused remaining time. Settle an elapsed transition once at
startup/read/command and schedule the next transition, avoiding per-second writes.
Starter controls pause/end; owner can take over. Individual opt-out affects only
that person. Session UUID/revision rejects stale timer resurrection. Initial25/5 means one
work phase plus one optional break. Store original workEnd/breakEnd; resumed phase
is a pure function of server time and paused state. An hour offline becomes ended,
not a new five-minute break. Test both deadlines,multiple elapsed phases,pause,
repeated reads and restart.

First board uses DOM cards and SVG strokes. Goal progress is todo/doing/done and helpNeeded is separate; board sections are
filters. Drag modifies coordinates; explicit field actions change progress/help.
Default board view is All. Today is a non-destructive filter of active goals and
unarchived notes; no nightly wipe is implied. Cards preserve conflicting drafts;
separate per-object operations allow editing different cards at once. Drag
preview is transient; release is one durable intent. A completed stroke has a
unique immutable ID, bounded points and author-scoped inverse/tombstone. Full-board
snapshot undo cannot overwrite other people's work. Yjs is justified later by
demonstrated concurrent rich-text or offline merge needs, not by availability.

Image enhancement gates: JPEG/PNG/WebP,2MiB input,4MP,1280px output <=300KiB,
10MiB/house and one decode at a time. These are proposed budgets. Server
validates/re-encodes/removes metadata; client resize is not trust validation.
Use random confined paths, authenticated reads, atomic metadata updates and orphan
cleanup. No SVG/HTML/remote imports initially. Links are plain title+https URL,
without automatic server fetching or embedded iframe.

## Migration, resources and operations

Current v1 has visitors/sessions/one room per visitor/parts/receipts/global seq.
Test a v1-to-v2 migration using copied real fixtures. Retain public C8 content
separately; never announce that public neighbours became private members. An
owner may deliberately import their own prior furniture into a new house.
Preserve catalogue transforms/IDs or present explicit incompatibility.

Back up consistently with WAL-aware SQLite backup, test restoration, then migrate
at mounted startup. Fly release commands cannot access /data. A v2 DB cannot run
under the C8 binary without compatible schema or tested restore. Document handling
of writes after a backup before any rollback; never silently discard them.

Production gates use two exact configurations,30minutes each: (L1) one house,six
controllers plus six observers=twelve connections,including two slow observer
readers; (L2) two six-person houses,twelve controllers plus zero observers=twelve
connections,including one slow-reading controller in each house. Each controller
sends10Hz motion while connected; each house sends six chat/board intents per
minute. RSS<=180MiB,reliable change p95<=1second,bounded queues/stable event loop.
Slow-client expiry/rejoin is part of the result,not a silent exclusion. Local comparison's200MiB gate has a different purpose.
Server capacity starts at two parallel six-person houses/twelve views, not an
unlimited public service; idle houses persist but have no simulation loop.

Coalesce transient updates for slow clients. Stop queuing on backpressure; close
and re-snapshot rather than accumulate reliable payloads. Measure synchronous
SQLite commit/event-loop delay before introducing a bounded DB worker.

Log meaningful server actor/action/time/result/stream sequence and bounded
latency; no message/board text,codes or proofs. Log motion start/stop/zone/seat
actions and aggregates rather than every frame. Alert at70%volume use and bound
chat/event/receipt/assets with explicit retry horizons. No change to the fixed
machine/volume shape is a valid hidden workaround.
