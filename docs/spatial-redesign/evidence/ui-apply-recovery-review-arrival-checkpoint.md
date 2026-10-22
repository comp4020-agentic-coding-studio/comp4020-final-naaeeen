# Recovery arrival acknowledgement and real generation transitions

23 October 2026. Final worker production freeze for parent independent recheck. Source binding: ui-apply-recovery-review-arrival-source-binding.json. Existing earlier native observations do not verify these new recovery bytes.

## Confirmed defect and corrected fixture assumption

The previous recovery journey compared the arrival to its departure generation. Actual `house.subscribe` increments the already-subscribed controller's lease generation and access generation. The old UI tests and callback fixture held generation1 and therefore missed cancellation of a normal authorized return. The contextual review was correct.

`spec/house-recovery-service.test.ts` now executes the actual createService/SQLite/realtime implementation, the real Socket.IO client and createHouseClient, and the production main UI source with a controlled renderer/navigation adapter. Its two baseline cases failed in ui-apply-recovery-review-service-red.txt: a held bedroom draft did not reopen Pending after a real generation-changing subscription; bedroom -> lounge -> server-validated motion -> physical chair ACK opened Game instead of held Pending. These are actual server generation transitions, not a constant-generation mock. The lightweight recovery client fixture was also changed to increment generation on every subscription.

## Applied transition contract

An intended recovery door/exit interaction registers one specific subscription transition before calling the client. A valid arrival head can be displayed, but cannot finish the recovery or start queued travel until that subscription ACK has passed the real client's current-request/reducer guard. The client returns the actual reduced snapshot after that guard. The journey adopts only that intended ACK's confirmed generation/access, requiring the original identity/house/server epoch, controller authority, exact intended destination, increasing generation/access and agreement with the current accepted head. Ordinary unrelated generation changes are still rejected.

A pending transition records its first arrival authority candidate. A different subsequent authority, observer status, identity/epoch change, failed ACK, stale ACK or actual disconnect cancels the recovery and its queued room/table navigation. Intentional zone-selection null is suspended while the intended subscription is outstanding; the real disconnect callback cancels. After a confirmed lounge arrival, the original game-seat ACK requirement remains separate and unchanged. The persisted selected-command hold still prevents automatic dispatch throughout; no command UUID, payload or revision is replaced.

Negative refinement initially exposed that cancelling the journey alone left a queued table route. Cancelling now clears the journey's queued place/visit as well, including identity clearing. The failure and refinement logs are preserved. A real second socket takeover while the intended arrival ACK is deliberately delayed verifies the actual reducer rejects that stale ACK and Pending does not reopen; the original held command remains stored and unsent.

## Verification

- ui-apply-recovery-review-service-red.txt:2 real-service baseline failures.
- ui-apply-recovery-review-service-green.txt:3 real-service cases plus7 incrementing callback-client recovery cases PASS.
- ui-apply-recovery-review-arrival-final-focused.txt:19 focused positive/negative UI and real-service checks PASS, including failed/stale ACK, identity change, seat timeout/disconnect and replaced control.
- ui-apply-recovery-review-arrival-full.txt:222/222 PASS across client, main UI, callback-client recovery and real-service recovery suites.
- ui-apply-recovery-review-arrival-final-typecheck.txt:whole-checkout typecheck PASS. Final owned-path diff whitespace check PASS.

The game recovery integration performs real server-validated movement to a current game-chair approach, receives its real seat ACK/snapshot, reopens held Pending, and observes zero selected house.command packets until explicit Retry. Retry sends the exact original UUID/payload once and removes the acknowledged outbox entry. The bedroom integration verifies the same held original is available after its generation-changing room arrival. Ephemeral loopback test services were closed during teardown; no persistent preview, native browser, load test or commit was performed. Parent owns contextual/independent recheck and final affected native acceptance.
