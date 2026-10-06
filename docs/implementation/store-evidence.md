# Durable house authority evidence

6 October 2026. Local implementation evidence for src/house-store.ts and
spec/house-store.test.ts. This record concerns SQLite authority; HTTP/realtime,
browser usability, physical-phone performance and deployed resource tests belong
to the parent integration evidence.

## Implementation and boundary

The authority uses the existing Linux Node 24.21.0 built-in SQLite binding, through
mise and pnpm 11.9.0. House state is an additive house.sqlite schema. The legacy
neighbourhood.sqlite code and schema were not edited. A test writes sentinel legacy
bytes next to the new database and confirms they survive creation and restart.

Opaque 32-byte session and recovery proofs are persisted as SHA-256 digests.
Recovery is one-use, replaces all previous sessions, and returns the existing
stable UUID without claiming another permanent membership slot. Reissuing a proof
invalidates the previous proof. Failed replacement-session persistence rolls the
entire recovery transaction back, keeping the original session and proof usable.

BEGIN IMMEDIATE serialises capacity checks, slot allocation, changes and receipts.
A command acknowledgement is returned only after COMMIT. Receipts retain actor,
normalised command UUID, canonical payload hash, result identifiers and cursor
metadata; they contain no chat or card text. Replaying a private-room receipt
rechecks current bedroom access. Command UUID case and JSON property order do not
repeat effects; changed payloads under the same actor/UUID are rejected.

New house-scoped commands carry the house UUID captured when the intent is
created. A queued action for a departed house cannot be redirected to a new house.
Create/join/profile bootstrap actions are separately validated. The server transport
must resolve identity from its house session rather than accept body-supplied actors.

Closed bedrooms default owner-only. Open rooms admit current same-house residents.
Room edits require the room owner and current revision. Shared residents expose
door ownership/open state, without private bedroom revision or placement data.
Private placement/palette edits advance only the bedroom cursor. Door transitions
also advance the lounge cursor. Geometry uses the shared public/house-geometry.js
validator rather than a second collision catalogue.

Capacity counts permanent active members, including offline residents. Leaving as
owner requires transfer when another member remains. Last departure disables the
code and archives the house. Removal archives the departed room/card contribution,
rotates the code and blocks that stable identity until explicit reinstatement.
Rejoining receives a fresh bedroom; private archives remain tied to the original
identity. Export contains only the actor's profile, own active room/cards and own
departure archives, excluding other residents' private content and card text.

Chat retains the newest 100 messages per zone for at most seven days. The parent
assigned the 100-message implementation bound, superseding the earlier suggested
200-message/paging policy. Snapshots filter expired rows without mutating them;
startup and writes prune expired data. Chat/card text is plain text, Unicode
codepoint bounds are tested, and resource links accept HTTPS without credentials
or remote fetching. The UI must disclose actual retention before posting.

Cards allow one active card per member. Saving a next step remains active.
Author-requested close and departure ownerLeft states are distinct. The newest
12 inactive cards are selected by persisted inactivity sequence and UUID order;
active steps are never quota-evicted. Departure captures the original identity's
room/card snapshot before inactive trimming.

## Red, green and review

The initial nine behavioural tests failed with the explicit NOT_IMPLEMENTED
authority stub. The implemented authority then passed all nine real-SQLite tests.
An initial CLI attempt used unsupported Vitest --include; it failed before running
tests and was replaced with an isolated temporary configuration. Temporary config
files are recreated per WSL execution because this bridge's /tmp state is ephemeral.

Further failing regressions reproduced differently cased UUID double application,
expired chat visibility, private revision leakage, insecure resource acceptance
and queued former-house text reaching another house. Fixes made those cases pass.
The stale-house regression was rerun after the parser accepted the new houseId
field, so its recorded failure represented the incorrect effect rather than an
unsupported-field fixture.

A fresh read-only reviewer independently reproduced the queued-house, expiry and
private-cursor defects. After reconciliation, the reviewer used separate in-memory
SQLite assertions for house scope, private cursor/projection isolation, expiry,
UUID replay and HTTPS policy, and reported no remaining actionable issue. The
reviewer did not claim browser verification or simultaneous contention.

Final affected verification at 23:29 Sydney on 6 October:

- 19 house-store tests passed, real temporary on-disk SQLite, 1.33 seconds total.
- V8 coverage scoped only to src/house-store.ts: statements 94.65%, branches 92.73%,
  functions 100%, lines 98.86%.
- Whole current repository pnpm typecheck passed.
- git diff --check passed.
- Deterministic RNG fault injection confirms invitation collision retry and
  bounded failure leave no partial house or profile update.
- SQL trigger fault injection confirms state/receipt rollback and recovery rollback.
- Two independent connections to the same database exercise the final-slot guard
  sequentially. Actual simultaneous process contention is not established.

The isolated config contains test.include for spec/house-store.test.ts, no app
global setup, coverage.provider v8, coverage.include src/house-store.ts and text
reporting. It is run with mise exec -- pnpm exec vitest run --config
/tmp/house-store-vitest.config.mts --configLoader native --coverage. Required parent
integration still runs the repository's normal pnpm check and check:evidence.

No commits, pushes, publication, deployment or memory edits were performed by this
worker. Human value trials, actual devices, production L1/L2 load, backup restoration
and migration of intentionally linked legacy data remain unverified.
