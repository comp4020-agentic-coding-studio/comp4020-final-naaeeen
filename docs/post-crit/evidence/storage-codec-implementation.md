# Receipt codec implementation checkpoint

22 October 2026. Canonical Ubuntu/lizhi checkout; Windows-to-WSL bridge, native
mise Node 24.21.0 / pnpm 11.9.0 / SQLite 3.53.4. Parent owns fresh review and final
integration, browser and sustained acceptance. No commit or publication occurred
in this worker lane. Source identities and actual test counts are in the
[verification record](../../../evaluation/receipt-codec-verification.json).
The subsequent [canonical-schema refinement](storage-codec-schema-gate.md) records
one confirmed noncanonical v1 migration gap, its RED/fix/GREEN and current evidence.

## Representation and bounded reads

Requirement: retain each original accepted response and consumed command ID while
reducing repeated-response storage. The reviewed [contract](../STORAGE-CONTRACT.md)
selected built-in gzip level 1 over reference/delta migration, expiry or admission
policy changes. The new helper stores the exact UTF8 JSON behind the 11-byte
`NNBR\0gzip1\0` local tag only when it is smaller than raw TEXT in the database's
actual UTF8/UTF16 encoding. Otherwise the new value remains TEXT.

Before fetching a response, the store reads only command hash, `typeof(response)`
and `octet_length(response)`. A changed hash returns ID_REUSED first. Supported
TEXT/BLOB and their bounded stored lengths are checked before selecting bytes.
TEXT is fetched as its raw BLOB view so fatal UTF8/UTF16 decoding can reject bad
stored bytes rather than accepting replacement characters. The permanent decoded
limit is 2 MiB + 256 bytes; UTF16 TEXT and encoded input are bounded by twice that
limit. Gzip uses normal finish, bounded output and strict trailing-data rejection,
including an extra member. The Node runtime supports the strict option; installed
Node typings require a small explicit option type extension.

Decoded JSON must have `ok: true`, the original ID and house, a safe nonnegative
sequence and the expected single payload kind. Inner historical winners are
returned as saved, without applying today's element normalizer. Malformed data
fails as STORAGE_UNAVAILABLE and never becomes a new action.

The [predeclared diagnostic](../../../evaluation/receipt-codec-diagnostic.protocol.json),
[script](../../../evaluation/receipt-codec-diagnostic.mjs) and
[result](../../../evaluation/receipt-codec-diagnostic.results.json) compare seven
actual deterministic synthetic receipts under raw TEXT, gzip 1, gzip 6 and Brotli 4.
All candidates round-trip the same UTF8 bytes. The implemented representation also
round-trips all 21 receipt/SQLite-encoding combinations without increasing stored
bytes. A 12,282-byte UTF8 CJK receipt occupies 8,564 UTF16 bytes; tagged gzip1 needs
8,952 bytes, so both UTF16 encodings correctly keep TEXT. Repetitive text receipt
24,479 UTF8 bytes becomes 642 stored bytes including its tag. These cases are a
bounded correctness/byte diagnostic, not the earlier reported 66-sample corpus,
a speed/RSS ranking, representative-user compression ratio or workload result.

## Migration and atomic replay

New files start directly at schema 2; public receipt/snapshot schema remains 1.
Opening v1 checks required columns, declared types, NOT NULL flags and composite
key order for all six tables, plus non-STRICT receipt-table compatibility. The
receipt table must also have the known canonical unquoted CREATE TABLE definition
with only ASCII SQL-whitespace and keyword-case differences; extra CHECK/table
constraints, persistent receipt triggers and explicit receipt indexes are unsupported.
The canonical implicit primary-key index remains allowed. Only then does the
same transaction set version 2. Reopening v2 validates the schema
without rewriting responses. Malformed v1 keeps its original version; future
versions fail closed. No row rewrite, backfill, cleanup or VACUUM is performed.

The existing mutation transaction now encodes its receipt before insertion and
commits the state, contribution, cursor and receipt together. Insertion failure
rolls back the whole mutation. Exact retry survives peer rewrites, process reopen
and chat expiry. Author contributions and former-member export authorization are
unchanged. New tests exercise the actual store and HTTP/Socket.IO service as well
as the codec boundary.

Schema 2 makes a newly opened old binary reject the file. It does not stop a
previously opened old process: a future authorized release must stop/drain old
writers before cutover. Rollback after new writes needs a v2-aware binary or a
separately validated lossless decode/export; an older backup loses later writes.

## Initial test and refinement trail (before schema-gate review)

- RED against the original store: 31 pass / 11 fail / 42 total, exit 1. Expected
  failures cover schema 2, v1 compatibility validation, corrupt envelopes and
  metadata-first reads. The original source/spec hashes and full
  [RED output](../../../evaluation/receipt-codec-red.json) are preserved.
- Implementation plus focused controls: 97/97 store/codec/service tests passed.
  Cases include mixed TEXT/BLOB, UTF16le/be fallback, malformed tags/UTF8/gzip
  trails/truncation, frozen output bounds, wrong IDs/houses/kinds/sequences, hash
  precedence, rollback/reopen, and former-member personal export after peer edits.
- The losing-patch regression sends less than 128 KiB of input and receives over
  1,800 KiB of authoritative winners, then reopens/replays it exactly. This is why
  the permanent decoded limit follows retained responses rather than input quota.
- All isolated board-config tests: 205/205 passed. Affected production coverage is
  92.41% statements, 90.87% branches and 92% lines. Codec: 100% statements/lines,
  98.27% branches. Store: 91.42% statements, 88.88% branches, 90.94% lines. Existing
  store error/image-parser branches remain uncovered; this is scoped coverage,
  not whole-app/browser coverage. Typecheck passed.
- Typecheck first exposed a strict zlib option typing mismatch and an unknown-size
  narrowing issue; both were fixed. A new test draft's syntax error was corrected
  before its executable pass. Criteria and assertions were retained.

The worker re-read the active methods and reviewed the scoped diff against the
contract at entry, after the typing failure and at exit. Fresh independent review later confirmed the noncanonical schema gap documented in
the refinement record. Its fix awaits reviewer recheck and parent reconciliation;
they are not replaced by this self-review.
The parent also owns final required/evidence checks and two-browser edit/replay/
export verification. No browser or load job started here.

The unchanged sustained resource gates and prospective retained-response growth
<=16 MiB criterion remain NOT RUN on this candidate. No lifetime bound, occupied-disk
reduction, Fly performance or human-usability result is claimed. Existing frozen
workloads, databases and failed results are preserved. Long-term admission/retention,
backfill and repacking remain separate decisions.
