# Independent board workspace evidence

7 October 2026. Owned frontend files: `board/main.jsx`, `board/client.js`,
`board/interaction.js`, `board/workspace.css`, `public/board.html`,
`spec/board-client.test.ts`, `spec/board-ui.test.ts`. The parent owns package,
production bundle/server/Docker wiring and final integration acceptance. The WSL
Windows bridge executed all scoped checks in Ubuntu/lizhi; output is English.

## R3.1 Element reconciliation and pending recovery

Requirement: concurrent unrelated canvas edits survive; deletes remain tombstones;
remote events are not echoed as new local edits; local undo must preserve peers.
HTTP intents retain their original UUID after an uncertain reply and are bound to
the captured actor and house. Local viewport, selection and tool/window preferences
never enter scene patches. Canonical losing edits remain inspectable/recoverable.

Compared incremental per-element merge with full-scene replacement using the same
small object/nonce/delete fixtures. Eight assertions failed against the replacement
and no-op retry/validation negative control before implementation. This is a
technical test calibration, not a human A/B or agent-harness reliability result.
The installed Excalidraw 0.18.1 source at `dist/dev/index.js` lines 32824-32907 and its
published types verify public `reconcileElements` and lower versionNonce tie-break.
Host incoming updates use `CaptureUpdateAction.NEVER`; explicit sticky/image/conflict
restoration uses `IMMEDIATELY`. Actual editor undo is a native acceptance gate.

The client keeps a house-and-identity-scoped sessionStorage queue, dirty object map,
chat draft/version and conflict backups. Pending writes are not labelled Saved.
Assets precede dependent image objects. Every socket envelope is gated by
schemaVersion 1 and current subscriptionId; HTTP results capture lifecycle epoch.
Pointer intents carry that subscription token. Retries older than 24 hours stop with
an export instruction. The board has a separate Socket.IO manager (`forceNew`).

Fresh reviewer with no inherited chat reproduced two client defects: over-limit
work was merged into the baseline without being queued, then Retry falsely reported
Saved; a canonical losing receipt erased its original edit. Parent verification
confirmed both. Refined client retains overflow dirty work, blocks false Saved,
persists conflict originals, exposes Restore as a newer edit/export/discard, and
reloads only canonical shared data after explicit discard. New regression checks
exercise reload, retry and original losing content. A stale chat snapshot now cannot
replace a newer chat event because messages advance the client sequence.

## R3.2 Plain content and images

Requirement: plain text, no arbitrary embedding or remote image fetch, bounded
PNG/JPEG/WebP upload and authenticated reload. The custom picker/drop/native paste
path checks 2 MiB bytes and bitmap dimensions8,192 per side / 16 megapixels. Native editor
image picking is disabled so the host controls accepted formats and limits.
Snapshot image metadata is fetched separately as same-origin authenticated bytes,
converted locally to data URLs and passed through editor addFiles. Peer new image
patches trigger metadata refresh; images loaded before editor mount are handed off.

Tests reject SVG/oversize files, arbitrary remote asset URLs, revoked asset reads,
late closed-session data, retained object/scene bounds and stale subscription data.
The fresh reviewer found native clipboard files bypass Excalidraw's onPaste when
`tools.image=false`; the host now captures file paste on the stage before that
pipeline. Native real clipboard verification remains pending, not inferred from
helper tests. The backend parser is a separate responsibility and reviewed lane.

## R3.3 Standalone workspace and admission

Requirement: direct `/board/` opens a full canvas without creating a Three renderer;
a visitor without a house can Create/Join/name/capacity using the existing authority.
Embedded Return posts only `{type:'night-board-close'}` to the current same-origin
parent; direct Return opens `/`. House cards remain separate author-owned objects.

React 18.3.1 and Excalidraw 0.18.1 are confined to `board/main.jsx`/the board bundle.
Actual pinned declarations verify `excalidrawAPI`, convertToExcalidrawElements bound
labels, collaborator Map, scoped keyboard handling and public export APIs. Sticky
notes compose a filled rectangle with bound multiline text; mature drawing/text/
arrow/shape/select/undo/zoom remain editor controls. The native file/PNG export is
local shared-canvas export; own authored-contribution export is a distinct action.
Admission captures UUID and original values across interrupted reply/reload.

Primary sources checked 7 October 2026:
https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/
https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api
https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/restore
Installed pinned source/types are the final API authority for this integration.

## R1.2 Companion chat and input ownership

Requirement: multiline plain text, movable/resizable/collapsible desktop companion,
responsive mobile dock, own scroll and paste/keyboard input, preserved newer drafts.
Compared fixed intrusive panel with a companion floating window under the same
canvas task: selected latter for explicit positioning/collapse and bounded mobile
dock. This is an implementation/design decision; no measured human preference.

DOM/helper checks cover actual move/resize styles, viewport bounds, mobile reset,
keyboard/wheel/paste bubbling isolation and same-origin Return. Client checks cover
an acknowledged prior chat preserving a newer draft, reload draft versions and
seven-day expired-message rejection. The fresh reviewer found native isolation
stopped React delegated Ctrl/Enter delivery; the shortcut now runs on a native
textarea listener before the aside bubble barrier. Native shortcut verification
is pending, not inferred from the isolated event test.

## Actual checks and remaining gates

Initial attempted domain-only test runner found no matching files (configuration
failure). Scoped runner then found the missing client (infrastructure red); a
replacement/no-op stub produced 8 meaningful assertion failures (behavioural red).
The pre-integrated-review scoped suite passed 31 tests: 27 client and 4 DOM/helper tests. Installed Node
and Vitest executed it after pnpm's auto-install hit ERR_PNPM_IGNORED_BUILDS for
@parcel/watcher 2.6.0; no hook or build-policy override was made. The parent owns the
package lane. Required installed `tsc --noEmit` passed after fixture corrections.
Parent production build script passed with Excalidraw production export condition,
self-hosted fonts/licenses, separate app.js/app.css. `git diff --check` passed.

Scoped coverage of client.js/interaction.js:81.38% statements, 73.79% branches,
87.09% functions, 96.94% lines. React UI/third-party editor/native flows are excluded;
branch gaps and actual browser integration remain explicit.

Fresh frontend review reported 4 actionable findings, all reproduced/refined above;
a bounded contextual recheck confirmed the four repairs. It ran 27 checks and an in-memory React/jsdom reproduction showing one shortcut send without canvas key delivery and one file paste interception without downstream paste delivery. A separate fresh authority/integration review
ran 90 tests and reported outbound error-ACK containment and expired chat replay,
forwarded to the parent/backend owner. Its Docker/TCP/native/max-resource gaps are
not counted as passed by this lane.

In-app Browser discovery returned no available browser. Existing project Chromium
is available. `board/native-check.mjs` is a loopback-only runner prepared for the
integrated preview at 4099: two independent identities,1920x1080and390x844, direct
Create/Join, bound multiline sticky, native Ctrl+Enter chat, real PNG clipboard,
peer rectangle, own undo preserving unrelated peer, redo, chat drag/resize, reload
and direct-route import inspection. The native diagnostic passed against the parent-owned integrated candidate at
`http://localhost:4099` with the latest frontend bundle: all listed tasks, immediate
two-resident roster before pointer movement, and actual PNG/native canvas downloads.
First Ctrl+Z tombstoned the author's image while the peer rectangle remained; redo
restored the image at a newer version. There were no browser page errors. Real
screenshots at both stated DOM viewport sizes were visually inspected; sticky text
contrast and mobile tool labels were refined and the affected native tasks reran.
Exact source and bundle hashes are `.local/board-native/source-hashes.json`; native
undo evidence and screenshots are beside it. Export files are `canvas-export.png`
and `canvas-export.excalidraw`.

The diagnostic's earlier aborted attempts were checker defects: missing houseId in
snapshot fetch, a browser-rejected invalid PNG fixture, and too-frequent context
polling exhausting the bootstrap limit. They were corrected to the frozen API,
native canvas PNG encoding and cached house scope/bounded polling. They are not
product failures or relabelled passes. Parent final freeze/restart/rebuild acceptance
must still recheck the integrated authority after its latest fixes.
No human usability/value, physical phone, production Docker/Fly/WAN or preference
result is claimed. No commit, push or publication was made by this worker.


## Integrated review correction: rejected image batch recovery

Fresh integrated review reproduced a further R3.1/R3.2 client defect against
client SHA256 `f3bcdecebca8b93c4790880248b5213545c5de4641402d7de3d4549d8d932622`.
A scene callback containing a missing-file image followed by text updated the
comparison baseline before asset validation, then returned without retaining either
unsent object. Repeated callback plus Retry displayed Saved with no POST and an
empty pending export. The reviewer also reproduced the real clipboard trigger in
the built editor using a route-mocked API and an Excalidraw clipboard payload;
this native reproduction did not write to the real server.

Three new meaningful regression checks failed before the repair: missing image plus
following text, oversize image plus following text, and unchanged scene recovery
when the missing file later becomes available. The selected minimal repair retains
every changed object in dirty state and every available pending file's bytes before
validation, validates the complete batch before freezing mutations, and caches
pending referenced files under the original identity/house. Rejected image data and
later text remain in export/reload; Retry cannot report Saved without submission.
An identical scene callback can supply the absent file, then its asset precedes the
complete element patch. Browser-storage quota errors still tell the user to keep
the tab open and export; local memory is not misrepresented as confirmed storage.

Current repaired client SHA256:
`b6fc2e77e6ba4c955549931bfe620473f8b60161c7c2831fbca84cf9f57896b8`.
Current client-test SHA256:
`eeb7263fb5775b57c35177e47eb71367867dc7fecf4b5ccbdd5e3ce53594f605`.
Affected installed-runtime verification passed 34 scoped checks (30 client,
4 DOM/helpers) and `tsc --noEmit`. Scoped client/helper coverage is 82.65% statements,
75.11% branches, 87.00% functions and 97.05% lines; JSX/editor/native scope remains
excluded. The fresh integrated reviewer completed a bounded contextual recheck: its independent module reproduction and all 34 client/UI tests passed, with no remaining actionable finding in that checked scope. This follow-up retains reviewer context and is not labelled another fresh review.
No unrelated production file or feature changed. The board bundle was deliberately
not rebuilt while the parent coordinates source freeze; earlier native screenshots
and bundle hashes do not establish acceptance of this new repair. Parent owns final
bundle/restart/native reconciliation after the source and authority fixes settle.


## Standalone identity and recovery boundary

The registered independent-app requirement includes cold recovery and private key
issuance without opening the game. The board header now opens Identity; a current
identity may generate a private key through the existing
`POST /api/house/recovery-key {}` with captured `X-House-Identity`. Cold Admission
provides Recover my identity, a password form using the existing
`POST /api/house/recover {proof}` and a fresh `/api/board/context` response. No new
endpoint, game renderer, controller requirement or administration feature was added.

One App-scoped identity helper serializes requests while pending, captures actor
and request generation, and verifies the current cookie identity through the
existing identity read before revealing an issued key. Close, identity change,
revocation and timeout invalidate delayed replies. Proofs live only in helper/
component memory, outside the board outbox, storage and exports. Successful recovery
invalidates outstanding bootstrap responses, closes the credential dialog and
rekeys the board component/client to the recovered actor. Old pending work remains
under its original scope; it is not replayed as the recovered identity.

Six meaningful identity assertions failed against the no-op baseline before
implementation. Scope, serialization, late close/identity response, current-cookie
verification and recovery checks passed afterward. An added abort-ignoring timeout
fixture confirms that a late proof is not revealed and no stale identity GET
follows. Latest scoped tests passed 41 checks (30 client and 11 DOM/helper/identity),
with installed typecheck and production bundle build passing. Scoped client/helper
coverage: 83.33% statements, 76.27% branches, 88.39% functions, 97.41% lines; JSX/
third-party editor/native scope remains excluded.

The integrated reviewer performed a bounded contextual credential-boundary recheck
at main SHA256 `dddcac608947fad90b2f659f18cde7a062947a0ce5f3d8153a0c483fa0e9d6b8`
and interaction SHA256
`4fadf77293c7ebc964e9f0b28554c83cdb48612690fe8b983d10d4a478ab2549`.
It independently ran all 41 checks plus a fake-proof timeout reproduction with
fetch ignoring abort; no actionable defect remained in that scope. This is a
contextual follow-up, not an additional fresh reviewer trial.

`board/native-identity-check.mjs` checks standalone issuance, closed private dialog,
cold recovery into a full two-member house, original membership/identity preservation,
old-session revocation, reload and no game imports. It keeps the real temporary key
only in transient browser/runner memory and never logs it, writes it to disk or
captures the credential dialog. Error output contains only a safe checkpoint and
error category. The first attempt began before parent browser-lane steering arrived
and ended during the reserved game lane at the create checkpoint; it is ABORTED /
non-isolated, not native acceptance or a timing result. Further native checks are
held until the game worker explicitly releases its browser lane. Parent owns final
source/bundle hash fencing, restart, native integration and resource acceptance.


## Final isolated native reconciliation and pending-scene loop repair

After the game worker released its browser lane, the isolated board diagnostic
found a real frontend regression: React maximum-update-depth error 185 blanked the
canvas during sticky save. This came from the image-draft retention repair, rather
than the identity authority: when dirty work existed, identical Excalidraw callbacks
still persisted and notified React, whose re-render triggered another editor callback.
The added unchanged-pending-scene assertion failed before correction. The client now
notifies only for an actual element delta or changed referenced pending file data;
its missing-file recovery path still accepts an identical scene with a newly supplied
file. All 42 scoped tests (31 client, 11 DOM/helper/identity), installed typecheck and
production build passed after the repair.

The isolated native board then passed: actual 1920x1080 and 390x844 DOM viewports,
standalone Create/Join, bound multiline sticky, native Ctrl/Enter chat, real PNG
clipboard, authenticated peer image metadata, PNG/editable canvas downloads, peer
rectangle, own undo preserving the peer, redo at a newer version, chat drag/resize,
reload, immediate resident roster and no game imports. No page error remained.
The private-safe native identity run passed: standalone key issuance, private dialog
close, cold recovery to the existing identity in a full two-member house, two retained
members, old-session revocation, reload and no game imports. No actual private proof
was logged, stored in an artifact or captured in a screenshot. The private runner's
initial create timeout was a checker exact-label mismatch caused by nested select
options; the semantic capacity label selector was corrected before the successful run.

Final source identities:

- Client: `bc78fe9ef17876a0162fb56c9d64a91420412016bdffe3ddc46d6cafb08628b1`.
- Main: `dddcac608947fad90b2f659f18cde7a062947a0ce5f3d8153a0c483fa0e9d6b8`.
- Identity/interaction helper: `4fadf77293c7ebc964e9f0b28554c83cdb48612690fe8b983d10d4a478ab2549`.
- Built app: `a947ce00c1710601649194b148d40eb0ea31e4408a54ba9829bef5eabf2f620c`.

`.local/board-native/identity-source-hashes.json` records equal before/after hashes
for main/helper/client/CSS and app.js/app.css. Both runners exited and closed their
browser contexts before releasing the lane. Native artifacts from earlier runs are
not relabelled as this result; `source-hashes.json` and current images/exports are
from the successful latest board diagnostic.

The credential helper/main boundary already passed the integrated reviewer's
contextual check and remains unchanged. A requested bounded contextual recheck of
the final small pending-scene notification correction hit the host agent thread
limit; parent received the exact packet and owns that remaining review reconciliation.
This limit is not described as a completed recheck. Final whole-project e2e/camera,
fixed-resource, production Docker/Fly/WAN, physical-device and real-user gates remain
separate from these observed two-dimensional board outcomes.
