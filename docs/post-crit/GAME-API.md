> Current integration note: the game foundation uses database schema3; the optional
> Discord destination subsequently adds schema4. Game wire/actions remain as below.
> House snapshot transport schemaVersion remains2 with additive game/voice fields.

# Four-in-a-row transport API

22 October 2026. Factual production contract for the existing house authority.

HouseSnapshot.schemaVersion stays 2. SQLite user_version is 3, with ruleset 1 in
game_tables. HouseSnapshot.game is a GameTable in the lounge and null in bedrooms.
GameTable is declared in public/house-game-rules.d.ts. Player IDs are persisted
house identity IDs; compare them with durable.selfId and durable.residents.

All commands use the existing command envelope and house.command transport
wrapper, including current generation, zoneId="lounge" and the current tab token
for HTTP. Membership and current control come from server state. Never put an
actor ID, authentication claim or new round ID in a command.

| type | expectedRevision | payload |
| --- | --- | --- |
| game.join | game.revision | {roundId: game.current?.roundId ?? null} |
| game.ready | omitted | {roundId, rosterRevision: game.rosterRevision} |
| game.move | game.revision | {roundId, column} (integer 0–6) |
| game.resume | omitted | {roundId, resumeRevision: game.current.resumeRevision} |
| game.leave | omitted | {roundId} |

When a table is empty, only the adapter creates its new random UUID. A current
round's Join must name that round. Ready actions compose against the same roster
revision. Leave names only the actor's round, so a racing Move does not defeat it.

Success uses the existing HouseReceipt: entityRevision is the resulting game
revision; result is {roundId, code}, with the pure rules' lowercase code.
The receipt and state commit in one SQLite transaction before ACK/broadcast.
An accepted identical UUID/body returns its original receipt after the game ends,
including after restart, on an authorized lounge return. A changed body fails
COMMAND_ID_REUSED. Never silently rebase or reuse UUIDs.

Malformed input fails INVALID_INPUT. Pure rule rejections use GAME_ plus the
uppercase pure code, such as GAME_WRONG_ROUND, GAME_STALE_REVISION,
GAME_NOT_YOUR_TURN, GAME_STALE_ROSTER and GAME_STALE_RESUME. Existing authority
errors include NOT_CONTROLLER, STALE_GENERATION, STALE_ZONE and FORBIDDEN.
Failure is {ok:false,code,message}. Timeout is unresolved, not successful.

The first Join fixes waitingDeadlineAt at +90000ms. Ready expires at the earlier
of Ready+60000ms or that waiting deadline. Active inactivity expires at
lastMoveAt+300000ms. A genuine controlling disconnect or process restart pauses,
clears resume consent and keeps the earliest recoveryDeadlineAt (at most +90000ms).
Both original players must explicitly Resume against the current resumeRevision
while each has current lounge control. Watching/reconnect/failure do not extend
deadlines. Due maintenance commits before the next action's rollback boundary.
A successful controlling lounge departure ends participation; an observer's zone
subscription or stale controller's disconnect does not.

Closing the UI is local only. Watch is local/read-only. Logical game seats do not
change physical avatar chairs, Quiet, bedroom doors or study cards. Waiting expiry
has no played result. Terminal state releases seats and retains only latestResult.

