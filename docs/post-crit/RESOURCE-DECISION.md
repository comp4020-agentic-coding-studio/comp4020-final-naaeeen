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
