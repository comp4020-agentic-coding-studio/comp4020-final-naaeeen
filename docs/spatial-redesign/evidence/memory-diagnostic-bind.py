"""Read-only preflight by default. --bind requires a reviewed candidate digest.

This prepares registrations only; it never starts an application or workload.
"""
from pathlib import Path
import argparse
import copy
import datetime
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = ROOT / "docs/spatial-redesign/evidence"
CONDITIONS = ["schemaVersion", "durationSeconds", "automaticRetry", "configuration", "fixture", "workload", "slowReader", "negativeControls", "bounds", "measurement", "classification", "limitations", "storageAcceptance", "baseWorkloadRegisteredAtUTC"]
ORDER = [("A1", "baseline"), ("B1", "mixed"), ("B2", "mixed"), ("A2", "baseline")]
sha = lambda data: hashlib.sha256(data).hexdigest()
canonical = lambda value: json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def read(relative):
    return json.loads((ROOT / relative).read_bytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bind", action="store_true")
    parser.add_argument("--confirm-candidate")
    args = parser.parse_args()
    default_path = "evaluation/board-resource.protocol.json"
    mixed_path = "docs/spatial-redesign/evidence/resource-mixed.protocol.json"
    baseline, mixed = read(default_path), read(mixed_path)
    original = read("docs/spatial-redesign/evidence/memory-diagnostic-preimage-baseline.protocol.json")
    for key in CONDITIONS:
        assert baseline[key] == original[key], ("Baseline condition changed", key)
    assert (ROOT / default_path).read_bytes() == (EVIDENCE / "resource-baseline.protocol.json").read_bytes()
    files = sorted(set(baseline["sourceFiles"]) | set(mixed["sourceFiles"]))
    hashes = {name: sha((ROOT / name).read_bytes()) for name in files}
    allowed_changes = {"tools/board-resource.mjs", "tools/spatial-resource.mjs", "public/house-gathering-ui.js", "public/house-gathering.css"}
    assert all(hashes[name] == digest or name in allowed_changes for name, digest in original["sourceHashes"].items()), "Unexpected application/source change"
    assert hashes["public/house-gathering-ui.js"] == "bf2596abb33a987f02eef73644d2810dd68323e0edb27722e9596915486fa3e1"
    assert hashes["public/house-gathering.css"] == "b922e2ba110e87b7a0508af4c926250d32fbf7675da1b90ae8ed726f4a5d0968"
    assert all(b"\r\n" not in (ROOT / name).read_bytes() for name in files), "Noncanonical source bytes"
    manifest = sha(json.dumps(hashes, separators=(",", ":")).encode())
    spec_files = ["spec/board-resource-delivery.test.ts", "spec/spatial-resource.test.ts", "spec/spatial-resource-wiring.test.ts", "spec/spatial-resource-memory.test.ts"]
    spec_hashes = {name: sha((ROOT / name).read_bytes()) for name in spec_files}
    candidate = {"sourceManifestSHA256": manifest, "sourceHashes": hashes, "evaluationSpecHashes": spec_hashes, "planSHA256": sha((EVIDENCE / "memory-diagnostic-plan.md").read_bytes()), "defaultProtocolSHA256": sha((ROOT / default_path).read_bytes()), "mixedProtocolSHA256": sha((ROOT / mixed_path).read_bytes())}
    candidate_sha = sha(canonical(candidate))
    if not args.bind:
        print(json.dumps({"status": "PREFLIGHT_ONLY_NO_BINDING", "candidateSHA256": candidate_sha, **candidate}, indent=2))
        return
    assert args.confirm_candidate == candidate_sha, "Candidate changed or binding was not explicitly confirmed"
    destinations = [EVIDENCE / f"memory-diagnostic-{slot}.protocol.json" for slot, _ in ORDER]
    assert not any(path.exists() for path in destinations), "Never overwrite an existing ABBA slot"
    originals = [(default_path, "memory-diagnostic-prebinding-default.protocol.json"), (mixed_path, "memory-diagnostic-prebinding-mixed.protocol.json"), ("evaluation/board-resource.results.json", "memory-diagnostic-prebinding-default.results.json"), ("docs/spatial-redesign/evidence/resource-mixed.results.json", "memory-diagnostic-prebinding-mixed.results.json")]
    assert not any((EVIDENCE / target).exists() for _, target in originals), "Never overwrite a preserved prebinding artifact"
    preserved = []
    for source, target in originals:
        data = (ROOT / source).read_bytes()
        (EVIDENCE / target).write_bytes(data)
        preserved.append({"source": source, "preimage": str((EVIDENCE / target).relative_to(ROOT)), "sha256": sha(data)})
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()

    def bound(source, target, slot=None):
        result = copy.deepcopy(source)
        result.update(status="FROZEN_DIAGNOSTIC_BINDING_ONLY", registeredAtUTC=now, sourceFiles=files, sourceHashes=hashes, sourceManifestSHA256=manifest, instrumentSHA256=hashes["tools/board-resource.mjs"])
        result["sourceBinding"] = {"status": "FROZEN_PARENT_BINDING_ONLY", "boundAtUTC": now, "head": head, "runtimeScope": "8be15ef server behavior plus parent-frozen sofa UI source", "requiredFiles": len(files), "candidateSHA256": candidate_sha, "evaluationSpecHashes": spec_hashes, "authorization": "Binding only. No bootstrap or sustained execution implied."}
        command = "mise exec -- node tools/board-resource.mjs --protocol-file " + target
        result["commands"] = {"inspect": command + " --inspect", "calibration": command + " --bootstrap-calibration", "run": command + (" --bootstrap-calibration" if slot else " --run --go <protocolSHA256> --freeze <sourceManifestSHA256>")}
        result["memoryDiagnosticRegistration"] = {"planSHA256": candidate["planSHA256"], "slot": slot, "order": [name for name, _ in ORDER], "purpose": "Fixed four-slot bootstrap diagnostic; no automatic retries or sustained acceptance", "execution": "NOT_RUN"}
        return result

    new_default, new_mixed = bound(baseline, default_path), bound(mixed, mixed_path)
    for key in CONDITIONS:
        assert new_default[key] == baseline[key] == original[key], key
    metadata_keys = {"status", "registeredAtUTC", "sourceFiles", "sourceHashes", "sourceManifestSHA256", "instrumentSHA256", "sourceBinding", "commands", "memoryDiagnosticRegistration"}
    mixed_unchanged = [key for key in mixed if key not in metadata_keys]
    assert all(new_mixed[key] == mixed[key] for key in mixed_unchanged), "Mixed condition/profile changed"
    encoded = lambda value: (json.dumps(value, indent=2) + "\n").encode()
    default_bytes = encoded(new_default)
    assert hashes == {name: sha((ROOT / name).read_bytes()) for name in files}, "Source drift before write"
    (ROOT / default_path).write_bytes(default_bytes)
    (EVIDENCE / "resource-baseline.protocol.json").write_bytes(default_bytes)
    (ROOT / mixed_path).write_bytes(encoded(new_mixed))
    slots = []
    for (slot, profile), target in zip(ORDER, destinations):
        value = bound(baseline if profile == "baseline" else mixed, str(target.relative_to(ROOT)), slot)
        target.write_bytes(encoded(value))
        slots.append({"slot": slot, "profile": profile, "path": str(target.relative_to(ROOT)), "protocolSHA256": sha(target.read_bytes())})
    assert hashes == {name: sha((ROOT / name).read_bytes()) for name in files}, "Source drift after binding"
    condition_hashes = {key: {"originalSHA256": sha(canonical(original[key])), "beforeSHA256": sha(canonical(baseline[key])), "afterSHA256": sha(canonical(new_default[key])), "equal": original[key] == baseline[key] == new_default[key]} for key in CONDITIONS}
    record = {"status": "BOUND_ONLY_NO_EXECUTION", "atUTC": now, "head": head, "candidateSHA256": candidate_sha, "sourceManifestSHA256": manifest, "instrumentSHA256": hashes["tools/board-resource.mjs"], "preserved": preserved, "unchangedBaselineConditionGroups": CONDITIONS, "baselineConditionHashes": condition_hashes, "allowedRegistrationKeys": sorted(metadata_keys), "mixedUnchangedConditionKeys": mixed_unchanged, "defaultProtocolSHA256": sha(default_bytes), "mixedProtocolSHA256": sha((ROOT / mixed_path).read_bytes()), "defaultAndEvidenceByteIdentical": default_bytes == (EVIDENCE / "resource-baseline.protocol.json").read_bytes(), "slots": slots}
    (EVIDENCE / "memory-diagnostic-binding.json").write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
