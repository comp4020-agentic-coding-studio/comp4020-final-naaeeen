# First rejected ACK category

Scope: failure reporting only. Preserve the exact 812dd66 instruments, protocols
and first results in `failure-category-preimages-812dd66` before instrument edits.
The first full mixed preparation failed RATE_LIMITED after two chair claims; its
missing message cannot be recovered, and this change does not infer its cause.

On an already rejected ACK, reuse the exact two-message classifier and retain
only ACTION_BUDGET, MOVE_INTERVAL or OTHER. Throw the same existing error code and
store its fixed category in a WeakMap keyed by the locally created Error. At the
existing board outer/launch catches, explicitly project `ackCategory` into the
first failure record. No ACK/error spread, message, identifier, token, body,
timestamp or additional sample is retained. Unknown and transport errors are
OTHER; forged category-like fields on foreign errors are ignored. The WeakMap
avoids treating an arbitrary transport property as a classified ACK.

Keep the existing success predicates and returned response identity. Preserve
every ask, timeout, timer, route, source check, gate, original first-failure `??=`,
in-flight drain and cleanup. This adds work only after rejection/catch; it does
not opt a full profile into tracing. Update spatial ok(), the explicit traced
bootstrap rejection, and board ok() so the two ACK paths agree. Leave general
HTTP, transport and harness code forwarding behavior as it was.

First write focused service-free RED controls against actual extracted current
ok/bootstrapAsk and actual board catch statements. Cover both known categories,
unknown/non-rate/null ACKs, original codes, raw-field privacy, success identity,
transport rejection/forged fields, first-failure preservation, trace on/off and
the asynchronous launch catch. Then implement the small shared helper and rerun
these plus affected pure trace/memory controls and syntax/type checks. No service,
browser, full suite, protocol registration or resource run is authorized here.

Freeze the two instrument hashes and focused spec, obtain independent source
review, preserve the actual first RED/green outputs, and return readiness to the
parent. New source qualification and any later binding/execution belong to the
parent. Old evidence retains its original source scope.
