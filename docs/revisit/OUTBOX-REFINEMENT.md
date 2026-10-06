# Pending-command recovery refinement

7 October 2026, Sydney. Responsible worker: outbox_revisit_fixes. This revisits
existing S1 behaviour and records new checks and repairs; it does not rewrite the
original implementation as if these checks had already existed. Parent owns the
register, integration, final browser verification and milestone commit.

## Requirement and candidate

S1.I2d requires a person to recover uncertain chat/save acknowledgements without
changing the captured UUID, payload, identity, house or zone. S1.I5a requires visible
uncertainty and safe admission/return feedback, including the lobby. The existing
queue retains up to 16 entries and 32 KiB globally in this tab's sessionStorage.
Automatic retry stops after 24 hours. Expired or inaccessible entries must remain
inspectable and explicitly discardable rather than consume the quota permanently.
Discarding a local draft does not undo an action already committed on the server.

The baseline is HEAD `1c44cb7adc09bddd7952f9e068799e03d21c7d38` plus dirty files.
First refinement client SHA-256: `1557b5057c3a3ca8ce789cc65a35dcc5484e587c333f7e8f609bb542d2506af1`.
First refinement test SHA-256: `96ef7faab6530ef472d7132880c599a0242f6d3e12d5d5009f108f300b43cd7e`.
Only public/house-client.js, spec/house-client.test.ts and this evidence document
are owned by this worker. UI/world/backend/operations work is preserved. The checks
use the Windows-to-WSL bridge, Ubuntu/lizhi, the existing repository and Linux
mise's Node v24.21.0 / pnpm 11.9.0. No server, release or load criterion was changed.

Required guidance was loaded at entry: AGENTS, CLAUDE, PLAN, ACTIVE-TASK,
CURRENT-HANDOFF, HARNESS-AUDIT, the owner harness addendum, active REPORT and
CHECKPOINT-TEMPLATE, and RESEARCH, REQUIREMENTS-AUDIT, COMPARISON-AND-REVIEW and
EVIDENCE-AND-WRITING. REPORT sections 3, 5 and 6 and the evidence method were reopened
when red tests/reviewer findings changed the candidate and at verification exit.

## Alternatives, method and acceptance

Automatic expiry eviction would free quota by silently losing an uncertain intent.
Recreating it with another UUID could duplicate a server action whose reply was
lost. Increasing the limits would defer the problem and weaken the bound. The
selected correction is an identity-scoped inspection/export surface, explicit
local discard and manual retry of the original entry after inspection. Foreign
entries expose only a count; restoring their original identity is necessary to
inspect/export them. Explicit redacted bulk discard can free their quota.

This is a focused correctness comparison against the same storage/transport
fixtures, followed by fresh source review. No new agent-harness A/B or human A/B
experiment was run. The decision is governed by checkable receipt, quota, privacy
and cancellation invariants; participant preference could inform the panel but
cannot establish those invariants.

Acceptance was defined in the assigned task and tests before the corresponding
repairs: reconstruct 16 expired entries; stop automatic expired resend; inspect
and export only current-identity commands; free quota after explicit discard;
reject foreign/cross-house/cross-zone/uncontrolled retries; preserve the exact
original payload and UUID; serialize concurrent retries; prevent a discarded or
newly expired queued entry from being sent; require durable storage before a new
intent is sent; preserve uncertainty after native timeout/abort; and reject invalid
or oversized stored data without silently replacing it. Stop this lane when these
checks pass, substantive review findings are corrected and APIs are stable.

## API and lifecycle

createHouseClient and createPendingInspector expose the same recovery methods:

- getPending() returns plain `{entries, otherIdentityCount, total}`. Each own row has
  commandId, type, createdAt, houseId (or null), zoneId, state (pending/expired), the
  original command and canRetry. It resolves the current identity from /me even
  with no home or socket. Foreign payloads, UUIDs and identity IDs are omitted.
- exportPending() returns the own rows as a JSON-serializable array.
- retryPending(commandId) reloads the stored original rather than accepting an
  editable/new intent. An expired entry requires preceding inspection in that
  identity. A house-bound command requires a connected authorized controller in
  its original house/zone. Lobby create/join/profile commands use the original
  captured command through HTTP without a socket.
- discardPending(commandId) removes only that identity's local draft; an in-flight
  send cannot be discarded. discardOtherIdentities() explicitly removes redacted
  foreign local entries, also refusing in-flight sends. Neither calls the server.
- inspector.command(intent) persists a new lobby intent before HTTP submission.
  An expired original cannot bypass inspection through the ordinary command API.

All operations reread storage to prevent a lobby inspector/live client from
mutating stale copies. Returned commands are copies; caller/panel edits cannot
change the stored intent. Clients sharing storage share the in-flight guard.
Each automatic queue step rereads presence, age and current authorized scope after
an earlier acknowledgement. Storage restoration checks raw UTF-8 bytes, entry
count, command bounds/UUID uniqueness, metadata, and house/chat-zone consistency.
Corrupted raw storage is retained and operations report OUTBOX_CORRUPT. Unavailable
storage refuses new durable sends rather than allowing a UUID to vanish on reload.

Native transport exceptions, including DOMException TimeoutError/AbortError with
numeric codes, become PENDING and retain the captured entry. Only locally created
domain errors represent confirmed responses. A successful server acknowledgement
remains saved if local cleanup fails; the caller receives the saved receipt plus
a STORAGE_UNAVAILABLE warning, with the stale local copy available for later
explicit discard. Existing reducer epoch/access/control fences, takeover, denied
room fallback, reconnection token and private-state clearing remain intact.

## Observed red, green and refinement

The command prefix below is `wsl.exe --distribution Ubuntu --user lizhi --cd
/home/lizhi/comp4020/comp4020-final-naaeeen --exec`. Test execution uses
`/home/lizhi/.local/bin/mise exec -- pnpm exec vitest run --config
vitest.house.config.ts spec/house-client.test.ts`.

| Check | Observed result |
| --- | --- |
| First direct `--exec mise` invocation | INFRASTRUCTURE FAILURE: mise absent from the non-login PATH. Resolved the existing /home/lizhi/.local/bin/mise; no tool installed. |
| Initial recovery regressions against old client | FAIL: 7 failed / 12 passed (19 total). Missing inspector/retry APIs, corruption silently reset and stale instances reproduced. |
| First implementation | PASS: 19/19. |
| Additional expiry/ACK-cleanup/chat-zone checks before refinement | FAIL: 3 failed / 20 passed (23 total). |
| Refined implementation | PASS: 23/23; complete project typecheck passed after UI owner corrected its fixture type. |
| Fresh reviewer queue/storage repros, then authored regressions | FAIL: 3 failed / 23 passed (26 total): discarded queued copy sent, queued entry sent beyond 24 hours, inaccessible sessionStorage still sent. |
| Native timeout regression before error refinement | FAIL: 1 failed / 26 deliberately filtered tests. TimeoutError's numeric code was misclassified and the original pending UUID removed. |
| Revised candidate reviewed by the original reviewer | PASS: 27/27 independently rerun; no remaining actionable defects in the contextual recheck. |
| Shared inspector/live-client guard regression | PASS; verifies own discard and redacted foreign bulk discard both reject a shared in-flight send. |
| First refinement final affected client test/coverage command | PASS: 28/28, exit 0; no skipped tests in this final run. |
| First refinement coverage scope | public/house-client.js only: 98.14% lines, 88.37% statements, 84.56% branches, 92.10% functions. Artifact .local/outbox-coverage/coverage-summary.json. |
| Final full project pnpm typecheck | PASS, exit 0 after the world-owned imported module existed. |
| git diff --check | PASS, exit 0. |

The final coverage command added `--coverage --coverage.include=public/house-client.js
--coverage.reportsDirectory=.local/outbox-coverage`. It does not measure the server,
SQLite, renderer or native panel. No private payloads, session tokens or credential
files are included in this evidence.

## Independent review and remaining integration

A fresh read-only reviewer was spawned with fork_turns none, current requirements,
source/check scope and rubric, without parent discussion or earlier verdicts.
The reviewer independently reproduced queued discard, queued expiry, absent
sessionStorage and native DOMException error classification. The worker reproduced
all four with red tests and corrected them. The same reviewer completed a contextual
recheck of the revised client and independently ran 27/27 tests and diff --check.
No remaining actionable defects were found. This correction pass is not another
independent experiment. A subsequent test-only change exercises simultaneous
inspector/live-client in-flight discard protection; the final 28/28 run passes.

Client APIs are integrated by the separate UI worker. Native panel/browser
verification, full project checks and parent register reconciliation remain
parent-owned. An intermediate full typecheck temporarily failed because the world worker's new
test imported house-label-layout.js before that module was present; no client/API
type errors were reported. The final required typecheck was rerun once that module
existed and passed with exit 0.
Corrupt storage is deliberately preserved; recovery of untrusted malformed raw
entries is not an automatic migration/reset. Server receipt expiry/garbage
collection is unchanged. Human value, physical-device/IME behaviour, production
recovery and deployment are NOT RUN by this worker. No commit or push was made.

Next action: parent native-browser integration, subsection register reconciliation
and the actual milestone commit. The three owned files and hashes are ready for
parent inspection. Do not promote client mock coverage into deployed/real-browser
or human evidence.


## Identity-epoch follow-up

A later parent review found an additional S1.I2d/S1.I5a failure: a lobby command
started under identity A could await /me, then continue after recovery changed the
cookie to B. The HTTP endpoint authenticates the current cookie, so the old command
could otherwise execute under B and clear A's local UUID. Closing the old inspector
while that identity lookup was pending also failed to stop the eventual POST.
This supersedes the earlier review's completeness limit; the first refinement's
28-test result remains historical evidence, not final acceptance of this path.

The follow-up reopened AGENTS/CLAUDE, active REPORT sections 3/5/6, the checkpoint
template and applicable requirements/evidence methods. Parent owns the server
identity precondition and UI worker owns invalidating/recreating inspector and
client at every identity epoch, including lobby-to-lobby changes. This worker
changed only the client, its tests and this evidence record.

The selected correction combines immutable intended identity and asynchronous
lifecycle fences. A UI-only guard cannot protect an HTTP request already sent;
a header alone cannot stop a closed inspector from exposing an old inspection
result. createHouseClient/createPendingInspector now accept optional
expectedIdentityId; the native UI passes its captured me.identity.id. A fetched
actor differing from that identity reports IDENTITY_CHANGED before exposing or
mutating another identity's pending rows. Without an explicitly captured actor,
the original /me actor is still attached to the stored command and HTTP request.

Lobby POSTs include X-House-Identity equal to the entry's immutable identityId.
The parent-owned server compares it to the current cookie actor as a precondition;
the header never grants identity or authority. Client handling preserves the
original entry on IDENTITY_CHANGED, CLOSED and stale-request rejection. It never
rewrites that entry as B's intent. This record does not claim a mocked HTTP reply
verifies the real endpoint's enforcement.

Every pending lookup/save/retry/discard/export captures the request generation and
checks closure/generation again after awaited identity work. HTTP sends recheck
before interpreting the response, after response JSON and before clearing the
outbox. Shared in-flight callers and exported inspection results also check their
own lifecycle before returning. A saved action's late ACK after closure leaves the
original local UUID available for same-command receipt reconciliation.

Acceptance cases were authored before this repair: no POST after close during
/me; original actor header after stale /me A with cookie B; retention on server
IDENTITY_CHANGED; rejection of captured-actor mismatch during inspection/bulk
discard; no delayed inspection/export/discard after close. The unchanged client
failed all four initial grouped tests: 4 failed / 28 passed (32 total). After the
repair, 32/32 passed. Three further checks cover close after POST before ACK,
expired manual retry's exact original actor/command, and newer room subscription
invalidating an outstanding inspection. The final suite is 35/35 PASS, exit 0.
Full pnpm typecheck and git diff --check also PASS, exit 0.

Final client SHA-256:
`9a09c6959cdf68974b0c79cfcf2845fd87ee8815b62964a9c46e4299169705f0`.
Final test SHA-256:
`36927425513895269f32783d5178d5002ba8e9769bab61fe0cb1883f0b2566d1`.
The same client-only V8 coverage command records 98.23% lines, 90.47% statements,
86.26% branches and 92.30% functions at .local/outbox-coverage/coverage-summary.json.
These percentages do not measure server/UI/browser enforcement.

Attempting to restart the original reviewer for a contextual correction pass
returned the collaboration infrastructure error "agent thread limit reached".
The parent was informed and asked to include this exact client candidate in its
active review. Follow-up independent/integrated review is therefore pending parent
reconciliation. No reviewer approval is invented. Real server cookie switching,
native recovery/fault/reload and UI identity-epoch behaviour remain parent-owned
integration checks. No commit, push, global configuration or unrelated file change
was made by this worker.


## Native recovery diagnosis and namespace admission refinement

The parent added tests/e2e/house-lifecycle.spec.ts. Its first invocation against
shared development port 4093 failed with the recovered page showing Reconnecting.
Another Playwright job cleared the shared default output directory, so the original
network/trace evidence is unavailable. That invocation remains failed; its exact
cause is UNCONFIRMED. Concurrent connection-limit contention is only a hypothesis.
The client source must not be patched to fit that hypothesis.

The parent reran against an isolated actual service on 4094 with separate output
.local/lifecycle-browser-isolated. That native run passed recovery, original
identity/home equality, saved-next-step return and old-controller/proof purge;
it then failed at a different phone observer takeover target, covered by the new
Recenter button. It is not a full lifecycle PASS. UI owns that confirmed geometry
repair. This worker inspected only sanitized endpoint/status/timing records from
the preserved trace: /recover and post-recovery /me returned 200, and subsequent
WebSocket upgrades returned 101. No proof, cookie, session token, request body or
private draft was printed. No extra browser fixture was run on the busy service.

The read-only source trace separates identity establishment from connection:
recovery rotates the actor's sessions, revokeIdentity disconnects its old contexts,
then the response sets the recovered cookie; UI invalidates the previous client
and inspector before /me bootstrap; the new client subscribes to the lounge.
createHouseClient.connect does not fetch /me, so its injected fetchMe callback
cannot directly establish an old cookie during Socket.IO connection. Admission
middleware can reject UNAUTHENTICATED, LOAD_LIMIT (12 views) or TAB_LIMIT (2 views
per identity). Socket.IO 4.8.4's installed socket.js lines 502-506 constructs
connect_error as an Error with server metadata in error.data; it destroys the
inactive namespace rather than automatically retrying it.

A separate read-only experiment confirmed a real callback classification gap:
error.data.code=UNAUTHENTICATED rejected connect(), but the forwarded error.code
was absent, so the actual UI membership-refresh code branch was false. A matched
direct-code control made that branch true. This is evidence of the error contract,
not evidence that UNAUTHENTICATED caused the original 4093 failure. The parent then
authorized the bounded client repair. User-required evidence-driven-work skill
was loaded for this subsection, alongside the project's recurring methods.

The alternatives were teaching every caller Socket.IO's nested data format or
normalizing the client callback to its existing code/message contract. Normalizing
at the transport boundary preserves the original Error.message and lets native
UI distinguish authentication loss from connection/tab limits. It does not grant
identity from a body/header, change cookie authority, restart namespaces or add
an automatic retry loop. Closed clients ignore late connect_error callbacks.
UI owns the accessible blocked-status/message for LOAD_LIMIT/TAB_LIMIT and the
instruction to close an unused window or reload deliberately.

The regression covers the actual three admission codes and checks callback plus
connect() rejection, original message and one connect attempt. Before repair:
1 failed / 35 passed. After repair: client 36/36 PASS; combined affected client/UI
suite 71/71 PASS (36 client + 35 UI), full pnpm typecheck and git diff --check PASS.
The test uses an injected transport, not live admission pressure. No sustained
load, backend byte, automatic-retry policy or public release was changed.

Current client SHA-256:
`fa80759780442fe69c8fabd0befb17b2fcede8634e2c761490d480183273e70b`.
Current test SHA-256:
`ab9af4ecbc7871b43abed00f2eaca29bca7c1cb076b1abeddbfa3cfe4d6941ca`.
The previously recorded 35-test coverage is historical for the previous hash;
coverage was not rerun merely to inflate a passing count for this bounded delta.
Independent review of this final transport delta remains with the parent's active
review lane; this worker's source/installed-library experiment and test checks
are actual verification, not a fresh reviewer verdict. The original failed native
invocation is retained in this narrative with the artifact-loss limitation.
