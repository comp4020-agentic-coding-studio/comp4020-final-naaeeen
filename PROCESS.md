# Process overview

## From a house to a shared purpose

I started with a Kind Words/gogh-inspired house: moving avatars, DIY bedrooms and
shared study. The early Crit 8 slice explored windows and a shared lamp. Later,
I kept asking what someone would actually use the house for. A collection of
furniture and activities could look complete while leaving that question open.

In [52ce8ee](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/52ce8ee),
the agent compared working alongside friends, finding brief help, receiving
feedback and encountering distant friends. We narrowed the provisional audience
to two to six familiar university peers. They could work independently, ask about
a confusing paragraph or take a break together. This was a design direction from
research and comparison, rather than an interview finding.

## Separating presence from participation

For Crit 9, Quiet/Can chat became a consequential choice. A visible avatar says
someone is connected, but does not establish willingness to talk. An always-open
hangout would reduce status maintenance and support chance encounters. Invitations
would make agreement clearer but add acceptance steps to every brief exchange.
We chose a softer declaration between them.

[2f941e1](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/2f941e1)
and [ea60440](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/ea60440)
made the rule concrete. New controlling sessions start Quiet; room access remains
separate. [Social translucence](https://smg.media.mit.edu/library/erickson2000.pdf)
helped connect awareness with accountability. Review corrected our explanation:
default Quiet is not the person's declaration. The control also changes private
speech previews, so fewer controls cost someone the freedom to welcome chat while
hiding those previews. Status can become stale and needs maintenance.

## Making joint work usable

I asked for a game opening, larger world, HUD and better camera tracking because
the earlier interface felt too webpage-like. The redesign in
[ca57bb2](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/ca57bb2)
compared readable avatars, routes and panels. Closer framing makes nearby activity
more prominent but loses distant context, so Overview remains available. Some
comparisons also changed foreground text; they cannot isolate a camera-only gain.

I also wanted the board to work as a complete app.
[f5a25f2](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/f5a25f2)
gave it an independent route, drawing editor and movable companion chat. Entering
the board pauses world interaction. Joint work gets more space, while the house
becomes less continuously visible. Board conversation is house-wide and separate
from bedroom chat; each person controls their canvas view.

## Following permissions through awkward cases

The stack uses TypeScript, Node 24, SQLite, Socket.IO, Three.js and Excalidraw.
Reusing a drawing editor made the board feasible. Identity, authorization,
persistence and recovery still needed project-specific rules. SQLite keeps durable
state on one mounted volume; the [native SQLite decision](docs/decisions/0002-native-sqlite.md)
records the runtime dependency and alternatives.

The Crit 10 audit followed permissions through HTTP, SQLite and socket control
leases. Administration does not let the host edit another resident's bedroom or
study goal. Shared board state also differs from a person's retained submitted
versions. Keeping the latter after removal preserves a contribution, but can lose
later context and does not establish sole authorship.

For action logs, we compared sparse events, structured metadata and full content.
We chose actor/action/outcome with validated interaction metadata, excluding
private text and credentials. Independent review found receipt parsing dropped
house correlation. Failing integration assertions reproduced the problem before
the repair. A later resource trial exposed clock-sensitive pointer limits; real
sockets reproduced clock rollback, and the elapsed budget clock changed. These
repairs and checks are recorded in
[d71c47b](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/d71c47b).

## Giving each place a reason

The next challenge was the house's overall purpose. Two activity chairs could not
explain six active participants, and a visitor's desk interaction opened their
own unrelated work card. Adding more content would leave those mismatches intact.
The [comparison protocol](docs/spatial-redesign/COMPARISON-PROTOCOL.md) used one
mixed-intention visit to examine capacity, consent, return, privacy and phone use.
It compared design mechanisms, rather than measuring human preferences.

[397e3f5](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/397e3f5)
set the room task: return to meaningful material and let a friend inspect it.
Another form would add reporting work; a timer offered little shared subject;
general media introduced broader playback and provider scope. One selected image,
saved crop and optional atmosphere offered a bounded complete interaction.
[17fd380](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/17fd380)
implemented owner storage and PNG validation. Tests distinguish owner changes,
guest reads, door revocation and restart. Visitors keep independent inspection
without changing the owner's saved view.

[Harrison and Dourish's author-hosted draft](https://dourish.com/~dourishc/publications/1996/cscw96-place.pdf)
helped frame the difference between geometry and socially understood place.
An owner's reference gives a room a recognisable subject, but needs content effort
and extra navigation compared with chat. The next useful evaluation is whether
friends bring material and choose to return. A room that only adds walking needs
revision. A useful comparison would give friends the same image in a room and in
ordinary chat or the board. Observe whether the saved crop and known owner help
them resume and explain a detail, and whether that benefit earns the extra
navigation.

## Correcting the evidence as well as the app

[8bdb8bb](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/8bdb8bb)
reconciled independent reviews with place contracts. Review found cancellation
could misrepresent an uncertain save, and later integrated checks found sofa crop
continuity and touch-panning gaps. Repairs used affected regressions and rechecks.
Separate Join choices now distinguish sitting from playing or following; the
picture table gives up to six residents legal contributions without forced quotas.

The path to [07d66fb](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/07d66fb)
also corrected the verification harness. A seat handoff exposed a real client
movement race, while review found that one fixture's claimed room-edit behavior
was synthetic. The fixture and explanation changed to match actual controller
generation. A missing-avatar-selector finding was withdrawn after checking runtime
DOM creation. Keeping those corrections prevents a test or review verdict becoming
more authoritative than the behavior it describes.

[Technical acceptance](docs/spatial-redesign/ACCEPTANCE.md) links source-bound
browser journeys, sustained resource trials, preserved failures and data checks.
These establish technical behavior under their recorded conditions. They leave
real-friend usefulness, physical-phone feel and this candidate's deployment to
separate verification.

Codex assisted research, implementation, drafting and verification; I supplied
the goals, constraints and corrections described here. The linked records make
those decisions inspectable. I confirmed the redeemable Crit reflection after reading its Chinese translation.
