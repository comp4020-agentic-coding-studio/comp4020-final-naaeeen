# Clock rollback repair

Final fresh Astra/max integration review reproduced an accepted legal move at
`t-1000` after a round started at`t`. The next saved-state read failed because
lastMoveAt preceded startedAt. Neutral departures had the analogous endedAt risk.
This was a concrete persistence defect, not a change to game preference or timing.

Parent added six regressions before the fix. The initial diagnostic contained a
mislabeled member-removal call; it was replaced with actual house.remove before
retaining the final six-failure RED. Tests cover moves and subsequent reads, Leave,
lounge departure, real member removal, backward-clock disconnect, repeated restart
and expiry at its exact boundary. The rules now validate raw time, then infer an
effective lower bound from existing round timestamps before all three maintenance/
action/event paths. No schema,90/60/300window, extra state or periodic write changes.

All70 affected pure/store/socket checks and typecheck pass. Contextual Astra
recheck independently passes all6 regressions plus the original read/maintenance/
unrelated-command reproduction. The common resource manifest is rebound to the
new rule bytes; native normal-flow records retain their original scope. Only the
coming resource attempts qualify their own measured source.

Rules SHA256: bdd02f77ab351a9856c10b2ec3bbc78562fc6042bdac2ad500a9aeabf2e8bedf.
