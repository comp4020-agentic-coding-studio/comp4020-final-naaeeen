# Current release: verified image allocation refinement

8 October 2026. Store `da3d7ec`, motion `5c40545` and evaluator `e54a694` are
verified at `aee040c` by [CI 37717775859](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37717775859).
All 498 checks, nine image browser cases, 300-second resource gates, process and
secret checks, backups, deployment and HTTPS smoke pass. Root verifies seven
deployed source hashes and affected live board cases at 9.7 and 3.4 seconds.
[Exact results](../../evaluation/movement-reconciliation.results.json) and the
[resource artifact](../../evaluation/board-resource.asset-ci.results.json) bind
202.54 MiB peak RSS, 9.282 ms normal p95, all 24 transports, zero skips/missing
targets/unexpected disconnects and full recovery. Earlier failures and diagnostic
limitations remain history. Final evidence publication keeps runtime bytes
unchanged and receives its own CI result before completion.

# Verified movement and evaluator release

Runtime `5c40545` and evaluator `e54a694` are verified at `daef80c` by
[CI 37603266802](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37603266802):
495 required checks across 28 files, nine native cases, all 300-second resource
gates, process and secret checks, mounted backups, deployment and HTTPS smoke.
Six deployed source hashes match. The revised live core and room journeys pass
in 19.2 and 30.9 seconds. [Exact results](../../evaluation/movement-reconciliation.results.json)
and the [resource artifact](../../evaluation/board-resource.indexed-ci.results.json)
bind the source, protocol, instrument and observations. Earlier failures remain
preserved. Pending labels below describe their historical checkpoints. The final
evidence publication keeps runtime bytes unchanged and receives its own CI check;
a further status-only publication is unnecessary.

# Current movement gate: open

CI [37596250446](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37596250446)
at docs-only source `61e297e` failed real peer movement: the owner's predicted
avatar had travelled far while the peer still saw it near spawn. Eight other
browser cases passed. Earlier `b95d9a1` results below remain valid for their exact
source and scope; they do not close this newly observed failure. The current
motion reconciliation correction requires fresh review, affected native flows,
required checks and actual CI/deployment verification. See
[MOVEMENT-RECONCILIATION.md](MOVEMENT-RECONCILIATION.md).

# Approved redesign release status

7 October 2026. The owner approved public checkpoint/main pushes and the existing
CI/Fly release. Final runtime ee40225 is deployed and VERIFIED at b95d9a1 by CI37594001833
and revised live game/room flows. [Final release](FINAL-RELEASE.md) supersedes
pending labels below, which remain historical source-specific checkpoints.
Preserve the Crit 8 tag, original data, existing secret hooks, fixed Fly
256 MB machine and one mounted volume.

## Actual CI history

| Run / source commit | Verified result | Downstream status |
| --- | --- | --- |
| [37575162606](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37575162606), f7afba2 | Image build and 411 spec checks passed. Chromium launch failed with NoUsableSandbox. | Native cases failed; registered resource and deploy did not run. |
| [37577667210](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37577667210), 31bd1ba | Image/spec passed; container settings verified; Chromium launched. Renderer discovery returned no matches. | Nine application cases, registered resource and deploy did not run. The old scan's exact failed condition is unproven. |
| [37578702188](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37578702188), 99cdaba | Image/spec passed. Actual sandbox artifact passed: non-root, default enforced AppArmor, renderer user/PID namespace, NoNewPrivs and extra seccomp filters. Playwright then failed EROFS deleting the output mount root. | Application cases, registered resource and deploy did not run. |

The output correction places Playwright's disposable results/report directories
inside the existing writable output mounts. This addresses its directory deletion
contract without making source writable. Sandbox policy, nine selected cases,
60-second case/10-second startup guards, zero retries and resource acceptance stay
unchanged. The correction passed actual CI in the run below.

The public checkpoint branch is redesign-game-board at f5a25f2. Main contains the
reviewed application and subsequent CI-only corrections. The private same-volume
backup preflight succeeded on the existing production machine at
2026-10-07T04:59:59.935Z; the exact final candidate gets another verified backup in
CI before deployment. The following actual release supersedes the earlier Crit 8
production UI; the frozen tag and legacy database remain intact. No real-human
preference result is claimed.

Local required build/type/spec passed 411 checks. See
[local validation](REDESIGN-VALIDATION.md) and
[exact local source/evidence](../../evaluation/redesign-closeout.results.json).
Board statement/branch coverage remains below the 80% target. Physical-device,
human value/A-B and student-authored reflection remain explicit separate gaps.

## Successful CI and deployed verification

[Run 37579809454](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37579809454)
passed check and deploy at d693d06: production Docker build, 411 build/type/spec
checks, nine maintained browser cases, registered 300-second resource attempt,
process evidence, both secret scans, exact-candidate private mounted backup and
Fly deploy/HTTP smoke. The run retains the original deadlines and zero retries.
The live board native gate is recorded separately below.

The downloaded [current resource result](../../evaluation/board-resource.results.json)
is PASS, has all gates true, binds to protocol 1ef47348 / manifest 545d79c3 /
instrument 6130e233, and every listed runtime source hash matches the checkout.
Peak server RSS is 202.59 MiB; normal delivery p95 is 8.862 ms; 47,376 delivery
targets were observed with no pending targets or unexpected disconnects. It ends
with 12 game and 12 separate board transports. Exact earlier results remain in
[the pre-CI archive](../../evaluation/board-resource.pre-ci.results.json) and their
existing earlier files; failures have not been relabelled as passes. This synthetic
Ubuntu process exercise is not a constrained Fly, browser-rendering or WAN result.
Its pointer ACK/cadence does not grade peer pointer content/drain; that behavior
has separate pressure fixtures. Sole snapshot ACK and per-event disconnect
attribution are also narrower than this workload's pass criteria.

Live HTTPS native game flow passed in 30.9s, including two actual identities,
movement, willingness, chat, authored next step and saved return. Live seats/room
flow passed in 49.5s: sit/stand, DIY palette/placement persisted across reload,
allowed visit and visitor revocation. The board case initially stopped at the
loopback-only fixture guard before mutation; this is not a board behavior failure.
The existing default remains restricted; a reviewed explicit opt-in accepts only
the exact approved HTTPS app. All 23 focused controls pass. The unchanged board
case then passed live in 12.8s, with two independent identities, sticky note,
multiline text paste, native image paste, peer drawing, real chat, own undo/redo,
movable/resizable/collapsible chat, PNG/canvas export and saved reload. The two
previously passing live game/room cases were not repeated. Root first invoked the
23 controls against an absent default8080 fixture (NOT RUN), then used the actual
4093 preview and obtained 23 PASS; no application defect is inferred.

A reviewed read-only Machines API probe at 2026-10-07T06:21:00.420Z verified one
shared-CPU/256 MB machine and one /data mount, Node24.21.0 and exact server, board
service, world, UI and package hashes. Server RSS was 105,668 KiB at that moment.
Cgroup memory telemetry was unavailable; no sustained physical resource pass is
inferred. A fresh reviewer found stale-PASS handling; root reproduced two negative
controls, repaired invalidation before local hashing/network calls, and obtained
a contextual recheck. The private probe reads code/process metadata only.

[Release result](../../evaluation/redesign-release.results.json) keeps exact hashes,
run/candidate identities, scoped results and residual gaps. Native private reports
and images remain under .local/redesign-closeout. Root inspected the live owned-room
image and CI board image; these show actual rendering, not human preference.

## Evidence publication and remaining scope

The final publication updates test-fixture authorization and evidence only; deployed
application source and resource protocol/instrument remain unchanged. Existing main
CI still runs for the evidence commit; its result is a separate run identity. No
second live flow replay is required merely for identical runtime bytes. The source
probe binds the verified application independently of documentation commit IDs.

Human value/preference/A-B, physical-phone performance, board unit coverage below
80%, prolonged stress on the actual Fly VM, off-volume backup recovery and student
personal writing remain distinct future work. They are not represented as completed
by this implementation/release. The app is available for the owner to try.

## Later startup failure and reviewed refinement

Runs37581974214 (03b5f6f) and37582431626 (bc3e4a9) each passed required specs and
eight browser cases, but peer join exceeded the unchanged10s startup guard at
16.288s/11.539s. Resource/backup/deploy were skipped; no new release replaced the
verified d693d06 app. Failures remain saved separately. The reviewed incremental
world99bac82 removes repeated static geometry work and fixes stale queued-door
visits. Parent final local454checks and two affected native flows pass; one matched
comparison records8.204s baseline/4.951s candidate join. It does not prove general
reliability. Refined-world CI and deployed source/flow verification remain required.

## Subsequent idleGPU refinement

CI37587377555 at38148c8 passed454requiredchecks/eight native cases, then failed
peer admission under10s; downstream skipped. Actual filtered network timings
were milliseconds while UI actions took seconds. Reviewedsourceee40225 now budgets
only staticGPU drawing at<=10Hz, preserving all active/logic/network cadence and
models/AA/light/shadow/criteria. Parent465checks, two affected native flows and
worldcoverage92.95/83.81 pass. One fixed-order diagnostic records9861ms/257ms join;
cache/host/confounds and differing duration are explicit. Latestremote acceptance
remains pending; see [GPU evidence](IDLE-RENDER-EVIDENCE.md).

## Final verified release

CI37594001833 atb95d9a1 passes check+deploy. Root checks exact downloaded resource
source/gates:300.001s,200.87MiB peakRSS,11.86ms normalp95,24finaltransports andzero
pending/unexpecteddisconnect. Private backups, secrets andprocess evidence pass.
Deployed source/board assets match final source; live game19.2s/room35.1s pass.
[Final closure](FINAL-RELEASE.md) records scope/gaps. Final documentation-only
publication has identical runtime and a separate CI identity; no recursive doc
updates are needed solely to restate that followup run.
