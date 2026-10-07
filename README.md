# Night Neighbourhood

Night Neighbourhood is a small private house for two to six university friends.
It is for evenings when you want company, a short conversation about something
that has you stuck, or a shared surface for thinking. The aim is a clearer next step with willing friends. Its value still needs a real
group trial.

## Enter and settle in

Create a house or join with its eight-character code. Offline residents keep
membership and their bedroom; capacity counts people, not browser windows. A
cookie returns you to your identity. Continue enters the saved house, while Options
controls framing, zoom and reduced motion. Move with WASD or arrows, use the touch
controls, or select a nearby door, seat or board. E performs the nearby action.

Your avatar reflects real movement, sitting and location. Follow keeps you visible;
Overview stays selected while you walk. Drag to inspect, zoom over the scene and
Recenter to return to yourself. Your closed bedroom belongs to you. Open it to current housemates when you want
visitors; visiting does not grant decorating authority. Ten pieces from six furniture
categories, grid placement, rotation and six palettes provide bounded DIY.

Quiet and Can chat express willingness, independently of connection and door access.
Floating bubbles preview conversation; a movable, resizable chat window holds the
longer text. Typing, scrolling and tool interaction do not drive the avatar. Room
chat is visible to people currently allowed into that room, including history. Quiet hides previews while retaining unread messages.

## Think together on the board

Shared board opens a full workspace with drawing, text, shapes, arrows, sticky notes,
images, undo, zoom and PNG/editable-file export. The same workspace opens
directly at [/board/](/board/), with Create, Join and identity recovery, without
loading the game. Companion board chat moves beside the canvas; on narrow screens
it docks and collapses. This is house-wide board conversation, separate from room
chat. Everyone currently in the house may edit shared canvas objects. Simultaneous
changes merge by element; text conflicts provide recoverable drafts, rather than
character-level co-editing.

Study notes remain author-controlled goal/question/next-step cards. Saving a next
step does not declare the question solved. A missing reply is pending, not saved;
retry keeps the original action ID. Retained chat is limited to 100 messages per
channel and seven days. The canvas has a two-MiB/2,000-element bound, including
deletions. Images support PNG/JPEG/WebP: two MiB each, twenty files/twenty MiB per house. Limits show
errors and preserve unsent work for recovery/export.

Keep your identity recovery key private. It replaces old sessions and restores your
place in a full house. Private export retrieves your room/cards and your authored
board contributions; full canvas export contains the current shared document.
Owners transfer responsibility before leaving other residents; removal revokes
access and rotates the invitation.

## Run and assess it

Use the pinned Linux toolchain through mise, install the lockfile, run
`pnpm build:board`, then `pnpm start`. User data belongs in the configured data
directory. `pnpm check` builds and checks source/specs; maintained browser journeys
exercise independent users. Production uses one Fly service and its mounted volume.
Local browser/synthetic results do not establish physical-phone usability, deployed
performance or human value. [PLAN](PLAN.md) and [validation](docs/implementation/REDESIGN-VALIDATION.md)
record the current phase, evidence and remaining gates.

Kind Words, gogh and spatial collaboration tools informed the design.
[Excalidraw](https://github.com/excalidraw/excalidraw) supplies the MIT editor;
collaboration, authority and persistence are project code. Three, Socket.IO and
self-hosted licensed fonts support the implementation. Research records credit earlier KayKit/CC0 exploration. This argument is AI-assisted and requires the
student's review and defence; process evidence is separate from personal reflection.
