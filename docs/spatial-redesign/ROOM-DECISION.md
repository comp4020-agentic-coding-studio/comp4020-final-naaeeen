# A personal room with a reason to return

23 October2026. This is a design comparison and implementation decision, not a
human preference experiment. Astra max independently investigated the room goal
without the previous chat; the parent checked its claims against the actual
sources and current code. Execution uses bounded Sol lanes and separate fresh
reviews. The earlier generic work-card concept remains available as Saved work,
but is no longer the room's main purpose.

## Matched task and decision

A resident returns alone after working elsewhere, reopens something meaningful
without completing a compulsory form, then lets a friend visit and discuss it.
The friend must see the resident's material. Both must leave without losing the
saved state or changing who can read it. Compare usefulness alone and together,
owner/guest asymmetry, content effort, security/resource cost and a clear ending.

| Candidate | Solo return | Visit | Cost and decision |
| --- | --- | --- | --- |
| Existing global work card | Resumes text already available outside room | Desk opens the visitor's own card; no common subject | Cheap but does not answer the room task. Retain data/export and secondary access. |
| Another focus timer | Helps time a session | Little material to discuss; duplicates external tools | Not the first room capability. A timer may later be tested as an enhancement. |
| General media room with videos/GIFs/links | Broad expression | Rich shared subjects | Format/provider/rights/playback and synchronization work make this an unbounded first slice. |
| One reference image, saved inspection and chosen atmosphere | Resumes a diagram, plan, illustration or visual reference at its saved crop | Visitor inspects the owner's selected material and uses existing room chat | Selected. Small but complete authored object, audience, useful revisit and voluntary visit. |

The meaningful DIY is what the resident chooses to keep in view and the atmosphere
around it, as well as the existing furniture. The image can be useful study material
or a personal illustration; it is not a forced productivity report. Decorative
objects still help character and orientation and need not become extra chores.

## What reference products actually support

[gogh's Steam description](https://store.steampowered.com/app/3213850/) describes
room building and user images/GIFs alongside co-working. This motivates personally
chosen visual material; it does not supply our room implementation or prove demand.
Its [multiplayer documentation](https://gogh.zendesk.com/hc/ja/articles/55524515648025-Multiplayer)
says ambience is inherited initially, then locally adjustable rather than
synchronized. We adopt individual control more strictly: no visitor sound starts
until Listen here is chosen for this visit. The parent's source read confirmed
those specific statements on23October2026.

[Spirit City](https://store.steampowered.com/app/2113850/) combines a configurable
space with concentration tools and soundscapes. We borrow atmosphere as a practical
room affordance, rather than importing its progression or assuming the same
single-player loop serves visiting friends. Our rain/fire/night sounds are original
procedural Web Audio, without copied music, audio downloads or a provider account.

## Bounded implementation contract

PNG only, at most256 KiB,2048pixels on either edge and1,048,576pixels total. The
browser prepares a bounded image; the server independently validates and re-encodes
it, stripping metadata. The original selection remains local on failure. One saved
view/preset per room; the owner explicitly saves. Visitors can inspect independently
but cannot overwrite it. No synchronized bedroom following is claimed.

Open door means current house visitors can read this chosen reference; closed
means owner-only. It is not selected-person invitation privacy. Bytes recheck
access independently of metadata. Original owners retain bounded paginated exports
of archived material. Previously obtained copies cannot be recalled.

Studio tables share house.sqlite and keep their own schema metadata; no new volume
or database migration version is imposed on HouseStore. SQLite's official
[foreign-key guide](https://www.sqlite.org/foreignkeys.html) documents per-connection
foreign-key enablement. Current connection settings and transaction authorization
are tested in the implementation rather than inferred from that guide.

## What could change this choice

Run the matched return-and-visit task with familiar peers. Observe whether they
bring real material, can explain why it belongs in their room and choose to return;
compare with opening the same image from a normal chat/board. If the room only adds
walking, revise the interaction. Technical tests establish safe completion and
continuity, not attachment, usefulness or market novelty.


## Why this is a spatial design decision

Harrison and Dourish's [CSCW1996 argument](https://dourish.com/~dourishc/publications/1996/cscw96-place.pdf)
distinguishes geometric space from socially understood place. The author-hosted
PDF is a draft, not a newly verified final proceedings copy. Its argument suggests
our test: what would friends actually do here, and what would they expect to belong
here? A visitor opening their own unrelated card from someone else's desk failed
that mapping. An owner's chosen reference gives the desk a shared subject and the
room a stable identity. Walking and furniture alone cannot establish that value.

Erickson and Kellogg's [Social Translucence](https://smg.media.mit.edu/library/erickson2000.pdf)
(TOCHI7(1),2000) connects visible activity, awareness and accountability. Applying
that lens, an occupied chair should make presence legible while Join identifies
willing participation. The two cues carry different information; disconnect and
reconnect cannot silently turn the former back into the latter.

These are design inferences from the papers, checked against concrete interaction
contracts. Neither paper demonstrates that our reference desk, huddle or chosen
layout is useful to this particular group. That still needs the return-and-visit
task with real friends. Both primary PDFs were opened and checked23October2026.
