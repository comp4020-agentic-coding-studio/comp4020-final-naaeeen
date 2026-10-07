# Active game and standalone-board extension

The 7 October redesign adds the implementation contract below to the earlier house
authority design. It supersedes card-only/no-drawing statements in the historical
house sections. Source is authoritative: three additive SQLite databases, a
vanilla Three game and a separately built React/Excalidraw board. The original
Crit 8/legacy database and house schema remain preserved.

# Shared-house implementation and lifecycle design

Updated 7 October 2026. This describes the actual local implementation. The
published service remains the frozen Crit8 rehearsal until an authorised release.
[PLAN](../../PLAN.md) defines purpose and scope; [validation](../implementation/VALIDATION.md)
and the [subsection register](../revisit/REGISTER.md) identify actual acceptance.
Historical plans remain useful alternatives, not current endpoint/schema contracts.

## Stack and ownership boundaries

One Linux Node 24.21.0 process serves native HTTP, SQLite, Socket.IO 4.8.4,
Three.js 0.186.1 modules and DOM controls. Production remains one shared CPU /
256 MB Fly machine with one 1 GB `/data` volume. The game remains vanilla Three/DOM; the independent board is a React/Excalidraw
browser island. No Redis, external database or generic ECS/plugin architecture
was introduced.

| Actual module | Responsibility |
| --- | --- |
| src/house-contract.ts | Typed durable/live data and command/receipt shapes |
| src/house-store.ts | Identity, membership, permissions, transactions and persistence |
| src/house-realtime.ts | Current-session authority, streams, control, presence and seats |
| src/server.ts | HTTP, origin/input boundaries, cookies, static files and shutdown |
| public/house-client.js | Ordered authorised reducer, uncertain-command outbox and transport |
| public/house-geometry.js | Shared footprints, collision, layouts and validated routes |
| public/house-world.js | Original procedural room/avatar models, input, picking and animation |
| public/house-camera.js | Transient close follow, overview and safe framing |
| public/house-label-layout.js | Bounded previews, glyph/rectangle layout and occlusion |
| public/house-ui.js | Lobby, status, conversation, cards, room drafts and administration |

Socket.IO offers acknowledgement and connection machinery while keeping the
existing HTTP/store. Its transport is not durable delivery. SSE plus POST remains
a credible lower-frequency alternative; Colyseus changes schema/lifecycle and
prediction integration. The earlier comparison bundled transport and projection
factors and cannot rank every framework. See the recorded comparison and ADRs.

## Actual storage and migration

`neighbourhood.sqlite` schema 1 / `night_session` preserve the unchanged C8 public
window data. `house.sqlite` schema 1 / `house_session` add the private house.
Wire/export schemaVersion 2 is independent of SQLite user_version. No in-place
v1-to-v2 legacy migration or automatic identity/content import occurred.

| Persistent record | Meaning |
| --- | --- |
| identities, sessions, recovery | Stable UUID/profile; opaque session/proof digests, expiry and revocation |
| houses | Unique eight-character code, fixed capacity 2–6, owner and active/archive state |
| members, bedrooms | Permanent active house/slot ownership; offline keeps membership; archived former rooms |
| bedroom placements | Validated bounded JSON arrangement, palette, door permission and common room revision |
| cards | Author-owned goal/question/resource/nextStep, explicit help/state/revision |
| chat | Author/name/text/time and zone sequence; latest 100 per zone, up to seven days |
| streams | Persisted per-zone sequence counters; no persisted delta-event table |
| receipts | Actor/UUID/canonical hash and committed outcome; idempotent replay |
| archives, removed_guards | Original-identity room/card export and stable removal guard |

Only memory holds connections, avatar position/heading/animation, controller and
access generations, seat reservations and declared willingness. Camera, selection
and unsaved previews are local. The game authority has no drawing, typing-preview, timer or CRDT channel.
The independent board authority below owns drawing, images and shared elements.

Use short BEGIN IMMEDIATE transactions, foreign keys and bound SQL parameters.
Create/join allocates a permanent slot and bedroom atomically with its receipt and
cursor; last-slot contenders yield one winner with no loser profile side effect.
A disconnection is not a departure. Rejoin returns the same member/room.

The store reuses at most 96 constant SQL StatementSync plans per instance. Every
execution still reads current rows with current bindings; this is not a result or
permission cache. References clear on close/startup failure. Future query/catalogue
changes must revisit the bound and migration compatibility. The native preparation,
authority, failure/restart and short controlled comparisons are recorded separately
from sustained RSS acceptance.

## Identity, permissions and lifecycle

An HttpOnly opaque cookie identifies the actor; production adds Secure and
SameSite=Lax. Display names, body actor fields, socket IDs and house codes never
authorise an identity. Recovery proof is private, single-use and replaces old
sessions/controllers; returning to a full house does not claim another slot.

The code invites someone into the whole house. Capacity counts permanent members,
not sockets. One active house per identity; one controller and one observer per
identity, and twelve live views per process. Stable removal guards prevent that
same identity rejoining until owner reinstatement, but do not identify every
possible new human identity. Removal rotates the code. Transfer ownership before
leaving with others; last departure archives the house and disables its code.

Own bedrooms begin closed. Opening grants current housemates arrangement/history
access; closing or removal clears a visitor's private scene and returns them to
an authorised lounge. Every input, subscription, delivery and private receipt
replay checks current membership/session/room access. Server epoch, access
generation, controller generation and client request barriers reject stale data.
A new grant requires a fresh authorised snapshot; camera motion never changes rights.

`X-House-Identity` is a compatibility precondition for delayed UI requests, compared
against the cookie actor before and after body receipt. It never authenticates the
caller. New clients supply it; old callers may omit it. Scoped HTTP mutations also
need current zone, controller generation and private tab token. The original
house ID and command UUID survive uncertainty; a draft cannot move into a new house.

Own export contains the profile, current owned room/cards and original-identity
room/card archives. It contains no session/recovery secrets and no general chat
transcript export. Departures preserve owned work before trimming inactive cards.
Archived rooms are retrieved through this export, not a separate archive browser.

## Actual interfaces and synchronisation

| Boundary | Current contract |
| --- | --- |
| GET /api/house/me | Establish/return own identity, active home and archive count |
| POST /api/house/command | Stable UUID durable intent through the shared authority |
| GET /api/house/snapshot?zone=… | Current member's authorised bounded projection |
| POST /api/house/recover | Private proof; rotate sessions and return recovered identity |
| POST /api/house/recovery-key | Authenticated proof issuance/replacement |
| POST /api/house/export | Authenticated original-identity room/card export |
| GET /api/house/removed-members | Current-owner keyset pagination |
| Socket subscription/control/motion/seat/availability | Current cookie, membership, zone and generation |
| house.snapshot / house.motion / house.revoked | Authorised saved projection, compact transient players and revocation |

The HTTP body is bounded at 16 KiB, UTF-8 JSON only; origin, rate and session
boundaries are enforced. Failures retain clear domain codes without private payloads.
Static routes are whitelisted/confined; remote resource links are validated HTTPS,
without server fetch or iframe. Text uses textContent. `/readme/` publishes the
whole argument; `/legacy/` retains the public C8 UI and its existing API.

Lounge and bedroom streams have separate persisted cursors. Current implementation
broadcasts bounded authorised snapshots and compact volatile motion; it does not
implement the earlier proposed replay-event envelope, delta log or history API.
Reconnect obtains current saved state. Receipts commit atomically with effects and
cursors before ACK. Delayed/repeated ACK cannot claim another effect. A timeout is
pending, not saved. Automatic outbox retries stop after 24 hours; explicit original-
scope retry/export/discard is available. Receipt keys are not garbage-collected
until a verified server expiry/consumed-ID contract exists.

## Movement, seats, camera and personal expression

Client ground-plane prediction/interpolation accompanies server speed, sequence,
generation and geometry checks. Circle/AABB collision, sliding, route clamping
and protected arrivals keep doors/seats/board reachable. Avatars pass one another.
Actual permanent slots spawn apart. Clear input on blur/visibility/permission
change; text/IME/editor focus never drives a character. Volatile motion is not
queued as a durable offline command.

Seats have one occupant and a 30-second same-controller reconnect reservation.
Stand, zone change, takeover, removal, expiry and restart release/reset correctly.
Changed furniture reconciles invalid positions and chair poses. DIY is six kinds,
ten pieces, half-unit grid, quarter turns and six palettes. Revisioned metadata/
layout drafts preserve newer edits; only an own receipt safely advances their base.
Conflicts retain work and offer an explicit saved-state review/reset.

Close play fills more of the frame while fixed-angle bounded following keeps
self clear of actual controls. Overview reveals context; Recenter returns to self.
Editing uses a stable overview. Reduced motion disables easing/decorative bob.
The [camera evidence](../implementation/CAMERA-EVIDENCE.md) includes matched views,
actual mesh/glyph bounds and disclosed cropping; this is not human preference proof.

Quiet/Can chat is explicit and separate from presence, location and room openness.
New lease/full reload/restart defaults Quiet; short same-token reconnect may retain
choice and its last-set time. Lounge helper eligibility requires connected, present
there and self-declared Can chat. Quiet hides all floating speech previews; transcript
and unread cues remain. Fresh previews use monotonic arrival, max three globally,
one/member, about 80 Unicode codepoints and four seconds. Initial/reconnect history
never appears as fresh speech. Smaller viewports may suppress more labels; native
roster/Overview/Chat retain context.

Cards are optional, one active per author plus twelve inactive per house. Each card
has its own revision; authors control content and explicit closure. NextStep never
automatically solves/closes a question. Departure uses ownerLeft and original-
identity archive before trimming. No forced timer, pairing, mention or reply.

## Operations, evidence and future changes

Native operations tests restore the original two live WAL databases, identities,
receipts, room state and next steps; the board integration tests separately restore
all three quiescent databases and board asset BLOBs; main-file-only copies fail the deliberately populated
WAL control. Separate database backups do not create a common cross-database
instant; quiesce writes when that common boundary is required. A later source write
is absent from the earlier backup. Restore/rollback must account for it explicitly.

Mounted startup creates/checks the additive schema and fails safely on unknown
versions. A Fly release command cannot access the volume. The old C8 binary can
continue with its unchanged legacy database and ignores house.sqlite; preserve
that new file and its later writes during a UI/binary rollback. Any future
incompatible house schema needs an explicitly tested compatibility/restore plan.
No new production backup/deployment is claimed by local tests.

Exact sustained L1/L2 gates remain twelve views, 10 Hz input, six durable intents/
minute/house, 1800 seconds/configuration, RSS <=180 MiB and combined reliable p95
<=1 second. All slow-reader expiry/rejoin, count, queue and valid-input gates are
retained. Source-frozen pacing-v3 runs follow a calibrated generator repair; older
failures remain evidence. [Operations](../implementation/operations-evidence.md)
and [load refinement](../revisit/LOAD-PACING-REFINEMENT.md) distinguish full trials,
short calibration, double-based source tests and unmeasured Fly/WAN conditions.

Catalogue/theme additions need stable IDs/footprints/anchors, licences and migration
checks. Live profile appearance, timers, voice and multiple houses each need demonstrated
value, their own contracts and resource acceptance. The current larger layouts and
independent drawing/image board follow the owner-authorised redesign below. No new package earns adoption merely by popularity.
Future renderer work should measure actual target devices and startup/frame cost;
software-rendered local checks cannot prove physical-phone performance or enjoyment.

## Current independent board implementation

`board.sqlite` has its own version-one schema, separate from `house.sqlite` and
`neighbourhood.sqlite`. Durable elements, tombstones, binary images, messages,
canonical mutation receipts and per-actor last-authored contributions belong there.
HouseStore remains authoritative for identity and active membership. No cross-file
atomic departure transaction or replicated storage is claimed. Read/actions/delivery
recheck current sessions/membership; a 200-ms sweep clears revoked board views.

HTTP `/api/board/context` establishes/reuses identity. Snapshot and authenticated
asset reads are distinct. Patch/image/chat writes require captured actor intent,
original house ID and mutation UUID. Bodies have separate explicit limits.
`/api/board/export` provides own authored contributions/uploads, including after
departure; it does not reveal a shared cursor or other residents' chat/assets.

Socket.IO `/board` has an independent physical manager (`forceNew`) from the game.
Subscribe returns one full snapshot through its ACK; duplicating that large snapshot
was reproduced to close valid near-limit boards and repaired. Envelopes include
schema version, house, subscription identity and cursor. Old subscription/identity
responses cannot repopulate a revoked view. Cursor/selection/view state is transient.
Every response/error ACK and revocation path has the same outbound protection.

Persistent updates are touched elements, not whole-scene replacement. Higher
versions win; equal versions use lower nonce. Canonical winners and retained
tombstones preserve convergence and deletion. Remote changes use the editor's
NEVER history capture; own undo preserves unrelated peer edits. This is not
character-level text merging. Conflicting local work is recoverable explicitly.

Canvas bounds: two MiB serialized state, 2,000 elements including tombstones. Images
are PNG/JPEG/WebP, two MiB each, twenty files/twenty MiB per house. Snapshot files
are metadata/authorized URLs; binary never accompanies every element refresh. PNG
structure/CRC and image dimensions are checked. JPEG/WebP header checks do not
claim full server pixel decoding. Arbitrary SVG/embedded frames/server URL fetch
are disabled. Chat retains the latest hundred messages for seven days.

The client keeps original UUIDs and scoped pending work on uncertainty. Review
reproductions repaired failed-image loss of adjacent text and a false Saved state.
The resulting unchanged-callback feedback then caused a real React update loop;
notifications now require an actual element/file-data change. Both module and
native checks cover these boundaries; helper tests alone did not establish UI.

## Presentation, packaging and future changes

The game uses title/Create/Join/Continue, compact HUD, independent movable chat and
modal tools. Lounge16x11 and bedroom14x10 preserve saved coordinates. Fixed camera
orientation, manual pan/zoom, explicit Overview and recenter use measured posed
actor extents. Options is excluded from underlying world framing; closing an editor
restores a play/Overview frame after new HUD geometry arrives. Visual-viewport
changes invalidate fits, while ordinary chat dragging preserves the camera.

The full-screen same-origin board iframe suspends game input/rendering without
relocating the avatar. Only board HTML permits SAMEORIGIN framing. Standalone entry,
key issuance/recovery and private export need no Three/game renderer. Proofs stay in
private component memory with actor/generation fencing and clear on close/revoke.

A native esbuild stage bundles the browser island and self-hosts required fonts
and licences. Runtime Node dependencies stay separate. Fixed-name entry JS/CSS
revalidate after a new build; fingerprinted chunks/fonts have bounded caching.
The game now supports 2,000-character text. Its actual worst retained Unicode
transcript exceeded the old512-KiB guard; a real red/green subscription test supports
separate1-MiB frame/2-MiB queue ceilings. Four-packet and16-KiB input limits remain.
Board frames have independent4-MiB/eight-packet protection. Old load results are
source-bound and do not become acceptance of these expanded limits.

Backups include all three quiescent/WAL-aware databases, including image binaries.
Future content uses stable furniture IDs/footprints and tested existing-room
migrations. Tombstone/receipt compaction and unused-image reclamation need explicit
expiry/reset epochs, stale-offline rules and source-bound tests before changing
retention. They are not silently promised by the present hard caps. Production
Docker/Fly/WAN and physical-phone/human value remain separately verified tasks.

## Operator rollback and data boundary

Stop writes and use SQLite backup for all three databases before a new release.
Include board image BLOBs in board.sqlite; a scene JSON export alone is not a complete
backup. Restoring independent live copies does not produce a common instant, so
quiesce the service for a consistent three-file checkpoint. The actual local
createService/backup/restart tests cover this boundary; production mounted-volume
operations remain NOT RUN.

A rollback to the frozen Crit 8 binary reads only neighbourhood.sqlite. Retain
house.sqlite and board.sqlite with all later user changes when changing binaries.
A rollback to the earlier house binary ignores board.sqlite but must also retain
it. Never replace the volume with an old fixture or seed database to make an older
binary start. Unsupported schema versions fail closed and require a tested
compatibility/restore decision. No production credential, volume or deployment
change is authorised by this local runbook.
