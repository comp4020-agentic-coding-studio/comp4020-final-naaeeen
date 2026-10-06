# ADR: willingness is chosen, not inferred

7 October 2026. Implemented and checked locally; target-user judgement and the
live C9 pod session remain open.

## Context and definition of good

[README](../../README.md) proposes familiar-peer help that starts voluntarily and
leaves an author-written next step. The [product positioning](../product/PRODUCT-POSITIONING.md)
allows quiet company without compulsory goals or replies. A connected avatar at a
table establishes neither attention nor willingness to explain a course concept.
Door permission, location and conversation willingness therefore need separate meanings.

## Options considered

| Option | Benefit | Cost or reason against choosing it |
| --- | --- | --- |
| Treat every online resident as approachable | No status-setting effort | Connection is not consent to an interruption or a promise to reply. |
| Infer willingness from movement or idle activity | Automatic cues may look current | Activity cannot establish intent; the inference is hard to interpret and can mislabel quiet study. |
| Explicit Quiet/Can chat choice with a last-set time | The person controls the declaration; its age is visible | People must update it, and a connected declaration can become stale. |

A configured Discord status convention is also a fair alternative to the whole
spatial app. Choosing an explicit cue here does not make that mechanism unique
or show that the house earns its extra setup and movement.

## Decision and resulting rules

Choose explicit willingness. A new controller lease, full reload or server restart
starts Quiet. A reconnect of the same controller before its 30-second lease expires
may retain the declaration; this is transient server state, not saved next-day availability.
Entering a bedroom changes location, not the person's choice or the door's saved permission.

An approachable lounge helper must be connected, in the lounge and self-declared
Can chat. The cue still does not establish attention or guarantee a response.
There is no automatic helper assignment, mention, call or forced reply. Quiet
suppresses floating chat previews while the native transcript and delivered-message
unread cue remain available. Ordinary conversation needs no posted goal.

## Evidence, costs and what could change the decision

The [realtime rules](../../src/house-realtime.ts) and [tests](../../spec/house-realtime.test.ts)
cover lease defaults and same-controller reconnect. [UI refinement](../revisit/UI-REFINEMENT.md)
records last-set display and actual delivered unread handling; native independent
browsers observed live changes. These checks establish behavior, not correct human
interpretation or reduced interruption.

The cost is an extra choice and possible stale declarations. Last-set time and
separate connection/location cues make that limit visible rather than inventing
attention. A real pilot must examine willingness errors, unwanted interruptions,
next-step retrieval and preference against configured Discord. That comparison and
human next-day return have not run. If people still treat the cue as a promise or
prefer the baseline, revisit the convention and product argument.

This is the proposed consequential behavior decision for
[C9: All at once](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/09-all-at-once/).
The student must explain how it follows README's good, its rejected options and
costs, then address the pod's counter-case. This ADR is not the live demonstration,
Crit9 reflection or proof of the student's understanding.
