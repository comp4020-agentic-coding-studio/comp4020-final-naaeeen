# Fresh normal-input decision after completed mixed qualification

Fresh-context GPT-6 Astra max independently inspected the saved complete run,
current scheduler, core guards and renderer without execution or mutation. Parent
source inspection agrees. The report has30 gates:29true, normalInputsfalse due to
two movement RATE_LIMITED ACKs. Per-view rejection counts/times/categories are
absent, not zero; the exact two historical causes remainUNKNOWN. All source53
matched the registered candidate when reviewed. First results remain immutable.

## Independent causes to discriminate

The workload keeps an old100ms nominal deadline after moderate lateness: a send
scheduled100ms can occur149ms, followed by the retained200ms deadline,51ms later.
Stand and subscribe reset the server's movement clock, while workload control
completion leaves the previous next-motion deadline. Connection readiness can
also finish after its pre-handshake deadline. Each could put a nonzero send inside
the unchanged80ms guard without an excessive sustained average frequency.

The30-action budget is separate; speed-credit failures are INVALID_MOVE. HTTP
media counts do not prove root socket budget usage. The normal ACK path preserves
only aggregate rejection/code; semantic logs intentionally omit movement failure
bodies. Existing evidence cannot identify the actor, timing or RATE subtype.

Use actual socket handlers with an explicit injected monotonic clock, current
authority/sequence and valid small displacements. Compare149/200 against149/249;
Stand+50 against+100; same-zone/actual-zone subscription+50 against+100;30stationary
accepted actions versus the31st and a new1000ms window. Include a stationary ACK
at reset+50 followed by nonzero+100/+150: accepted stationary packets update the
same movement clock. Keep overspeed/collision/auth negative controls and verify
rejected requests do not advance pose or accepted sequence. Stop unexpected
outcomes before selecting a correction.

Conditional smallest caller repair: no deadline catch-up, a fresh pacing deadline
after successful control/readiness, and accounting for actual send/ACK timing.
Keep nominal10Hz,9.5..10.2standing acceptance, transition time in its denominator,
every route and rejection counter, roles/duration/quality and all other gates.
Bound safe rejection details and aggregate counts; store only fixed categories and
numeric connection/view/timing/route/fault fields, never raw messages or credentials.

## Real-client boundary remains open

The renderer resets lastSent/lastSettled to-Infinity on stand/zone/control changes,
and held movement can initiate Stand. Source therefore does not establish that
this is solely a synthetic caller problem. A predeclared actual held-key transition
trial must distinguish client ACK, projected state and first movement, preserving
urgent-stop/visibility/access behavior. Passing the synthetic pacer alone cannot
close this user-facing question. No native failure or client repair is claimed yet.

Parent authorized preparation of bounded controlled tests and a separate native
protocol. No further unchanged full trial is allowed. New verdict requires actual
reproduction, useful positive/negative controls, reviewed changes and a newly bound
qualification; retrospective attribution of the original two rejections staysUNKNOWN.
