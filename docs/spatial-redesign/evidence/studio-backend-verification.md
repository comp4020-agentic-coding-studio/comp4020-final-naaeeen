# Room studio backend: implementation and verification

23 October 2026. Local backend scope only. Production sources are
`src/house-studio.ts` and `src/house-studio-codec.ts`; the wire/authority contract is
[STUDIO-API](../STUDIO-API.md). Parent owns HTTP, realtime admission, UI, export
download reachability, full checks and final independent review.

## Decision and acceptance before implementation

User outcome: an original owner can prepare one real image, save an inspection
position and a small ambient preset, return to them, and let permitted visitors
inspect that owner's material. No additional note or timer is required.

| Subsection | Alternatives and criterion | Decision | Actual verification |
| --- | --- | --- | --- |
| Durable authority | Existing house file with namespaced tables vs another database; preserve migrations, rows and one-volume operations. | Separate connection in the same file; own version metadata, unchanged HouseStore user_version. Parent callbacks run before synchronous studio BEGIN. | Real HouseStore/Studio connections; saved house snapshot/schema version unchanged; partial upload and selected material survive both connections closing/reopening. No nested HouseStore BEGIN. |
| Room audience and owner state | Embed material in a general snapshot vs dedicated authenticated access; reject current unauthorized reads/bytes and guest writes. | Dedicated current read callback for every state/image/execute; immutable original owner for writes/export. Required per-request live-control callback. | Open-door guest reads owner's PNG; closed door/member removal denies state/bytes; observer/wrong-room callbacks deny mutations/retries. Foreign room/current image ID cannot retrieve another image. |
| Upload integrity | Large JSON vs bounded chunks; magic/header-only checks vs bounded actual raster decode. Reject malformed data, keep old image until valid atomic replacement. | 8 KiB raw chunks within 16 KiB requests; static 8-bit RGB/RGBA PNG only. Check CRC/order/decompressed size/filter data; reconstruct pixels and re-encode without metadata. | Known pixel vectors exercise all five filters and all Paeth predictors. Reject bomb/excess raster, bad CRC, malformed chunks, animation, trailing compressed/input bytes, unsupported formats/dimensions and canonical output over 256 KiB. Existing selected material/revision survives invalid/incomplete commit. |
| Idempotency and failures | Forget old receipts vs retain IDs with bounded new admission. Commit data and receipt together. | Metadata-only receipt ≤512 bytes; exact accepted retry precedes revision conflict after current authorization. Retain IDs; reject fresh growth at cap. | Injected receipt-insert SQLite trigger rolls back state; same UUID succeeds after repair and replays after restart. Changed-payload UUID reuse fails. Count/byte cap retains old exact replay and prevents new state changes. |
| Bounded retained/staged content | Only bound active images vs include departed owners; bulk export vs pagination. Keep author material after departure without broadening current reads. | 8 MiB chosen PNG bytes per original owner across active+archived rooms; reject growth without removing old content. 2 uploads/actor, 12 global, 5-minute TTL. Export at most 2 rows/page, plus one-room export. | Near-cap valid normalized archived PNG fixtures reject further replacement; original current image remains. Global cap exercised across real house identities/houses; TTL releases slots. Pagination includes real bytes, has no duplicate/missing room and excludes other authors. Actual transfer/leave/restart preserves own export while current reads fail. |

The common acceptance criteria were meaningful saved output, current authorization,
no partial replacement, exact receipt retry, persistence and explicit resource
bounds. A technical contract comparison/failure tests resolved these choices;
no human preference or productivity result is inferred.

## Red, green and refinement

- Initial RED: the focused studio suite failed because the new module did not yet
  exist; [original output](studio-backend-red.txt) preserves it.
- First GREEN: 36 focused tests passed, with aggregate 85.85% branch coverage.
- Additional resource/pagination and known-pixel checks brought the suite to
  63 passing tests; the codec then had full measured coverage.
- Self-review discovered that Node ASCII decoding masks high-bit bytes in PNG
  chunk names. A CRC-valid malformed IDAT name was incorrectly normalized.
  The new targeted regression failed as expected: one failure, 21 cases excluded
  by its name filter, exit1 at02:52:15. Changed only chunk/header decoding to
  latin1 before the ASCII character check. This is self-review, not independent
  review. [Refinement record](studio-backend-refinement.json).
- Final affected run: **64/64 tests pass, zero skipped**, two files, **exit0**,
  2.38 seconds. [Actual output](studio-backend-green.txt),
  [source/coverage snapshot](studio-backend-checks.json).
  Aggregate: 100% lines/functions, 98.07% statements, 97.36% branches.
  Codec: 100% in each measured category. Store: 100% lines/functions,
  97.39% statements, 96.11% branches. These are the two new modules, not the app.

Command:

`mise exec -- pnpm exec vitest run --config vitest.house.config.ts spec/house-studio.test.ts spec/house-studio-codec.test.ts --coverage --coverage.include=src/house-studio.ts --coverage.include=src/house-studio-codec.ts --coverage.reportsDirectory=.local/studio-backend-coverage`

Runtime was canonical WSL Ubuntu/lizhi, Node24.21.0, pnpm11.9.0, Vitest/coverage5.0.3.
Actual SQLite persistence was exercised; no server/browser/service was started.
The [Node zlib primary source](https://github.com/nodejs/node/blob/main/doc/api/zlib.md)
documents bounded convenience output and info/engine metadata; the installed
runtime tests additionally reject unconsumed compressed bytes.

Typecheck was run during concurrent implementation. One own definite-assignment
error was corrected; the latest run has only another lane's temporary
`spec/house-gathering.test.ts:12` string/UUID Map mismatch. No overall typecheck
PASS is claimed here. Parent owns the integrated rerun.

## Remaining boundaries

Fresh independent review is centrally assigned by the parent; it was not yet
complete at this record. HTTP/controller/body-arrival tests, DOM/actual browser
Canvas/phone interaction, local audio opt-in/exit behavior, complete own-export
download UI and full resource workload are parent/integration scope. Domain
authorization tests do not establish those paths. No release, remote action,
human trial, physical phone or social-value acceptance is claimed.

Budget tests use valid normalized archived PNG fixtures inserted directly into
SQLite to reach the retained-byte limit without an unrelated 1,000-command setup;
departure/export itself uses actual HouseStore transitions. Receipt cap tests
likewise seed retained rows to exercise quota/rollback/retry, not lifetime load.

