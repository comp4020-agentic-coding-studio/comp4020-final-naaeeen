# Canonical receipt schema migration refinement

22 October 2026. This follows the initial 205-test receipt-codec checkpoint and
fresh implementation review. It is a confirmed rejection-boundary gap for a
noncanonical v1 database; canonical historical UTF8/UTF16 migration was already
passing. The parent independently reproduced the gap in
[storage-schema-parent-red.json](storage-schema-parent-red.json), and its read-only
[private preview schema check](storage-preview-schema.json) found canonical v1 DDL.
Neither observation claims a canonical deployed-data migration regression.

Requirement: reject an incompatible v1 receipt schema before promoting its metadata,
while retaining legacy TEXT, all IDs and atomic receipt/state writes. Required
column/PK/non-STRICT metadata alone cannot reveal an added CHECK constraint. An
otherwise matching `response TEXT NOT NULL CHECK(typeof(response)='text')` upgraded
to v2 and then rejected compressed writes. A size-conditional CHECK shows why a
representative rolled-back BLOB insertion cannot establish arbitrary-schema
compatibility. Triggers can also reject, rewrite or ignore an insertion.

The selected bounded fix compares stored receipt CREATE TABLE SQL with the known
application definition, accepting only ASCII SQL-whitespace and keyword-case
normalization. It retains all existing metadata checks and rejects persistent
receipt triggers or explicit receipt indexes; SQLite's implicit primary-key index
is allowed. No arbitrary DDL parser, insertion probe, row rewrite or schema rebuild
was added. Compatibility is intentionally limited to this canonical receipt schema,
not all custom SQLite definitions. The constructor uses the same canonical SQL
constant when creating new files. Post-open failure triggers remain usable for
transactional rollback tests.

| Part | Evidence and decision | Verification |
| --- | --- | --- |
| Added CHECK constraints | Fresh finding and parent reproduction; reject canonical-SQL mismatch before version change | TEXT-only and size-conditional CHECK cases leave version 1 unchanged |
| Receipt ancillary objects | Exact table SQL alone does not exclude a trigger or extra uniqueness rule; reject persistent receipt triggers and explicit indexes | Trigger and unique-index cases leave version 1 unchanged |
| Canonical compatibility | Preserve old column/PK/non-STRICT checks, known DDL and narrowly harmless formatting variants | UTF8, UTF16le and UTF16be migrate, replay unchanged legacy TEXT, and accept a new BLOB receipt |
| Metadata-only upgrade | A pre-open trigger is now outside the supported boundary; directly observe writes in the opening connection instead | `total_changes() = 0` after upgrade/reopen plus unchanged saved TEXT; no INSERT/UPDATE probe |
| Existing codec/authority/rollback | No codec change; actual store and HTTP/Socket.IO service behavior remains covered | All isolated board tests and typecheck pass; diagnostic corpus stays identical |

[Before-fix source/initial GREEN hashes](../../../evaluation/receipt-codec-schema-gate-before.json)
and the [initial verification snapshot](../../../evaluation/receipt-codec-verification-before-schema-gate.json)
are preserved. New
[RED](../../../evaluation/receipt-codec-schema-gate-red.json): 48 pass, 4 expected
fail, 52 total, exit 1. Each failing case reported that the constructor did not
reject its noncanonical schema. Existing canonical positives passed in that run.

After the initial canonical-DDL fix, [focused codec/store/service GREEN](../../../evaluation/receipt-codec-schema-gate-green.json)
passes 104/104, and [all isolated board tests](../../../evaluation/receipt-codec-schema-gate-board-green.json)
pass 212/212. Native Linux typecheck passes. Affected production coverage is
92.56% statements, 91.03% branches and 92.14% lines; the store is 91.61% statements,
89.14% branches and 91.12% lines. The unchanged codec retains 100% statements/lines
and 98.27% branches. The bounded seven-receipt/21-storage-case diagnostic reran on
the new source with the same deterministic corpus hash and all exact/no-growth
checks passing; its earlier result is separately preserved.

Current source hashes and command/result identities are in the
[verification record](../../../evaluation/receipt-codec-verification.json).
The worker inspected the new diff and rechecked the affected method/contract at
entry and after the reviewer finding. Reviewer contextual recheck and parent
reconciliation remain pending. Full required/evidence checks, browser flows and
unchanged sustained resource/16 MiB growth acceptance remain the parent's gates.
No server, browser, load job, live database, frozen workload, commit or release was
started or changed in this repair. Other workers' house/UI changes were preserved.


## Contextual correction: mixed-case ancillary table name

The same reviewer then confirmed that SQLite preserves `ON ReCeIpTs` spelling in
`sqlite_schema.tbl_name`, while the first ancillary-object lookup compared that
value case-sensitively. The canonical table definition therefore passed, but a
mixed-case trigger capable of rejecting BLOBs was missed. This is another
noncanonical-schema rejection gap, not a canonical migration failure.

The exact regression creates a saved legacy TEXT row and a BLOB-rejecting trigger
on `ReCeIpTs`. It verifies SQLite's mixed-case metadata, constructor rejection,
unchanged version 1 and exact preservation of all original receipt rows. The
[RED result](../../../evaluation/receipt-codec-schema-nocase-red.json) has 52 pass,
one intended fail, 53 total, exit 1; the only failure was the missing rejection.
[Previous source/green identities](../../../evaluation/receipt-codec-schema-nocase-before.json)
and the [previous verification](../../../evaluation/receipt-codec-verification-before-schema-nocase.json)
were preserved before the repair.

The bounded fix adds `COLLATE NOCASE` to that ancillary-object identifier lookup,
matching SQLite's ASCII case-insensitive identifier behavior. It does not broaden
the CREATE TABLE normalizer or change codec bytes. The
[new board GREEN](../../../evaluation/receipt-codec-schema-nocase-board-green.json)
passes 213/213, including the canonical encoding positives and all prior denials.
Typecheck and scoped diff checks pass; affected coverage remains 92.56% statements,
91.03% branches and 92.14% lines. The prior seven-receipt diagnostic remains bound
to its recorded earlier source; it was not rerun for this identifier-predicate
correction, and it is not integrated/sustained acceptance. Reviewer recheck and
parent final acceptance remain pending. No service/browser/load job or commit was
created, and other workers' files were preserved.


## Contextual review closure and parent reconciliation

The reviewer rechecked the final store hash `5cd264abd599e18e4222fb07e897ff6a878f7c59b4f90d94430847fcdbaf900b`.
The exact mixed-case trigger now rejects opening and preserves version 1, rows and
schema. Actual canonical historical files in all three encodings migrate, retain
legacy TEXT, and replay new BLOB responses after restart. Eight targeted cases
passed; 45 unrelated cases were intentionally skipped in that focused invocation.
Both reported findings are closed. This is the same reviewer's contextual recheck,
not another fresh trial.

The parent inspected the final SQL/code path, checked source hashes and the
maintained regression records, and completed an integrated 1,037-test run. The
213-test board run remains the scoped coverage source. Native and sustained
acceptance are still separate open gates. The preceding pending paragraphs record
those earlier checkpoints; the [closure record](storage-codec-review-closure.json)
is the current review state.
