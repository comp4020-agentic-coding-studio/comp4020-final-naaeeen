# Approved redesign release status

7 October 2026. The owner approved public checkpoint/main pushes and the existing
CI/Fly release. The application is locally verified; release acceptance remains
open. Preserve the Crit 8 tag, original data, existing secret hooks, fixed Fly
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
unchanged. Actual next-run results must be recorded before claiming completion.

The public checkpoint branch is redesign-game-board at f5a25f2. Main contains the
reviewed application and subsequent CI-only corrections. The private same-volume
backup preflight succeeded on the existing production machine at
2026-10-07T04:59:59.935Z; the exact final candidate gets another verified backup in
CI before deployment. Production still serves the earlier Crit 8 release at this
checkpoint. No redesigned deployment or real-human preference result is claimed.

Local required build/type/spec passed 411 checks. See
[local validation](REDESIGN-VALIDATION.md) and
[exact local source/evidence](../../evaluation/redesign-closeout.results.json).
Board statement/branch coverage remains below the 80% target. Physical-device,
human value/A-B and student-authored reflection remain explicit separate gaps.
