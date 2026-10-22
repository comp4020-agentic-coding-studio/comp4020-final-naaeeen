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
A bedroom desk opens its owner's Room studio. Keep one reference image there,
save the crop you were inspecting, and return to it later. It can be a diagram,
a design or something you want a visiting friend to see. The image stays visible
on the room's desk and wall after the inspection panel closes. Guests inspect it
locally; only the owner changes the saved reference and view. Choose a PNG; the
upload prepares it within the room's image limit.

Room atmosphere offers Rain, Fire or Night. The owner saves a preset, and each
visitor chooses Listen here and their own volume. Leaving the studio stops that
local sound. An open bedroom makes its chosen reference available to current
housemates alongside its furniture and retained room chat.

The lounge's places support different ways of spending an evening. At a study
seat, Join huddle when you want to work through something together. A volunteer
can Lead huddle; the independent shared board keeps each person's own viewport.
At a sofa seat, Join and deliberately share your room reference with the house.
Others can inspect independently or Follow the presenter’s crop and pointer. That published copy is house-visible until the shared session clears it,
even if its source bedroom closes. Closing the shared view leaves participation
and keeps your ordinary seat.

The activity table has one physical chair per resident. Sit, then choose Watch
or explicitly Join. At the picture table, up to six friends assemble one shared
illustration: select a loose piece, then its place. Start and Join are separate
choices. Progress stays when someone leaves. Reconnecting returns you to Watch;
finishing releases everyone's participation.

Four-in-a-row is another choice at that table. Two players Join and Ready while
others can watch. Turns are untimed. Look around keeps your chair; Stand releases
it and activity participation. After a disconnect, both players choose Resume
before continuing. Waiting and idle rounds eventually clear.

Return to my room leaves the activity and walks home to your reference desk.
Earlier authored cards remain under Options -> Saved work, including saved goals,
next steps and newer unsent drafts. Cards remain house-visible and author-controlled;
they are separate from the bedroom's chosen reference and door access.

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
[plan](PLAN.md), [spatial implementation](docs/spatial-redesign/IMPLEMENTATION.md),
[post-Crit improvements](docs/post-crit/PLAN.md) and
[earlier validation](docs/implementation/REDESIGN-VALIDATION.md)
record development details. Research and drafting were assisted by AI;
the project record is in PROCESS.md.
