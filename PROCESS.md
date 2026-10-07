# Process overview

*Initial C8 account, 6 October 2026. AI-assisted draft grounded in my stated aims and recorded work; student review remains required. This account will be rewritten as the project develops towards the final submission.*

I wanted to move beyond another game and make a cosy place with enough technical depth for about two weeks of work. The starting idea combined a personal room, bounded DIY and a shared object that could change over time. Research into gogh and Kind Words 2 made me narrow the originality claim: room decoration and gentle social interaction already have strong examples. The question became whether separately authored panes in one persistent lamp could give people a reason to return, without followers, scores or an obligation to reply.

I also wanted to reuse the careful research and review methods from Assignment 2. Reuse needed a boundary: old instructions, tests and permissions could not become evidence for a new app. The first milestone, [b1677a4](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/b1677a4), brought 163 planning files into [docs/planning-source](docs/planning-source/PROJECT.md), preserving their provenance while making the root instructions specific to this repository. The historical prototype's 15 tests are not this implementation's tests. Its fixed-camera comparisons informed the visual choice, but they are not new participant trials.

The live [C8 brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/08-its-alive/) changed the immediate scope. A stranger must be able to do the core thing and find a saved trace on return. My earlier invite-only circle would put a grant and limited membership ahead of that first action. [ADR 0001](docs/decisions/0001-crit8-slice.md) records the public rehearsal alternative: cookie identity, a deliberately published window and an owned lamp pane. This keeps the authorship model while postponing invitations and recovery. The cost is public content, so the interface says who can see each save. It does not describe visitors as trusted friends.

The stack follows that smaller loop. TypeScript and Node serve the page, commands and full state snapshots; SQLite stores sessions, rooms, panes and command receipts. [ADR 0002](docs/decisions/0002-native-sqlite.md) explains choosing the installed node:sqlite binding over another native package. The actual Linux runtime reported SQLite 3.53.4. The binding is release candidate, so avoiding an extra build dependency is a trade-off, not proof of stability. A fixed Three.js cutaway uses licensed furniture models and procedural scenery, while HTML controls keep editing possible without accurate scene picking.

I asked agents to own separate server, interface and renderer files, with the main agent reconciling their work. Their reports needed code and observed results behind them. The domain milestone [87a8c14](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/87a8c14) defines owned editing, bounded text and full collision geometry. Store and HTTP tests then exercise real SQLite restart, atomic receipt rollback, replay, stale revisions and attempts to edit another visitor's objects. Repeating a timed-out save must not apply it twice; changing its payload must not reuse a successful command ID.

The first runnable application milestone [38358b3](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/38358b3) joined the server, scene and native controls. I then asked for the experience to look more like a game: the large headline, scene card and webpage sidebar were the wrong presentation. [ADR 0003](docs/decisions/0003-world-first-game-interface.md) records inspected official screenshots and a world-first HUD alternative. The data and ownership rules remain useful even when the interface direction changes.

A fresh integrated review also exposed a stuck-tab case: after the browser acquired another cookie identity, a save could fail without an in-page recovery action. A real browser regression reproduced the hidden control. That failure is evidence to fix, not something a passing happy-path suite can overrule. The review record separates this from human preference.

Local browser checks now exercise two identities, peer changes, a returning cookie, furniture controls and pane withdrawal. That establishes a working local slice, not a shipped app or evidence that people value it. The supplied route checks remain intact, and [C8-VALIDATION](docs/C8-VALIDATION.md) records the check scope and pending release work. Docker and Fly deployment still need verification. The next critique should ask whether visitors can explain the lamp and whether contributing feels worthwhile. I want to change the design when that evidence warrants it, rather than protect the original plan because an agent already implemented it.

## Final-project development evidence, 7 October

This addendum is an AI-assisted factual log for later student reflection. The
initial C8 account above describes its own milestone, not the current product or
release. The owner subsequently requested controllable real avatars, owned DIY
bedrooms, shared study, game-style entry/HUD and an independent collaborative
whiteboard. The detailed redesign register and release records retain the
research, comparisons, implementation and review evidence for those changes.

The movement repair [5c40545](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/5c40545)
shows why passing previous checks did not justify defending the first solution.
A later CI run showed the owner moving far locally while the peer saw its avatar
near spawn. The working hypothesis was a gap between optimistic prediction and
volatile transport authority; the precise first dropped or rejected packet was
not established. The agent compared fire-and-forget movement, queued delivery
and bounded acknowledgement/correction against the same ownership, collision,
speed and deadline constraints. It kept a single transient flight rather than
replaying old movement after a stall.

Fresh review then challenged the correction itself. The shared collision slide
was not idempotent at a plant corner: a locally projected endpoint could fail the
server's next sweep. The implementer reproduced the reviewer's failing case and
changed endpoint validation, while preserving the server rules. A contextual
recheck confirmed the finding resolved. The final parent checks passed485 cases,
with native two-user movement/chat and seats/rooms/DIY/access flows passing on
the frozen source. These checks measure the specified behavior; they do not
prove human enjoyment, market value or an HD grade.

This is a concrete requirements-to-evidence-to-refinement example. The agent
reports, tests and screenshots were inspected and corrected rather than treated
as authorities. Missing historical raw logs are distinguished from retained
parent check logs and source-bound coverage; the fresh review and its follow-up
are not counted as two independent studies. Actual publication, resource and
deployed checks are recorded separately in
[MOVEMENT-RECONCILIATION](docs/implementation/MOVEMENT-RECONCILIATION.md). Personal
lessons and claims about lecture understanding remain for the student to assess
and write after reviewing the code and evidence.
