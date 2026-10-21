# Fresh-review refinement: retain the accepted room cursor

22 October 2026. This record follows the initial `work-projection.md` and its
immutable 65-test evidence. It supersedes that source's readiness/hash status,
without rewriting its RED, GREEN or coverage results.

## Finding and source check

The fresh Astra review found that `clear()` / `selectZone()` set displayed
`current` to null. The initial implementation retained access/controller/work
ordering but still read the room cursor from `current`. Consequently, after
bedroom sequence 9 / own-work 4, a same-epoch/access/controller envelope with
bedroom 8 / own-work 99 passed while the display was null, then poisoned work.
The parent and worker confirmed this against the actual reducer source.

`src/house-realtime.ts`'s `house.subscribe` obtains the requested snapshot and
assigns `context.accessGeneration = ++nextAccessGeneration` before returning
`project(context)`. Accepted transitions into another subscribed room therefore
have a newer access generation. A single latest accepted room stream/cursor,
retained alongside the existing authority, is sufficient for this correction;
an unbounded map of visited rooms is unnecessary. Different stream sequences
remain incomparable. The own-work high-water remains separately scoped to epoch,
identity and house as before.

## Reproduction before the fix

Five focused cases were added before production edits:

- Clear, same-zone reselect and an unacknowledged zone roundtrip each hide the
  display, then deliver the same-authority bedroom 8 / own-work 99 envelope.
- A mocked `createHouseClient` path starts a same-room subscription, injects the
  delayed `house.snapshot` before its ACK, then delivers the fresh access ACK.
- A positive control uses actual `bedroom:<roomId>` / `lounge:<houseId>` stream
  naming and successive server-issued access generations to leave/reenter a room.

The filtered RED command used `--maxWorkers=1` and exited 1: **4 failed, 1 passed,
65 excluded by the name filter**, 332 ms reported Vitest duration. The three null
reducer cases accepted the stale room; the transport case displayed its poison
projection. The cross-zone positive control already passed.

`work-projection-review-red.json` binds the pre-fix client/test hashes, command,
result and patch. `work-projection-review-red.patch` reconstructs that exact RED
source from `d95055b` and includes only the owned client/spec paths. The original
`work-projection-red*`, `work-projection-verification.json` and initial report were
left unchanged.

## Change and checks

The reducer now stores `roomStreamId` and `roomSequence` primitives whenever a
snapshot passes every guard. Clear/selection preserve them while still emitting
null. Same-epoch, same-access stale room envelopes compare against those
primitives before any authority/own-work change. Revocation resets the retained
room cursor; a subsequently accepted epoch/scope/access updates it as usual.
No per-room map, private storage write, UI, outgoing command or retry change was
added.

The full focused client file then passed **70/70**, zero skipped, exit 0:

```text
mise exec -- pnpm exec vitest run --config vitest.house.config.ts spec/house-client.test.ts --maxWorkers=1
```

Vitest reported 678 ms total / 337 ms test body. The new cases verify rejection
leaves the display null and cannot block the later legitimate work sequence 5.
Existing lifecycle, stale epoch/access/controller, identity/house, revocation,
observer, outbox and movement tests still pass. `git diff --check` passed.

Only authorized bounded logic checks ran while the camera native timing lane was
active, with one worker. No test duration is treated as a performance comparison.
No coverage, broader suite, browser or workload was run in this refinement. The
prior 97.70% line / 89.09% branch measurement belongs only to the earlier client
hash, not to this newly changed source.

Frozen hashes and results are in `work-projection-review-refinement.json`. Parent
contextual review recheck is pending. UI/server delivery, native two-user/viewports,
required broader checks and human/physical-device acceptance remain open. No
commit/push/service action was made by this worker.
