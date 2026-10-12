# Process overview

## From a large idea to a particular use

I started with a warm multiplayer house inspired by Kind Words and gogh. I wanted
moving avatars, personal rooms, some DIY and a shared study space. I also wanted
the agent to research alternatives and leave a useful commit history. That brief
could have produced a collection of features without a clear reason to use them.

The early Crit 8 slice tested a saved interaction through windows and a shared
lamp. The later house grew from it, while keeping that checkpoint separate. In
[52ce8ee](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/52ce8ee),
the agent compared possible purposes: completing a task alongside friends,
finding a willing peer when stuck, getting feedback on work, and casually
encountering distant friends. The provisional focus became brief help between
known university friends, with an author-chosen next step. This came from
research and comparison, not interviews with a group who had already asked for it.
Ordinary company and conversation stayed possible without posting a study goal.

## Choosing what presence means

For Crit 9 I asked for a decision with more HCI depth. I rejected a proposed focus
on keeping a newer draft after a delayed acknowledgement: it was useful
reliability work, but mainly explained a repair. I wanted the discussion to show
a user goal and a capability we consciously gave up.

The resulting argument is quiet company with voluntary conversation. Two avatars
at a table establish presence, but do not establish willingness to talk. Quiet
and Can chat are separate from room access and location. An always-open hangout
would require less upkeep and encourage chance encounters. Invitation and
acceptance would make engagement clearer but add steps to short familiar
exchanges. I accepted the softer declaration for this small group, with stale
states and mistaken expectations as its costs. The
[decision record](docs/decisions/2026-10-07-explicit-willingness.md) preserves
those alternatives.

The agent’s later research gives this argument a clearer basis.
[Erickson and Kellogg](https://smg.media.mit.edu/library/erickson2000.pdf) describe
visibility as useful for coordination and accountability. It can also create
pressure. [Harrison and Dourish](https://dourish.com/~dourishc/publications/1996/cscw96-place.pdf)
explain why geometry alone cannot give a setting its social meaning. These
references help explain why a door and a status need different meanings.
They were added during this reconsideration.

## Directing the agent

I asked the agent to carry Assignment 2's research and review methods into the
project and adapt them to this repository. The inherited files were
brought in at [b1677a4](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/b1677a4).
Old checks and old publication permissions could not stand in for current
evidence. The active harness now routes research, comparisons and review back
to the relevant section of the project.

The planning comparison used separate research lanes and fresh-context reviewers
who saw candidates in opposite orders. Their agreement was not user preference.
The records also identified an unfair human-comparison scenario that already
assumed one candidate's task. No human trial ran. That correction matters because
a comparison can make a choice look strong simply by asking it the right question.

Later I challenged the agent's recommendation again. The
[design-first revisit](docs/crit-9/round-3/DESIGN-COMPARISON.md) compared viable
alternatives instead of treating a broken implementation as the opposition.
Reviewers disagreed between the social-state decision and the full-board mode.
That left a judgement to make, rather than a vote to report.

## Making the experience fit the purpose

I called the earlier interface too webpage-like and asked for a game-style
opening, HUD and larger world. A boxed scene with webpage controls was not the experience I wanted.
[ca57bb2](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/ca57bb2)
records the later entry, controls and framing redesign. The camera comparisons
checked readable scale, routes and what happened when panels moved. Close framing
makes people prominent but loses distant context; Overview remains a useful
deliberate choice. Some comparisons changed foreground text as well as camera
framing, so they do not isolate a camera-only benefit.

I also asked for the shared board to work as a complete app. In
[f5a25f2](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/f5a25f2),
it gained its own route, full editor and companion chat. Opening it from the
house pauses world interaction. This gives sustained joint work more room while
sacrificing continuous spatial context. The board uses house-wide conversation,
so it does not preserve the room chat as one seamless stream.

## Stack, rules and verification

TypeScript and Node serve the app; SQLite holds identities, membership, rooms
and receipts on the course's single mounted volume. Three.js renders the house.
Socket.IO supplies live transport, while Excalidraw supplies the editor.
Using an existing editor made the full board feasible, but identity, authorization,
persistence and recovery remained project work. The native SQLite choice is
recorded in [ADR 0002](docs/decisions/0002-native-sqlite.md); it avoided another
native-build dependency at the cost of relying on the pinned runtime.

The social rule became concrete in
[2f941e1](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/2f941e1)
and [ea60440](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/ea60440).
A new controlling session starts Quiet; a brief reconnect can keep its previous
setting. Furniture persists, while willingness is transient. Review then found
that the state timestamp existed only in transport and Quiet lacked an unread
cue. The [UI refinement](docs/revisit/UI-REFINEMENT.md) made both visible.

Independent review also corrected the later argument. Default Quiet is not a
personal declaration, and its timestamp can be system-initialized. Public
willingness and private preview suppression are currently coupled. Separate
controls would offer more freedom but require more decisions from users.
The [review record](docs/crit-9/round-3/EVIDENCE-AND-REVIEW.md) keeps those limits.

## What the evidence can answer

Tests protect ownership, delivery, reconnect defaults and retained work. Browser
checks show what two sessions actually receive. The registered resource workload
checks the small server budget. These results have different scopes. The current
Crit 9 checks and release status are recorded in
[the submission record](docs/crit-9/submission/ACCEPTANCE.md).

The unresolved question is whether friends interpret the convention comfortably.
I would compare the house with a configured Discord group, looking at stale
states, reply pressure and useful next-step retrieval. More features cannot
answer that question. I kept bringing the discussion back to why someone would use the house and what
our choice makes harder.

*Codex assisted the research, implementation, drafting and checks. This account
is based on my instructions and the repository record.*
