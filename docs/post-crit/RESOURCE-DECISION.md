# Resource decision before adding post-Crit features

22 October 2026. Evidence: [unchanged live snapshot](resource-baseline.json),
[research](RESEARCH.md) and the existing `evaluation/board-resource.protocol.json`.

The observed limit is 256 MB of machine RAM. The persistent volume currently has
about 900 MiB available. Furniture settings and game moves primarily add small
structured records, so reducing visual quality is not justified by a disk-shortage
claim. The live sample is idle; it does not qualify the expanded concurrent app.

The parent checked `src/server.ts`: static assets already use `createReadStream`
and response piping (baseline lines 256–258). Replacing an imagined whole-file
asset buffer would be a false optimization. HTML is read separately for CSP hash
calculation. Keep this distinction when discussing past or future memory changes.

For this iteration, reuse procedural furniture and the existing materials, avoid
large new asset catalogues, store room presets once at allocation, and keep one
current game state with compact public projections. Voice media remains off the
small Fly process. No backup, database, receipt or user-content deletion is part
of the current work. Existing room/board data and prepared-statement bounds remain.

After integration, run every unchanged registered workload gate and a separately
specified combined board/new-actions workload. Measure process RSS, any available
cgroup/OOM information, client rendering/transfer and persistent growth separately.
Repeated game rounds must measure receipt growth as well as the current table:
replacing a current session does not remove retained idempotency records. If a
budget fails, preserve the result and isolate the cause before reducing quality,
changing limits or accepting an optimization. Current idle figures do not establish
that all new features fit under the original concurrency limits.

## Current measured result, 22 October

[Final resource closure](evidence/p7-resource-closure.md) records the current
original23/23 and combined27/27 results. Each uses the unchanged300-second
monotonic workload and all original gates. Peak server RSS is190.45/193.91MiB;
board deliveryp95 is12.172/11.936ms. Combined includes124game and62pictureactions.
Actual retained board+house response growth is4.53/4.57MiB, below the prospective
16MiB target. Exact accepted response verification runs after server exit; all
8,142 receipts per run match. Raw UTC spans differ from monotonic duration and
remain documented without a causal diagnosis.

[Same-dataset accounting](evidence/p7-receipt-byte-comparison.json) compares all
current combined-run response bytes, including bootstrap:4,854,559stored versus
170,744,820decoded UTF-8bytes,97.1568% smaller. It uses read-only64-row batches and
an unchanged main-DB hash. This is a lossless representation comparison for receipts,
not total-volume reduction, RAM reduction, sustained timing A/B or a lifetime cap.
Per-file main/WAL/SHM logical and allocated measurements remain in the raw digests.

No visual quality was reduced for storage. One original8,445-byte picture SVG,
existing/procedural furniture and bounded structured settings keep content small.
The Docker build excludes docs/evidence/prototypes and uses only production server
dependencies in the runtime stage; the board asset build remains an explicit stage.
This source/config inspection is not an actual new container build or Fly release.

The next resource decision should use observed growth over real use and a clear
retention/export contract. Avoid deleting idempotency records or user material to
meet an invented limit. Recheck these workloads after relevant runtime, content or
protocol changes; do not treat this one synthetic workload as unlimited capacity.
