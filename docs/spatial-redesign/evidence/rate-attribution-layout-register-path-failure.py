#!/usr/bin/env python3
"""Prepare one registration; default operation is read-only and never runs load."""
import argparse
import copy
import hashlib
import json
import math
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = Path("docs/spatial-redesign/evidence")
STEM = EVIDENCE / "rate-attribution-final-layout"
BASE = EVIDENCE / "rate-attribution-reviewed-final.protocol.json"
PLAN = EVIDENCE / "rate-attribution-layout-registration-plan.md"
BASE_SHA = "6e0e195716a18a57655a94a0f31d1101eb9cc75e4f422156a79b3a43d8668259"
PINNED_PROTOCOLS = {
    BASE.as_posix(): BASE_SHA,
    (EVIDENCE / "rate-attribution-probe.protocol.json").as_posix(): "58a1f35cd20fd7961c3758d8025ef061accedcb99bf27ec739b14bec7633e62e",
    (EVIDENCE / "resource-mixed.protocol.json").as_posix(): "48a0d5f34a65fcab5fb1396afaff90e29915eb0d5f375ea2345e397f05c32255",
    (EVIDENCE / "memory-diagnostic-A1.protocol.json").as_posix(): "b4286e395148222a8d936c696bd00949deb1ccb178fdb65a034ff0b4caa3a01a",
    (EVIDENCE / "memory-diagnostic-B1.protocol.json").as_posix(): "8d80b9c54347235b6e847b2757b50dfce95859dd1c841545e465c73c9874cc46",
    (EVIDENCE / "memory-diagnostic-B2.protocol.json").as_posix(): "a6612bc1efe50df9a66c1aa81ac083744de2d0d6eab8007b41f497f7a2bc1ef3",
    (EVIDENCE / "memory-diagnostic-A2.protocol.json").as_posix(): "228420f71ae6b6330fc4567459033b84137bc6f6e72090df56358a9674d9e7af",
}
LAYOUT_HASHES = {
    "public/house-puzzle-ui.js": "8cd1edc8449ba10009094534b2de1387e3d74bf665871e00e2f3f06e213540f8",
    "public/house.css": "57eb2039f0a55fe0530b91d9784a8c91466297f552fb9e93f5fb1f693474cce9",
    "public/house-ui.js": "2541507c8998719b22da2f4312e1a75ee3aa1eb1e53f1765c2ecf6f6a4f40d2a",
}
MIXED_GROUPS = (
    "configuration", "fixture", "workload", "slowReader", "negativeControls",
    "bounds", "measurement", "storageAcceptance", "gameScenario",
    "pictureScenario", "spatialScenario",
)
REGISTRATION_KEYS = frozenset((
    "commands", "instrumentSHA256", "memoryDiagnosticRegistration",
    "registeredAtUTC", "sourceBinding", "sourceFiles", "sourceHashes",
    "sourceManifestSHA256", "status",
))
RATE_METADATA_KEYS = frozenset(("sourceReview", "priorReviewedFinalProtocolSHA256"))
REQUIRED_OMISSIONS = frozenset((
    "fly.toml", "mise.toml", "tools/board-resource-p7.mjs",
    "tools/board-resource.mjs", "tools/spatial-resource.mjs",
))
SUFFIXES = (
    ".protocol.json", "-registration.json", ".inspect.json", ".results.json",
    ".memory-diagnostic.json", ".rate-attribution.json", ".log", ".closure.json",
)


def require(condition, code):
    if not condition:
        raise ValueError(code)


def sha_bytes(value):
    return hashlib.sha256(value).hexdigest()


def file_sha(path):
    return sha_bytes((ROOT / path).read_bytes())


def canonical_sha(value):
    return sha_bytes(json.dumps(value, sort_keys=True, separators=(",", ":")).encode())


def read_json(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def output_paths(stem=STEM):
    return [Path(str(stem) + suffix) for suffix in SUFFIXES]


def require_unused(paths, root=ROOT):
    require(all(not (root / p).exists() and not (root / p).is_symlink() for p in paths),
            "OUTPUT_PATH_ALREADY_EXISTS")


def validate_candidate(base, candidate):
    require(set(base) == set(candidate), "PROTOCOL_KEYSET_DRIFT")
    for key in set(base) - REGISTRATION_KEYS - {"rateAttributionRegistration"}:
        require(candidate[key] == base[key], "CONDITION_DRIFT:" + key)
    old_rate, new_rate = base["rateAttributionRegistration"], candidate["rateAttributionRegistration"]
    require(set(old_rate) ^ set(new_rate) <= RATE_METADATA_KEYS, "RATE_METADATA_KEYSET_DRIFT")
    for key in set(old_rate) | set(new_rate):
        if key not in RATE_METADATA_KEYS:
            require(old_rate.get(key) == new_rate.get(key), "RATE_METADATA_DRIFT:" + key)
    require(candidate["sourceFiles"] == base["sourceFiles"], "SOURCE_ALLOWLIST_DRIFT")
    require(candidate["memoryDiagnosticRegistration"] == base["memoryDiagnosticRegistration"],
            "MEMORY_DIAGNOSTIC_METADATA_DRIFT")
    require(len(candidate["sourceFiles"]) == 53, "SOURCE_FILE_COUNT")
    require(set(candidate["sourceHashes"]) == set(base["sourceFiles"]), "SOURCE_HASH_KEYSET")
    require(candidate["instrumentSHA256"] == candidate["sourceHashes"]["tools/board-resource.mjs"],
            "INSTRUMENT_HASH_DISAGREEMENT")


def source_preflight(base):
    names = base["sourceFiles"]
    require(len(names) == 53 and len(set(names)) == 53 and names == sorted(names), "SOURCE_ALLOWLIST")
    require(set(names) == set(base["sourceHashes"]), "SOURCE_HASH_KEYSET")
    # Do not search local configuration. These two explicit production directories
    # detect a newly added backend/house module absent from the frozen allowlist.
    backend = {p.relative_to(ROOT).as_posix() for p in (ROOT / "src").glob("*.ts")}
    house = {p.relative_to(ROOT).as_posix() for p in (ROOT / "public").glob("house*") if p.is_file()}
    require(len(backend) == 17 and backend | house <= set(names), "PRODUCTION_COVERAGE_DRIFT")
    hashes = {}
    for name in names:
        data = (ROOT / name).read_bytes()
        require(b"\r\n" not in data, "CRLF_SOURCE:" + name)
        hashes[name] = sha_bytes(data)
        expected = LAYOUT_HASHES.get(name, base["sourceHashes"][name])
        require(hashes[name] == expected, "FROZEN_SOURCE_DRIFT:" + name)
    ignored = subprocess.run(
        ["git", "check-ignore", "--no-index", "--stdin"], cwd=ROOT,
        input="\n".join(names) + "\n", text=True, capture_output=True, check=False,
    )
    require(ignored.returncode == 1 and not ignored.stdout, "IGNORED_OR_UNCHECKED_SOURCE")
    # Match the runtime's sorted-key JSON.stringify manifest exactly.
    manifest = sha_bytes(json.dumps(hashes, separators=(",", ":")).encode())
    return hashes, manifest


def validate_required(record, hashes):
    require(type(record.get("exitCode")) is int and record["exitCode"] == 0,
            "REQUIRED_CHECK_NOT_GREEN")
    require(record.get("sourceUnchanged") is True, "REQUIRED_CHECK_SOURCE_CHANGED")
    require(isinstance(record.get("finishedAt"), (int, float))
            and not isinstance(record["finishedAt"], bool) and math.isfinite(record["finishedAt"]),
            "REQUIRED_CHECK_NOT_COMPLETED")
    before, after = record.get("sourceBefore"), record.get("sourceAfter")
    require(isinstance(before, dict) and before == after, "REQUIRED_CHECK_MAP_DRIFT")
    require(set(hashes) - set(after) == REQUIRED_OMISSIONS, "REQUIRED_CHECK_COVERAGE")
    require(all(after[name] == digest for name, digest in hashes.items() if name in after),
            "REQUIRED_CHECK_STALE_SOURCE")
    return {"exitCode": 0, "sourceUnchanged": True, "finishedAt": record["finishedAt"],
            "coveredResourceFiles": 48, "directlyVerifiedOmissions": sorted(REQUIRED_OMISSIONS)}


def component_preflight():
    stem = EVIDENCE / "picture-layout-preflight-v5"
    result_path, packet_path = stem / "result-current-menu-scroll-first.json", stem / "FINAL-PACKET.json"
    result, packet = read_json(result_path), read_json(packet_path)
    require(result.get("status") == "PASS_COMPONENT_LAYOUT_VISUAL_REVIEW_PENDING",
            "V5_MECHANICAL_RESULT_NOT_PASS")
    require(result.get("sourceUnchanged") is True, "V5_SOURCE_CHANGED")
    require(packet.get("candidateExpectedSourceHashes") == LAYOUT_HASHES, "V5_LAYOUT_BINDING_DRIFT")
    require(result.get("protocolSHA256") == packet.get("protocolSHA256")
            and result.get("sourceManifestSHA256") == packet.get("sourceManifestSHA256"),
            "V5_RESULT_BINDING_DISAGREEMENT")
    cleanup = result.get("cleanup", {})
    contexts = cleanup.get("contexts", [])
    require(len(contexts) == 6 and all(c.get("closed") is True and c.get("closeEvent") is True
            and c.get("stillPresent") is False for c in contexts)
            and cleanup.get("browserDisconnected") is True and cleanup.get("remainingContexts") == 0
            and cleanup.get("errors") == [], "V5_CLEANUP_NOT_CONFIRMED")
    return {"resultPath": result_path.as_posix(), "resultSHA256": file_sha(result_path),
            "packetSHA256": file_sha(packet_path), "mechanicalStatus": result["status"],
            "evidenceScope": "Component only; final visual approval comes from explicit parent GO"}


def protected_history():
    own = {Path(__file__).name, PLAN.name}
    excluded = set(output_paths())
    paths = [Path("evaluation/board-resource.protocol.json"), Path("evaluation/board-resource.results.json")]
    paths += [p.relative_to(ROOT) for p in (ROOT / EVIDENCE).iterdir()
              if p.is_file() and p.name.startswith(("resource-", "memory-diagnostic-", "rate-attribution-"))
              and p.name not in own and p.relative_to(ROOT) not in excluded]
    return {p.as_posix(): file_sha(p) for p in sorted(paths)}


def prepare():
    for name, digest in PINNED_PROTOCOLS.items():
        require(file_sha(name) == digest, "HISTORICAL_PROTOCOL_DRIFT:" + name)
    require_unused(output_paths())
    base = read_json(BASE)
    for name, digest in base["sourceBinding"]["evaluationSpecHashes"].items():
        require(file_sha(name) == digest, "REVIEWED_EVALUATION_SPEC_DRIFT:" + name)
    mixed = read_json(EVIDENCE / "resource-mixed.protocol.json")
    for key in MIXED_GROUPS:
        require(base[key] == mixed[key], "MIXED_CONDITION_DRIFT:" + key)
    route_bound = read_json(EVIDENCE / "rate-attribution-route-bound.json")
    route_bound.pop("scope")
    require(base["rateAttribution"] == route_bound, "ROUTE_BOUND_DRIFT")
    routes = route_bound["routes"]
    require([r["actorIndex"] for r in routes] == [2, 4, 14, 16]
            and [r["moves"] for r in routes] == [41, 54, 41, 54]
            and [r["seatActions"] for r in routes] == [1, 1, 1, 1]
            and sum(r["moves"] + r["seatActions"] for r in routes) == route_bound["maximumRows"] == 194,
            "ROUTE_CAP_DRIFT")
    hashes, manifest = source_preflight(base)
    report = {
        "status": "PREFLIGHT_ONLY_NO_PROTOCOL_WRITTEN", "baseProtocolSHA256": BASE_SHA,
        "sourceManifestSHA256": manifest, "sourceFiles": 53, "backendFilesUnchanged": 17,
        "instrumentSHA256": hashes["tools/board-resource.mjs"],
        "spatialInstrumentSHA256": hashes["tools/spatial-resource.mjs"],
        "layoutSourceHashes": LAYOUT_HASHES, "attributesSHA256": hashes[".gitattributes"],
        "mixedConditionHashes": {k:canonical_sha(base[k]) for k in MIXED_GROUPS},
        "historicalRegistrationKeys": sorted(REGISTRATION_KEYS),
        "proposedNarrowRateMetadataKeys": sorted(RATE_METADATA_KEYS),
        "routeMaximumRows": 194, "component": component_preflight(),
        "unusedArtifactPaths": [p.as_posix() for p in output_paths()],
        "registrationHelperSHA256": file_sha(Path(__file__).relative_to(ROOT)),
        "planSHA256": file_sha(PLAN), "execution": "NOT_RUN; parent owns separate execution GO",
    }
    return base, hashes, report


def build_candidate(base, hashes, report, required):
    candidate = copy.deepcopy(base)
    now = datetime.now(timezone.utc).isoformat()
    protocol_path = output_paths()[0].as_posix()
    launch = "mise exec -- node tools/board-resource.mjs --protocol-file " + protocol_path
    candidate.update({
        "registeredAtUTC": now, "status": "FINAL_LAYOUT_ATTRIBUTION_REGISTRATION_ONLY",
        "sourceHashes": dict(hashes), "sourceManifestSHA256": report["sourceManifestSHA256"],
        "instrumentSHA256": report["instrumentSHA256"],
        "commands": {"inspect": launch + " --inspect", "run": launch + " --bootstrap-calibration",
                     "calibration": launch + " --bootstrap-calibration"},
        "sourceBinding": {
            "status": "FROZEN_PARENT_REGISTRATION_ONLY", "boundAtUTC": now,
            "head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
            "runtimeScope": "Unchanged 17 backend files and reviewed instruments; parent-approved final layout",
            "requiredFiles": 53, "node": base["sourceBinding"]["node"],
            "reviewedInstrumentHashes": base["sourceBinding"]["reviewedInstrumentHashes"],
            "evaluationSpecHashes": base["sourceBinding"]["evaluationSpecHashes"],
            "layoutSourceHashes": LAYOUT_HASHES, "attributesSHA256": hashes[".gitattributes"],
            "registrationPlanSHA256": report["planSHA256"],
            "registrationHelperSHA256": report["registrationHelperSHA256"],
            "componentEvidence": report["component"], "requiredCheckEvidence": required,
            "authorization": "Parent registration-only GO; separate execution GO required",
        },
    })
    candidate["rateAttributionRegistration"]["sourceReview"] = (
        "Parent-approved V5 final layout and green required check; reviewed rate instrument unchanged. "
        "Component, suite and resource evidence remain distinct."
    )
    candidate["rateAttributionRegistration"]["priorReviewedFinalProtocolSHA256"] = BASE_SHA
    validate_candidate(base, candidate)
    return candidate


def write_exclusive(path, value):
    with (ROOT / path).open("x", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(value, indent=2, ensure_ascii=True) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bind", action="store_true")
    parser.add_argument("--parent-registration-go", action="store_true")
    parser.add_argument("--approve-narrow-metadata", action="store_true")
    parser.add_argument("--confirm-source-manifest")
    parser.add_argument("--required-completion")
    parser.add_argument("--required-completion-sha256")
    args = parser.parse_args()
    base, hashes, report = prepare()
    if not args.bind:
        print(json.dumps(report, indent=2))
        return
    require(args.parent_registration_go and args.approve_narrow_metadata,
            "PARENT_REGISTRATION_AND_NARROW_METADATA_GO_REQUIRED")
    require(args.confirm_source_manifest == report["sourceManifestSHA256"], "MANIFEST_CONFIRMATION_REQUIRED")
    require(args.required_completion is not None and re.fullmatch(
        r"\.local/spatial-apply/required-current-[0-9]+\.json", args.required_completion),
        "ALLOWLISTED_REQUIRED_COMPLETION_REQUIRED")
    completion = Path(args.required_completion)
    require(not (ROOT / completion).is_symlink(), "REQUIRED_COMPLETION_SYMLINK")
    require(file_sha(completion) == args.required_completion_sha256, "REQUIRED_COMPLETION_HASH")
    required = validate_required(read_json(completion), hashes)
    required.update({"path": completion.as_posix(), "sha256": args.required_completion_sha256})
    history = protected_history()
    candidate = build_candidate(base, hashes, report, required)
    require(source_preflight(base)[0] == hashes, "PREWRITE_SOURCE_DRIFT")
    require_unused(output_paths())
    protocol_path, registration_path, inspect_path = output_paths()[:3]
    write_exclusive(protocol_path, candidate)
    inspection = subprocess.run(
        ["mise", "exec", "--", "node", "tools/board-resource.mjs", "--protocol-file", protocol_path.as_posix(), "--inspect"],
        cwd=ROOT, text=True, capture_output=True, check=False,
    )
    # Retain first stdout/stderr even if the inspector rejects this registration.
    with (ROOT / inspect_path).open("x", encoding="utf-8", newline="\n") as handle:
        handle.write(inspection.stdout)
        if inspection.stderr:
            handle.write("\n" + inspection.stderr)
    inspect_ok = False
    try:
        inspected = json.loads(inspection.stdout)
        inspect_ok = inspected.get("status") == "READY" and inspection.returncode == 0
    except ValueError:
        pass
    source_ok = source_preflight(base)[0] == hashes
    history_ok = protected_history() == history
    report.update({"status": "REGISTERED_EXECUTION_NOT_RUN" if inspect_ok and source_ok and history_ok else "REGISTRATION_FAILED",
                   "protocolPath": protocol_path.as_posix(), "protocolSHA256": file_sha(protocol_path),
                   "commands": candidate["commands"], "requiredCheckEvidence": required,
                   "inspectionExitCode": inspection.returncode, "inspectionReady": inspect_ok,
                   "sourceUnchanged": source_ok, "protectedHistoryUnchanged": history_ok,
                   "protectedHistoryFiles": len(history), "protectedHistoryManifestSHA256": canonical_sha(history)})
    write_exclusive(registration_path, report)
    print(json.dumps(report, indent=2))
    require(inspect_ok and source_ok and history_ok, "REGISTRATION_OR_INSPECTION_FAILED_NO_RETRY")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        raise SystemExit(str(error))
