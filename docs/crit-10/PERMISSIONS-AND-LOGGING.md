# Crit 10: authority, retained contributions and instruments

19 October 2026. Local candidate based on 6bbc4d2; not committed or released.
The owner requests no commit, push or deployment. See [acceptance](ACCEPTANCE.md).

## What a person means here

A server-issued cookie resolves to an opaque persistent identity. Display names
are mutable labels and may be identical. A recovery key restores credential
continuity; it does not establish a verified human or friendship. House codes
admit identities into 2–6 permanent places; offline residents still occupy them.
A removal guard applies to that identity, not every browser a person might use.

## What each identity may do, and why

| Object / operation | Server rule | Product reason / sacrifice |
| --- | --- | --- |
| Current house and shared board | Active members only, checked on reads, writes and live subscriptions. | Joint activity among invited peers; a known URL/UUID alone grants no shared access. |
| Bedroom and retained room chat | Owner, or another current member while its door is open. | The door controls visiting and retained room conversation. It is not a decoration permission. Opening exposes existing retained chat. |
| Bedroom configuration / furniture | Bedroom owner, current house and expected revision. | An open room remains personal; the host cannot redecorate someone else's room. |
| Study goal / next step / close | Card author, current house and expected revision. | A peer's help does not decide the author's intention or completion; quick corrections by others are unavailable. |
| Shared canvas / board chat | Current members co-edit the canvas and send house-wide chat. | Sustained joint work; canvas objects are not author-locked. |
| Membership / transfer / reinstatement | Current house owner; store validates target and transition. | Someone can manage a small invited group without gaining all personal-work rights. |
| Own board export / own uploaded assets | Authenticated identity can retrieve its filtered contributions after membership ends. | Exclusion from ongoing collaboration does not erase the stored record of earlier submissions. The archive is partial, potentially outdated and not exclusive authorship. |
| Game actions | Live controller token, generation, current zone and session; collision and seat rules remain server-side. | A background/old tab cannot silently control the returning person's avatar or send an old-room draft into another room. |

Existing enforcement is in `src/house-store.ts`, `src/house-realtime.ts` and
`src/board-service.ts`. No blanket current-membership check was inserted ahead of
own export: it would remove an intended capability. Positive controls matter as
much as forbidden requests. `spec/house-crit10-permissions.test.ts` exercises real
HTTP, SQLite and socket control leases, including otherwise-valid nonowner
administration and house-owner attempts against a peer's room and goals.

The personal-versus-shared distinction is explicit in
`spec/board-store.test.ts` and `spec/board-service.test.ts`: a guest submits x=12,
a peer moves the shared object, and the guest's export remains x=12. After removal,
shared snapshot is 403 while filtered own export is 200. These assertions prove
representation and access, not whether an exported fragment makes sense to users.
The normal reopen UI does not yet expose former-board retrieval; see
[the topic refinement](TOPIC-COMPARISON.md).

## Logging comparison and selected implementation

Common task: explain two participants' successful, denied and retried operations
from server output without reading their private notes or messages. Criteria:
authoritative attribution, correlation, bounded privacy exposure, action failure
isolation and maintenance. This is a qualitative technical comparison.

| Option | What it enables | Cost / reason |
| --- | --- | --- |
| Existing actor / action / outcome | Separates stable browser identities and broad actions. | Missing HTTP-denial coverage and interaction correlation; a repeated saved label can imply another write. |
| Structured allowlisted metadata | Adds valid command/house/zone IDs, receipt sequence, transport and server time; includes HTTP denials. | More boundary tests and pseudonymous activity linkage. Cannot reconstruct message meaning or every UI gesture. Selected. |
| Full request / content logging | Richer incident replay and readable text. | Duplicates private work and can capture credentials; unnecessary for the common task. Rejected. |

`src/activity-log.ts` is the central serializer. It accepts only a closed set of
fields; actor identity comes from the session, not a submitted identity header.
Messages, aliases, cookies, recovery proofs, controller tokens, body fields and
error prose are excluded. JSON encoding and bounded server labels prevent a value
from forging an extra event line. Unknown actors are null rather than guessed.

Accepted durable operations include the original command ID and receipt sequence.
A retry can therefore produce another accepted line with the same interaction
metadata without another mutation. “Accepted” deliberately does not claim
“newly applied”: a no-op may also share a sequence. Lounge stream IDs name houses;
bedroom stream IDs name rooms, and cannot be parsed as houses indiscriminately.
Synchronous log-sink failure is isolated from already-committed recovery/actions.
Logs are best-effort instruments outside the database transaction, not an atomic
financial audit or proof that a client read a message.

These choices follow the course's
[logging lecture](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-10/)
and [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html):
record attributable events and outcomes while excluding secrets and unnecessary
content. Stdout remains part of the running app beyond Crit 10; Fly collects it.
There is no new audit database or promise of indefinite platform retention.

## Verification and observed refinement

- Logger worker reproduced its contract failures, then passed 47 focused cases;
  that module alone measured 100% statement/line/function/branch coverage.
- Seven initial HTTP integration cases failed before adapters were added; all
  passed after implementation. A throwing console sink reproduced a real 503
  after a committed recovery action and is now isolated.
- Independent fresh code review found accepted house events lost house correlation:
  splitting a receipt at `:` selected the stream kind. Parent added failing HTTP
  and real socket assertions, then used stream-aware metadata. Nine integration
  cases passed; the reviewer independently reran them and TypeScript successfully.
- Permission worker and its independent reviewer passed seven new real-boundary
  cases. The initial complete required run passed 565 tests. The final current-source
  run passed 569 tests in 33 files, including the correlation and clock controls;
  see acceptance for the exact source-bound result.

Current hashes, browser results, resource exercise and final checks belong in the
acceptance/evidence record, rather than being inherited from last week's release.
