# Night Neighbourhood

Night Neighbourhood is a small house for two to six university friends who want
company while working on their own tasks. You might be revising quietly, welcome
a short chat, or want help with a confusing paragraph. The house lets those
activities happen together without requiring everyone to post a goal or reply.

## Quiet company, voluntary conversation

Two avatars sitting at the same table tell you that their friends are connected.
They do not tell you whether those people want to talk. Our main design decision
is to keep presence, willingness and room access separate.

New arrivals start in Quiet. Choose Can chat when you welcome conversation.
Your friends see that value and when it was set. The time can also come from the
default being initialized; it does not prove that you are watching the screen.
Quiet hides house speech previews while keeping authorized messages and an unread
cue. It is a soft convention, not a message block. The same control currently
changes both public willingness and your previews.

An always-open hangout would need less status maintenance and make chance
encounters easier. Invitations accepted before each conversation would make
agreement clearer, but add steps to a brief exchange between familiar friends.
We chose a declaration between those options. Its cost is an extra choice and
the possibility that someone forgets to update it.

[Erickson and Kellogg (2000)](https://smg.media.mit.edu/library/erickson2000.pdf)
explain how visibility helps people coordinate while also creating accountability.
[Harrison and Dourish (1996)](https://dourish.com/~dourishc/publications/1996/cscw96-place.pdf)
show why a shared setting needs social meaning beyond its geometry. These ideas
help explain our choices; friends still need to develop and understand the
convention through use.

## Enter, explore and think together

Create a house, share its eight-character code, or join one. A cookie returns you
to the same identity; keep a recovery key private if you want another way back.
Offline members keep their bedroom. Capacity counts residents, not browser tabs.

Move with WASD, arrows or touch controls. E uses the nearby door, seat or board.
Follow keeps your avatar centred. Walking resumes Follow after a temporary camera
drag; Look and Overview remain deliberate viewing choices. Places routes you to
study seats, the rest corner, the break table, the board or your own room. New
bedrooms start with different furnished arrangements. Existing rooms keep their
contents; My room offers a preview before applying a starter arrangement. Each
person can decorate their bedroom with a bounded furniture set.
Bedrooms start closed. Opening one admits current housemates and exposes retained
room chat; visiting does not grant decorating rights. Quiet does not hide your
name, connection or coarse room location.

Shared board opens a full canvas with drawing, notes, images and companion chat.
It also works at [/board/](/board/) independently. Board conversation is house-wide,
separate from room chat. Peers see shared canvas edits and pointer/selection
awareness; each person controls their view. Study cards remain author-controlled.
Saving a next step leaves the card active; closing records the author's choice.
Every desk opens your own My work card, including when you visit a friend. Bedroom
chairs and adjustable lighting make the room usable for studying as well as decorating.

The lounge has shared study seats, a sofa corner and a break table. At the picture
table, up to six housemates can assemble one shared illustration. Pick a loose
piece, then choose its place; keyboard and touch use the same board. Opening the
table lets you watch. Start creates a picture, and Join is a separate choice.
Progress stays when someone leaves. Reconnecting returns you as a watcher until
you choose Join again, and finishing the picture releases everyone's participation.

Four-in-a-row is another choice at the table. Two players choose Join and Ready;
other housemates can watch. Turns are untimed. Closing the panel keeps your place,
while Leave withdraws without a loss. After a disconnect, both players choose
Resume before continuing. Waiting and idle rounds eventually clear.

Return to my room leaves the activity and walks your avatar home. The room shows
your saved goal and next step, with a separate Open my work button that keeps newer
unsaved drafts. This gives the bedroom a role between shared breaks: a familiar
place to pick up your own task, with your arrangement, chair and lighting. My work
also stays directly available from the toolbelt. The card is visible to housemates;
room access and Quiet remain separate choices.

The house owner can add an existing Discord invite or server-channel link in
House settings. Voice options opens that destination in a separate tab; call
participation and microphone controls stay in Discord. The house's Quiet choice,
text chat and shared board continue independently.


## What we check and what we still need to learn

Code checks and browser journeys cover ownership, room access, saving, reconnects
and message delivery. Unconfirmed submitted actions retain their IDs for retry.
If local storage fails, an unsent board-chat draft may exist only in that tab.

Whether this house feels welcoming, makes asking easier or is preferable to a
well-configured Discord group needs real-friend evaluation. We have not established
a learning benefit. [The decision and evidence](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/blob/main/docs/decisions/2026-10-07-explicit-willingness.md)
explain the alternatives and checks.

Built with Three.js, Socket.IO, SQLite and the MIT-licensed Excalidraw editor.
Use the pinned Linux toolchain: pnpm build:board, pnpm start, and pnpm check.
[Permissions and logging](docs/crit-10/PERMISSIONS-AND-LOGGING.md),
[plan](PLAN.md), [post-Crit improvements](docs/post-crit/PLAN.md) and
[earlier validation](docs/implementation/REDESIGN-VALIDATION.md)
record development details. Research and drafting were assisted by AI;
the project record is in PROCESS.md.
