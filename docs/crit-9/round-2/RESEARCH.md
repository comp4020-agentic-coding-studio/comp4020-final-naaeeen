# Round 2 research: HCI depth and agent judgement

12 October2026; research applies to baseline3c91f53. These sources inform choices,
not a ranking of this product or an HD prediction. The revised protocol explicitly
adds HCI mechanism and actual agent direction/correction as separate criteria.

## Current course lens

[Crit9](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/09-all-at-once/)
asks for one implemented behavior with several people, alternatives/costs and
rationale from README's good. [Week5 verification](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-5/)
distinguishes running evidence from assurances and emphasizes the student's
ability to explain the artifact. [Week9](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-9/)
covers isolated subagent contexts, independent reads/reviews and transport.
The extension worth showing is a product-specific acceptance rule, calibrated
against plausible bad outcomes, then checked across source, client and authority.
Using many agents alone says little about human judgement.

## System feedback, control and recovery

[Nielsen's original usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/),
1994, current page reviewed2024: status visibility, user control, error prevention
and recovery are pertinent. Parent read sections1–3/5/8–9. These are broad
principles, not an experiment proving a timeout/label. Design inference: local
rendering, confirmed submission and current unsent input are different facts.
Use immediate drawing while representing unconfirmed submitted work and offering
recovery. Extra feedback can burden users, so the interface must keep the scope
of a save claim understandable. Human comprehension remains untested.

## Presence does not directly establish willingness

Fogarty/Lai/Christensen2004,
[Presence versus Availability](https://homes.cs.washington.edu/~jfogarty/publications/ijhcs2004.pdf),
DOI10.1016/j.ijhcs.2003.12.016. Researcher read deployment/results/discussion;
parent read key results/discussion. Four workplace groups,26 people, four-week
deployment. Users often treated sensed context as presence; speaking did not
significantly discourage messages. Authors also criticize stale manually set DND.
The study did not experimentally prove our explicit status better. Quiet/Can chat
is a contextual choice with manual-upkeep cost, not enforced consent or measured
interruption reduction. B remains strong for a social/attention-focused argument.

## Individual authorship can be negotiated rather than enforced

Dourish/Bellotti1992,
[Awareness and Coordination in Shared Workspaces](https://www.dourish.com/publications/1992/cscw92-awareness.pdf),
DOI10.1145/143457.143468, §§4–5. Designer triads negotiated individually authored
public contributions and a group offering, despite equal edit permissions.
Authors favor fluid coordination and criticize inflexible roles. This supports
examining whose statement an action represents but challenges blanket hard ACLs.
It does not show personal cards improve student commitment. C is an excellent
product-purpose argument, with agreed-scribe/shared-assignment countercases.

## Separate views create a coordination cost

Gutwin/Greenberg2002,
[A Descriptive Framework of Workspace Awareness](https://grouplab.cpsc.ucalgary.ca/grouplab/uploads/Publications/Publications/2002-DescriptiveFramework.JCSCW.pdf),
DOI10.1023/A:1021271517844. Researcher read author-uploaded full text; parent
used the [1999 author manuscript](https://www.cs.usask.ca/faculty/gutwin/1999/WA-theory/Theory-submitted-TR.html).
Direct GroupLab PDF access failed; versions are not silently conflated.
Relaxed WYSIWIS permits separate views, but makes common reference/assistance
harder. It is a descriptive framework, not one controlled efficacy study.
I's local view can preserve control; opt-in following or awareness aids are
credible alternatives. Actual pointers/selected IDs are shared as awareness,
so “selection stays local” must distinguish state ownership from visibility.

## Personal undo is not universally best for collaboration

Rasch/Perzl/Weiss/Müller2024,
[Just Undo It](https://arxiv.org/html/2403.11756v1),
DOI10.1145/3613904.3642864, §§3–6. Parent inspected apparatus/results/discussion;
researcher read complete relevant sections.32 participants in pairs, eight
counterbalanced VR tower-building conditions. Individual undo reduced interference
during divided work, while world undo improved perceived connection and had
advantages in joint work. Dependencies can constrain individual undo; selective
undo's weakness in this task is not universal. These results reject a blanket
“personal undo is superior” argument. They do not establish browser-canvas
preference or this code's same-object undo correctness.

## Agent evaluation must inspect the outcome

[Anthropic, Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents),
9January2026, structure/grader/outcome/maintenance sections. Parent read the
relevant full sections. The engineering guidance distinguishes claimed completion
from environment outcome, recommends task-appropriate graders and warns about
uncalibrated checks. It is vendor guidance with examples, not proof that our
workflow improves every agent. Applied inference: a Saved label alone cannot
establish durable content, correct attribution or preserved newer work. A
synthetic negative control can reveal a weak grader; it does not measure human
value or model reliability.

## Delivery semantics are application work

[Socket.IO4.x delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/)
state default at-most-once delivery; optional retries still do not preserve pending
events across refresh by themselves. App-level IDs/persistence/cursors address
different boundaries. Current package is4.8.4, but board submitted mutations here
use HTTP, not socket retries; that route must be checked independently.
Do not infer durable receipt semantics from a real-time transport name.

## A tempting source that does not directly apply

[Amershi et al., CHI2019 Human-AI Interaction Guidelines](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf)
defines AI-infused systems as exposing AI features to users. The house is
AI-assisted development, not a user-facing AI assistant. General control ideas
may be useful analogies, but that paper is not direct validation of this UI.
This applicability check prevents keyword-based citation.

## Evidence that could change the conclusion

A real-friend study could show that status detail distracts, uncertain queues are
misunderstood or recovery costs exceed benefit. A common-reference task might
favor opt-in shared views; shared assignment work might favor delegated cards.
A better current fault-path probe could expose incorrect intent/receipt behavior.
A fresh review may find that a purported agent correction is retrospective or
that a test probes legacy instead of the claimed current feature. Preserve
contradictions and select for the actual task rather than an appealing theory.
