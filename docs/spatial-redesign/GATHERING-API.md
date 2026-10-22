# Study huddle and sofa inspection API

Implementation contract, 23 October 2026. Parent owns HTTP ingress and integration.

## Exact adapter contract

`new HouseGathering({ authorizeHouse, currentSeat, sourceImage?, now? })`
from `src/house-gathering.ts`. All callbacks and methods are synchronous.

- `authorizeHouse(actorId): { houseId: string; residents?: { id: string; name: string }[] }` checks CURRENT house membership, e.g. `HouseStore.snapshot(actorId, "lounge")`; throws on denial. Never use a body actor/house.
- `currentSeat(actorId): LoungeControl | null` uses `realtime.currentLoungeSeat`; disconnected/standing controls return null or null seat facts. It is consulted on every read/action to prune departed/replaced members.
- `sourceImage(actorId, roomId): { bytes: Buffer; ownerId: string; width: number; height: number; imageId: string }` is optional. It must check that actor is original owner of that room and is still in the active house, then read the current canonical PNG through RoomStudioStore. No arbitrary URL fetch. Callback must throw if no current image.
- `state(actorId, kind): GatheringState` checks membership and prunes.
- `image(actorId, kind, itemId): { bytes: Buffer; mime: "image/png" }` checks CURRENT house membership, kind sofa, exact current itemId; returns an independent Buffer copy.
- `execute(actorId, command, authorizeControl: () => LoungeControl, requestEpoch?: { accessGeneration: number; seatGeneration: number }): { receipt, state }` invokes current membership/control checks including on retry. Parent binds per-request callback to `realtime.loungeHttpControl(actorId, generation, controllerToken)` AFTER the JSON body arrives. Parent parses positive integer request access/seat epochs from headers and passes them as the fourth argument. The module validates membership, current generation/token control and current lease, then checks the exact accepted command/hash receipt, then enforces request accessGeneration and (except Leave) seatGeneration equality BEFORE fresh effects. An accepted retry may use old visit epochs but still requires current membership and controller authorization; its receipt never restores consent. A delayed unaccepted Join must not upgrade its old visit to newly returned facts. Leave still requires this current control callback, but does not require a seat. The command never carries authority facts.
- `close(): void` releases transient material and sessions.

GET `/api/house/gathering?kind=study|sofa` returns state.
GET `/api/house/gathering/image?kind=sofa&itemId=UUID` returns current bytes with `Content-Type: image/png`, `Cache-Control: private, no-store`.
POST `/api/house/gathering`: parent reads `x-house-generation`, `x-house-controller-token`, `x-house-access-generation` and `x-house-seat-generation` authentication headers; JSON is UNWRAPPED. Pass ONLY `{ commandId: UUID, kind: "study" | "sofa", sessionId: UUID, type, payload }`. Keep the existing 16 KiB JSON limit. All unknown keys are rejected.

| type | payload |
| --- | --- |
| `gathering.join` | `{ participationId: UUID }`; fresh ID for each explicit Join |
| `gathering.leave` | `{ participationId: UUID }`; same ID as the Join, including pending Join |
| `gathering.share` | study `{}`; sofa `{ roomId: UUID }` to publish own room image, or `{}` to claim the frozen current item |
| `gathering.pointer` | `{ x: number 0..1, y: number 0..1 }` or `{ x: null, y: null }` |
| `gathering.view` | `{ x: number 0..1, y: number 0..1, zoom: number 1..4 }` |
| `gathering.clear` | `{}`; current presenter only, clears current published copy/view |

State is `{ ok: true, kind, houseId, sessionId, revision, members: [{ actorId, name }], presenterId: string|null, item: null|{ id, ownerId, sourceImageId, width, height, bytes }, view: { x, y, zoom }, pointer: null|{ x,y }, selfJoined: boolean, selfParticipationId: UUID|null }`. selfParticipationId is only the authenticated reader's current consent UUID, allowing safe Leave recovery after reload; other members' consent IDs are never exposed. No bytes, controller tokens, private room IDs, or durable board contents appear in state. Receipt is `{ ok:true, commandId, sessionId, revision }`; exact retries return their original receipt plus CURRENT state, never historical consent.

## Lifecycle and limits

Join/share/pointer/view require current study/rest seat respectively. Share requires explicit joined membership; pointer/view/clear require current presenter. One presenter only; a different current presenter must leave before another can claim. Departure, seat switch, disconnect, controller takeover and membership loss prune consent and presenter on next read/action. Presenter departure freezes item/view, clears pointer and elects nobody. An eligible remaining member explicitly claims Share. Close leaves gathering but retains ordinary chair; reconnect never autojoins/follows. Follow is explicit LOCAL UI consent and is never inferred from a Join ACK.

Each kind has at most six joined identities, 1024 successful ordinary intents plus at most six exit receipts, one PNG copy of at most256 KiB and1,048,576 pixels (max2048 per edge). The RoomStudio source contract already validates/re-encodes PNGs; the gathering additionally checks bounds/signature. At most128 current sessions and128 retired receipt-only epochs globally. Current sessions expire after10 minutes without a fresh action or a valid joined member's state poll. Legitimately seated joined polling renews idle time, so an active50-minute huddle remains the same session. There is no forced30-minute expiry. Observer reads and retired-receipt retries do not renew retention. Empty sessions immediately release image/presenter/view, and a new session epoch on expiration rejects old intents. At the ordinary-intent/session admission cap, reject fresh actions rather than evicting consumed IDs. Each of at most six current members can still Leave, preserving the exit boundary. Once a capped session is empty, the next read starts a new epoch with Join available; the old epoch keeps only receipt/tombstone metadata for10 minutes. Accepted old receipts replay against current state, while unaccepted old-epoch commands fail STALE_GATHERING. If128 retired epochs are still retained, new rotation waits for expiry rather than evicting consumed IDs. Clear/last viewer/expiry release transient bytes. Only a validated currently joined reader extends idle expiry. Durable material remains in RoomStudio only. A published sofa copy is explicitly HOUSE VISIBLE and remains valid when the source room closes, until gathering cleanup; it is credited to its original owner.

## UI adapter

`createHouseGatheringUI(element, { api?, state?, action?, image?, onOpenBoard?, onClose?, onChat? })` uses callback overrides or `api.state(kind)`, `api.action(command, context)`, `api.image(kind,itemId)` (image returns Blob). `update(context)` / `setContext(context)` accepts `{ kind, houseId, identityId, controller, generation, accessGeneration, seatGeneration, zoneId, seatId, seatPurpose, ownRoomId, residents? }`. `open(kind?)` begins polling only when explicitly opened; `close()` leaves and invokes onClose; `dispose()` clears everything. Initial construction does not poll/open/join. State callbacks return state; action returns `{receipt,state}`. Action gets captured context as a second argument for HTTP authority envelope.

Callbacks never open remote panels or play audio. Study exposes an explicit Open independent board button through onOpenBoard. Its view is a huddle marker, NOT synchronized Excalidraw viewport/editing. Sofa uses a bounded image, local fit/zoom and explicit Follow presenter. Context change/revocation/close immediately stops polling/follow, invalidates late replies and revokes object URLs. Parent must call update before open after context changes. A generation/access/seatGeneration/seatId/identity/house/seat transition requires another explicit open and Join.

Join/Leave carry a consent UUID. Leave tombstones that consent even if its Join has not arrived, preventing a delayed request from enrolling after the panel closed. A previous-consent Leave cannot remove a later explicit Join. Membership binds generation, accessGeneration, seatGeneration, seatId and purpose; stand/re-sit and same-token reconnect cannot revive old consent.

Study labels are coordination roles: Lead huddle and Follow huddle (the latter explicitly opens the independent board via callback). They promise no remote board viewport. The parent board callback must keep the huddle alive, e.g. an explicitly opened independent board tab, rather than close the huddle panel as a side effect.

An unref-ed minute cleanup timer expires idle sessions and retired receipts and prunes current seats even when no gathering API request arrives; close clears that timer. Resource expiry therefore does not require a later visitor.


Review refinements: presenter view changes coalesce the latest local zoom/pan while a prior request is pending; normalized zero coordinates are retained. Close retains its exact pending withdrawal until acknowledgement and retries it on explicit reopen. Failed withdrawal is shown as pending; no Join or Follow is inferred. State's selfParticipationId also permits a recreated panel to leave an existing own consent. Authority context changes discard local pending work after server-side seat/access epochs have invalidated the old consent.
