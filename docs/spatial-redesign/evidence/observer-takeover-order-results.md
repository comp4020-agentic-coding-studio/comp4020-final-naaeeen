# Observer takeover ordering: deterministic test repair

This is a test-only repair. The old fixture and original failed full run are preserved by exact copies/hashes in observer-takeover-order-entry.json and observer-takeover-order-old-fixture.txt. Full run5 passed1470/1471 and reported undefined .code where the test expected FORBIDDEN. Its full ACK was not captured, so this record does **not** label that historical ACK successful.

Two real-service tests now select the two legal event orders explicitly. Neither accepts an either/or result:

- **Takeover preflight first:** the bedroom remains open until the actual takeover calls the narrowly matched actor/bedroom authorizeZone spy. The spy synchronously closes it through a real owner HouseStore command, then invokes the bound original authorization. Exactly one matching preflight and a real false/FORBIDDEN ACK are required. The original controller/generation and picture participation stay valid and make a fresh placement. No permission result is mocked.
- **Projection revocation first:** a real owner socket command closes the room and queues refresh. The test waits for the observer's actual FORBIDDEN revocation plus fresh lounge snapshot with advanced access generation. The original controller and consent still make fresh placements, and closed-bedroom resubscription remains denied. An explicit subsequent lounge takeover must succeed with a new generation, revoke the former controller/consent and leave the new controller outside the picture roster.

A calibrated isolated-source-copy control checks the meaningful permission boundary. The unchanged source passes caseA. Removing takeover preflight fails because the expected real preflight is never reached. Moving preflight after consent clearing fails when the original controller's new placement returns PUZZLE_NOT_JOINED. The expected mutation failures live only under ignored .local/observer-takeover-order/controls; production files were never edited. Detailed control hashes/results are in observer-takeover-order-controls.json.

Actual verification: the two selected cases pass2/2; the complete picture realtime file passes16/16 with zero skips; pnpm typecheck and scoped git diff --check pass. All17 backend files match their entry hashes byte-for-byte. The existing walk-clock/pacing helper is also byte-identical. No backend, clock, limit, timeout or wait duration was changed; no production fix or original hidden ACK is inferred.

The adjacent results JSON binds the old/new fixture, all17 backend hashes and exact commands/logs. Raw logs and isolated control copies remain ignored in .local. Parent independent review and any broader rerun remain separate. No automatic full-suite rerun, browser, resource job or commit was performed.
