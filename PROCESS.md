# Process overview

## Giving the house a reason to exist

I started with a Kind Words/gogh-inspired house: moving avatars, personal rooms,
DIY and a shared study space. I wanted the agent to research widely, but I also
kept asking what someone would actually use this for. The early Crit 8 slice
explored windows and a shared lamp. The later house kept that checkpoint while
moving toward a more substantial multiplayer experience.

In [52ce8ee](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/52ce8ee),
the agent compared working alongside friends, finding brief help, receiving
feedback and encountering distant friends. We narrowed the provisional audience
to two to six known university peers. Someone could work quietly, ask about a
confusing paragraph, then keep their own next step. This gave the rooms, shared
table and study cards different purposes. The audience came from research and
comparison; it was not a finding from interviews.

## Making presence optional to respond to

The house could show that someone was connected without knowing whether they
welcomed a conversation. For Crit 9, the consequential choice became quiet company
with voluntary conversation. An always-open hangout would make chance encounters
easier and need less status maintenance. Invitations would establish clearer
agreement, but require acceptance for each short exchange. We chose a softer
Quiet/Can chat declaration between those options.

The rule became concrete in
[2f941e1](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/2f941e1)
and [ea60440](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/ea60440).
A new controlling session starts Quiet; a brief reconnect can preserve its value.
Room access remains separate. Research on
[social translucence](https://smg.media.mit.edu/library/erickson2000.pdf) helped
explain why awareness also creates accountability. Later review corrected the
argument: default Quiet is not a person's declaration, and public willingness
currently changes private speech previews too. The cost is both stale status
and less freedom to choose those preferences separately.

## Giving joint work enough space

I found the earlier interface too webpage-like and asked for a game opening,
HUD, larger world and better camera tracking.
[ca57bb2](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/ca57bb2)
records the redesign. Camera comparisons checked readable avatars, routes and
panels. Close framing improves prominence but loses distant context, so Overview
remains an intentional choice. Some earlier comparisons also changed foreground
text; they cannot isolate a camera-only benefit.

I also wanted the board to stand as a complete app. In
[f5a25f2](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/f5a25f2),
it gained its own route, drawing editor and movable companion chat. Entering it
pauses world interaction. Sustained joint work gets room at the cost of continuous
spatial context. Board conversation is house-wide, rather than the room chat
continuing unchanged.

## Building and checking the rules

TypeScript and Node serve the app. SQLite stores durable identities, memberships,
rooms and receipts on one mounted volume. Three.js renders the house; Socket.IO
carries live state; Excalidraw supplies the editor. Reusing an editor made the
board feasible, while authorization, persistence and recovery remained our work.
[ADR 0002](docs/decisions/0002-native-sqlite.md) explains the native SQLite choice
and its pinned-runtime dependency.

The Crit 10 audit traced permission checks through real HTTP, SQLite and socket
control leases. The host can administer membership but cannot edit another
resident's bedroom or study goal. Positive export controls protect intended
access alongside tests of forbidden operations. For logs, we compared sparse
events, structured metadata and full content. We chose actor/action/outcome plus
validated interaction metadata, excluding private text and credentials. Repeated
accepted lines can share a receipt without representing another mutation.

Independent code review found house correlation was being dropped by incorrectly
parsing receipt streams. New failing HTTP/socket assertions reproduced it; the
stream-aware correction passed nine integration tests and independent recheck.
A throwing-sink test also ensures logging cannot report a committed recovery as
failed. A full resource trial then exposed clock-sensitive pointer limits. We
kept its failure, reproduced wall-clock rollback with real sockets, and changed
only the elapsed budget clock. These changes and their behavioral checks are
recorded in [d71c47b](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/d71c47b).
Current checks and browser evidence are linked from
[Crit 10 acceptance](docs/crit-10/ACCEPTANCE.md).

## Keeping the agent's conclusions accountable

I asked for Assignment 2's reusable methods to be adapted, recorded in
[b1677a4](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/b1677a4),
and later required recurring subsection comparisons and fresh review. I also
challenged proposed reflection topics and asked for decisions with real user
costs. Agent agreement suggested where to look; source, failure cases and review
findings determined what could be claimed. Technical comparisons were not human
A/B tests. Classroom use by two classmates is still to be observed.

Codex assisted research, implementation, drafting and verification; I supplied
the goals, constraints and corrections described here. I reviewed and shortened
this account before authorizing publication. The commit links trace the project's
development, with the Crit 10 checks and reviews in the linked acceptance record.
