# ADR: quiet company and chosen availability

Recorded 7 October 2026; revised for Crit 9 on 12 October.

## Context

Night Neighbourhood is for a small group of friends who may want company,
conversation or brief help while doing their own work. A connected avatar at a
table gives a presence cue. It cannot establish willingness to talk.
[README](../../README.md) therefore defines good as allowing quiet participation
and voluntary exchange, with room access as a separate permission.

## Alternatives

| Option | Useful capability | Cost |
| --- | --- | --- |
| Treat online residents as open to interaction | No status-setting effort; spontaneous encounters. | Quiet company is difficult to express; connection is an ambiguous proxy. |
| Infer from activity or proximity | Lower manual upkeep and apparently current cues. | Similar activity can mean concentration, availability or absence. |
| Explicit Quiet/Can chat | The person can express willingness without leaving the group. | Another choice to maintain; declarations can become stale. |
| Invitation and acceptance before conversation | Clearer agreement to engage. | More steps and waiting for a short familiar-peer exchange. |

Separate public availability and private preview settings are another option.
They would let a person welcome chat while hiding previews, at the cost of more
controls. Configured Discord remains a fair alternative to the whole product.

## Decision

Use an explicit soft willingness cue, independent of connection, room location
and bedroom access. A new controller lease starts Quiet. A same-token reconnect
before its 30-second expiry may retain the previous value; this is transient state,
not next-day willingness. Entering a bedroom changes location without changing
the cue. A current lounge helper must be connected, in the lounge and Can chat.

Quiet suppresses the recipient's house speech previews while keeping authorized
transcript and delivered unread awareness. That public cue and private presentation
are currently coupled. It does not block messages, ensure a response or conceal
presence. The separate board has its own conversation and presence.

The default Quiet value is system-initialized. Last-set time includes that event
as well as explicit changes. It is not proof that the person is attending to the app.

## Reason and sacrifice

We favor a low-cost declaration for known friends, while accepting manual upkeep
and uncertain interpretation. A more public group or a strict DND requirement
could justify invitation or enforced blocking. An open hangout could reasonably
prioritize spontaneous contact instead.

[Erickson and Kellogg (2000)](https://smg.media.mit.edu/library/erickson2000.pdf)
connect social visibility with coordination and accountability.
[Harrison and Dourish (1996)](https://dourish.com/~dourishc/publications/1996/cscw96-place.pdf)
challenge the assumption that spatial metaphors supply shared social meanings.
These references were revisited on 12 October; they explain the present argument
without being backdated as the original design's reading.

## Evidence and reopening

[Realtime rules](../../src/house-realtime.ts),
[reconnect tests](../../spec/house-realtime.test.ts), and
[UI refinement](../revisit/UI-REFINEMENT.md) protect the default, chosen value,
freshness and unread behavior.
[Crit 9 acceptance](../crit-9/submission/ACCEPTANCE.md) records current deployed
observations and release checks. Historical planning comparisons preceded the
house implementation; no human A/B of availability policies has run.

A pilot should examine stale values, mistaken DND expectations, reply pressure
and whether friends prefer their existing group chat. If the cue communicates
poorly, revise its wording or separate its functions before adding more features.
