# Comparison,validation and independent review

6 October 2026. Parent-owned evidence record. This is local research/planning
evidence,not a production house release or a human preference study.
Protocol declared before trials:
[evaluation/shared-house-planning.protocol.json](../../evaluation/shared-house-planning.protocol.json),
SHA25657a4e07831b490ea15184707a1656f061dc32eab831036f07086f53c20128278.
Hash was rechecked after experiments and remained unchanged.

## Baseline and environment

Canonical Ubuntu/lizhi repository,Windows-to-WSL bridge; Node24.21.0,pnpm11.9.0,
Three0.186.1. Production baseline is frozen crit-8 at6dc79c5. Root package/lock,
src/public/spec,Fly shape and CI workflow were not changed. Prototype libraries
are isolated under prototypes and excluded from the Docker image.
The initial root pnpm check failed because localhost8080 had no server; this
was a setup failure,not failing application assertions. Parent started an isolated
baseline on4093 and re-ran with APP_URL:32tests passed,typecheck passed.
check:evidence passed with three existing real commit references.

## Transport-plus-payload comparison

Both candidates share one fixture service and real SQLite for membership/chat.
Six synthetic distinct-cookie clients,10moves/s each,5second warmup,20second
sample;1200 measured commands and7200 expected observer deliveries. Fresh server
process per candidate,same host/runtime. Byte counters are actual Node TCP-stream
counters,including HTTP/WebSocket framing and fixture metrics requests,excluding
TCP/IP headers. This is not a pure transport-overhead comparison: SSE sends full
snapshots; Socket.IO sends deltas.

[Final raw results](../../evaluation/shared-house-network.final.json):
parent command and both server shutdowns exit0;17finite real HTTP/SSE/Socket/SQLite
tests pass. Each candidate accepts1200moves,observes7200deliveries,has no workload
failures and passes the unchanged declared latency/RSS gates.

| Observation | SSE+POST/full projection | Socket.IO4.8.4/deltas |
| --- | --- | --- |
| Visible same-host latency p50 |6.70ms |4.38ms |
| Visible same-host latency p95 |10.51ms |7.41ms |
| Maximum sampled latency |22.76ms |80.41ms |
| Peak sampled child RSS |90.43MiB |89.84MiB |
| TCP-stream written bytes in window |17,089,335 |1,709,685 |
| Server graceful shutdown | exit0 | exit0 |

Both are viable for this small local fixture. Socket.IO's lower payload volume
and event/control lifecycle fit the planned high-frequency game channel; the
choice is not proof of better latency or memory on Fly. The one-pair observation
does not establish reliability probability or an optimal tick rate.

### Failed/rejected evidence and refinements

1. Original trial: SSE1198/1200 and two rate rejections; Socket1200/1200. Reviewer
   found sampling/drain timing contamination and a startup-snapshot listener race
   hidden by HTTP fallback. This pair was rejected for comparative conclusions.
2. Fixed measurement trial: both1200/7200 and gates passed,but overall exit1:
   SSE cleanup failed. [Raw trace](../../evaluation/shared-house-network.results.json)
   remains. Parent noticed the nonzero exit rather than accepting green subfields.
3. Short child reproduction found ERR_STREAM_WRITE_AFTER_END: simultaneous stream
   disconnect caused presence delivery to ended responses. Worker added response
   guards and shutdown ordering; four real-child cases exit0.
4. The final full pair above includes those17checks and both clean shutdowns.

The delayed-tick limiter regression reproduced a300ms catch-up burst rejection.
Both candidates use shared burst4/refill12/s after the fix; nominal10Hz and all
grading thresholds stayed fixed. Tick lateness/inter-send measurements are retained
in raw results. The exact original rate-drop root cause was not assumed proven.
[Prototype rejected-run notes](../../prototypes/house-network/REJECTED-RUN.md)
preserve observed facts and instrumentation defects.

Parent native test coverage for final network prototype:98.27%lines,83.84%branches,
97.22%functions across client/service/server/CLI. server.mjs branches81.71%;
CLI branches40% is an explicit residual gap,not hidden by the aggregate.
This is not coverage of the production game. Production/WAN/proxy behaviour,
full-game collision authority,slow readers and long-run resources remain untested.

## Layout and interaction comparison

A=all doors on rear wall; B=ceil(capacity/2)rear plus remaining left-side doors.
Same12x8floor,central table/furniture,palette,fixtures and oblique camera.
Both configure exactly2,3,4,5,6doors/seats/avatar fixtures,checked in actual DOM.
All90door/seat/board geometric targets across the ten configurations are covered
by the model route checks. Parent ran16model/HTTP tests:exit0; scoped coverage
100%lines,87.5%branches,92.86%functions. Browser app.js is outside that coverage.

Initial parent desktop screenshots found constant-header occlusion of a top door
in both candidates. A shared camera safe-area change enlarged the vertical frustum
12->16 with offset+0.4; angle/geometry unchanged. Both were recaptured.
A native-label association problem was fixed; plant/lamp/chair footprints and
off-grid corner routes had meaningful regressions; keyboard route takeover and
old shadow-map disposal were also reviewed and corrected.

Final matched samples verify DOM1920x1080 and390x844,no horizontal overflow:
[desktop A2](screenshots/shared-house-A2-desktop-final.jpg),
[desktop B2](screenshots/shared-house-B2-desktop-final.jpg),
[desktop A6](screenshots/shared-house-A6-desktop-final.jpg),
[desktop B6](screenshots/shared-house-B6-desktop-final.jpg),
[phone A2](screenshots/shared-house-A2-phone-final.jpg),
[phone B2](screenshots/shared-house-B2-phone-final.jpg),
[phone A6](screenshots/shared-house-A6-phone-final.jpg),
[phone B6](screenshots/shared-house-B6-phone-final.jpg).
Expanded diagnostic overlays were used for counts then collapsed for final pictures;
an initially misnamed capacity4capture was rejected/renamed before grading.
Initial clipped desktop pictures are retained beside final files.

Parent browser observations at phone B6: walk to seat,sit/stand,local text bubble
and transcript,walk to board,pin a Chinese note,enter own room and return completed.
A12second room-transition wait timed out before the room subsequently appeared;
no device-frame-rate or timing guarantee is inferred from this automation.
Typing same-direction wwwwww in the chat input left displayed position unchanged;
movement button changed position. This is not physical IME/soft-keyboard validation.

Parent also detected removed PCFSoftShadowMap use on Three0.186.1; prototype changed
to the actual PCFShadowMap fallback. Geometry and effective rendering algorithm
stayed matched. Final parent reload produced no new browser warnings/errors; prior warnings
remain historical diagnostics.

Choose A for2/3 and B for4-6 as a reasoned initial configuration: compact intimacy
versus more room for door names. All geometric candidates pass; this preference
is parent design judgement,not a statistically supported human result. Large
research banner/diagnostics are intentionally absent from proposed production HUD.

Fixtures,chat,notes and rooms here are local simulations. This prototype does not
provide actual friends,persistent DIY,membership/privacy,shared focus or a working
multiplayer whiteboard. It is separate from the network fixture. P1 must integrate
two real browsers before the combined game is called implemented.

## Fresh reviews and verified resolutions

Two root reviewers were spawned with fork_turns=none and only current owner
brief,candidate files and criteria. They did not receive parent chat,previous
recommendation history or each other's findings. Parent reconciled their initial
findings against actual documents; their followups reviewed revised artifacts.
Followups are refinement,not extra independent trials. Prototype workers also
obtained bounded independent code reviews; parent ran checks/observed the browser.

| Confirmed planning issue | Resolution |
| --- | --- |
| Sole house owner cannot leave | Last-member archive disables code,releases member and permits new house |
| Board columns/stages contradict | Separate goal progress/helpNeeded; sections are filters; drag only moves |
| Removed resident can use old code | Atomic code rotation,removed identity guard and explicit reinstatement |
| Late join history unclear | Disclose retained lounge/board history and opened bedroom history |
| Recovery placed too late | P1/P2 minimum export/import; full-house return does not claim another slot |
| Selected timer/pen treated as owner mandates | Mark chosen mechanisms; substitutions require reason while preserving core |
| Chat delight too vague | Concrete bubble count/time/lines,viewport clamping,unread/quiet behaviour |
| Delayed private snapshot after door close | Permission epoch/access generation barrier and old HTTP request invalidation |
| Receipt GC versus old outbox | Active-house metadata retained;24hour auto-retry; future GC cannot drop consumed IDs |
| Conflicting production loads | Exact L1 six controllers+six observers and L2 twelve controllers/no observers |
| Private archive no read contract | Original identity-only read/export separate from active membership |
| Offline focus phases unclear | One finite work/break cycle using original deadlines,then ended |

Both review followups report their original findings resolved in the plan with no
new material contradiction. These are specification fixes,not proven production
security repairs. Production tests must cover delayed snapshots/revocation,
old receipts,recovery,archived isolation and multiple elapsed deadlines.

## Acceptance status

PASS: requirement capture,actual baseline inspection,current primary research,
fixed protocol,local transport pair,finite prototype checks,scoped coverage,
matched viewport samples,listed local interactions,fresh reviews/refinements.
NOT RUN: integrated two-browser house game,real Fly256MB30minute workloads,
physical phone/IME/GPU,real-friends/no-coaching/next-day trials,production v1->v2
migration/restore and authorisation/revocation implementation.
These are explicit P1-P7 acceptance tasks,not silently completed features.
