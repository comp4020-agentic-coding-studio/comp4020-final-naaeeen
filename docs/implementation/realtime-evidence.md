# Realtime adapter and browser transport evidence

6 October 2026. Implementation is local Ubuntu WSL work through the Windows-to-WSL bridge. No worker commit, push or deployment occurred. The parent owns integrated browser/SQLite checks and phase acceptance.

## Authority and delivery

`src/house-realtime.ts` attaches Socket.IO 4.8.4 to the existing HTTP server. Its middleware only resolves the persisted `house_session` digest; it never creates an identity. Production requires the configured exact Origin. The development exception accepts only an exact HTTP Origin matching a constrained localhost/loopback Host. The server permits twelve connections and two tabs per identity, with one controller and one observer.

Each read, action and outbound application delivery rechecks the session and current room permission. Scoped HTTP writes additionally need the current generation, original zone and controller tab token. Socket and HTTP durable writes call the same injected store. No motion, availability, control or seat lease is written to SQLite. Semantic intent/connection/motion-start-or-stop logs contain actor/action/time/outcome; private text, credentials and raw motion frames are omitted.

Reliable updates are authorised full snapshots. Control generations advance on takeover, zone resubscription, forced room exit and invalid-position reconciliation. Access generations increase across connections for this process, so a reconnect after a private-room visit cannot be permanently rejected by an older client barrier. A fresh process epoch invalidates the previous epoch; the reducer also retires previously seen epochs.

Motion uses compact `house.motion` player/stamp payloads at ten hertz. The client merges only motion matching its current process, access generation, control generation and authorised zone. Coordinates, heading, animation and seat are included only for players in the receiver's current zone. Other-zone residents expose bounded presence/zone/explicit willingness metadata. Idle ticks avoid projecting all durable content.

Movement checks finite coordinates, sequence, generation, swept collision and a 3.2-unit/second refill credit. The credit has a 0.64-unit cap and a single 0.06-unit tolerance debt; tolerance cannot add extra speed on every packet. Shared browser/server geometry prevents tunnelling. Layout changes reconcile every affected resident/visitor lease: an invalid standing pose or deleted/moved/rotated/inaccessible occupied chair releases the seat, returns to the protected spawn and advances generation. An ordinary chat/card refresh leaves valid positions alone.

The same controller token can resume within thirty seconds with its last explicit willingness and seat lease. A new token/full reload, expired lease, takeover or restart defaults Quiet. Offline/reconnecting presence is not connected eligibility. Session expiry, membership loss, movement between zones, takeover, stand and lease expiry release seats as appropriate.

## Bounded buffers and pending drafts

Outbound checks inspect actual Engine.IO transport writability, its bounded packet buffer and the underlying WebSocket `bufferedAmount`. The pinned Engine.IO 6.6.11 runtime has private `writeBuffer`/WebSocket fields, read through one checked structural cast. Up to four queued packets and 512 KiB total queued/transport/upcoming encoded bytes are allowed. There is one coalesced pending reliable snapshot per connection. Motion drops while unwritable; prolonged backpressure or overflow discards the transport and requires a fresh snapshot. The connection drain event is not incorrectly treated as completion of WebSocket writes.

The initial 64 KiB limit disconnected a legitimate bounded Unicode fixture with one hundred chat messages and eighteen cards. That failure was observed over a real WebSocket. Raising the still-bounded total byte ceiling to 512 KiB delivered this fixture; the test asserts its actual JSON size is above 64 KiB and below 512 KiB. This isolated fixture is not the production load gate or a proof of all performance bounds.

`public/house-client.js` rotates its in-memory controller token when a client is constructed/full reload occurs; reconnects in that client retain it. Its sessionStorage outbox permits sixteen intents/32 KiB. Each pending entry freezes UUID, identity, house ID, original zone and creation time. Automatic retry stops after twenty-four hours and never moves an old lounge draft into another house. Volatile actions have no retry queue. Network uncertainty is reported as pending; successful acknowledgement removes the entry. Confirmed conflicts leave the UI's draft responsible for the user's next edit.

Room selection clears the displayed private state immediately. A denied room request performs at most one fresh lounge subscription, preserves the denial for the UI and leaves controls usable. It never restores a cached private snapshot. Revocation similarly clears first; delayed old snapshots/motion are rejected.

## Observed checks and corrections

The first six realtime behavior tests failed with the explicit missing-authority implementation. The first five client behavior tests failed with explicit missing reducer/outbox/transport implementations. Later regression tests reproduced: stale movement after changing/revoking a room, the reconnect access barrier, recurring speed tolerance, legitimate large snapshot disconnection, an avatar trapped by furniture, an occupied chair moved underneath a visitor, a denied room entry stranding the client, and an expired cookie retaining its seat. These failures were corrected before the final focused run.

Final focused command:

`mise exec -- pnpm exec vitest run --config vitest.house.config.ts spec/house-realtime.test.ts spec/house-client.test.ts --coverage`

Observed: 26 tests passed in two files (15 realtime, 11 client). Realtime tests use real TCP/WebSocket Socket.IO clients and an injected authority test double; they isolate transport/lease behavior rather than claim SQLite or browser integration. Client tests exercise reducer and mocked browser transport/HTTP behavior. `mise exec -- pnpm typecheck` and `git diff --check` also passed after the same changes.

Affected-module V8 coverage: realtime 84.72% statements, 94.42% lines, 78.31% branches; client 85.87% statements, 98.51% lines, 80.76% branches. The realtime branch target remains below eighty percent, chiefly transport failure/storage/error combinations. This focused run excludes the independent store and geometry suites, so the report's all-files percentage is not a meaningful integrated-house coverage figure.

Independent integrated review supplied the denied-room and layout-reconciliation findings; tests and refinements address both. Parent confirmation in real browsers remains separate. Twelve real connections were admitted and a thirteenth rejected, but the fixed thirty-minute L1/L2 tests, RSS <= 180 MiB, p95 <= one second, intentionally slow readers, physical phone/IME performance, live deployment and human value pilot are not established by these focused tests.

## Primary API evidence

Installed source verifies Socket.IO 4.8.4, Engine.IO 6.6.11 and ws 8.21.3. Engine.IO `build/transports/websocket.js` sets writability after the final ws send callback; `build/socket.js` connection drain occurs when a batch is handed to its transport. ws `lib/websocket.js` includes writable socket/sender bytes in `bufferedAmount`.

[Socket.IO server API](https://socket.io/docs/v4/server-api/) documents `socket.conn`, volatile emission and closure. [Server options](https://socket.io/docs/v4/server-options/) documents `allowRequest` and buffer/transport options. [Delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/) motivates fresh reconnect snapshots and command UUIDs. The private runtime field checks must be reverified before upgrading the pinned transport dependencies.

## Arrival refinement, 7 October 2026

The parent reported stacked real avatars in the combined browser screenshots and reproduced zero arrival separation in its real SQLite/HTTP/WebSocket regression. Before changing the adapter, five additional real-WebSocket tests failed at capacities two through six because the old lounge arrival was the shared `(0,2.85)` point.

`resetZone` now resolves the actor's permanent resident slot and computes `x = 0.65 * (slot - (capacity - 1) / 2)`, `z = 3.3` in the protected arrival band of either zone. Shared geometry validates that position before assignment; the layout's protected spawn is the defensive fallback for an invalid arrival. This is the server's actual pose, used on new arrivals, room switches and forced reconciliation. Existing same-token reconnect preservation remains intact.

The authority fixture now keeps stable bedroom UUIDs and permanent slots when another member is absent, and it no longer supplies obsolete resident revision fields. Movement and seating tests capture the authoritative arrival and follow shared-geometry validated routes; their speed, collision, next sequence, seat exclusivity, takeover, expiry and forced-return assertions remain active.

Observed affected verification:

- `mise exec -- pnpm exec vitest run --config vitest.house.config.ts spec/house-realtime.test.ts spec/house-client.test.ts --coverage`: 31 passed (20 realtime, 11 client). The five added capacity cases verify every connected arrival is collision-free and every pair is at least 0.6 units apart, in both lounge and the same visited bedroom.
- `mise exec -- pnpm exec vitest run --config vitest.house.config.ts spec/house-http.test.ts -t "places real arrivals"`: the parent's actual SQLite/HTTP/WebSocket arrival test passed; four unrelated cases were intentionally filtered out and are not counted as passing.
- `mise exec -- pnpm typecheck` and `git diff --check`: passed.

Updated focused coverage: realtime 84.70% statements, 94.51% lines, 77.31% branches; client 85.87% statements, 98.51% lines, 80.76% branches. Defensive spawn/transport/error branches still leave realtime below the eighty-percent branch target.

A preceding combined HTTP/realtime/client run preserved a separate failure: the HTTP static-module test's `afterEach` application close hook timed out at ten seconds. Its arrival case passed. The parent owns the HTTP fixture/server teardown investigation; the worker did not edit those files or suppress the failure. The long load run was aborted by the parent to freeze this correction before restarting the load candidate; this refinement does not claim RSS, p95, slow-reader or thirty-minute load completion.

Independent read-only review of this arrival change found no actionable issue: permanent slot uniqueness is enforced by the production store, adjacent arrivals are 0.65 units apart versus a 0.48-unit avatar diameter, and their x range (at most ±1.625) and z=3.3 remain within the geometry's safe arrival band at every supported capacity. The reviewer inspected the source and tests but did not independently rerun them. No runtime source changed after the passing affected checks.
