# Diagnostic binding and execution commands

Binding is complete. Execution remains NOT RUN and requires a separate parent GO after the exclusive native lane and required checks close.

Common source manifest: `b55112cf8bbec5d3c4fdd19f9a391f5a1db43cd7684582db99e45768398bbbc3`.
Board instrument: `1485ed11184db397ae9ebe0677cae769e5830ed3db177779495b35d4d50afec8`.

The registered default and its resource-baseline.protocol.json evidence copy are byte-identical. memory-diagnostic-binding.json contains all fourteen original/before/after condition hashes and preserved first protocol/result hashes. Both default/mixed and all four slot inspect results are READY.

Do not rerun the binder or overwrite existing slot paths. The binder defaults to read-only preflight; it was invoked once with the reviewed candidate digest. No bootstrap was invoked.

## Fixed ABBA sequence after explicit execution GO

### A1: baseline

Protocol SHA256: `b4286e395148222a8d936c696bd00949deb1ccb178fdb65a034ff0b4caa3a01a`.

```sh
mise exec -- node tools/board-resource.mjs --protocol-file docs/spatial-redesign/evidence/memory-diagnostic-A1.protocol.json --inspect
mise exec -- node tools/board-resource.mjs --protocol-file docs/spatial-redesign/evidence/memory-diagnostic-A1.protocol.json --bootstrap-calibration
```

First artifacts: `docs/spatial-redesign/evidence/memory-diagnostic-A1.results.json`, `docs/spatial-redesign/evidence/memory-diagnostic-A1.memory-diagnostic.json`, and a retained `docs/spatial-redesign/evidence/memory-diagnostic-A1.log`.

### B1: mixed

Protocol SHA256: `8d80b9c54347235b6e847b2757b50dfce95859dd1c841545e465c73c9874cc46`.

```sh
mise exec -- node tools/board-resource.mjs --protocol-file docs/spatial-redesign/evidence/memory-diagnostic-B1.protocol.json --inspect
mise exec -- node tools/board-resource.mjs --protocol-file docs/spatial-redesign/evidence/memory-diagnostic-B1.protocol.json --bootstrap-calibration
```

First artifacts: `docs/spatial-redesign/evidence/memory-diagnostic-B1.results.json`, `docs/spatial-redesign/evidence/memory-diagnostic-B1.memory-diagnostic.json`, and a retained `docs/spatial-redesign/evidence/memory-diagnostic-B1.log`.

### B2: mixed

Protocol SHA256: `a6612bc1efe50df9a66c1aa81ac083744de2d0d6eab8007b41f497f7a2bc1ef3`.

```sh
mise exec -- node tools/board-resource.mjs --protocol-file docs/spatial-redesign/evidence/memory-diagnostic-B2.protocol.json --inspect
mise exec -- node tools/board-resource.mjs --protocol-file docs/spatial-redesign/evidence/memory-diagnostic-B2.protocol.json --bootstrap-calibration
```

First artifacts: `docs/spatial-redesign/evidence/memory-diagnostic-B2.results.json`, `docs/spatial-redesign/evidence/memory-diagnostic-B2.memory-diagnostic.json`, and a retained `docs/spatial-redesign/evidence/memory-diagnostic-B2.log`.

### A2: baseline

Protocol SHA256: `228420f71ae6b6330fc4567459033b84137bc6f6e72090df56358a9674d9e7af`.

```sh
mise exec -- node tools/board-resource.mjs --protocol-file docs/spatial-redesign/evidence/memory-diagnostic-A2.protocol.json --inspect
mise exec -- node tools/board-resource.mjs --protocol-file docs/spatial-redesign/evidence/memory-diagnostic-A2.protocol.json --bootstrap-calibration
```

First artifacts: `docs/spatial-redesign/evidence/memory-diagnostic-A2.results.json`, `docs/spatial-redesign/evidence/memory-diagnostic-A2.memory-diagnostic.json`, and a retained `docs/spatial-redesign/evidence/memory-diagnostic-A2.log`.

## Stop and interpretation rules

Run sequentially A1 baseline, B1 mixed, B2 mixed, A2 baseline, maximum four. Preserve each first attempt and closure before proceeding. Stop earlier on infrastructure/function/validation/source drift/cleanup failure or missing terminal/count/ACK. A recorded RSS gate failure alone remains part of the four-slot sample; it does not justify retrying or selecting favorable runs. Never run a sustained workload from these slots.

Each slot remains a bootstrap CALIBRATION. Require VALID compact artifact, complete terminal stream, exact gated recovery.after prefix peak, and actual process closure. Distinguish the unchanged210MiB gate-prefix peak, later shutdown/lifetime sampled peak and separate OS maxRSS. All30 pure checks and the independent fabricated-IPC controls validate the instrument, not the application memory hypothesis.

No production repair, app/bootstrap result, Fly cgroup enforcement or performance PASS is inferred by this binding.
