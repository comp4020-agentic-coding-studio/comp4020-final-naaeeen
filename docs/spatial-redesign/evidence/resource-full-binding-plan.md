# Current full resource registration

Preparation only. Protocol writes wait for the parent's release of the actual
attribution review; execution requires separate parent authorization. The one
completed attribution bootstrap is diagnostic evidence. It establishes neither
the cause of B2's earlier rejection nor a 300-second resource result.

Refresh the registered default baseline and existing mixed profile using the
successful probe's exact current 53-file manifest:
`8d74b63aaf503a37f8738215edd82e5190e459b21e7ce373095a71ed8886f14e`.
Copy only its source-binding fields, never its `rateAttribution` opt-in. Require
the reviewed instruments and all current source hashes to match before and after.

Change only nine registration keys: commands, instrumentSHA256,
memoryDiagnosticRegistration, registeredAtUTC, sourceBinding, sourceFiles,
sourceHashes, sourceManifestSHA256 and status. Preserve every other field.
Explicitly compare the baseline's 14 original groups and mixed profile's 11 groups
with canonical hashes and structural equality. This includes the declared 300s,
24 views, 210 MiB RSS, 12 MiB semi-space, fixtures, negative controls, motion roles,
action cadences and schedules. No bootstrap command or trace key is introduced.

Before writing, exclusively preserve byte copies of the old default protocol and
result, documentation baseline copy, mixed protocol and mixed result under new
`resource-full-prebinding-*` names. Existing CALIBRATION results remain unchanged
by registration and are never relabelled. The actual runs use the documentation
baseline and a new byte-identical `resource-full-mixed.protocol.json` copy, giving
fresh result/diagnostic/log/closure paths. Canonical old results remain untouched.
Keep default
and documentation baseline protocol bytes identical. Older attribution, ABBA,
failure, diagnostic and historical evidence stays untouched.

The binder defaults to a read-only preflight. After the parent releases binding,
`--bind --parent-binding-go` performs this single registration and the first
`--inspect` of each profile using the verified absolute mise path. Preserve any
failure and stop; no automatic retry or rebinding. The binder cannot launch load,
tests, browsers or an application service.

```sh
python3 docs/spatial-redesign/evidence/resource-full-bind.py
# Only after explicit binding release:
python3 docs/spatial-redesign/evidence/resource-full-bind.py --bind --parent-binding-go
```

After READY, the binder prints commands with the exact new protocol digests:

```sh
/home/lizhi/.local/bin/mise exec -- node tools/board-resource.mjs --protocol-file docs/spatial-redesign/evidence/resource-baseline.protocol.json --run --go <baseline-protocol-sha> --freeze 8d74b63aaf503a37f8738215edd82e5190e459b21e7ce373095a71ed8886f14e
/home/lizhi/.local/bin/mise exec -- node tools/board-resource.mjs --protocol-file docs/spatial-redesign/evidence/resource-full-mixed.protocol.json --run --go <mixed-protocol-sha> --freeze 8d74b63aaf503a37f8738215edd82e5190e459b21e7ce373095a71ed8886f14e
```

These are two different declared 300-second workloads, each requiring its actual
first result and closed processes. No further bootstrap, retry, threshold change,
production optimization, Fly measurement or deployment is authorized here. Parent
owns exclusive execution and its stopping decisions. Preserved preimages, source
maps, condition hashes, first inspection outputs and exact commands make the
registration reviewable before any execution.
