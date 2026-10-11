# Crit 9 design recommendation: quiet company, voluntary conversation

12 October2026. Latest recommendation for the owner's design-first question.
Earlier uncertain-message work remains reliability/process evidence; it is not
the primary design argument under this revised goal.

## One decision

**Let a friend declare Quiet or Can chat independently of being connected,
where their avatar is, and whether their room is open.**

User-goal hypothesis: familiar friends want company while doing their own work,
with an easy opportunity for brief help, without always performing sociability.
The owner supplied the house/game/shared-study experience. This precise peer-help
framing was agent-derived provisional positioning, not an interview result.

This is a choice about the meaning of shared presence. The same connected avatar
at a table can represent a person concentrating, welcoming a conversation, or
away from their screen. A furniture pose cannot establish willingness. We keep
observable connection/location separate from the availability value and any
explicit change the person makes.

Concrete example: Alice and Bob are both online in the lounge. Alice is Quiet;
Bob chooses Can chat. Charlie, stuck on a paragraph, can identify Bob's declared
willingness without treating Alice's presence as a request to interact. Alice
still sees company and can choose to read messages later. The system does not
claim that Bob is attentive or will answer.

## The real design tension

More visible/automatic availability can make chance encounters easier and remove
status-setting work. More control can protect self-directed participation but
makes users maintain a declaration and interpret others' cues. Stronger invitation
approval can clarify agreement but inserts a negotiation into casual conversation.

All these alternatives can function correctly:

| Choice | Useful capability | Cost |
| --- | --- | --- |
| Online means open for casual interaction | Immediate spontaneous encounters; no status upkeep. | Quiet company is harder to express; connection is an ambiguous proxy. |
| Infer from movement, idle time or proximity | Less manual work; automatic cues may seem current. | Similar observable activity can represent different intentions; users may not understand the inference. |
| Explicit Quiet/Can chat: current | People state their preference while sharing the house. | Extra choice; stale declarations; others may still interrupt or interpret a promise. |
| Invitation and acceptance before conversation | Explicit negotiated engagement; stronger boundary. | More steps/waiting for brief familiar-peer exchanges; can inhibit spontaneity. |

Current soft declaration is a contextual choice for a small known group, not
proof that explicit cues are universally better. If participants chiefly want
spontaneous hangout, automatic proximity/open interaction may fit better. If they
need guaranteed DND or strangers interact, invitation or enforced blocking may
be preferable. Those are product changes, not bug fixes.

## What the current behavior actually guarantees

- A new controller lease starts Quiet; a same-token reconnect within the existing
  lease can retain the choice. Willingness is transient, unlike saved furniture.
- Lounge approachability uses connection, lounge location and chosen Can chat.
  Entering a bedroom changes location, not the chosen statement.
- In the house view, Quiet suppresses floating speech previews, while the authorized transcript and
  delivered unread cue remain available. It does not block messages.
- Door state controls room access separately. Open rooms expose retained chat to
  authorized housemates; opening is not proof of willingness.
- Housemates can still see name, connection, coarse zone and availability value/time.
  Quiet is not invisibility, confidentiality or protection from social pressure.

The design makes quiet participation expressible; it does not enforce a social
promise. Quiet may be the default rather than an active personal declaration.
Can chat is explicitly chosen. Last-set time includes automatic lease initialization,
not only a deliberate choice; the current UI does not distinguish those origins.
It is not evidence of current attention.

There is a further cost: the house's same Quiet/Can chat control couples a public
approachability cue to recipient-side bubble suppression. Users cannot separately
say “I welcome a brief chat but want fewer previews” through those controls.
Separate availability/notification settings would offer that flexibility at more
settings/interpretation cost. The independent board has its own chat/presence;
house Quiet is not an app-wide DND policy. Code can check the explicit update/default value and whether house previews respect it.
Only people can judge whether they understand/respect the convention.

## Why this has HCI depth

Social translucence asks which social information should be visible, to whom,
and with what privacy/accountability costs. More transparency is not automatically
better: people may feel watched or obligated to respond.

Space/place research challenges the assumption that rooms, doors and avatars
automatically recreate real-world norms. We therefore assign distinct meanings:
a door is an access boundary; Quiet/Can chat is a declaration; connection is
observed presence. Those meanings need testing, not faith in the house metaphor.

Calm-technology and lightweight-group research motivate adjustable peripheral
participation and low-cost transitions into conversation. They also expose a
cost: suppressing cues can miss encounters, while formal invitations can make
brief interaction cumbersome. This is interpretation of original research, not
evidence that our app reduces distraction or improves learning.
[Research and countercases](RESEARCH.md).

## Authentic AI process, rather than retrofitted depth

Before the shared-house implementation, commit52ce8ee preserved four candidate
jobs, source research, two opposite-order fresh-context reviews and parent
reconciliation. That research narrowed the task, removed unsupported difference
claims about competitors and separated connection, willingness and room access.

This was a product-purpose comparison, not an experiment comparing three status
algorithms. No human A/B ran. Do not claim the agent first implemented automatic
attention inference and was corrected; that episode is not established.

Later review found the chosen timestamp only in transport and no unread cue when
bubbles were hidden. Refinement made freshness visible and retained delivered
unread awareness. This connects feedback to the original choice's known costs.
The accepted source, dated records and actual commits corroborate that chain.
[Evidence and reviews](EVIDENCE-AND-REVIEW.md).

Current selected tests passed for lease/reconnect defaults, Quiet unread and
displayed freshness. They protect behavior, not user interpretation.

## Comparison conclusion

Two fresh reviewers disagreed: one preferred this social-state choice, the other
the full-board/workspace mode. Both treated message recovery primarily as
supporting reliability and identified genuine design alternatives elsewhere.

Parent recommends this point because its goal, competing values and one live
multiuser behavior are especially clear. The full-board mode is the strongest
alternate if the student wants to foreground their explicit owner-led decision:
sacrifice continuous spatial immersion for a full focused shared canvas with chat.
Camera/readability has the strongest mechanical comparison, but its central rule
is mostly local. [Detailed comparison](DESIGN-COMPARISON.md).

## What to demonstrate and defend

Have two independent sessions enter the same house. Show both connected, one
Quiet and one Can chat. Change willingness without moving the avatar or opening
a door. Show that Quiet still retains authorized conversation/unread awareness
while that same Quiet mode suppresses their house previews. The cue and preview
preference are currently coupled; separate settings are an alternative. Explain the stronger invitation
alternative and why the current familiar-friend context accepts a softer cue.

This is a proposed live demonstration; today's selected checks are not a current
deployed/browser rehearsal. Ask the pod to argue for automatic availability or
invitation-first interaction. The interesting answer is the capability we give
up and when we would change, not “our implementation passes”.

A real pilot must check stale declarations, perceived reply pressure, mistaken
DND expectations, missed encounters and preference against configured Discord.
If the soft cue fails to communicate, revise the convention or adopt stronger
negotiation. Student writing must describe actual direction/understanding;
this report is preparation, not their reflection or an HD guarantee.
