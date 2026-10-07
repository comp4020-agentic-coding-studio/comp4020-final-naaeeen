# Evidence for the student's process argument

7 October 2026. This is a factual source map for the local core at `ea60440`, not
the student's submitted PROCESS or personal reflection. The student must choose,
explain and rewrite the argument; this map supplies no invented feelings,
participant feedback or claims of understanding.

## Consequential decisions and their evidence

| Decision | Problem and considered options | Change and evidence | Limit on the claim |
| --- | --- | --- | --- |
| Focus the idea | The owner wanted movement, owned rooms and shared study, then asked for a clearer purpose. Existing cozy apps already offer many of those features. | Chose voluntary familiar-peer conversation and an author-written next step. [Positioning comparison](../planning/POSITIONING-COMPARISON.md) treats configured Discord as a fair alternative. | Need, value and novelty remain hypotheses. The human pilot has not run. |
| Preserve identity and ownership | Offline residents should keep their rooms; a display name cannot establish authority. | Opaque cookie sessions identify a stable UUID. Permanent membership, atomic receipts and full-house recovery are tested; see `a7f596a`, `eb59848` and the [contract](../product/SHARED-HOUSE-CONTRACT.md). | Anonymous identity is a chosen policy, not proof of a real person's identity. |
| Share one realtime authority | A socket ACK alone does not make an edit durable. Revocation must stop delayed private data. | One store authority, separate zone cursors and access/control generations; see `2f941e1`, `ea60440` and the [architecture](../architecture/SHARED-HOUSE-IMPLEMENTATION.md). | Transport doubles, real SQLite/HTTP and native browser checks establish different boundaries. |
| Keep newer work | Mocked green UI checks missed actual-client late ACK behavior and delayed snapshot projection. | Own-receipt draft bases, projection barriers and retained original UUIDs now preserve drafts. An actual-client/UI replay fixture records one effect; see `ea60440` and [UI refinement](../revisit/UI-REFINEMENT.md). | Simulated transport does not establish adversarial WAN or physical-device behavior. |
| Expand the world | Fitting a whole room inside the HUD left the avatar too small. | Compared whole-room framing with close fixed-angle follow and Overview: 16 matched images, 25 focused checks and 8 native cases. [Camera evidence](CAMERA-EVIDENCE.md) records `ea60440` and the cropping tradeoff. | Mechanical visibility and native control use are not human preference or physical-phone performance. |
| Respect the resource budget | Original 30-minute runs peaked at 196.492 and 260.102 MiB, above the declared local RSS gate. | Eight matched 100-second memory trials led to bounded SQL-plan reuse, `b61706c`, with fresh-authority and close regressions. See [memory comparison](../revisit/MEMORY-COMPARISON.md). | Allocation churn is not proof of a permanent leak. Short trials do not replace sustained acceptance or Fly measurements. |
| Calibrate load feedback | Readable sends could overlap ACKs; an old ACK age did not prevent a queued burst. | A callback/handler counterexample led to v3 single-flight pacing, 14 calibration controls, a real 100-second L2 calibration and one exact 30-minute L1/L2 pair PASS at `2c120a1`. [Load refinement](../revisit/LOAD-PACING-REFINEMENT.md) preserves the unchanged full gates. | The historical 1/29 rejections lack timing attribution. Original failures remain in the record. |
| Reuse methods carefully | The owner required recurring subsection checks and reusable defaults. | A2/A3 extraction, three qualitative scenarios, two portability corrections, Windows/WSL installation and observed instruction injection; see `bf7c801` and [global extraction](../harness/global-extraction). | This is no new agent-efficacy A/B result, proof of web/mobile account sync or universal superiority. |

## From lecture ideas to a working argument

The [plan](../../PLAN.md) and [product positioning](../product/PRODUCT-POSITIONING.md)
define good as voluntary, owned and saved familiar-peer help. Those promises reach
[README](../../README.md), [CLAUDE](../../CLAUDE.md) and meaningful spec cases.
Unit counts cannot decide whether the house feels welcoming, helps someone or earns
its extra walking; those questions belong in a real pilot.

Backpressure exposed specific wrong outcomes: missing routes, leaked descriptors,
clock-dependent speed, stale proofs, duplicate effects and overflowing glyphs.
Repairs changed code, checks or routing guidance. Evaluators were corrected too:
an old toast location or an assumed origin could reject valid current behavior.

Context engineering is visible in bounded ownership, frozen interfaces, handoffs
and source hashes. One review read earlier verdicts; its caveat and the factual-only
fresh-review exception are retained. Techniques are useful when they change a
decision or expose a defect, not because their count predicts a grade.

State has distinct homes: SQLite stores durable membership, rooms, cards, chat and
receipts; server memory holds presence, control and seats; drafts and camera state
stay local. [Operational tests](operations-evidence.md) cover WAL restoration and
opaque-session recovery. Local service factories do not prove the production
Docker entrypoint, Fly TLS or redeployment worked.

## Writing PROCESS from this map

Use the [43-row register](../revisit/REGISTER.md) and its linked subsection records
for requirements, failures, reviews, checks and remaining gaps. [Outbox](../revisit/OUTBOX-REFINEMENT.md),
[world](../revisit/WORLD-READABILITY.md), [camera](CAMERA-EVIDENCE.md) and
[CI evidence](CI-VERIFICATION.md) distinguish their actual execution scopes.
Inspect cited commits with `git show`; verify public commit/compare URLs before
using them in the submitted PROCESS. These local hashes are not a claim that new
commits have been pushed.

The [Final Project guidance](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/)
gives indicative ranges of 400–600 words for README and 900–1100 for PROCESS.
PROCESS is rewritten as the work develops, rather than extended as a diary.
Passing the existing evidence sensor's old PROCESS links does not show that its
narrative explains this house. The student must write that account and name
borrowed or earlier work under the [AI-use policy](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/ai-use-and-integrity/).

## Owner-tested redesign evidence

The owner's hands-on rejection triggered the new R0–R4 scope, recorded in
`5af0812`. `321e27c` adds independently reviewed board authority and69actual tests.
The [18 redesign checkpoints](../revisit/REDESIGN-REGISTER.md) link the new owner
requirements and their separate methods. Native integration exposed cached modal
framing/actual mesh/editor-return/viewport errors beyond initially green units.
Fresh board review found lost image/text, false Saved, bounded-ACK and expired-chat
paths; another actual native run found a React feedback loop. Each has preserved
reproduction, scoped repair/recheck and current source identity.

The [resource protocol](../../evaluation/board-resource.protocol.json) itself was
reviewed: undefined reflection state, dropped deadlines/chat bursts and protocol
drift classification were reproduced in isolated controls before a full workload.
Do not call that an agent-performance win or a human A/B study. Current acceptance
and final commits still need reconciliation after the held resource measurement.
The student must select/explain these real decisions in their own PROCESS argument.
