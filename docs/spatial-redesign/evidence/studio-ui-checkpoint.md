# Studio UI implementation checkpoint — 23 October 2026

Scope: additive `public/house-studio-ui.js`, `public/house-studio.css`,
`public/house-ambience.js` and their focused specs. Existing house UI/world/server
integration belongs to other workers. No server, browser, full suite, commit,
push or deployment was run by this lane.

## Integration contract

`createHouseStudioUI(element, { api, onPreview?, onClose?, onChat?, onStatus? })`
returns `{ update(context|null), open(), close(), refresh(), dispose() }`.

Context is `{ identityId, houseId, roomId, ownerId, ownerName?, doorOpen,
controller, generation, accessGeneration, controllerToken?, zoneId? }`.
If supplied, zoneId must equal roomId. Parent passes only the currently authorized
room. It calls update(null) synchronously on leave/revocation/disconnect and
updates every changed authority snapshot. Identity/house/room/zone/owner/access/
controller/generation/token changes invalidate async results and immediately clear
image URL, preview, upload draft and local sound. Parent remains responsible for
current trusted transport headers and server authorization.

API callbacks:
- `state(roomId)` -> frozen StudioState.
- `image(roomId, imageId)` -> authenticated current PNG Blob.
- `command(exactStudioCommand)` -> StudioReceipt; throw errors with server code.
- `export({ roomId })` -> room export JSON, including actual current image bytes.

Open/close owns element.hidden. Programmatic close does not call onClose;
Look around/Escape calls it. Keys inside the component do not walk the avatar.
No focus trap. Radio entry can focus `[data-studio-action="listen"]`; owner preset
selection is `[data-studio-preset]`. onPreview receives the decoded displayed
HTMLImageElement or null. Null is an immediate privacy/cleanup signal; the parent
world must discard its texture. Closing stops audio and clears the preview.
Every reopen is silent and rereads the confirmed room reference/view.

Optional injection hooks `ambience, urls, download, preparePng` support focused
lifecycle/encoder tests; product defaults use browser APIs and procedural audio.
createHouseAmbience's full contract is in studio-ui-ambience-checkpoint.md.

## Requirement -> decision -> actual verification

| Subsection | Material comparison / decision | Verification and refinement |
| --- | --- | --- |
| Chosen PNG | Authenticated Blob + object URL supports custom transport headers and explicit revocation; a naked img URL cannot carry those headers. Browser Canvas produces bounded clean PNG pixels instead of uploading the original metadata. Source decode admission is 16 MiB, 8192 per edge and 16 megapixels; output is at most 1 megapixel, 2048 per edge and 256 KiB. | Encoder fixtures check pixel/byte downsizing, decode/Canvas/null-encoding failures, bounded attempts and decoded-pixel cleanup. Actual browser decode/output remains parent browser acceptance. Source file input is preserved on failure/cancel. |
| Durable owner view | Explicit Save this view preserves a reviewable bookmark; every pan frame stays local. Guests always inspect the owner's material with their own independent crop. | Owner/observer/guest controls, reset/resume, late ACK and newer local view tests. A meaningful RED revealed guest polling overwrote local crop; local inspection now remains dirty for both roles. |
| Atomic replacement and retry | 8192-byte raw chunks (maximum 32) fit frozen backend limits. Old image remains until commit; each request has one stable UUID, retained through explicit uncertain retry. | Begin/chunk/commit shape/size/order; uncertain chunk replay then continuation; rejected storage admission; explicit staged-upload cancellation/abort; no partial-save claim. Temporary uploads abandoned on context exit expire under server bounds. |
| Privacy/context | Full context epochs plus monotone read/image tokens beat a room-only guard. Clear immediately on null/authority change; stale data is ignored. Guests poll every five seconds only while visible because the current API has no studio stream. | Revocation, delayed metadata/bytes/export, room/controller/identity changes, null reference, decode/read permission errors, out-of-order state and timer/URL cleanup. RED found same-image refresh invalidated a pending decode callback; unchanged-image refresh now preserves it. |
| Local sound | Saved preset is room state; consent, volume and mute stay local. Explicit Listen creates/resumes WebAudio; every visit starts off. | 23 ambience lifecycle/error/race tests and UI explicit-listen/save-preset/hidden/close integration tests. No downloaded media, music, external provider or license dependency. Listening quality and real-browser audio remain unverified here. |
| Accessible inspection | Native buttons provide pan/zoom/reset/download independent of precise 3D raycasting; pointer drag is additional. | Native control/pointer pan and key-isolation specs. Phone layout/overlap/focus/room-entry browser acceptance remains parent work. |

No human A/B, preference or utility result is inferred from these technical checks.
Independent fresh review was held by the host thread limit; root is dispatching it
centrally after execution lanes finish. No independent implementation acceptance
is claimed in this checkpoint.

## Actual checks

- studio-ui-red.txt: initial new-module RED.
- studio-ui-guest-preview-red.txt: two substantive failing crop/decode regressions.
- studio-ui-green.txt: 63/63 focused specs passed (40 UI, 23 ambience).
- Targeted V8 module coverage: studio UI 91.82% statements, 82.10% branches,
  92.85% functions, 99.56% lines; ambience 94.80%, 87.64%, 95.23%, 95.79%.
- studio-ui-typecheck.txt: scoped TypeScript 6 check passed after adding the
  exported options JSDoc and precise async test fixture typing.
- node --check passed for both new JavaScript modules; scoped git diff --check passed.
- Runtime: Windows-to-WSL Ubuntu/lizhi, canonical repository, mise Node 24.21.0
  and pnpm 11.9.0. Mocked DOM/audio/encoder checks are not native browser,
  real listening, deployment or human acceptance.

