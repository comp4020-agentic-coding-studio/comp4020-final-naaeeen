# Physical-seat arrival handoff: scoped repair and review packet

23 October 2026. The client/spec candidate is frozen for fresh independent review.
This is a local implementation checkpoint, not native-browser, live-server,
resource, human-use or release acceptance. World, UI and server source hashes
remain unchanged from entry; the source-freeze JSON records exact identities.

## Behavior and implementation

A physical chair claim now establishes one scope-bound client latch before the
seat request is emitted. Move keeps its existing false/ineligible return through
the claim and accepted-ACK/projection gap; authoritatively seated clients also
cannot emit movement. Canceling the UI's panel-opening choice does not cancel the
physical claim. No pose is reconstructed from an ACK.

The latch follows server epoch, identity, house, controller/access generations,
stream, zone and connection. A definite rejection releases only its matching
claim and preserves the original error. Accepted claims settle when current self
seatGeneration advances, including a chair removed/released before its first
seated projection. An old standing generation cannot settle the request. The
accepted claim and the advanced head may arrive in either order.

An ambiguous reply stays safe and reports the actual visible recovery labels:
Options -> Return to title -> Continue saved home. The actual UI fixture follows
that explicit route and resumes walking after the new authoritative subscription.
No automatic subscribe, seat replay, sleep or server permission change is added.
Explicit Stand remains callable; its successful ACK establishes a local accepted-
head receipt barrier, and a subsequent current unseated head can resolve the
unknown claim. An unavailable Stand/head preserves the recovery choice.

A preclaim motion receipt can outlive a claim and release whose intermediate sit
head was never delivered. If its self seatGeneration has changed while the broader
motion authority scope stayed current, that receipt settles as an ordinary failed
motion with the current authoritative anchor. It cannot overwrite that anchor or
return stale:true to strand World's otherwise current flight. Existing stale
receipts after other lifecycle changes retain their prior behavior.

## Requirement, evidence, refinement and verification

| Requirement or finding | Evidence before correction | Decision/refinement | Current verification |
| --- | --- | --- | --- |
| No move after a seat commits while projection still says standing | Original native RED retained separately; actual UI/World/client Places -> study reproducer failed on exactly one ordinary post-seat move with unchanged client | Client latch before Seat emission; known seated move guard | Actual module ACK-before-head and head-before-ACK cases pass |
| Panel cancellation and ordinary controls remain usable | Actual held walking input while projection is withheld | Keep physical handoff independent of UI panel choice; return false/busy through the gap | Held input -> Stand -> standing head -> movement passes; no canceled panel reopening; ordinary disabled-tool idle stop and typing/IME pass |
| Unknown claims have a safe visible recovery | Missing seat ACK through the actual client ask path | Preserve PENDING and name existing explicit title/re-entry controls | Actual Options/title/re-entry/walk flow passes; one claim and no automatic subscription/replay |
| Existing room-edit chair removal must not silently lock a known accepted claimant | Parent finding; both ACK/head orders failed against the first latch candidate because Move returned false | Accept advanced authoritative self seatGeneration after known ACK, whether seated or released | Both controlled release orders pass; queued old standing-generation controls remain green |
| A late preclaim move must not overwrite released authority | New focused RED returned old success/position after accepted claim and released head | Seat-generation-aware ordinary failed receipt with current anchor; preserve other lifecycle stale handling | Late move, subsequent rejected move recovery and subsequent valid movement pass |
| Scope replacement must retire only old physical intent | Controlled epoch/house/identity/control/access/zone/connection changes with old completion after a new claim | Match the per-claim object and current authority scope | Seven late ACK cases, late rejection, close, unknown late facts and unavailable recovery controls pass |

The new spec contains 24 cases: six import the actual UI, World and client, with
only WebGLRenderer, socket and HTTP boundaries replaced and a manual DOM RAF clock;
the others isolate actual client callback/authority behavior. Production Node's
performance clock is not patched. Fixtures retain only dummy data in memory.
The release and late-receipt controls are transport-level authoritative-head
fixtures; they do not claim a native DIY browser flow or real server geometry run.

## Checks and measured scope

The final focused run passes all 346 tests across four files: existing client 79,
existing UI 138, existing World 105 and new handoff 24. The actual process exit is
0. Typecheck also exits 0. No tests are skipped in that final run. The tracked
client diff check is clean; both live files are canonical LF with no trailing
whitespace. Existing client/UI/World tests were not edited.

Whole-client V8 coverage is 81.13% lines, 77.69% statements, 81.81% functions and
66.23% branches. The whole-module statement/branch gaps remain; this is not a claim
of 80% across all whole-module measures. An explicit mapping from added diff lines
to Istanbul source starts measures the patch scope at 32/33 executable line
starts, 58/59 statements, 44/46 mapped branch alternatives and 16/17 function
declarations. There are 154 unmapped branch alternatives across the module; they
are not attributed to this patch. The coverage JSON records method, exact source
lines, original local coverage path/hash and whole-module totals.

Preserved intermediate records include the original one-case deterministic RED,
the first expanded fixture failure (old ownWork stream during a house change), its
coherent-fixture correction, the initial optional-arrivals typecheck failure, both
release-regression RED cases and the late-motion RED. Preimage/RED source artifacts
retain their original bytes. Commands, exits and historical scopes are recorded
in seat-arrival-verification.json; raw logs and coverage remain ignored locally.

## Remaining gates

Fresh independent source/test review and parent reconciliation are pending.
Full required checks, the identical maintained native case on a new integrated
freeze and full resource qualification remain parent-owned. No browser, service,
resource workload, remote push or deployment was launched by this worker.
