# Product positioning: a familiar-peer study house

6 October 2026. Review candidate. This is a provisional product decision based on
current competitor/paper evidence,not a validated market need. Owner source:
[original house brief](OWNER-BRIEF-2026-10-06.md) and
[purpose addendum](OWNER-POSITIONING-ADDENDUM-2026-10-06.md).
The [source dossier](../research/2026-10-06-positioning-evidence.md) separates
facts from inference. Architecture and existing code do not dictate this choice.

## One target,trigger and user outcome

Target assumption:2-6 already-known university friends studying the same or
related subjects,working on their own tasks during an overlapping evening.
They already have a group chat. They sometimes want a few minutes of familiar
help,but do not know who wants to talk without interrupting everyone.

Primary user goal: when I get stuck,find a friend who voluntarily welcomes a short
conversation,clarify my own next step,and retrieve that step when I continue later.

The product is a small persistent game-like study house organised around this
low-pressure interaction. It does not need a public community,tutor marketplace,
course library or full productivity suite. Ordinary quiet company and casual
chat remain available; users never have to manufacture a question to enter.

Illustrative scenario,not a participant account: one resident is quietly revising,
another is working but willing to chat,and a third has a confusing paragraph.
The third sees the explicit availability cue,leaves a brief question card,the
willing friend responds in text,and the author writes the next action. The quiet
resident receives no compulsory call,modal,mention or task assignment.

## Value proposition and boundaries

Proposed selling point: familiar-peer help that starts voluntarily,without calling
the whole group,and leaves one useful next step inside a place the friends own.

This is task-level focus and a default interaction convention,not an exclusive
feature claim. gogh has chat/history/shared timers; Virtual Cottage2 and On-Together
already provide company while working; Gather and Discord preserve conversations.
Browser access,avatars,room decoration and persistence are not individually new.

The appropriate comparison is configured Discord: a private text channel,explicit
availability convention,one pinned goal/help format,a thread and a next-step
summary. If that already serves the group comfortably,the house has not earned
its extra movement and setup. Attractive3D cannot conceal that result.

We may earn value through faster interpretation of willingness,less unwanted
interruption,clear question/next-step objects and personally valued presence.
All four remain hypotheses. We do not promise faster homework,higher grades or
a psychological effect.

## What each requested feature is for

| Feature | Role in this one experience | What must be judged |
| --- | --- | --- |
|2-6house code and permanent members | Re-enter the same known group without rebuilding context | Join friction and understood membership |
| Real avatars,movement and dialogue | Make actual familiar people approachable in a small game | Does movement add valued presence or just extra clicks? |
| Explicit availability | Distinguish online from willing to talk | Users interpret it correctly;quiet is respected |
| Own bedroom and limited DIY | Personal expression,ownership and invited retreat | Friends recognise a person's corner;no productivity claim attached |
| Doors | Access boundary and readable connection between rooms | Open/closed is not confused with availability |
| Shared table,seats | Quiet co-study has an obvious place | Sitting is not inferred attention |
| Small shared board | Hold goal/question/context and next step | Useful items do not disappear into chat |
| Return/persistence | Continue the same small piece of work later | Actual retrieval on another day |

Functional necessity,experiential preference and reliability are different reasons.
Do not invent a causal study benefit for bedrooms just to justify an owner preference.
Their meaningful ownership and game feel are judged directly.

## The complete first loop

Join the known house -> recognise actual friends -> choose Quiet or Can chat ->
work/sit -> optionally post a concise question with context -> a willing friend
responds -> converse -> author records a next step -> continue or leave -> return.

One active card per member has three text fields: current small goal,where I am
stuck (optional),next step (optional),plus an optional resource link. A question
indicator is derived from the author's explicit choice,never their activity.
No matching algorithm,queue,automatic helper assignment or mandatory response.

A lightweight I can chat acknowledgement can be added only if ordinary reply is
hard to notice in pilot use. It is an offer,not proof the author accepted help.
No avatar teleport,forced mode change or completion claim follows automatically.
The author may leave a question open if nobody responds;the UI says so honestly.

The primary help loop occurs in the lounge. A currently approachable helper is
connected,in the lounge,and self-declared Can chat;this eligibility does not infer
attention. Going to a bedroom does not change chosen willingness,but removes that
person from the current lounge-helper list. They may return voluntarily;no
cross-room summon,teleport or automatic reply is added. Ordinary authorised
bedroom visits/chat remain available.

Talk occurs through the existing same-zone chat contract. A conversation corner
is a social cue,not secret messaging. Members can read lounge chat;authorised
bedroom visitors follow the door permission rules. Quiet suppresses intrusive
bubbles but leaves transcript/unread state;posting a card does not ping quiet
residents. Availability and door visibility have separate controls. Quiet is the default
on new arrival;Can chat is self-declared and carries a last-set time. A connection
and this statement do not prove the person is looking at the app or will reply.
A disconnected member is shown offline,not as a currently willing helper.
Same-controller reconnect within30seconds retains a last-set choice;new lease,
full reload,server restart or next-day arrival defaults Quiet. Willingness is
transient;room/card saving never persists a claim of next-day availability.

## Explicit first-release scope

Keep all owner-core experiences:2-6permanent membership/house code,own bedrooms and
doors,controllable avatars,actual text/presence,shared study,seating and meaningful
DIY,useful live board and reliable saved return. These are the house's experiential and
functional minimums,not a claim that each independently improves learning.

Bound DIY initially to six furniture categories and up to ten pieces,move/rotate,
a few colours and one wall/floor palette choice. Exact styles are adjustable after
ownership tasks;capacity and safe routes are not. Initial procedural/verified
assets are enough to evaluate the world without a character-creator project.

Board initially holds one active card per resident and up to twelve inactive(closed or ownerLeft)
cards;18total is the chosen upper bound. State is active,closed or ownerLeft.
Departure is not resolution;inactive quota and private own-step export follow
the capability contract. The owner can write a new current card
without overwriting resolved work. All cards have UUID/revision/author;independent
updates and losing-draft preservation remain. Drawing,uploads,filters,board-wide
undo and rich text are enhancements with separate need/resource gates.

No shared timer in the first value loop. Quiet/co-study works by voluntary status
and seating. A timer can follow observed demand and its previously reviewed finite
deadline contract. No statistics,streaks,XP,pets,minigames or content marketplace
during the two-week core build.

Keep minimum identity recovery,privacy/revocation,persistence and safe departure
semantics because exposing rooms requires them. Do not build a full archive browser,
history-management product or many-house selector. A read-only own-data export
and consistent archived ownership satisfy lifecycle duties first.

## Stop/go criteria before expanding

G0,target fit: owner-assisted recruitment of at least two existing-friend pairs
or one3-4person group;ask about actual recent co-study/help episodes and current
tools. Do not count this document or peer-agent preference as demand evidence.
If questions are uncommon or unwanted,choose simpler candidateA(start/finish
alongside friends) before implementing a help flow. Owner can change the target.

G1,first complete loop: two real browsers join,move,talk,save identity/a chat message and
return;the useful card/next-step loop is completed in S3. No new catalogue,uploads or timers until the loop works at both viewports.

G2,value pilot: compare with configured Discord under the declared matched task,
counterbalance order,record coaching,availability errors,interruptions,extra work,
next-step retrieval and reasoned reuse choice. Small pilot criteria support a
direction decision,not statistical or productivity claims. No comparison run yet.

G3,return: at least one natural next-day continuation observed; distinguish
voluntary return from being reminded for a test. If only decoration is valued,
revise the product argument rather than relabel it as successful peer help.

A finding that the baseline is preferable is a useful outcome,not a failed score
to hide. Any pivot updates README/rules/checks and the plan before more work.

## HD argument and evidence chain

A strong course response can defend one concrete notion of good. Here the proposed
claim is that familiar help should be voluntary,quiet residents should remain
undisturbed,and the requester should keep their own next step. Tie it to:
- README: target/task,why these choices,competitors and uncertainty.
- CLAUDE: no fake presence,no automatic interruptions,clear access/availability,
  author-controlled outcome,truthful pending/saved states.
- spec: membership,delivery,card/presence correctness,quiet presentation,
  reconnection and persistence.
- human judgement: comfort,value of embodiment,ownership,unwanted pressure and return.
- process: rejected alternatives,actual failures,corrections,commits and decisions.

This supports an HD case; it does not predict a grade. The [official rubric](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/)
also requires corroborated process and a robust deployed artifact.
