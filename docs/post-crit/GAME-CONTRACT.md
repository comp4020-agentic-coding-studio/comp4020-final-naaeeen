# P4: one voluntary shared break table

22 October 2026. Parent decision after a history-free Astra/max review of factual
protocols, source, measurements and original-resolution images. The reviewer did
not read the worker recommendation. This is a design judgment, not human preference.

## Choice and costs

Choose untimed Four-in-a-row: two explicit players and up to four watchers. A
public board and one action per turn make an interrupted game understandable to
players and observers. The cost is limited active participation. Reopen Crazy
Eights if real groups want all six to participate actively; reopen timed chess if
the actual friends already play and explicitly want a clock.

Chess is feasible: shared padding fixed phone targets to 44.5px; server-held
history plus a bounded position projection resolves the raw-history size issue.
It loses this first decision because clocks and prior chess knowledge demand more
continuous attention. Crazy Eights offers whole-group participation, but withdrawal
requires a considered continuation policy for hidden hands and turn order. Its
prototype ends everyone's round when one leaves; that is a social cost, not proof
that cards are too hard or need another server. Four-in-a-row does not guarantee
a short elapsed round. Show elapsed break time and an immediate exit, without a
score, streak, penalty, compulsory study timer or automatic rematch.

## What the comparison actually established

[Protocol](evidence/game-protocol.md), [refinement](evidence/game-refinement-protocol.md)
and [worker record](evidence/game-comparison.md) retain source bindings and failures.
79 pure probes, 24 small pointer/key traces and six separate emulated-touch traces
passed their implemented assertions. These were one-browser trusted fixtures.

Fresh review found a grading gap: the first Four-in-a-row token lands below the
initial phone viewport, while the runner checks a revision increment. Chess also
clips lower rows. Target size and a passing scripted action do not establish visible
move feedback. Keyboard targets were programmatically focused; Tab discovery,
focus retention and a textual board are not established. Cards' grown-hand/wild
choice cases are untested. JSON roundtrips are not SQLite restart evidence, and
Return opens a placeholder. The production acceptance below must close these gaps;
do not relabel fixture PASS as a complete user task or production multiplayer.

## Lifecycle to implement

- Open defaults to Watch. Show the two-player limit before Join. Logical game seats
  are separate from avatar chairs. Neither operation changes Quiet, doors or work.
- Join reserves a free logical slot. Both people then explicitly Ready against the
  same round ID and roster revision. The second consent starts atomically; roster
  changes clear readiness. A waiting round holds seats for a fixed 90-second window from its
  first Join. Readiness expires at the earlier of 60 seconds after Ready and that
  waiting deadline. Joins, Ready, watches and reconnects never extend the window;
  an unstarted expired table releases seats without a played-game result. A waiting
  controller disconnect releases its slot immediately. Explain the reservation
  before Join so another connected but inactive person cannot occupy it forever.
- Closing the panel only hides it. Keep a small At table / Reopen / Leave control.
  Explain that closing retains participation without forcing the panel back open.
- Leave or Return to My work exits the UI immediately. Waiting players release
  their slot. Leave is bound to the actor and round ID, not a potentially changed
  table revision: another person joining, readying or moving cannot defeat voluntary
  withdrawal. An active round ends neutrally when someone leaves; no inferred loss.
  Return opens the actual canonical card and retains its next step. Explicit
  concession is an enhancement, not required for this low-pressure first table.
- A successful controlling transition out of the lounge withdraws that participant.
  An observer tab's subscription must not end another tab's game participation.
- A controlling disconnect pauses the round and retains its two identities for
  up to 90 seconds. A watcher cannot substitute into a live position. Both original
  players must deliberately resume after reconnecting with current lounge control.
- Either participant can end a paused round immediately. End it neutrally when
  recovery expires, or after five minutes without an accepted move. Failed actions,
  watches and reconnects do not renew inactivity. Show this rule in the UI.
- Restart restores SQLite state and requires explicit resume. Keep the earliest
  retained recovery/idle deadline; repeated restart must not extend abandoned play.
- A terminal result releases both seats. A new round has a new ID and requires new
  Join/Ready consent. Keep one current table and one latest result, not a history feed.

60/90/300 seconds are initial housekeeping policies, not measured optimum timings.
The public position has 42 cells. Use distinguishable token shapes/labels as well
as colour, a last-move cue and an inspectable textual board.

## Authority and implementation boundary

Pure domain rules take a validated state, action and server time, returning an
immutable transition/result. They know nothing about DOM, sockets or SQLite. The
store owns session IDs, membership, transactional state/revision and receipts.
Realtime owns controller generation and physical lounge transitions. UI owns
voluntary navigation, focus and explicit pending/saved feedback.

Ready consent is bound to roster revision, so simultaneous consent by both players
can compose without silently rebasing an uncertain action. Moves bind round ID and
current table revision, turn and legal column. Waiting-slot changes serialize with
the table revision. Freeze exact command schemas with backend integration rather
than accepting arbitrary fixture IDs or trusted fixture contexts as authentication.

State and receipt commit together before ACK. Retry the original UUID/body; never
apply an old round's pending move to a new round. The existing outbox retains its
original lounge scope. Moving to a bedroom does not discard or silently rebase it:
inspect there, resolve the same command on an authorized lounge return. An accepted
retry returns its old receipt even if the game ended; an unaccepted obsolete move
is definitively rejected. Navigation cannot wait for an uncertain game ACK. Cap
pending game work so it cannot fill the whole study-work outbox.

Game housekeeping and membership/room departure must be transactional, idempotent
transitions. Pure `advanceGameTime` is explicit; a rejected player action returns
unchanged action input. Integration must persist due maintenance before executing
the player command, so the existing command rollback cannot undo expiry. The
pure action rejects an already-due state if an adapter forgets maintenance. Do not write every second or broadcast receipt histories. Keep the
existing 96-query bound and record repeated-round storage growth. Use the current
SQLite authority, not another game server. Add an explicit schema migration after
the now-implemented room v2 migration, preserving all existing records/archives.

## Acceptance before a finished table

Real independent clients must cover concurrent Join/Ready, move/departure races,
watcher/outsider/old-controller denial, disconnect/resume, membership removal,
restart between commit and ACK, old-round retry, changed-payload UUID reuse and
immediate exit. A second tab observing another zone cannot cancel its controller.

At 1920x1080, 390x844 and 844x390, show the board, current turn, last move and Leave
control together. Verify actual move feedback, Tab/keyboard paths, focus retained
after updates, textual/non-colour state and emulated touch. Test actual Return to
My work and unaffected Quiet/door/card state. Then run the original resource gates
and separately declared combined workload; fixture bytes do not qualify 256 MB.
Fresh code review and parent reproduction remain required. Physical devices and
real-friend enjoyment/preferences are separate, unrun gates.
