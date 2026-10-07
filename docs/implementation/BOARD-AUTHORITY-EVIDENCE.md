# Board authority evidence, 7 October 2026

Scope: additive `src/board-contract.ts`, `board-store.ts`, `board-service.ts` and
matching contract/store/service specs. Existing house and legacy schema and game
input limit are preserved by this worker. Parent owns server/build/UI integration,
required whole-project verification, final diff, independent review reconciliation,
and commits. All verification here used Windows-to-Ubuntu WSL commands with native
`mise exec`, Node 24.21.0 and pnpm 11.9.0. No publication or participant trial ran.

## R3.1 Durable scene, convergence and uncertain save

Requirement: retain independent objects, merge a shared object deterministically,
persist deletes, restore by a higher version, commit a UUID receipt atomically,
and reread the same saved state after restart. Full-scene replacement is the
registered negative control. Acceptance was defined before six behavioral red
checks against an inert authority scaffold: the six failed for missing saved
objects, non-convergence, absent tombstones/restart and missing rejection rules.
The first runner selection found no files, and default setup lacked an app; these
were infrastructure attempts, not behavioral red results.

Primary 0.18.1 sources:
[reconciliation](https://github.com/excalidraw/excalidraw/blob/v0.18.1/packages/excalidraw/data/reconcile.ts),
[element types](https://github.com/excalidraw/excalidraw/blob/v0.18.1/packages/excalidraw/element/types.ts),
[fractional ordering](https://github.com/excalidraw/excalidraw/blob/v0.18.1/packages/excalidraw/fractionalIndex.ts),
and [font constants](https://github.com/excalidraw/excalidraw/blob/v0.18.1/packages/excalidraw/constants.ts).
The server implements higher version then lower nonce. Exact version/nonce
collisions prefer tombstones, then lexicographically smaller canonical JSON, so
arrival permutations converge. Order uses bounded editor indices and ID ties.
The browser editor is not imported into Node: upstream uses browser/environment
state. Backend checks test the contract directly; actual editor history belongs
to the parent browser acceptance lane.

Observed checks: independent create/update, two nonce permutations, exact-nonce
permutations, stale resurrection rejection, higher-version undo, full old undo
scene preserving a peer's newer object, deterministic order and UUID reuse
rejection. The evaluator accepts both independent object IDs, and rejects a
scene-replacement result containing only the last peer object. An actual SQLite
trigger rejects receipt insertion: state, sequence and receipt roll back; removing
the trigger permits the original UUID to save once. Restart checks reopen the
same database and verify scene, receipt, binary image and per-author contribution.

`board.sqlite` schemaVersion/user_version 1 is separate. Unsupported versions and
an unrelated existing schema fail before board migrations or WAL mode changes.
Shared scene is capped at 2 MiB / 2,000 objects including tombstones; no tombstone
GC exists. The actionable full-board error says to preserve/export local work.
Own contributions have a separate actor/object table, containing the author's
latest submitted payload rather than a subsequent peer rewrite, with a matching
2 MiB bound. Contribution/export state and the receipt are part of one board
transaction; departure is not described as an atomic two-database transaction.

## R3.2 Images, input bounds and departed authors

Requirement: paste supported binary images, reload via authenticated URLs, bound
wire/decoded size and storage, deny arbitrary embedding/URL fetching, retain own
contributions after membership loss without revealing another member's content.
Binary storage was compared to embedding data URLs in every scene/snapshot under
the same image reload task. The selected wire contract is metadata-only snapshots
and a separate authenticated GET; element patches contain no image bytes.

Supported scene types are rectangle, diamond, ellipse, line, arrow, freedraw,
text, image and frame. Strict field lists reject iframe/embeddable/magicframe,
selection and arbitrary customData. Tests cover multiline text, bound sticky-note
fields, arrows/elbow segments, freehand pressure arrays, safe HTTP(S) links,
finite coordinates, numeric ranges, ID/order/collection sizes, duplicate IDs,
self-container/group errors, control characters and executable URL schemes.
These are bounded shape/reference-field checks; they are not a full cross-object
constraint solver. Image references require an asset in the same saved house.

PNG/JPEG/WebP magic, dimension headers, truncation checks and strict canonical
base64 are local. Limits: 2 MiB decoded, 3 MiB HTTP asset wire, 20 assets / 20 MiB
per house, 8,192 pixels per side / 16 million pixels; animated WebP and SVG are
rejected. No server remote fetch exists. Same file ID/different bytes fails;
same ID/same bytes returns saved metadata. Snapshot files are exactly
`{id,mimeType,url,created}`. Download sets trusted MIME, nosniff, no-store and
same-origin resource policy.

A real CRC-bearing 820x820 random RGB PNG exercises >1,900 KiB decoded and >2 MiB
JSON wire. Upload and exact binary reload pass; the snapshot stays under 1 KiB.
JPEG/WebP synthetic header fixtures exercise validator branches and are explicitly
not pixel-decoder/browser-reload evidence. This service checks signatures/headers
and dimensions; it does not decode/re-encode pixels or remove metadata. Browser
acceptance must verify actual JPEG/WebP display and invalid-image errors.

Own export remains callable under the original current session after leaving,
removal or last-resident archive; it includes only that actor's contribution
records, uploaded metadata and retained messages. Its sequence is zero to avoid
revealing shared changes. A former uploader may retrieve their own bytes; shared
snapshots, new shared writes and another member's assets still require membership.
Tests verify peer rewrites do not replace the author's exported payload, no other
actor's upload becomes readable, and shared content remains for the group.

## R3.3 HTTP, subscriptions, chat and ephemeral state

Requirement: server-resolved cookie identity, captured identity/house intent,
current membership before every read/action/delivery, fresh subscription epochs,
prompt revocation and bounded transient state. Same-origin and fetch-site checks
apply; new writes require captured `X-House-Identity`. Body arrival is asynchronous:
actual delayed HTTP tests revoke the session by recovery or remove membership
before finishing the body, then verify rejection and unchanged scene.

Actual Socket.IO namespace `/board` uses the existing server and unchanged
16 KiB inbound limit in the fixture. Subscribe ACK is
`{ok:true,schemaVersion:1,subscriptionId,snapshot}`; snapshot is augmented directly
with `schemaVersion:1,subscriptionId`. Every snapshot/patch/chat/presence/revoked
server envelope carries this version and server-issued subscription UUID. Every
new subscribe renews the UUID. Patch ACK additionally supplies canonical winners
for touched IDs. Chat event wraps `{houseId,sequence,message}`. Presence wraps
`{houseId,views:[{id,name,colour,pointer?}]}`. Pointer includes bounded x/y and up
to 100 selected IDs; it is never saved. A missing or stale client pointer subscription ID fails.

A 200 ms authorization sweep clears removed/recovered/left/archived subscriptions;
actual tests require receipt under 250 ms measured from the state mutation.
Every broadcast independently rechecks each recipient before delivery, and an
immediate remove-then-save test receives no new content before the sweep. Outbound
memory is bounded by 4 MiB / eight pending packets; a slow transport disconnects
and must obtain the current snapshot. Parent must reconcile this envelope budget
with the existing game's 512 KiB aggregate Engine.IO outbound guard when both
namespaces share one engine connection.

Chat is explicitly house-wide, 4,000 characters / 100 retained messages / seven
days. No game-zone or willingness rule makes the board private. Tests verify
multiline retention, count/age, retry deduplication and logs excluding private
text/session tokens. Twelve total board views, 20 pointer events per view/second,
24 subscribes per identity/minute and 240 HTTP reads/writes per session/minute are
bounded. Bootstrap is capped at 60 requests per source address/minute before
creating an identity. At most four asynchronous bodies buffer concurrently; an
actual four-held-request fixture rejects a fifth before saving. Body idle timeout
is 10 seconds; exact timeout delivery is not separately exercised here.

## Verification and remaining integration gates

Completed bounded authority run before the final size-error and pointer-token refinements:
`mise exec -- pnpm exec vitest run --config vitest.board.config.ts
spec/board-store.test.ts spec/board-service.test.ts spec/board-contract.test.ts
--coverage`: 62 PASS in 2.67 seconds. Authority src scope: 90.02% statements,
86.24% branches, 97.16% functions, 89.88% lines. Contract/store/service per-file
line coverage: 92.66% / 91.54% / 86.90%. The broader config also includes frontend
files; zero frontend coverage in this backend-only invocation is not a frontend
failure or measured complete-workspace coverage. Final rerun will supersede these
counts below. Typecheck passed with the current integrated checkout.

Preserved evaluator failure/refinement: a generic deep Buffer assertion on about
two million properties exceeded the 5-second test timeout under coverage. Native
`Buffer.equals` verifies exactly the same bytes without property traversal; the
62-check suite then completes in 2.67 seconds. No product limit or behavioral
assertion was weakened. Bootstrap/body-budget additions were checked afterward.

Fresh independent review: requested from parent because all seven agent slots
were occupied. Pending parent review and reconciliation; self-review and the
actual checks above do not substitute for it. Parent integration/browser gates:
real independent editor clients, native shared-object and independent undo,
ordering/binding consistency after editor restore, sticky/text/image paste,
standalone route and game return, actual JPEG/WebP decode, mobile/keyboard,
shared-engine backpressure, required full-project checks and secret scan. Fly,
WAN, physical phones, long sustained load and human usefulness/preference are
NOT RUN in this lane. No local commit or push was made by this worker.

### Final worker checkpoint

The final decoded-size regression produced 63 passing authority checks, 3.36 s,
using the already installed native runner:
`mise exec -- node node_modules/vitest/vitest.mjs run --config
vitest.board.config.ts spec/board-store.test.ts spec/board-service.test.ts
spec/board-contract.test.ts --coverage`. Src-only aggregate was 90.05% statements,
86.27% branches and 89.90% lines. This direct invocation did not install packages
or change build-script approvals. The pnpm wrapper temporarily rejected a
concurrently introduced @parcel/watcher ignored build; parent owns dependency
policy. Concurrent frontend typecheck error in `spec/board-ui.test.ts` was handed
to its owner. Final pointer-token enforcement and readability refinements are
checked in the last rerun below; parent still owns fresh review and integration.

Final pointer-token/readability rerun: 63 PASS in 2.49 s; src-only aggregate
90.02% statements / 86.21% branches / 97.14% functions / 89.83% lines.
Per-file lines: contract 91.41%, store 92.37%, service 86.97%. Integrated native
TypeScript exited 0. Owned-file `git diff --check` exited 0. Parent reports its
locked install/peer/audit lane settled and owns the complete runtime verification.
A fresh read-only authority/integration reviewer was dispatched by the workspace
worker with fork_turns none. A factual source/rubric packet was supplied;
findings and parent reconciliation are pending, not counted as completed review.

## Fresh review findings, reproduction and repair

A fresh authority/integration reviewer confirmed two service defects. Real Socket.IO
reproduction stalled transport.writable after subscribing and sent 100 invalid
pointer requests with ACKs: 100 queued packets exceeded the declared eight-packet
bound. Error ACKs and revocation bypassed the original outbound guard. A new
behavioral test failed with 100 versus at most eight. Every success/error ACK now
uses one bounded helper; revocation is also checked, and overflow directly closes
the Engine connection with discard rather than enqueueing a disconnect frame.
The original and added negative control both pass after repair.

Aged chat UUID replay returned its original receipt and rebroadcast the retired
message. The actual HTTP/socket test failed with an expired delivery. The service
now reads the cheap current sequence before a mutation and emits only when its
sequence advances. Original idempotent receipt responses remain unchanged; stale
patch/no-op/asset/chat retries do not create fresh delivery. The original-event
arrival is awaited before testing replay, so an earlier in-flight event is not
mislabelled as the replay. Both findings were reproduced by this worker; reviewer
contextual recheck was requested and is distinct from fresh initial review.

The reviewer separately demonstrated a 45-byte PNG with no IDAT and incorrect
chunk integrity being accepted by the initial header parser. Structural acceptance
now checks all chunk lengths/CRCs, IHDR bit depth/colour/compression/filter/interlace,
palette/critical chunk ordering, contiguous IDAT with actual aggregate payload,
IEND and rejects APNG controls. See the primary
[W3C PNG3 specification](https://www.w3.org/TR/png-3/#11IDAT). It explicitly allows
zero-length IDAT chunks, so a positive fixture protects them when another adjacent
chunk contains raster data. A no-IDAT/CRC negative case and the valid empty-IDAT
positive case each failed before their fix and now pass. The earlier tiny PNG
sample had an invalid IDAT CRC; fixtures now use CRC-correct bytes. Pixel decoding,
re-encoding and metadata removal still do not occur server-side; JPEG/WebP checks
retain their documented header-only scope.

Self-review also refined restart during a delayed HTTP body: it returns retryable
STORAGE_UNAVAILABLE (503), preserves the original valid identity and applies no
scene change, rather than describing the restart as session revocation. Its actual
HTTP regression passes. Final repaired authority coverage run through the restored
pnpm wrapper: **68 PASS in 2.59 seconds**, src-only **89.89% statements, 85.86%
branches, 97.19% functions, 89.58% lines**. Contract/store/service lines:
91.41% / 89.57% / 88.42%. Native typecheck and owned diff whitespace checks are
rechecked at handoff. These results supersede the earlier checkpoint counts;
parent still owns complete browser/runtime acceptance and final reviewer closure.
