# Crit 9 decision recommendation

12 October 2026. Research and discussion preparation, not a student reflection.
Implementation baseline: dea0b7a2f352cc93fd2d9c88d0287607a9d8d304.
This is retrospective documentation; the new comparison did not precede the original implementation.

## Recommended single argument

**Friends can share an explanation without sharing authority over each other's
study commitments.** Keep the canvas jointly editable; only the author can change
or close their own goal/question/next-step card.

A replicated state is not automatically a shared intention. Sending everyone the
same update answers a transport question. Deciding whose statement it represents
answers a product question. The house needs both a surface friends develop
together and a record of what each learner actually chooses to do next.

Alice asks about a proof. Bob changes Alice's diagram and adds a counterexample.
Alice's study card remains hers. Bob can suggest a next step in conversation, but
cannot silently rewrite Alice's goal or end her request. Alice saves “expand the
preceding line myself”; the card stays active. Closing is another explicit author
action. Neither saved text nor closure proves understanding.

Precise scope: for individual study with occasional peer help, current housemates
may revise shared explanations while each active card's author controls its goal,
next step and explicit closure. We accept author-mediated transcription;
delegation remains unsupported.

This is authority, not confidentiality. Housemates can read lounge cards. Shared
canvas objects, including text, can be changed by peers. Personal assertions
written directly on the canvas receive no special protection.

## Why this is the best current Crit 9 point

The [current brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/09-all-at-once/)
asks for one multiuser behavior, alternatives and costs, grounded in README's
definition of good. The pod will defend the rejected option.

The decision has an inspectable path: README defines familiar friends and a
clearer author-written next step; CLAUDE separates board collaboration from
author-owned cards; HouseStore checks ownership and revision; BoardStore admits
shared edits; UI reserves personal-card controls for its author and labels
closure “Closed by author”; actual checks expose the boundary and its cost.
[Source and code evidence](SOURCE-AND-CODE-EVIDENCE.md).

This is more specific than target narrowing and more explanatory than naming
WebSockets. It connects purpose to rules, checks and visible behavior, a promising
route to corroborated judgement rather than a predicted mark.

## Alternatives and the real price

| Policy | Capability | Cost |
| --- | --- | --- |
| Shared canvas, author cards: current | Peer diagram correction; each person controls their stated goal/closure. | Trusted helper cannot directly transcribe or close an agreed personal step. |
| Everything shared between members | Teammate can revise or finish a collective task. | Same permission permits replacing an individual's commitment under its original creator label. |
| Existing canvas objects author-only | Protects each existing contribution against peer changes. | Blocks welcomed corrections; requires copying or author mediation. |
| Delegation or separate shared-task object: future | Chosen delegation with truthful responsibility model. | New grant/revoke, actor attribution, recovery, UI and tests; not implemented. |

A shared model with explicit editor attribution is also credible; the tested
creator-labelled variant does not represent every shared design. Attribution
could show who changed a commitment without preventing its change.

The all-shared option is credible. A group presentation or an agreed scribe role
can need that freedom. Current policy is appropriate only if the principal task
remains individual study with occasional help. If collective assignment management
dominates, use a genuinely shared-task model instead of calling every task personal.

Dourish and Bellotti observed groups distinguishing individual contributions from
a shared offering, but participants negotiated these boundaries without rigid
system roles. That is a serious counterargument to hard permissions. We limit
the restriction to explicit personal statements and leave the canvas flexible.
This is contextual judgement, not a conclusion established by their experiment.
[Original study, §§4.3–5.1](https://www.dourish.com/publications/1992/cscw92-awareness.pdf).

## What the comparisons established

Two no-history reviewers received the same eight candidates and fixed rubric,
with reversed presentation orders. Both qualitatively preferred C, but it **tied**
with explicit Quiet/Can chat under every registered weight profile. The parent
selected C for its directly demonstrable, server-enforced contrast. Model agreement
does not prove preference; the tie was retained.

A frozen technical comparison used current stores and two minimal ACL variants
on fresh SQLite fixtures. All 43 case/order records matched expected behavior.
The shared-everything variant admitted agreed team editing/closure, a real
advantage over current policy; author-only canvas objects blocked peer correction.
All three retained separate-object changes and rejected stale own-card drafts.

These results show what each policy permits, not which learners prefer, whether
consent exists, or whether anyone learned more. Delivery-order checks are not a
network timing test. [Comparison and reviews](COMPARISON-AND-REVIEWS.md).

## Proposed 90–120 second demonstration

Use independent browser profiles at 1920×1080 and 390×844:

1. Alice creates a two-person house and an active card; Bob joins.
2. On the shared board, Bob changes Alice's existing diagram. Show Alice's screen
   updating without reload.
3. In study notes, Bob reads Alice's card but has no edit/close controls.
   Separately cite forged-command rejection tests: hidden controls alone do not
   establish authorization.
4. Alice saves her next step. Show that it remains active and reaches Bob.
5. Alice explicitly closes it. Explain the author-choice label, not measured learning.

This is a rehearsal proposal, not a recorded full live demonstration. Maintained
local browser results are separate; they are not deployed/human/sub-second evidence.

## Defend the choice

Why not let trusted friends edit everything? House membership does not automatically
transfer authority to state another person's goal. Canvas collaboration remains
open; author cards preserve control of commitments. Lost delegation is the cost.

Why not protect everything? Diagrams are collaborative material. Blanket
creator ownership requires author mediation even for welcomed correction.
The boundary follows meaning, not merely who created a piece of content.

Why not claim learning improved? We record interactions and choices, not
understanding. A real-friend trial should examine whether people understand the
boundary and whether blocked delegation costs more than the distinction helps.
[Proposed human comparison](FUTURE-HUMAN-TRIAL.md), NOT RUN.

## Provenance and student-owned writing

The owner established the warm house, avatars/conversation, personal rooms and
later a full standalone board. Next-step positioning and detailed card rules arose
in planning/implementation and were re-examined here. Git timestamps show when
code appeared, not who first invented an idea.

Discuss choices the student actually directed, accepted or understood. This new
comparison is retrospective verification, never evidence of a prior experiment.
Student PROCESS/reflections/crit-9.md are still separate work.

One supporting sentence may mention explicit Quiet/Can chat as another instance
of not inferring intention from presence. Keep one main argument. Quiet hides
previews but does not block delivery, enforce consent or guarantee no interruption.
