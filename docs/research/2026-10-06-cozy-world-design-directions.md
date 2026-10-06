# Cozy study-world design directions

6 October 2026. Proposed design synthesis, not implemented capabilities. The owner
requires movement, real dialogue and a minimally enjoyable experience. Preserve
those through scope reductions; change renderer or detail level rather than
replace them with static seats or a visitor list.

## What to borrow, and what we propose

| Primary reference | Verified reference feature | Proposed use here |
| --- | --- | --- |
| [Kind Words 2](https://store.steampowered.com/app/2118120/Kind_Words_2_lofi_city_pop/) | Cosy rooms, kind letters, neighbours and social activities | Warm text bubbles while together; a small deliberate note for a later visit |
| [gogh](https://store.steampowered.com/app/3213850/gogh_Focus_with_Your_Avatar/) | Avatar/room customisation, multiplayer focus rooms and timers | Own room leading to one shared study room; sit, focus and take a break |
| [WEBFISHING](https://store.steampowered.com/app/3146520/WEBFISHING/) | Chat-centred multiplayer hanging out and playful shared tools | A later low-demand social object, such as a shared notice board; protect the social loop first |
| [Spirit City](https://store.steampowered.com/app/2113850/Spirit_City_Lofi_Sessions/) | Avatar and bedroom styling, rain/fire soundscapes, spirit companions | Ambient warmth and a future quiet pet; no dependency on copying its music/assets |
| [Chill Corner](https://store.steampowered.com/app/1749630/Chill_Corner/) | Room decoration, weather, character/pet options | One well-lit rainy-night setting before multiple complex scenes |
| [Gather](https://www.gather.town/) | Visible availability, walking over to talk, waving and focus status | Door arrivals, recognisable people and clear quiet/available states |

The right-hand column is our design proposal, not a claim these games implement
that exact combination. Publisher descriptions were read; no new human playtest
or broad gameplay inspection was performed in this assessment.

## Recommended concept: an after-hours study house

Personal rooms sit around a shared late-night reading lounge. The scene is a small,
warm, cutaway 3D space. The owner can arrange a modest furniture set. They enter
the lounge as their avatar, see a friend, walk over, greet them, and sit at a desk.
Studying together makes the desk area softly lit; breaks allow easier conversation
around a sofa or tea corner. Space conveys availability without forcing responses.

Optional later memory: each person can deliberately leave a short paper note on a
board. Returning reveals an actual saved contribution, distinct from who is online.
These spatial and memory interactions are the project's distinctive design
hypothesis; their social value still needs to be judged with actual friends.

Two alternative art packs can reuse the same systems later: a rainy attic cafe
and an overnight train reading carriage. Initially implement one setting. A scene
template should describe geometry, seat anchors, walkable floor and catalogue
references; do not fork identity, chat or timer code per theme.

## Minimum enjoyable experience: release criteria

1. Two people can enter the same authorised room, recognise themselves and each
   other, and see truthful arrival/leave/disconnection states.
2. Keyboard and touch can move around furniture, approach a friend, sit and stand.
   Local control feels immediate, remote motion is interpolated, and chat focus
   prevents movement keys from acting. Multiple people can pass each other.
3. Both can send and receive actual text. Short bubbles attach to the correct
   avatar; a readable transcript retains the full conversation. Failed delivery
   is visible; bubbles do not cover important controls or people indefinitely.
4. Both can opt into the same focus session and see consistent status/deadline.
   Sitting alone is not proof of attention. Joining/rejoining loads the current
   state; a cancelled or completed session cannot revive from stale events.
5. Their room layout and appearance return after restart. There is enough
   customisation to recognise ownership, without needing an unrestricted editor.

Performance targets need identified devices and measurements. Server eight-client
tests cannot establish phone GPU performance. Ordinary-laptop rendering, phone
layout/touch and network reliability have different acceptance evidence.

## Scope and review

Core: movable avatars, reciprocal text, real presence, the existing personal room,
one shared layout, reliable seat claims, one shared focus session and modest
room/avatar choices. Optional after the core is pleasant: notes, a pet, one gentle
shared object, additional weather and theme packs. Full clothing rigging, arbitrary
uploads, voice/video and a large city are later work.

Run two small presentation comparisons with real paired tasks: bubble readability
and compact chat history placement; quiet-state cues and availability clarity.
Use the same room, messages and viewports, vary one factor at a time, alternate
order and record task observations. A few friends' feedback is qualitative
evidence, not a statistically validated preference result.

[WorkAdventure](https://workadventu.re/open-source/) is a useful complete browser
world reference. Its [default production setup](https://github.com/workadventure/workadventure/blob/master/contrib/docker/README.md)
contains multiple services; it is not a drop-in Three.js plugin. Its
[current play license](https://raw.githubusercontent.com/workadventure/workadventure/master/play/LICENSE.txt)
includes AGPLv3 and Commons Clause, rather than MIT. Evaluate reuse component by
component; prefer our existing small application plus verified libraries here.
