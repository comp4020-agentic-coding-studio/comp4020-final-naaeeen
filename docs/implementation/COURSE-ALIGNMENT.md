# Current course requirement alignment

Checked 7 October 2026 against the official course pages and current repository.
This maps requirements to local evidence. It does not claim a grade, student
understanding, completed human activity or a new deployment.

| Requirement | Current local evidence | Remaining work |
| --- | --- | --- |
| A persistent, realtime, multi-user app | Separate browser identities, authorized sockets, SQLite/receipts and room/card/chat/restart/restore checks | Verify the actual Fly image, TLS, restart/redeploy and use by real people. |
| Definition of good agrees across argument, rules and checks | README's voluntary familiar-peer help, CLAUDE's quiet/privacy/ownership rules and targeted spec cases | Student review of the argument; human judgement of its value. |
| Complete marking environments, resize and keyboard; stronger simultaneous/slow/return behavior | Native 1920×1080 and 390×844 flows, touch/typing/room checks, process races and declared load workloads | Physical IME/GPU, WAN conditions and human next-day return remain unverified. |
| A defensible process, stack and workflow account | PLAN/ADRs, the subsection register, retained failures, repairs and focused local commits | Student-authored PROCESS and reflections with verified public commit/compare references. |
| C9: one consequential multiplayer behavior decision | The [willingness ADR](../decisions/2026-10-07-explicit-willingness.md), state/default/quiet/conflict checks and native propagation | Deploy the tested candidate, run the pod's concurrent device use and rejected-option challenge, write the Crit9 reflection. |
| C10: server-side action instruments and a live view | Structured actor/action/time/outcome logs and semantic movement start/stop checks | Deployed live observation, instruments-only group demo and Crit10 reflection. |

## Submission and marking contract

The [Final Project page](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/)
and [Assessment page](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/)
state noon Monday 9 November 2026. They do not explicitly name a timezone;
Sydney is this workspace's planning timezone, not a quotation from those pages.
The planned deadline remains noon rather than relying on the stated grace period.

For COMP4020, A3 is 40% of the course. Its components are process 50%, deployed
application 25% and response 25%. The indicative writing ranges are README
400–600 words, published in full at `/readme/`, and PROCESS 900–1100 words.
Rewrite PROCESS at the later crits rather than appending a diary; ADRs are separate
from its word count. Reflections are 150–300 words. The course does not define the
local tokenizer as an official counting method or make technique counts a grade.

Markers use stable Chrome at 1920×1080 and 390×844, begin at `/readme/` and test
promises with two sessions, resizing and keyboard input. The assessed submission
is the deployed state associated with the pushed main-branch commit. A local build,
the frozen Crit8 sensor or links in an old PROCESS cannot establish the new house's
live behavior or process argument.

## Crit-specific evidence and authorship

[C9: All at once](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/09-all-at-once/)
requires deployed changes to reach other sessions without reload, roughly within
a second. The written decision records options, README-based reasoning and costs;
an ADR is a suggested form, not a mandatory filename. The pod uses its own devices
and challenges the rejected option. The local ADR is preparation for that session.

[C10: Fly by instruments](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/10-fly-by-instruments/)
requires server logs of who acted, what happened and when, plus a live view. A
terminal tail can suffice; no dashboard product or tracing library is required.
The group uses the deployed app while the student explains the instruments without
clicking through their own UI. Local log tests are not that demonstration.

Under the [AI-use policy](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/ai-use-and-integrity/),
agent use does not remove the student's responsibility to explain, defend and modify
the work. PROCESS must name borrowed public work and reused earlier work. This
source map supplies no fictional feelings, human feedback or deployment success.
The student must explain the actual decisions and the counter-case that configured
Discord may serve the group better.

Use [PROCESS evidence](PROCESS-EVIDENCE-MAP.md), [CI verification](CI-VERIFICATION.md)
and the [register](../revisit/REGISTER.md) to locate actual claims and their limits.
