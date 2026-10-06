# Course principles in the implemented house

Primary lecture pages checked 6 October; official assessment and Crit pages
rechecked 7 October 2026. These links establish teaching
ideas; actual artifacts establish whether we applied them. A walkthrough does
not prove the student's understanding. The student should explain the following
traces and challenge the decisions in their own words.

| Course idea | Concrete application | Extension and evidence |
| --- | --- | --- |
| [Week3 harness feedback](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-3/) | CLAUDE steers ownership/truth; SQL/domain/spec enforce precise invariants | Independent review caught privacy and lifecycle errors beyond initially green sensors |
| [Week5 run the artifact](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-5/) | Real two-context Chromium flows, console and actual viewports | Differentiate locator defect, late arrival, genuine route/input bug; convert observations into regressions |
| [Week7 source of truth](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-7/) | SQLite owns durable work, server memory owns leases, browser owns presentation/drafts | Shared authority across HTTP/socket, UUID retries, house binding and permission/control generations |
| [Week8 persistence/decisions](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-8/) | Additive separate private DB/session; preserve public C8 data | Real populated legacy restart and WAL-aware restore; unknown version fails safely rather than reseeding |
| [Crit9 simultaneity](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/09-all-at-once/) | Droppable poses; durable author-controlled cards with saved return | Separate authorised streams, losing-draft protection, seat arbitration and Quiet defaults; deployed evidence pending |
| [Crit10 instruments](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/10-fly-by-instruments/) | Server semantic action JSON with actor/time/action/outcome | Omit text/codes/proofs; log lifecycle/control/zone/seat/start-stop, not each frame; actual class blind demo pending |

The [Final brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/)
and [assessment guidance](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/)
require a defensible response and working artifact with corroborated process.
Feature count, agent count and green tests alone do not earn an HD.

## Explain one saved action

Read house-ui.js save -> house-client.js command/outbox -> house-realtime.ts
controller/zone/session validation -> house-store.ts execute/apply transaction ->
receipt after COMMIT -> authorised refresh -> client snapshot reducer -> UI/world.
Explain why a timeout keeps the same UUID, why a saved next step stays active,
and why a room closure clears a guest rather than replaying an old snapshot.

## Explain one moving avatar

World receives controlled input and resolves the shared collision model. Positions
are predicted locally and sent at most10Hz. Realtime validates generation, speed,
zone and geometry; motion is volatile. Other clients interpolate only authorised
same-zone coordinates. SQLite receives no per-frame writes. Explain what happens
when the tab is hidden, the network drops, control moves, or a chair is moved.

## Questions for student review

Which state survives a server restart, and which intentionally resets? Why does
the invite code not recover an identity? How does a failed private-room subscription
restore usable controls safely? What distinguishes technical comparisons, fresh
model review and a real user A/B trial? Which earlier claim did a screenshot or
review overturn? What evidence would persuade us that Discord is the better choice?

These are preparation prompts, not recorded answers or personal reflections.

## Extensions demonstrated in the local candidate

The owner requested methods beyond a single green check. The concrete extension
is a 43-subsection evidence trail with fresh reviews, controlled comparisons and
parent reconciliation. A real-client replay exposed a duplicate-effect risk that
mocked success missed; actual glyph grading rejected a false border-box PASS.
These cases show why sensors and reviewers also need calibrated feedback.

Eight matched short memory trials informed the smallest SQL-plan change. Original
full failures then exposed generator pacing rather than proving a permanent leak.
An actual-source counterexample and fourteen controls preceded one exact full
L1/L2 acceptance pair. Stored source hashes and failed history distinguish a
measured candidate from a later Git HEAD or a confident summary.

[PROCESS evidence](PROCESS-EVIDENCE-MAP.md) and [course alignment](COURSE-ALIGNMENT.md)
map these decisions to actual commits and requirements. The student must explain
the mechanism, rejected alternative and cost. These preparation records are not
a completed reflection, demonstration of personal understanding or grade claim.
