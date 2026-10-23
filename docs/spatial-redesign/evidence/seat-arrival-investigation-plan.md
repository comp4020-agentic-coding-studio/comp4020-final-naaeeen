# Repair the physical-seat handoff, separately from timing diagnostics

23 October2026. The one preregistered native held-input case completed its planned
flow in21.8s and failed the final zero-rejection assertion once. Actual ordering:
seat request5389.534ms -> successfulACK5391.280ms -> movement5472.662ms rejected
INVALID_MOVE5473.083ms -> first received seated projection5514.836ms. The movement
was zero relative to the observer's previous position, not proven zero relative
to the server's post-seat pose. The next Stand occurs only6550.007ms. All519source
and35launch hashes stayed unchanged; all context/browser processes closed.

This is a separate reproduced arrival failure, not attribution of the two earlier
mixed RATE_LIMITED ACKs. Four held-key Stand first movements succeeded123.672–
205.095ms after ACK; the own-room first movement succeeded142.656ms after subscribe.
There was no actual sub80 challenge, so that renderer trial does not establish
safety in unobserved timing. Preserve the native RED and earlier functional results.

Parent inspected raw sanitized rows. A separate Sol ultra read-only source trace
finds World arrival invokes onInteract without following its promise; UI awaits
claimSeat without informing World, while the controlled client ACK does not invent
a seated projection. A final idle can therefore be emitted while local player
state is still standing after server commitment. Keep the server's seated-movement
rejection and its80ms/speed/30-action rules unchanged.

Before production edits, obtain the independent Astra decision and a concrete
minimal client plan. The candidate needs a physical-seat handoff separate from
panel auto-open choice: suppress stale locomotion through pending claim/projection,
retain authoritative state, and handle explicit rejection, uncertain reply,
manual input, cancellation, late ACK, generation/zone/identity changes and disposal.
Do not add an arbitrary sleep or optimistically claim physical ownership.

Write meaningful deterministic RED/GREEN with actual World/UI/client callback
seams and an intentionally delayed seated projection. Verify no move after claim
commit/before projection, failure/recovery behavior and preserved input/urgent-stop/
route/lateACK rules. Fresh-review actual changes; rerun the same native case on a
new frozen source with original budgets/controls, preserve this first result, and
then qualify the complete selected candidate. Other workers own resource tools;
no unrelated world styling, geometry, backend or game scope is authorized by this fix.

## Selected implementation boundary after independent comparison

Fresh Astra max and a separate Sol ultra trace agree on the ACK/projection gap.
Compare World action-promise tracking (UI currently discards results/errors), an
explicit UI-to-World barrier (risks conflating panel cancellation with physical
ownership), and a scope-bound client transport latch. Select the client boundary:
it observes real ACK/error and authoritative heads for every caller, including
bedroom seats without an activity-panel kind. Keep World/UI unchanged unless a
meaningful integration check demonstrates an additional requirement.

Establish the latch before house.seat emission; block move() with its existing
ineligible/busy return while pending, after accepted ACK awaiting current projection,
and while authoritatively seated. Do not synthesize a seat from ACK alone. Clear
only the matching latch on definitive rejection or causally current authority;
invalidate on identity/house/connection/control/access/zone/epoch/close changes.
Queued old standing heads and late old completions must not release a newer claim.
Test head-before-ACK and explicit Stand/recovery ordering as well as ACK-before-head.

The parent rejects the review's automatic-resubscribe suggestion for ambiguous
claim timeout: current house.subscribe clears participation, advances authority
and resets motion timing. That would silently change consent as a side effect of
claim recovery. Keep unknown claims safe and provide an actionable explicit
recovery through existing Return to title / re-enter (or an existing equally clear
authority refresh chosen by the owner). No silent permanent hidden lock and no
automatic replay of an uncertain chair request. Definitive failures remain usable.

Authorized worker ownership: public/house-client.js, one new actual-module handoff
spec and seat-arrival evidence. Existing client tests may gain meaningful targeted
cases if needed; World/UI changes require a concrete failing behavior and parent
scope approval. Preserve ordinary movement/urgent stop, held input, typing, pending
receipt navigation, voluntary participation and server authority. No timer sleep,
new server endpoint or generalized workflow framework is required.
