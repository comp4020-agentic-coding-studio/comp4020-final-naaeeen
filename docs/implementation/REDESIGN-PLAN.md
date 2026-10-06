# Game interaction and independent whiteboard implementation

Active extension of root PLAN, 7 October 2026. Baseline `f18fd52` is a mechanically
verified local core which the owner rejected for interaction quality. This record
implements the new owner brief; it does not reopen unrelated resolved lanes.

## Product experience and deliberate scope

A warm private house for 2–6 familiar friends. The game provides recognisable
presence, personal rooms and shared study; the board provides a full writing and
thinking workspace. Writing never requires squeezing long content into world
bubbles. A user can enter the board directly without creating a WebGL renderer.

Keep title/Continue/Create/Join/Options distinct. In-world essentials are a compact
location/connection badge, residents, contextual interaction and a small tool dock.
Long chat, house administration and decorating open in deliberate tools. Chat can
move/collapse; focus, pointer/wheel ownership and keyboard shortcuts remain clear.

The board uses a mature MIT editor island while the vanilla game remains intact.
Candidate Excalidraw 0.18.1 supplies drawing/text/shapes/selection/undo/zoom/export;
it does not supply our collaboration. Sticky notes use bound text rectangles.
React is confined to the board bundle. A different full editor is reconsidered if
actual integration/convergence cannot satisfy the declared task, rather than
silently using full-scene last-writer-wins.

## Registered decisions and comparisons

| Subsection | Common task / criteria | Alternatives and stopping condition |
| --- | --- | --- |
| R0.1 Editor reuse | Draw, sticky note, multiline paste, two-user durable return; licence/build/API costs | Excalidraw, tldraw, Fabric/Konva, WBO. Primary package/source verification, then a real integrated spike. Choose when complete editor and reliable host integration are demonstrated. |
| R1.1 Opening / HUD | New create, join, saved Continue, Options, resume; both viewports and keyboard | Persistent forms/header versus title menu + contextual dock. No hidden current state, lost drafts or blocked controls; fresh review and native tasks. |
| R1.2 Chat / tools | Read long text, type/paste/scroll/drag/collapse while scene remains understandable | One shared fixed panel versus separate movable chat and focused tool modes. Stop after input isolation, reachable controls and draft preservation pass. |
| R2.1 Spatial proportions | Six arrivals/seats/doors/board; own room with ten valid pieces; same avatar and zoom | Existing footprint versus larger authoritative layouts, then separate zoom tuning. Measure open circulation and reachability without claiming reference dimensions. |
| R2.2 Camera | Walk door → seat → board, inspect/pan/zoom, return to self, drag chat/resize | Room-fixed, stable follow and manual inspection. Measure discontinuities and target loss under identical geometry; no preference winner from model or screenshots. |
| R3.1 Board authority | Concurrent independent objects, same-object conflicts, delete/undo, retry/restart | Element-level versioned merge versus scene replacement (negative control). Preserve unrelated edits and tombstones; stored ACK is durable. |
| R3.2 Assets / privacy | Plain text/image paste, valid reload, bad/oversized upload, removed-member read/write | Binary assets separate from scene JSON; membership enforced per action/read/delivery. Never fetch arbitrary remote URLs or trust actor body. |
| R3.3 Board workspace / chat | Standalone direct entry, draw/edit/paste/export, movable chat and mobile | Full editor workspace versus small game panel. A direct route imports no Three game. Embedded close restores the same game position. |
| R4.1 Integration / evidence | Two independent browsers, reconnect/reload, identity/revocation, keyboard/touch, both course viewports | Meaningful red/green, required tests, scoped native tasks, fresh review, parent reconciliation, focused commits. Preserve failures and human/deployment gaps. |

## Phases and ownership

R0: baseline, source research, package/licence/API checks, frozen board transport
contract and owner brief. Parent owns root PLAN, build dependencies/server wiring,
review integration, browser acceptance and final evidence.

R1: game title/HUD/Options, separate movable multiline chat, contextual tools and
board launch. Worker owns house HTML/CSS/UI and their DOM tests. Durable identity,
projection barriers and uncertain original command UUIDs must survive the redesign.

R2: coherent spatial shell/geometry and stable camera with explicit zoom/pan/
recenter/overview. World worker owns renderer/camera/shared geometry and their
unit tests. Layout expands additively; saved furniture transforms remain valid.
No implicit relocation of stored user content or renderer/server geometry mismatch.

R3: a separate board authority/storage/service and editor client/workspace. Board
backend worker owns new board source/spec files; board frontend worker owns new
board browser source/page/style/tests. Parent owns existing server, package/build,
Docker/CI wiring. Interfaces below freeze before parallel implementation.

R4: integration, actual independent browser tasks, security/failure and persistence
checks, scoped resource exercise, fresh independent review, parent fixes/rechecks,
current README/harness/spec/plan alignment, local evidence commits and usable preview.
No old passing result is relabelled as acceptance of changed geometry or UI.

## Frozen board integration contract

A separate `board.sqlite` preserves the existing two databases/schema versions.
House membership and cookie sessions remain authoritative. One canvas/house. Board
read/edit/chat requires current membership regardless of game zone; this is clearly
house-wide content, never bedroom-private chat. Removal/recovery immediately stops
new action/read and promptly clears subscribed clients. House study cards remain a
separate author-controlled object, not a destructive migration into shared shapes.

HTTP `/api/board/context` returns self identity/home. `/api/board/snapshot` returns
`{houseId, sequence, elements, files, chat}`. Files are metadata only: `{id,mimeType,url,created}`;
authenticated GET `/api/board/asset?houseId=...&fileId=...` retrieves binary. `/api/board/patch` POST accepts
`{id, houseId, elements}` (UUID mutation ID); `/api/board/asset` POST accepts
`{id, houseId, file:{id,mimeType,dataURL}}`; `/api/board/chat` POST accepts
`{id, houseId,text}`. `X-House-Identity` is an actor-intent precondition, not auth.
Same-origin, request-size/rate bounds and session recheck after reading apply.
Files in snapshots contain metadata and an authenticated same-origin download URL;
image binary does not inflate every element patch. Own board contribution export
and a current shared canvas download are distinct, explicit actions.

Socket.IO namespace `/board`: client `board.subscribe` with `{houseId}` and ACK;
server `board.snapshot`, `board.patch`, `board.chat`, `board.presence`, `board.revoked`;
all envelopes carry schemaVersion 1, houseId and a server-generated subscriptionId,
renewed on resubscribe. Clients reject old epochs and identity/house responses.
client `board.pointer` transient bounded coordinates/selection. New subscribers
receive a current snapshot; elements merge by version and deterministic nonce
without dropping unrelated objects. Deletes persist as tombstones; undo creates a
new version. Client retains UUID on uncertain save, retries under original identity/
house and distinguishes pending/saved/error. Cursor/view/selection/chat-window
position are local/transient, not persistent scene data.

Backend exports `BoardStore` and `attachBoardService(io, houseStore, boardStore,
{origin,secureCookies,log})`, returning `{handle(request,response),close()}`.
`handle` returns true when a board endpoint was handled. Parent exposes the existing
Socket.IO server through the house adapter and wires cleanup/health. The adapter
must not replace the game controller or raise its inbound command limit merely to
send large board data; substantial board writes/assets use bounded HTTP.

Initial hard bounds are 2 MiB serialized scene, 2,000 retained elements including
tombstones, 128 KiB patch, 32 KiB element, 2 MiB supported PNG/JPEG/WebP asset,
20 assets / 20 MiB per house, 100 retained board messages / seven days, 4,000-character
board message and twelve board views/process. These are explicit product/resource
limits to test, not claims of unlimited enterprise scale. Show actionable error,
retain local work and allow export. Avoid arbitrary embedding/SVG/server URL fetch.

## Validation and sustainable development

Test actual element reconciliation against concurrent create/update/delete/undo,
receipts, persistence/restart, image reload/auth, removed membership, cookie changes
and bounded inputs. Protect the evaluator with scene-replacement and cross-house
negative controls. Editor undo must preserve a peer's unrelated object. Native
checks include pen/drag, text and image paste, canvas/chat shortcut isolation,
movable chat, close/return, direct `/board/`, long names/text, resize and reduced motion.

Content grows through stable furniture IDs/footprints and valid saved layouts;
board schema/limits/storage get deliberate migrations and backup/export. Build
editor assets locally in CI/Docker, self-host needed fonts and retain upstream
licences. New features follow the same subsection evidence loop. Physical phones,
real friend preference/value, production Docker/Fly/WAN and student reflections
remain separate observed tasks. No HD or enjoyment guarantee comes from green tests.

## Reconciled interface details

Higher element version wins; equal version uses lower versionNonce, matching the
pinned editor. Receipts return canonical winners for touched IDs; a losing edit
must be visible/recoverable, not labelled as the winning shared state. Remote
updates use captureUpdate NEVER so they do not become local undo steps. Test both
independent-object undo and same-object edit/undo conflicts against actual editor.

Asset snapshots are metadata only. Two MiB decoded images require a bounded
three-MiB JSON wire request, signature/dimension verification, current membership
and immutable asset IDs. Text links are HTTPS, embeds/SVG/server fetch disabled.
Per-action/read/delivery checks and a 200-ms subscription sweep reject/clear removal,
recovery, leave and house archive. New subscription IDs fence delayed old events.

Own export contains each actor's last authored element contribution, kept apart
from a peer's subsequent rewrite, plus their own uploads. It is available to the
verified original identity after departure through POST /api/board/export; it does
not expose another user's chat/assets or a shared cursor. Shared objects remain
editable by current housemates after their creator leaves; author study cards
remain separate. No cross-database atomic departure transaction is assumed.

The game opens a same-origin full-screen board iframe; only board HTML allows
SAMEORIGIN/frame-ancestors self. Exact frame source/origin guards close messages.
Game input/RAF suspends while the workspace is foreground but its socket stays
alive; returning restores position/camera/drafts. Standalone Create/Join establishes
identity using current house APIs, without a controller or Three import. Editor
shortcuts stay scoped; chat owns its typing/paste/wheel and offers reset/dock controls.

Camera/space criteria are registered separately: preserve chosen overview, no HUD
configure jump, consistent resize orientation, bounded pan/zoom/recenter, every
door/seat/board route and saved arrangement valid. Larger layouts preserve stored
coordinates; they do not relocate user objects. Hard retained-element caps show
export/full errors and preserve local drafts; tombstones are never silently removed.
A future compaction requires an explicit reset epoch and stale-offline contract.
Combined maximum-state/network/resource and three-database backup tests precede
acceptance of a resource claim. They do not inherit baseline load success.
