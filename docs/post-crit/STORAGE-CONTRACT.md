# Receipt storage improvement contract

22 October 2026. Reviewed implementation contract; see the review refinements below.
Baseline: board schema 1 at ff949bc; current code uses Node 24.21.0 and SQLite
3.53.4. This continues feedback item 8. It does not change the 256 MiB Fly shape.

## Problem and invariant

The completed heavy workload retains 170,744,820 bytes of board receipt responses.
They are the authoritative results for touched objects, not copies of the whole
scene. Repeated updates retain repetitive JSON. The original command ID/hash and
exact accepted response support retries after newer edits or chat expiry. Personal
contributions are a separate author's submitted winner per object, not a complete
revision history. Keep both contracts and existing export authorization.

Parent checked BoardStore.mutate/patch and BOARD_LIMITS directly. The read-only
researcher reproduced aggregate sizes in the closed synthetic database and tried
66 deterministic sample receipts (1,502,969 raw bytes). Three passes round-tripped
all samples. Gzip level 1 produced 40,290 bytes, level 6 produced 34,578, and Brotli
quality 4 produced 28,989. These are provisional diagnostic reports pending a
reproducible artifact, not a representative-user ratio or codec speed ranking.
Fixed-order timings and shared process RSS cannot establish comparative CPU/RAM.

## Alternatives and proposed choice

| Alternative | Preservation and cost | Decision |
| --- | --- | --- |
| Lossless individually encoded responses | Exact replay, small helper, no new dependency; bounded codec CPU/RAM | First candidate |
| Immutable references or delta chains | Must retain historical winners, integrity and reconstruction metadata | Greater migration/recovery work than this measured problem requires |
| Receipt expiry | Needs a new consumed-ID and late-retry contract | Do not silently delete accepted intent |
| Admission quota | Preserves past data but eventually refuses new saves; needs volume and backup reserve accounting | Separate lifetime policy, not disguised as compression |

Use built-in gzip level 1 as the initial candidate, with raw JSON fallback whenever
encoding plus its format header is not smaller than the raw TEXT bytes in the
actual SQLite encoding (UTF-8 or UTF-16). The aim is lower repeated-write
storage while retaining cheap decoding and exact public receipts. Codec choice is
conditional on unchanged sustained resource gates; the sample alone does not
select a universally fastest algorithm. The installed Node 24.21.0 probe confirms strict trailing-data handling also
rejects additional gzip members. Use that option, ordinary Z_FINISH and bounded
output; no custom gzip parser or format switch is needed.

## Persistence and compatibility

- New databases are created directly at board DB schema 2; public wire schema stays 1.
- Existing non-STRICT TEXT-affinity response column can store a versioned BLOB.
  Preserve legacy TEXT rows; one decoder handles legacy and new records.
- New records use an unambiguous local magic/version header and bounded compressed
  payload. Query storage type/length before fetching response bytes so an oversized
  corrupt BLOB is not first allocated in JavaScript. Check hash before decoding.
  Reject unsupported storage types/tags; validate UTF-8 without substitution and
  the receipt envelope (ok, original ID/house, sequence and expected payload kind),
  not JSON syntax alone. Do not normalize or regenerate historical content.
- Freeze the storage-format decoded ceiling at 2 MiB + 256 bytes. The current
  patch envelope adds at most 144 bytes; chat/asset receipts are smaller. A later
  product-quota reduction must not invalidate older retained receipts. The 128 KiB input-patch limit is insufficient: a small
  losing patch can receive many large authoritative winners.
- Check command hash before decoding; reuse with a changed command still returns
  ID_REUSED. Commit state, cursor and encoded receipt in the same transaction.
- Reject corrupt, truncated, unknown-version and oversized encoded responses as
  STORAGE_UNAVAILABLE without new effects. Do not turn a decode failure into a
  fresh command or silently regenerate its response from current state.
- Opening v1 upgrades only schema metadata transactionally, after validating the
  required columns/key structure and canonical non-STRICT receipt table. Compare
  the known receipt CREATE TABLE definition with only ASCII whitespace/case
  normalization; reject added CHECK constraints, persistent receipt triggers and
  explicit indexes. The ancillary-object lookup uses SQLite NOCASE identifier
  comparison. Keep the implicit primary-key index. This supports the application's
  actual schema, not arbitrary customized databases. It must not rewrite old
  receipts, run VACUUM or delete anything.
  Reopening v2 is idempotent; future versions fail closed. Malformed v1 keeps its
  original metadata on rejection. Old binaries reject v2 when opening; a future
  authorized release must stop/drain old processes before starting the new binary.
- Rollback must preserve writes after migration: use a v2-aware binary or a separately
  validated full decode/export. An older backup is not a lossless binary rollback.
  No live maintenance or deployment is authorized here.

Primary API checks: [Node 24.21 zlib](https://nodejs.org/download/release/v24.21.0/docs/api/zlib.html)
provides bounded output and trailing-garbage handling; inspect actual codec semantics
and test them. [SQLite typing](https://sqlite.org/datatype3.html) permits BLOB in this
non-STRICT column. Existing database files do not automatically shrink when values
are replaced; freed-page reuse and file repacking are different operations.

## Red tests, review and acceptance

First demonstrate failing cases against the old representation. Cover stored-size
reduction, exact original duplicate/restarted replay after later peer edits and
chat expiry, unchanged authored export, large losing-patch responses, mixed TEXT/
BLOB reads, schema migration and unsupported versions, UTF-8/UTF-16 quotas,
low-compression fallback, corrupt/unknown/oversized input, and transactional rollback
if receipt insertion fails. Preserve positive legacy cases alongside denials.

Fresh review checks authority, representation, bounds and migrations; parent
reproduces findings. Run affected existing store/service tests and current required
checks. A real two-browser board task must still edit, replay and export correctly.

Before sustained testing, freeze source/protocol. Preserve every original 300-second
workload gate and register disk criteria separately. Prospective target for the same
synthetic repeated-edit workload: retained receipt response-byte increase <=16 MiB
and no decoded receipt differences, with all original input/visibility/RSS gates
passing. This is a provisional engineering growth target (about 9.8% of the observed
170,744,820-byte baseline), not evidence of spare volume or reduced billing. Include
tags and actual raw-fallback storage bytes. Compare each accepted response with its
decoded persisted response by actor/command, or use a frozen deterministic corpus;
separate timed runs have different UUIDs and timestamps. Also report main/WAL/SHM logical and allocated
bytes, event-loop data and actual sampled RSS. Do not silently substitute logical
payload for occupied disk or infer a lifetime cap.

Stop this slice when exact replay/export and scoped native checks pass, independent
findings are resolved, and the unchanged sustained gates plus prospective receipt
byte target pass. If the codec regresses responsiveness/RAM, retain the failed
candidate and compare level/format or an asynchronous transaction design before
relaxing any criterion. Record long-term admission/retention as an explicit separate
policy decision; no mathematical lifetime bound is claimed from compression.

## Independent review and parent reconciliation

A fresh Astra/max reviewer inspected actual store/service/client contracts and ran
bounded in-memory probes. It approved this minimal slice after the above refinements.
It found that UTF-8-only fallback comparison can increase storage in UTF-16 databases,
and that valid JSON null is not a valid receipt. A tiny losing patch also returned
roughly 2 MiB of existing winners, confirming the input limit cannot be the decode
limit. These findings change implementation criteria before production work.

Parent independently reproduced the encoding counterexample: 12,282 UTF-8 bytes,
8,564 stored UTF-16 bytes, 8,982 gzip bytes. The same probe confirms an extra gzip
member is rejected on installed Node 24.21.0. See
[evidence](evidence/storage-review-parent-probe.json). No persistent data or service
was modified. This is technical review and a discriminating runtime probe, not
sustained compression acceptance. Whole-workload verification remains pending.

Backfill, a lifetime admission/retention quota and repacking remain separate policies.
The inspected production snapshot is small; the large receipt database is a synthetic
fixture. New-write compression is useful without rewriting or deleting that fixture
or touching production. The chosen scope claims reduced measured growth only.


## Implementation and independent review checkpoint

The codec and migration boundary are implemented locally. A fresh Astra reviewer
found two noncanonical-schema gaps: an added TEXT-only CHECK and a trigger whose
stored table name used mixed case. The parent reproduced both. The repair uses a
canonical receipt DDL check and a NOCASE ancillary lookup; all original failed
cases remain in the evidence. The contextual reviewer then confirmed rejection
preserves v1 metadata, schema and rows, while actual historical UTF-8/UTF-16 files
still migrate and replay. See [review closure](evidence/storage-codec-review-closure.json)
and [schema refinement](evidence/storage-codec-schema-gate.md).

All 213 isolated board tests pass on the final codec/store source. The parent's
integrated required run also passed 1,037 tests. These checks qualify a local
implementation commit. The two-browser task and newly source-bound sustained
resource/growth criteria remain open; no release, lifetime storage cap or reduced
hosting bill is claimed.
