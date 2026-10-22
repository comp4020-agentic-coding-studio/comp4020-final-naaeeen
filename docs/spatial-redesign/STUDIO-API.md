# Personal room studio API

Frozen implementation contract, 23 October 2026. This is an additive local capability
under the owner's implementation request; browser and human acceptance are separate.

## Methods and authority

`new RoomStudioStore(houseDatabasePath, { authorizeRead, authorizeExport?, now? })`
opens a separate connection to the SAME existing house SQLite file. HouseStore must
open/migrate that file first. `authorizeRead(actorId, roomId)` synchronously checks
CURRENT room permission and returns `{ ownerId }`; the parent can use
`HouseStore.authorizeZone` and `snapshot(...).room`. It must throw on denial.
`authorizeExport(actorId)`, when provided, validates the trusted identity without
requiring present membership. The parent derives every actor from its session.

Public methods (all synchronous):

- `state(actorId, roomId): StudioState`.
- `image(actorId, roomId, imageId): { bytes: Buffer; mime: "image/png"; image: StudioImage }`.
- `execute(actorId, command, authorizeWrite: () => void): StudioReceipt`.
- `exportOwn(actorId, cursor?: string): { schemaVersion: 1; rooms: StudioExportRoom[]; nextCursor: string | null }`.
- `exportRoom(actorId, roomId): StudioExportRoom` (original-author export, including bytes).
- `close(): void` (idempotent).

Every current read/image and write/retry invokes current read authority. Execute
also checks original room ownership and invokes the REQUIRED per-request write
callback, which the parent binds to `realtime.authorizeRoomHttp(actorId, roomId,
generation, controllerToken)` after body arrival. These callbacks finish BEFORE
the studio SQLite transaction starts; no callback or await is held inside its
transaction. Runtime then performs only synchronous operations until commit.
The callbacks must not return promises. Exact accepted retries still require
current read, owner and controller authority, then replay BEFORE revision conflict.
Guests inspect the owner's material; they cannot alter saved content/view/preset.

## JSON commands and responses

Endpoint proposal: `GET /api/house/studio?roomId=...`,
`GET /api/house/studio/image?roomId=...&imageId=...`, and
`POST /api/house/studio/command`. Parent owns HTTP routing/status/headers.
Every POST is ordinary JSON under the existing 16 KiB request limit:

`{ commandId: UUID, roomId: UUID, expectedRevision: nonnegativeInteger, type, payload }`

The parent may carry controller generation/token outside the command object, then
remove them before execution. All unknown command/payload keys are rejected.
UUID replay compares a canonical SHA-256 command hash; reusing an accepted UUID
with a different payload fails `COMMAND_ID_REUSED`.

| type | payload |
| --- | --- |
| `studio.upload.begin` | `{ bytes: integer 1..262144, mime: "image/png" }` |
| `studio.upload.chunk` | `{ uploadId: UUID, index: integer 0..31, data: canonicalBase64 }` |
| `studio.upload.commit` | `{ uploadId: UUID }` |
| `studio.upload.abort` | `{ uploadId: UUID }` |
| `studio.view` | `{ x: number 0..1, y: number 0..1, zoom: number 1..4 }` |
| `studio.soundscape` | `{ preset: "off" | "rain" | "fire" | "night" }` |
| `studio.clear` | `{}` |

Chunk order is contiguous. Each decoded chunk is 1..8192 bytes; all chunks except
the final one MUST be exactly8192 bytes. Begin reserves one bounded upload and
returns server-generated `uploadId`, `expiresAt`, `nextIndex: 0`,
`receivedBytes: 0`. Chunk returns that uploadId plus updated nextIndex and
receivedBytes. Commit accepts exactly the declared total bytes and a fully decoded,
validated/re-encoded PNG. It atomically replaces the current image and resets view
to `{ x: 0.5, y: 0.5, zoom: 1 }`. The old image remains readable until that commit.
A stale/incomplete/invalid upload cannot replace it. Clear withdraws current bytes
and resets view, while leaving the saved soundscape unchanged.

Room revision starts at0. View/soundscape/clear/commit increment it once; begin,
chunk and abort do not. Begin/chunk/commit use the current revision AND the upload's
base revision. Concurrent room edits therefore require rereading/restarting an
upload. Abort only requires current ownership/controller authority and ignores
revision conflict so stale temporary material can still be discarded.

State: `{ ok: true, roomId, ownerId, revision, image: null | { id, width, height,
bytes }, view: { x, y, zoom }, soundscape, writable }`. `writable` means the
current reader is original owner; the write callback additionally enforces live
control. Preset playback/volume is explicit and local; reading state never starts
audio. Visitors' local crop/zoom is not written to owner state.

Receipt: `{ ok: true, commandId, roomId, revision, result? }`. Result contains only
bounded upload metadata or `{ imageId }`; NO raw PNG/base64, filenames, tokens,
aliases or arbitrary content. Receipts are at most512 UTF-8 bytes. A successful
retry returns the same original receipt, even after subsequent revisions.

## Bytes, privacy, persistence and export

One currently chosen PNG per original room, at most256 KiB and1,048,576 pixels, maximum2048 pixels per edge;
8-bit RGB/RGBA, noninterlaced PNG only, matching browser Canvas output. Server
checks signature, CRCs, chunk order, bounded inflate, exact raster size, row filters
and dimensions, reconstructs pixels, strips ancillary metadata and writes a clean
PNG. No SVG/JPEG/WebP, URL fetch, animation or external decoder/dependency.

Authenticated image lookup requires CURRENT room permission and exact current
imageId for THAT room. Replaced/cleared IDs cannot retrieve old bytes or cross-room
data. Private responses require no-store; the parent must not cache/broadcast raw
bytes or material after room access generation changes.

Studio tables are namespaced `room_studio_*`, with their own metadata schema
version1. Do not alter `PRAGMA user_version`, HouseStore's tables, prior rows,
legacy cards, receipts or the number of database files. Selected material/view/
preset survives restart, room closure and membership departure. Author export
returns only rows whose immutable original owner matches the trusted actor,
including base64 of the currently chosen image (at mostone per room), at mosttwo room rows per page sorted by roomId, with nextCursor for continuation, preserving
a separate own-export route after departure. It never grants current-room reads
after departure or access to a later resident's material. Clearing withdraws the
chosen bytes from subsequent reads/export; historical copies cannot be recalled.

Temporary uploads last5 minutes and are cleaned on open/new command. Maximum2
per actor and12 globally; each receives only its declared bounded bytes. Upload
chunks live in the same SQLite file and are not current material. Successful
receipt IDs are retained; per actor admission stops at4096 receipts or1 MiB of
receipt JSON rather than discarding used IDs. Exact retries remain available at
the cap. The combined canonical chosen-image bytes across active AND archived rooms are capped at8 MiB per original identity; growth is rejected without deleting old material. Current/export data is bounded per retained room, not a lifetime house
disk cap; archived identities/rooms and SQLite overhead remain part of resource
measurement. No filenames/source image contents are logged.

Errors use existing `HouseError`: `INVALID_INPUT`, `FORBIDDEN`,
`REVISION_CONFLICT`, `COMMAND_ID_REUSED`, `UPLOAD_EXPIRED`,
`UPLOAD_INCOMPLETE`, `UPLOAD_CONFLICT`, `STUDIO_LIMIT`,
`STORAGE_UNAVAILABLE`; callback controller errors propagate unchanged.



Ingress refinement: studio mutations also require the captured positive integer
`X-House-Access-Generation` header. It is checked against the current controlling
connection after body arrival, in addition to identity, controller token, generation,
room and current door permission. A reopened room is a new access epoch.
