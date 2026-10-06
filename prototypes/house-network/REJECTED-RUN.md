# Rejected first runner execution

The parent reported the initial runner exit1 on6October2026. Preserve these facts;
this file is not a replacement for the parent's raw result artifact:

| Candidate | Accepted measured moves | Other observations reported by parent |
| --- | --- | --- |
| SSE + HTTPPOST |1198/1200|2 RATE_LIMITED responses; visible p95 about46.5ms; RSS about89.6MiB|
| Socket.IO4|1200/1200|visible p95 about6.87ms; RSS about89.7MiB|

Both candidates ran the earlier implementation with two confirmed evidence defects:
the runner captured end RSS/TCP counters after acknowledgement/delivery drain,
and reported drain after reconnect; the Socket.IO fixture attached snapshot
handlers after connect and substituted an HTTP snapshot. Consequently this run is
**rejected evidence** for final performance/transport acceptance. The lower
reported Socket.IO latency is not a final decision.

The updated fixture registers Socket.IO handlers before connecting and requires
the actual transport snapshot. It captures RSS/TCP/accepted counters at the end
of the measured20-second send window, then separately reports acknowledgement/
delivery drain before rejoin. Warmup and measurement actual wall durations are
reported separately. The monotonic schedule reports tick lateness and each
client's actual inter-send intervals.

The initial common limiter was12 events/s with burst2. A deterministic monotonic
test delivered nominal10Hz ticks at0,100,200,300,400,500,600ms, then delivered
the700/800/900ms ticks together at950ms, followed by1000ms. Burst2 rejected that
bounded delayed schedule with RATE_LIMITED (test exit1). The common implementation
now uses burst4 while keeping the sustained12/s refill and the excess-traffic
rejection check. This change applies identically to both candidates. It supports
the controlled nominal10Hz cadence after a short scheduling delay; it is not a
change to the frozen grading thresholds, workload, or protocol.

That reproduction demonstrates a limiter weakness under a plausible delayed
schedule. The original run did not record scheduler lateness, so the exact cause
of its two drops remains unproven. Only the parent's next single matched pair
will provide accepted or failed current evidence; no unbounded extra trials are
authorised.

Fresh reviewer confirmed the snapshot/window fixes and found no remaining
actionable defect. Reviewer identified untested same-cookie multiple connections,
existing-member rejoin into a full room, unauthorized event subscriptions, and
original chat-UUID replay after restart. These remain explicit coverage limits;
the fixture's checked domain paths do not establish production security.

## Subsequent completed measurement with failed SSE cleanup

The parent reported a subsequent matched pair with13 core checks passing and
both candidates accepting1200 measured moves with7200 visible deliveries and
latency/RSS thresholds passing. The whole runner still exited1 because SSE's
serverExit was{code:1,signal:null}; Socket.IO was{code:0,signal:null}. Preserve
that result as completed measurement with failed cleanup, not a fully passing
runner. The original run had also recorded SSE exit1.

A short real-child regression reproduced the failure without a20-second
benchmark: six SSE clients reconnect one client, then disconnect simultaneously
before shutdown. A presence broadcast attempted to write to an ended SSE response,
raising ERR_STREAM_WRITE_AFTER_END at server.mjs deliver and exiting1. With
clients left connected, SSE shutdown exited0 after roughly4.4seconds; both
Socket.IO closure scenarios exited0. The runner's stderr field had been copied
before client/server cleanup, so shutdown diagnostics were absent from its JSON.

The repair guards stopping/ended/destroyed SSE responses, terminates remaining
connections after initiating server closure rather than waiting for idle sockets,
and captures diagnostics after the child stdio closes. All four short child
closure cases then exited0 with empty stderr in roughly311–387ms each. The13
existing finite checks also passed unchanged. The protocol/grading/workload did
not change. No additional matched pair was run by the prototype worker; the
parent decides whether an integrated rerun is needed.
