# Asset-reuse source qualification preparation

PREPARATION ONLY. Required #11 is green (71 files, 1533 tests, source unchanged).
Registration remains held until the parent accepts the active native lane and
gives GO. No registration, inspection, tests, services or resource execution now.
Do not update metadata-spec aliases before registration is authorized.

Adapt the reviewed final binder with fresh `resource-reuse-baseline` and
`resource-reuse-mixed` entrypoints. Against the prior 53-file manifest
`b380844819cf766dd0e8b0eed14c73aedae030c33c767852cd62dd8c7fe7ceeb`,
permit exactly two source changes:

| File | Required SHA256 |
| --- | --- |
| src/board-service.ts | 241e15797951113133944fa6f745eb01aa375badb345d4b04fbb30c2ce60e3e4 |
| tools/spatial-resource.mjs | aac3caba800530d1f4f3b2047e8ba4d3e1bfe6f5f876d48e717e7844f04147b8 |

The other 51 hashes and the entire allowlist stay fixed. Prepared current manifest:
`49fe9a2ffe0dd025414ca9ad502000151c6ecd469556598b79d4ae2def8cff84`.
Before binding require actual current source to match GitHEAD as well as this map.

Keep all non-registration fields structurally equal, explicitly retaining the
14 baseline and 11 mixed groups, workload/faults/quality, 300 seconds, 24 views,
210 MiB, server flags, schedules, roles and gates. Only the same nine registration
keys may change. No rate trace, probe or bootstrap fields/commands are introduced.

Preserve final `783035…` / `00c77…` protocols and their first results unchanged.
Exclusively create only three new canonical **protocol** preimages under the
`resource-reuse-prebinding-*` stem. Reuse these three already frozen result
preimages after requiring exact hashes equal to their current canonical results:

- `resource-final-prebinding-default.results.json`
- `resource-final-prebinding-baseline-copy.results.json`
- `resource-final-prebinding-mixed.results.json`

These three explicit static files are read-only references, not rewritten copies.
Record their paths and hashes. Reject any mismatch. Keep existing canonical old
results unchanged, and create fresh actual results only under the reuse aliases.
Default/documentation baseline/fresh baseline are byte copies; canonical mixed
and fresh mixed are byte copies. New protocol preimages and output paths remain
exclusive; never overwrite an earlier attempt or artifact.

The helper defaults to read-only preflight. Later binding requires parent GO and
an exact hash-confirmed **required-current-11.json** record with exitCode 0,
sourceUnchanged true, equal before/after maps and all 48 covered resource hashes;
the five omitted files remain independently pinned. #10 is not accepted as the
new qualification proof. Confirmed #11 completion SHA256:
`638e9fd357354c4e66b0c7a34a98cada46c2dcb42f121cd30dcd477c6c28b927`.
Bind/inspect only after release, once; stop and preserve
failure. Parent owns separate baseline/mixed execution and its idle coordination.

```sh
python3 docs/spatial-redesign/evidence/resource-reuse-bind.py
# After green #11 and explicit registration GO only:
python3 docs/spatial-redesign/evidence/resource-reuse-bind.py \
  --bind --parent-binding-go \
  --required-completion .local/spatial-apply/required-current-11.json \
  --required-completion-sha256 638e9fd357354c4e66b0c7a34a98cada46c2dcb42f121cd30dcd477c6c28b927
```
