# Shared picture table and personal work return

22 October 2026. Proposed bounded extension; independent contract review precedes
production edits. Owner requirement: three to six friends can contribute, not just
watch two players. The earlier Four-in-a-row implementation remains available.

## User task and comparison

Six familiar housemates choose a short break. One uses a phone, another keyboard
controls. Each can make a meaningful contribution. Someone leaves or disconnects;
the others continue, and the returning person sees saved progress. Participants can
leave before completion and recover their own work. A three-to-five-minute break
is a design target, not a measured duration or a forced timer.

A fresh Astra/max decision compared four activities against that common task before
reading prior game verdicts. Parent checked the decisive developer sources and
current two-player rules. These are design judgments, not a human A/B study.

| Candidate | Advantage for this task | Cost and decision |
| --- | --- | --- |
| Shared picture puzzle | Simultaneous contributions, late joining and departure need no phase repair | Fast players can dominate; visual/nonvisual description needs careful design. First bounded candidate. |
| Simultaneous clue circle | Everyone contributes words; useful for conversation | Language burden, rotating guesser, secret projections and duplicate-clue policy. Conditional next activity. |
| Drawing telephone | Expressive interdependent group creation | Missing submissions, phases, hidden canvases and retained drawings increase recovery/storage work. Defer. |
| Cooperative platform/switch puzzle | Avatars cooperate directly | Movement/physics/mobile precision and participant-count-specific levels multiply design cost. Defer. |

[Jigsaw Explorer](https://www.jigsawexplorer.com/multiplayer-jigsaw-puzzle-games/)
documents shared assembly, later arrivals and continued play after the creator
leaves. Its retention duration is not adopted here. The developer's
[Puzzle Together listing](https://store.steampowered.com/app/1478220/Puzzle_Together/)
shows the shared-table form; its voice, uploads and generated-image catalogue are
separate features. [PICO PARK 2's Japanese developer page](https://picoparkgame.com/pp2/)
shows that cooperative stages are adjusted to participant count. These descriptions
establish reference mechanisms, not evidence that our implementation is enjoyable.

## Bounded first implementation

A 24-piece, 6-column by 4-row picture table uses three original locally authored SVG
illustrations. Fixed orientation and one unfinished puzzle per house avoid a second
3D editor. No game package, image provider, upload service, hidden cards or physics
engine is required. The existing Three.js table is its spatial entry; the playable
surface is native DOM/SVG. Keep total new illustration bytes below 80 KiB and the
serialized puzzle projection below 8 KiB; measure actual values.

Opening a break menu or the picture table does not enroll anyone. Join explicitly
opts the current lounge controller in. A member can join midway. Everyone may
place any available piece; distinct-piece commands should not conflict merely
because the global revision advanced. Correct pieces stay fixed. Wrong destinations
leave progress unchanged, retain the selected piece and give clear feedback.
There is no score, leaderboard, countdown, streak or automatic next round.

Leaving participation or returning to work never ends the shared puzzle. Losing
control, leaving the lounge, membership removal, disconnect and server restart
clear active participation, while durable puzzle progress survives. Reconnection
requires an explicit Join again. Selection and pointer position stay local; no
per-frame commands, cursor persistence or unbounded move history.

Show brief contributor feedback and shared progress, without ranking people. Equal
permission is not evidence of equal contribution. The six-client acceptance must
observe a successful contribution from each identity, not only connected avatars.

## Rules and authority contract

Implement a separate pure puzzle module, not a widened two-player GameTable.
The existing turn/ready/departure rules retain their own meaning. New house schema 5
adds one puzzle-table row per house; old records, receipts, rooms and archives are
preserved. Empty state is allocated on first deliberate creation, not every join.
Wire fields are additive and the current-client version gate must cover the new
capability. Freeze exact command/projection types before parallel backend/UI work.

- Server-generated round UUID, ruleset/version, illustration ID, bounded progress
  for 24 unique pieces, and monotonic table revision. The server knows each correct
  destination; no competitive secrecy or anti-cheat claim is needed.
- Explicit join/leave and placement commands use existing house binding, command
  UUID/hash, authority generation, controller/zone validation and atomic receipts.
  Progress and its receipt commit together before publication.
- Check current participation before a new placement. Same-piece contention gives
  one accepted effect; other clients see the committed result. Different pieces
  can both succeed without a global expected-revision collision. Round identity
  prevents a delayed placement from affecting a replacement puzzle.
- Exact duplicate successful commands replay their original receipt without a new
  effect. A replayed old Join receipt must not re-enroll a disconnected resident.
  Snapshot authority determines current participation, not optimistic receipt text.
- Keep accepted placement receipts small: reference round/piece/result/revision,
  not repeated SVGs or full puzzle history. Retained command count remains separate
  from the 8 KiB current-state bound; measure receipts and WAL in acceptance.
- Completed puzzles may be deliberately replaced by a participating member.
  Replacement clears old participation; the initiator's explicit new-puzzle action
  enrolls only that person. Others decide whether to join the new round.
- An unfinished replacement is owner-only, explicitly confirmed, and allowed only
  when no other active participant remains. Use expected table revision and check
  current participation in the same transaction; a racing join/place prevents an
  unnoticed reset. A spectator opening a panel cannot reset anything.
- Removed/foreign members cannot read or mutate the projection. Bedroom snapshots
  omit the lounge puzzle, using existing zone/privacy rules. Restarts clear active
  intent and preserve progress. No periodic idle timer or automatic deletion.

Logical participation transitions may be committed like the existing game lifecycle;
connection coordinates and selections do not belong in SQLite. The implementation
must specify and test its cleanup path before claiming absence of ghost players.

## Interaction and personal-room purpose

The break menu offers Four-in-a-row (2 players) and Picture table (up to 6 active
participants), with honest counts and current progress. Keep chat reachable. Use
large piece/destination targets, visible selection/focus, native buttons and a
complete tap-piece then tap-cell route. Drag can wait; no action should require it.
Compare stacked board/tray on portrait with side-by-side on landscape using the
same 24 pieces and controls. Preserve an immediately visible exit at every size.

Give pieces descriptive accessible names and a textual reference to the image's
regions, not only numbers. Use shape/outline and text alongside color. A keyboard
pass is not full screen-reader or human accessibility acceptance. If the visual
activity cannot support a meaningful nonvisual contribution within this bounded
design, prioritize the clue-circle alternative; retain the unresolved test gap.
[W3C dragging guidance](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
requires a non-drag pointer path separately from keyboard access.

Personal rooms are a resident's work home base and controllable surroundings.
Current ownership, furniture, lighting, door policy and room chat already make them
more than a cosmetic inventory. Improve continuity: show the saved goal/next step
clearly at the desk and offer a deliberate return-to-own-room/desk route after a
break. Existing desk interaction opens the same house-visible card, including when
visiting a friend's room. Do not label it private or create a second task database.

A return control must preserve newer drafts and pending intent, withdraw from the
activity without blocking navigation, then follow an ordinary reachable route.
Current camera/door/seat authority applies. Do not imply a saved card proves actual
concentration. Entering a bedroom never changes Quiet/Can chat, door access or task
completion. If automatic chaining fights user movement or keyboard focus, keep a
clear two-step Return to my room -> Open my work instead of a fragile scripted tour.
A private notebook remains a separately justified future capability.

## Implementation order and acceptance

1. Review this rule/UX contract and exact payloads; write pure red tests and a small
   responsive surface prototype. Compare actual control fit across 1920x1080,
   390x844 and 844x390 with the same content before claiming a usable layout.
2. Backend owns puzzle rules, additive migration, commands, projection and lifecycle
   cleanup. Verify six distinct contributors, different/same-piece races, retries,
   restart, old-round commands, outsider/removal/controller/zone denials, and reset
   racing another participant. Preserve existing game and board behavior.
3. UI owns break menu, selection/placement, live shared progress, accessible labels,
   pending recovery and explicit exit. It consumes the frozen backend contract.
   Review the current room-return path and saved-card visibility before changing it.
4. Run real separate-browser tasks: at least three active contributors, then six;
   a native phone and keyboard-only participant; join midway, leave while others
   continue, disconnect/rejoin, save/reload and return to own work. Record boundaries
   if one-host software rendering requires bounded cases; do not call watchers players.
5. Independently review changed sections, reproduce findings and rerun affected
   checks. Rebind the existing combined resource workload, adding actual group
   placements without weakening any original gate. Record asset, state, receipts,
   main/WAL/SHM, RSS and delivery metrics separately.

One integrated picture activity is the first complete addition. The clue-circle
extension is conditional on human preference or a demonstrated access problem;
this is a staged choice, not a promise to implement a catalogue. A real friend pilot
should examine contribution balance, ease of leaving, pressure to finish, enjoyment
and return-to-work discovery. These human questions remain untested.
