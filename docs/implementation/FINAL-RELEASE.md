# Current release: verified 16 MiB server policy

8 October 2026. Source `d2dcf5f` with the prior motion/board refinements is verified
at `2723796` by [CI 37722868698](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37722868698).
All 504 checks, nine image browser cases, unchanged 300-second resource gates,
process/secret checks, backups, deployment and HTTPS smoke pass. Root verifies
all eight deployed source hashes and the actual server flag. Four current live
journeys pass: game 21.4s, rooms/DIY/access 33.6s, board 8.8s and recovery 3.0s.
[Exact results](../../evaluation/movement-reconciliation.results.json) and the
[full resource artifact](../../evaluation/board-resource.semi16-ci.results.json)
bind 202.17 MiB peak RSS, 6.757 ms normal p95, zero skips/missing targets/unexpected
disconnects and all 24 transports. Earlier failures and invalid diagnostics remain
history. Final evidence publication keeps runtime bytes unchanged and receives
its own CI result before completion.

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

# Verified game and standalone board release

7 October 2026. Final runtime ee40225 is deployed and verified at b95d9a1.
[CI37594001833](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37594001833)
passes required465checks, nine image browser cases, the registered300s resource
exercise, process evidence, both secret scans, private mounted backups, Fly deploy
and HTTPS smoke. Root independently downloaded artifacts and checked all resource
gates and source/protocol/instrument hashes. Earlier failed CI, local diagnostics
and source-specific releases remain preserved; none was relabelled as a pass.

The live revised game core passes19.2s; live seat/room/DIY/access passes35.1s under
unchanged budgets. Read-only deployed checks match server, board service, world,
UI and package bytes; public board JS/CSS bytes also match. One shared CPU/256 MB
machine and one/data mount are verified. The current image passes both maintained
standalone board cases; its unchanged board source also retains the earlier live
full-editor proof. No user data root or frozen Crit8 tag was reseeded/moved.

The resource exercise ends with12game/12board/24physical Engine.IO transports,
zero pending deliveries/unexpected disconnects,200.87MiB peak serverRSS and11.86ms
normal deliveryp95. It is a synthetic Ubuntu process exercise. The live one-point
RSS probe and API machine shape do not turn it into sustained physical Fly stress.
GPU idle scheduling keeps active animation and all simulation/input/network/DOM
cadence; models/lighting/shadows/resolution and all deadlines remain intact.

## Requirement closure

| Required capability | Authoritative proof and scope |
| --- | --- |
| Game opening/Continue/Create/Join/HUD/Options | Owner brief, game shell source/tests, maintained title paint cases and current paired live core |
| Larger space, owned DIY rooms, door/seat access | Shared geometry90routes and footprint tests, camera/frame comparisons, current live DIY/reload/visit/revocation |
| Real control, other avatars and dialogue/study | Actual independent identities, motion/availability/chat/authored-next-step/saved-return in current live core; shared seats in current live room flow |
| Follow/Overview/pan/zoom and input ownership | Camera/world/shell tests; native world/room journeys; current47world tests include active/idle/camera/resize/suspend behavior |
| Complete independent collaborative board | Current production-image two-case maintained board gate; exact JS/CSS/backend matching; retained identical-source live draw/sticky/text/image/undo/export/chat/reload |
| Authority, persistence, revocation, recovery and legacy | Real service/store/HTTP/transport/backup suites, current recovery browser case, mounted predeploy backup, immutable Crit8 refs and preserved data |
| Methods, stages, English WSL artifacts and logical history | Active REPORT/PLAN, owner briefs,18redesign/43historical checkpoints, source-specific comparisons and fresh/contextual review records; canonical WSL repository |

[Exact final release record](../../evaluation/final-release.results.json) contains
run/source identities and limitations. [GPU evidence](IDLE-RENDER-EVIDENCE.md) and
[metadata evidence](STARTUP-REFINEMENT.md) preserve actual failures, alternatives,
matched diagnostics, grader checks, reviews and refinements. Board unit coverage
is69.85% statements/67.67% branches with main.jsx0%, distinct from native tests.
Affected world coverage is92.95/83.81%. Physical phone/IME, human preference/value/
A-B, prolonged Fly stress and off-volume restore remain future evidence. Student
PROCESS/reflection drafts require personal review; no HD guarantee is made.

The final evidence-only publication retains identical runtime/source bindings.
Its separate remote CI outcome is authoritative; do not create an endless extra
commit merely to record each subsequent documentation-only run. New work starts
from owner feedback and actual current state, preserving this verified implementation.
