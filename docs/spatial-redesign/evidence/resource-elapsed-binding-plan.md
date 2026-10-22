# Post-clock full qualification registration

Status: PREPARATION ONLY, awaiting a new green full required check and parent
binding release. Required #8 failed one game fixture; it is not a registration
gate pass. No inspection, protocol write, bootstrap or resource execution now.

Reuse the reviewed full-profile binder with new `resource-elapsed-baseline` and
`resource-elapsed-mixed` protocol/result stems. Compare against the prior exact
53-file manifest `8d74b63aaf503a37f8738215edd82e5190e459b21e7ce373095a71ed8886f14e`.
Permit only these four source changes:

| File | Required SHA256 |
| --- | --- |
| src/house-realtime.ts | 84e0cd968bb2c50d68be5f891d5fcd15c021aa1cc94974a203ce0d16b109e9b5 |
| src/server.ts | ce4ae8c93ab6bbe2c3cec12d65b11fc5fd2baa12f5ce1cf3d3f1bf0425977dfd |
| tools/board-resource.mjs | 3dc0c6e583a1fff080abd72dde1b9d0f403b9acc5ad3d6ec8af36bf9f5a97e59 |
| tools/spatial-resource.mjs | 1b4ce05747a286699f01d85cf3fdb19ea9e26777d6053768e48330e4bd702ebb |

All other 49 file hashes and the complete allowlist remain fixed, including the
three final layout files. Prepared current manifest:
`9bf3f70d400881cebeb939fd21b6ed1c5525cecddb45c38cf57870fb75f537e8`.

The only prospective protocol changes are the existing nine registration keys.
Require structural equality of all other fields, explicitly retaining the 14
baseline and 11 mixed condition-group hashes. Keep 300 seconds, 24 views, 210 MiB,
12 MiB semi-space, fixtures, roles, cadences, schedules, gates and first-failure
stopping rules unchanged. Neither full profile receives rateAttribution fields
or bootstrap commands. Failure categories are always provided by the new frozen
instrument; there is no new control flag or tracing/cadence choice.

Before any later mutation, exclusively preserve six exact byte preimages: current
canonical default protocol/result, documentation baseline protocol/result, and
canonical mixed protocol/result. Use new `resource-elapsed-prebinding-*` names.
Keep old full qualification, failed mixed, attribution and diagnostic files
unchanged. Keep default and documentation baseline protocol bytes identical; new
elapsed aliases are also byte copies of the corresponding canonical protocol.
Both embedded and printed run commands target only the fresh elapsed paths.

The helper defaults to read-only source/condition/path preflight. Its binding
branch additionally requires explicit parent GO, an exact hash-confirmed private
completion record, exitCode 0, sourceUnchanged true, equal before/after maps, and
current source hashes matching every one of the 48 covered resource files. The
five omitted configuration/instrument files are separately pinned by the exact
53-file manifest. Only after that branch is authorized does it write and inspect
each profile once. Preserve and stop on failure; no retry or rebinding.

```sh
python3 docs/spatial-redesign/evidence/resource-elapsed-bind.py
# Only after parent confirms full green and releases binding:
python3 docs/spatial-redesign/evidence/resource-elapsed-bind.py \
  --bind --parent-binding-go \
  --required-completion .local/spatial-apply/required-current-N.json \
  --required-completion-sha256 <green-record-sha256>
```

After READY, the helper will print exact protocol digests for separate parent-owned
300-second runs at the two new elapsed entrypoints. No more bootstraps, retries,
new acceptance thresholds or load execution are authorized by this preparation.
