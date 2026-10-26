# Night Neighbourhood

Night Neighbourhood is a shared house for two to six familiar university friends.
Work on separate tasks, explain something on a board, take a short game break or
visit someone's room. The design asks whether a persistent place can help friends
spend time together without requiring everyone to do the same thing.

[Redeemable Crit reflection, 26 October](reflections/redeemable-crit.md).

## Giving a room a reason to return to

A bedroom used to lead back to a general work card. Visiting a friend's desk could
open your own unrelated card. The room looked personal, but the interaction gave
you little reason to be there.

Now each resident can keep one reference image and save the view they were
inspecting. It might be a diagram, design or personal illustration. It remains
visible on the desk and wall after the panel closes. Returning resumes that
material; visiting gives friends something of the owner's to discuss. Visitors
pan and zoom independently, while only the owner changes the saved image and view.

[Harrison and Dourish's author-hosted draft (1996)](https://dourish.com/~dourishc/publications/1996/cscw96-place.pdf)
distinguishes geometric space from socially understood place. That suggests a
question for this project: what belongs here, and what do friends expect to do
here? An owner-selected reference is one answer to test. Another form would add
reporting work; a timer would add little to a visit; general media would broaden
expression but require more formats, playback and provider decisions.

This choice has costs. Someone must bring material, PNG is limiting, and walking
to a room takes longer than opening an image in chat. Saved context and a
recognisable owner give that journey a possible purpose. Whether friends value
it is still a question for use with real people.

## Enter and try a visit

Create a house or join with its eight-character code. Use separate browser
profiles for distinct people; tabs in one profile share an identity. Move with
WASD/arrows and E, or use touch controls and Places.

Choose My room, walk inside and open Room studio. Choose one PNG, save it, adjust
the crop and choose Save this view. Open your door in room settings to admit
current housemates. Another resident can then use Places to visit and inspect
your reference. Closing the door ends their current access; copies already
obtained cannot be recalled. Optional room sound starts only after each visitor
chooses Listen here and stops when they close the studio.

The [shared board](/board/) supports drawing, notes, images and companion house chat, with
an independent viewport for each person. Study seats support a voluntary huddle;
the sofa supports deliberately sharing and presenting an image. At the activity
table, sitting starts Watch. Join separately to contribute to the cooperative
picture table or the two-player Four-in-a-row game. Quiet/Can chat expresses
availability separately from room access and activity participation. Voice options
can open a house-configured Discord destination in another tab.

[Try it](docs/spatial-redesign/TRY-IT.md) contains the full controls and recovery
steps. [The room decision](docs/spatial-redesign/ROOM-DECISION.md) records the
alternatives. [Technical acceptance](docs/spatial-redesign/ACCEPTANCE.md) records
ownership, persistence, browser and resource checks: these establish implemented
rules, while usefulness, comfort and belonging require human judgement.

Built with Node 24, SQLite, Socket.IO, Three.js and the MIT-licensed Excalidraw
editor. Use the pinned Linux toolchain for `pnpm build:board`, `pnpm start` and
`pnpm check`. [PROCESS.md](PROCESS.md) follows the development decisions and
acknowledges assistance. The [current plan](PLAN.md) records the project direction;
[earlier redesign validation](docs/implementation/REDESIGN-VALIDATION.md) preserves
historical checks rather than acceptance of this candidate.
