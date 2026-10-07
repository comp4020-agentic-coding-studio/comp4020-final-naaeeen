# Registered matched memory diagnosis

Original full300: RSS301.305MiB, heappeak103.784MiB, finalheap49.453MiB,
external11.057MiB, arrayBuffers0.456MiB; only RSS and immediate slow-recovery
assertion failed, all final saved targets recovered. This does not prove a leak.

Run one original and one minimalcandidate100s under identical full valid fixture,
24physicalengines, rates and paused-reader fault. The only runtime factor is
BoardStore.patch quota/winner processing. The diagnostic adds aggregate timing
and heap-delta wrappers around actual patch/snapshot/getAsset methods, preserving
this/arguments/results/errors. Positive deltas are transient observations, not
totalallocated or retainedheap and not a leak proof. No command/actor/text logged.

Original prepared SQL is already cached; per-query preparation is ruled out by
source. Current patch parses/sorts/stringifies every retained scene on every
touched update, then joins all own contribution strings. A touched-winner plus
SQLite UTF8 byte/count delta candidate predicts lower synchronous heap churn
without caching authority or changing quotas/tombstones/transactions/receipts.
If the matched data does not support this, inspect the next cause before edits.

Protocol/tool/runtime hashes freeze each100s candidate. Diagnostic status stays
DIAGNOSTIC; the full300duration/workload gates remain false rather than weakened.
Both results/failedfull history are preserved. After scoped behavioral/restart/
quota checks and independent review, a new source-frozen300s exercise must retain
210MiB/24engines/fullscene/images/messages/rates and all original real faults.
