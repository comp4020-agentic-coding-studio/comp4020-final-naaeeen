# Recovery review repairs: explicit retry and current seat acknowledgement

23 October 2026. Production frozen for parent contextual review and affected native acceptance. No service, browser, commit or load task was started here. Source binding: ui-apply-recovery-review-source-binding.json. This supersedes the earlier recovery-route technical acceptance for the two newly reproduced issues; earlier native observations retain their original source scope.

## P1: returning must not silently dispatch the selected original

The real-client calibration seeded a recent game.move draft, connected with observer control, entered the bedroom as controller and subscribed back to the lounge. Against the pre-repair client, subscribe -> flush emitted the original house.command while standing; a seat-required rejection removed it. This is recorded in ui-apply-recovery-review-real-client-red.txt. The fixture uses actual createHouseClient, reducer, outbox and Socket.IO-style event/ACK callbacks, including a real client subscribe/claimSeat path. It is not a live server or browser run.

Selected recovery navigation and explicit Take control now first await `holdPending(originalCommandId)`. The hold is a persisted `recoveryHeld: true` field on the outbox entry, outside its unchanged command UUID/type/payload/revision. Automatic eligibility skips held entries; other drafts keep their ordinary eligibility. The flag survives construction/full reload and remains until an explicit manual retry is acknowledged/removes the entry. An uncertain manual retry stays held for another deliberate retry. Generic resubmission of the held command directs the user to Pending rather than bypassing the hold. Storage/capacity/in-flight failure blocks recovery navigation or takeover and preserves the original bytes.

Automatic activity retries separately require a real connected self game chair. game.leave remains an escape while standing. Manual retry keeps its original scope/identity/controller authority and can reconcile an already accepted historical receipt while standing. ACTIVITY_SEAT_REQUIRED is retained by both client outbox and main UI instead of deleting the original. These are different conditions: a new automatic effect needs current seat authority; historical manual receipt lookup must remain possible.

Real-client regressions cover the selected hold across reload, bedroom -> lounge -> actual seat ACK with zero selected house.command before retryPending(originalID), exact unchanged command once after manual retry, unrelated chat continuing, manual historical standing replay, retained seat rejection, failed hold storage preserving original bytes, automatic connected-chair positive and standing Leave. UI tests verify the hold finishes before navigation/takeover, and failure performs neither. A later control change while storage is awaited also blocks the old navigation.

## P2: a seated broadcast is not this journey's successful ACK

Five pre-repair UI regressions failed in ui-apply-recovery-review-ui-red.txt. Recovery journeys now carry their own seat-claim object and require its successful ACK plus matching current identity/house, server epoch, controller generation, access generation, connected seat and intended chair. Failed ACK clears the journey; disconnect during a pending claim or changed control/epoch cancels it. A subsequent seated snapshot therefore cannot reopen Pending merely because the transient choice was cleared. The queued reopen checks the same authority again.

An intentional bedroom-to-lounge subscription may clear the private view before any seat claim; the held journey can continue to that authorized lounge. A disconnect callback cancels it. No automatic Join, replacement command, teleport, takeover or retry is introduced. A hold stays available in Pending after cancelled navigation.

## Verification

- Real-client and UI RED artifacts preserve the original automatic send/deletion and false reopen failures.
- ui-apply-recovery-review-full.txt:215/215 PASS across client, main UI and the new seven-case actual-client recovery suite before the last control-during-hold guard.
- ui-apply-recovery-review-control-red.txt: the additional awaited-hold control change failed before its guard.
- ui-apply-recovery-review-final-focused.txt:20/20 PASS after that guard, including all new recovery client cases, recovery return/label/control cases and false-ACK/disconnect/replaced-control cases.
- ui-apply-recovery-review-final-typecheck.txt:whole-checkout typecheck PASS; final owned-path diff whitespace check PASS.
- Parent contextual review and current affected native recovery remain required. No existing pre-repair native pass is inherited as verification of this source.

## Subsequent real-subscription correction

The constant-generation fixture did not cover actual subscription generation changes. ui-apply-recovery-review-arrival-checkpoint.md supersedes the earlier arrival-generation acceptance with real createService/SQLite/Socket.IO/UI integration, intended successful ACK adoption, queued-route cancellation negatives and222 passing affected checks. Earlier hold/seat-denial results remain scoped historical evidence.
