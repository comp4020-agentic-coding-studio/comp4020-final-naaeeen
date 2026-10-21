# P7 resource preparation — held for source freeze and GO

22 October 2026. Preparation only. No resource service, bootstrap exercise or
300-second workload has run in this slice. Native work remains owned by the
parent/UI lane. Instrument, helper, specs and prospective protocol bytes are frozen
for the parent's fresh read-only review. Production source hashes remain unset;
`--inspect` reports HELD / SOURCE_BINDING_REQUIRED and `--run` cannot pass preflight.

## Scope and prospective runs

| Run | Workload retained | Added preregistered checks |
| --- | --- | --- |
| Original | Exact original 21 gates, 300 seconds, 24 engines, motion/pointer/write cadence, delivery/missing targets, real paired TCP pause/expiry, queues and RSS<=210MiB | Actual retained board+house response-byte growth<=16MiB; exact persisted decoded board responses against original actor/command-bound ACK digests. Expected23 gates. |
| Combined | Every original criterion plus unchanged 124 Four-in-a-row actions / 733 readable targets | Same storage/replay checks; six-contributor picture activity62 actions /372 targets and actual persisted contribution/receipt checks. Expected27 gates. |

Original protocol: `evaluation/board-resource.protocol.json`.
Combined protocol: `p7-combined-resource.protocol.json`.
Instrument: `tools/board-resource.mjs`; observation/codec helpers:
`tools/board-resource-p7.mjs`; focused specification:
`spec/board-resource-p7.test.ts`. The old resource specs retain original behavior
checks; their historical P6 one-field proof now reads the exact P6 preimage.

Per house, the last old game finishes at235s. The owner starts the picture at260s;
member0..5 explicitly Join at262..267s; the 24 public catalogue pieces are placed
at269+0.5*i, ending280.5s. Actor i%6 makes each placement, giving four actual saved
contributions per identity. Start never joins. Every action waits for all six
exact actual durable/roster projections before the next action. Absolute future
deadlines never slide; a collapsed500ms placement slot fails. Completion must clear
all six private self-consents and the public roster. No watchers count as active
contributors, additional sockets, navigation, forced availability or fake operator
mutations. Scripted equal contributions are technical evidence, not human balance.

The two houses add2 Start+12 direct Join+48 Place=62 actions and50 durable receipts.
Game-only receipt growth must remain124; all-house durable growth must be174,
with50 picture receipts. The game table bound/terminal condition remains unchanged.

## Receipt measurement and timing

The storage target sums `octet_length(response)` in board and house databases from
the post-bootstrap/pre-measurement sample to final live sample. It includes gzip
format headers and actual TEXT database encoding. The helper records storage type,
count and byte totals; file logical/allocated sizes are independent measurements.
Every100ms existing server sample additionally stats all three main databases and
their WAL/SHM names, retaining per-file sampled peaks. Baseline/final and pre/post
closed-database-decode file snapshots are explicit. No logical payload is presented
as occupied disk, spare volume, billing reduction or a lifetime storage bound.

Every successful board HTTP response, including bootstrap, is bound to its original
actor, command UUID, house and operation kind. Equal duplicates deduplicate; a
changed ACK for the same actor/command fails without overwriting the first digest.
The ledger retains digests/keys only, bounded to10000 entries. Timed write digests
are computed after the original event/receipt reflection points; original timestamps
and cadences are unchanged. No166MiB response-copy ledger is retained.

After the owned server exits successfully, the unflagged generator opens the
isolated database read-only and checks batches of at most64 entries using the actual
production decoder. Metadata is checked before fetching stored bytes. Every digest
must match; unique ledger entries, distinct compared rows and actual receipt count
must agree. Missing, wrong-actor, duplicate, corrupt or changed decoded responses
cannot pass. No decoder verification runs in the measured server. Puzzle persistence
is also checked read-only after close against original API observations and all six
actual actor mappings. No receipt rewrite, deletion, GC or manual checkpoint.

## Calibration and review boundary

`p7-resource-grader-final.json` records39 passed and one deliberately skipped
actual-service test. The P7 tests use native bounded in-memory/closed SQLite fixtures
and raw sanitized observation fixtures; no HTTP/Socket.IO service starts. The skipped
case is the earlier P6 real-socket authority fixture, held during native work.
Controls cover missing activity, wrong placement actor/state/roster, future-head
substitution, missing or duplicate targets, stale/private/wrong-house consent,
completion clearing, changed duplicate ACK, exact decoded payload, missing ledger
row, actual UTF-16 TEXT/tagged BLOB bytes, and growth over16MiB. Tests also extract
the actual Start/Place/direct-Join packet construction and preserve old criteria.
The resource reflection test verifies digest work follows its existing timing point.
Typecheck, self/checkpoint controls and scoped diff checks passed. These are grader
and source-calibration results, not live P7 resource acceptance.

The ignored fixture config used for the service-free test run is reproducible as:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  include: ['spec/board-resource-p7.test.ts', 'spec/board-resource-delivery.test.ts', 'spec/server-runtime.test.ts'],
  testNamePattern: /^(?!.*real socket authority).*$/
} });
```

Fresh instrument/protocol review is parent-owned and pending. Remaining execution
uncertainties are exact P7 orchestration under actual authority/board pressure,
post-close full-ledger comparison, storage growth, and unchanged cadence/RSS/delivery
limits. They remain NOT RUN until the parent confirms production freeze and gives
explicit sequential run GO. No conditional full PASS or new source acceptance is
inferred from old tests, codec diagnostics or the P6 resource passes.

## Freeze and ownership handoff

`sourceFiles` lists25 critical files, including codec, puzzle rules/presence/content,
SVG identity, server/runtime/version and the new observation helper. Root must bind
the final production bytes only after native fixes, verify the catalogue digest
against its SVG, recompute both source manifests/protocol hashes, and review the
candidate before GO. No production hashes were refreshed during preparation.
The exact P6 canonical protocol/result/instrument and combined bytes are preserved
by `p7-resource-preimage-manifest.json`; previous failed attempts remain unchanged.

No production, client/UI/store/geometry, provider, deployment, permission, dependency
or memory settings changed in this lane. No new services, agents or recurring work
were launched. Parent owns review/final binding/GO; the resource worker owns the
prospective instrument and these resource files and remains HELD for controlled
review follow-up rather than silently running or retrying a workload.
