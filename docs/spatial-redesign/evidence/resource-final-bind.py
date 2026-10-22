#!/usr/bin/env python3
"""Final-layout CSS-only full-profile registration. Default: read-only preflight."""
import argparse
import copy
import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
B = Path("docs/spatial-redesign/evidence")
DEFAULT = Path("evaluation/board-resource.protocol.json")
BASELINE_COPY = B / "resource-baseline.protocol.json"
MIXED = B / "resource-mixed.protocol.json"
BASELINE_ENTRY = B / "resource-final-baseline.protocol.json"
MIXED_COPY = B / "resource-final-mixed.protocol.json"
ENTRIES = {DEFAULT: BASELINE_ENTRY, MIXED: MIXED_COPY}
PROBE = B / "resource-elapsed-baseline.protocol.json"
MISE = Path("/home/lizhi/.local/bin/mise")
PRIOR_MANIFEST = "9bf3f70d400881cebeb939fd21b6ed1c5525cecddb45c38cf57870fb75f537e8"
MANIFEST = "b380844819cf766dd0e8b0eed14c73aedae030c33c767852cd62dd8c7fe7ceeb"
APPROVED_CHANGES = {
    "public/house.css":"93416803dd11cb80b372c67488c8be8f9b94f34f64b96f8bb706d8dd39a36325",
}
PINS = {
    DEFAULT: "fed4f30bfcc83b04e95e46a528fea9e5bcdde5137451bf67784483a7797d8f93",
    BASELINE_COPY: "fed4f30bfcc83b04e95e46a528fea9e5bcdde5137451bf67784483a7797d8f93",
    MIXED: "cb7c9121ad96fdfe3093c0e06b98c8ea831d520b9bdc2322489e1e5d79b6e71d",
    Path("evaluation/board-resource.results.json"): "a49b47e59731ae0c7419c37c2cec82459a5c5a200adabe42857705d07d148594",
    B / "resource-mixed.results.json": "8014ef6a7c29c773499bdb5b5eb6a1f82f40417ffb0a980880455fc9394700e4",
    B / "resource-baseline.results.json": "a49b47e59731ae0c7419c37c2cec82459a5c5a200adabe42857705d07d148594",
    PROBE: "fed4f30bfcc83b04e95e46a528fea9e5bcdde5137451bf67784483a7797d8f93",
    B / "resource-elapsed-mixed.protocol.json":"cb7c9121ad96fdfe3093c0e06b98c8ea831d520b9bdc2322489e1e5d79b6e71d",
}
ALLOWED = frozenset(("commands", "instrumentSHA256", "memoryDiagnosticRegistration",
    "registeredAtUTC", "sourceBinding", "sourceFiles", "sourceHashes", "sourceManifestSHA256", "status"))
BASELINE_GROUPS = ("schemaVersion", "durationSeconds", "automaticRetry", "configuration",
    "fixture", "workload", "slowReader", "negativeControls", "bounds", "measurement",
    "classification", "limitations", "storageAcceptance", "baseWorkloadRegisteredAtUTC")
MIXED_GROUPS = ("configuration", "fixture", "workload", "slowReader", "negativeControls",
    "bounds", "measurement", "storageAcceptance", "gameScenario", "pictureScenario", "spatialScenario")
PREIMAGES = {
    DEFAULT: B / "resource-final-prebinding-default.protocol.json",
    BASELINE_COPY: B / "resource-final-prebinding-baseline-copy.protocol.json",
    MIXED: B / "resource-final-prebinding-mixed.protocol.json",
    Path("evaluation/board-resource.results.json"): B / "resource-final-prebinding-default.results.json",
    B / "resource-mixed.results.json": B / "resource-final-prebinding-mixed.results.json",
    B / "resource-baseline.results.json": B / "resource-final-prebinding-baseline-copy.results.json",
}
RECORD = B / "resource-final-binding.json"
INSPECTIONS = [B / "resource-final-baseline.inspect.json", B / "resource-final-mixed.inspect.json"]
INSPECTION_ERRORS = [B / "resource-final-baseline.inspect.stderr.txt", B / "resource-final-mixed.inspect.stderr.txt"]


def require(value, code):
    if not value:
        raise ValueError(code)


def digest(value):
    return hashlib.sha256(value).hexdigest()


def read(path):
    return json.loads((ROOT / path).read_text())


def encode(value):
    return (json.dumps(value, ensure_ascii=True, indent=2) + "\n").encode()


def canonical(value):
    return digest(json.dumps(value, sort_keys=True, separators=(",", ":")).encode())


def sources(probe):
    names = probe["sourceFiles"]
    require(len(names) == len(set(names)) == 53 and names == sorted(names)
            and set(names) == set(probe["sourceHashes"]), "SOURCE_ALLOWLIST_DRIFT")
    hashes = {n:digest((ROOT / n).read_bytes()) for n in names}
    require(hashes == {**probe["sourceHashes"], **APPROVED_CHANGES} and digest(json.dumps(hashes, separators=(",", ":")).encode()) == MANIFEST,
            "CURRENT_SOURCE_DRIFT")
    return hashes


def exclusive(path, data):
    with (ROOT / path).open("xb") as handle:
        handle.write(data)


def prepare():
    for path, expected in PINS.items():
        require(digest((ROOT / path).read_bytes()) == expected, "PREBINDING_DRIFT:" + str(path))
    fresh_outputs = [Path(str(entry).replace(".protocol.json", suffix))
                     for entry in ENTRIES.values()
                     for suffix in [".results.json", ".memory-diagnostic.json", ".rate-attribution.json", ".log", ".closure.json"]]
    for path in [*PREIMAGES.values(), RECORD, *INSPECTIONS, *INSPECTION_ERRORS, BASELINE_ENTRY, MIXED_COPY, *fresh_outputs]:
        require(not (ROOT / path).exists() and not (ROOT / path).is_symlink(), "OUTPUT_COLLISION:" + str(path))
    require(MISE.is_absolute() and MISE.is_file() and os.access(MISE, os.X_OK), "MISE_UNAVAILABLE")
    probe = read(PROBE)
    hashes = sources(probe)
    require(probe["sourceManifestSHA256"] == PRIOR_MANIFEST and hashes["tools/board-resource.mjs"] == probe["sourceHashes"]["tools/board-resource.mjs"],
            "SOURCE_BINDING_MISMATCH")
    now = datetime.now(timezone.utc).isoformat()
    candidates, checks = {}, {}
    for path, groups in [(DEFAULT, BASELINE_GROUPS), (MIXED, MIXED_GROUPS)]:
        old = read(path)
        require(old["sourceFiles"] == probe["sourceFiles"] and "rateAttribution" not in old, "FULL_PROFILE_SOURCE_OR_TRACE_DRIFT")
        new = copy.deepcopy(old)
        launch = str(MISE) + " exec -- node tools/board-resource.mjs --protocol-file " + ENTRIES[path].as_posix()
        new.update({"registeredAtUTC": now, "status": "FROZEN_CURRENT_FULL_RESOURCE_REGISTRATION_ONLY",
            "sourceHashes": dict(hashes), "sourceManifestSHA256": MANIFEST,
            "instrumentSHA256": hashes["tools/board-resource.mjs"],
            "commands": {"inspect":launch + " --inspect", "run":launch + " --run --go <protocolSHA256> --freeze " + MANIFEST},
            "sourceBinding": {"status":"FROZEN_PARENT_BINDING_ONLY", "boundAtUTC":now,
                "head":subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip(),
                "runtimeScope":"CSS-only final layout; elapsed-clock backend and failure-category instruments unchanged",
                "requiredFiles":53, "node":"v24.21.0", "priorProtocolSHA256":PINS[path],
                "priorSourceProofProtocolSHA256":PINS[PROBE], "priorSourceManifestSHA256":PRIOR_MANIFEST,
                "approvedSourceChanges":APPROVED_CHANGES,
                "registrationScriptSHA256":digest(Path(__file__).read_bytes()),
                "authorization":"Registration and inspection only; parent owns separate full execution GO"},
            "memoryDiagnosticRegistration": {"schemaVersion":1,
                "purpose":"One NEW final-layout300second source qualification; original100ms sampler and gates unchanged; no rate trace opt-in",
                "execution":"NOT_RUN_REQUIRES_SEPARATE_PARENT_GO", "automaticRetry":False}})
        require(set(old) == set(new), "PROTOCOL_KEYSET_DRIFT")
        for key in set(old) - ALLOWED:
            require(old[key] == new[key], "CONDITION_DRIFT:" + key)
        require("rateAttribution" not in new and "rateAttributionRegistration" not in new, "TRACE_OPT_IN_LEAK")
        checks[path.as_posix()] = {k:{"old":canonical(old[k]),"new":canonical(new[k]),"equal":old[k]==new[k]} for k in groups}
        candidates[path] = new
    return probe, candidates, checks


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bind", action="store_true")
    parser.add_argument("--parent-binding-go", action="store_true")
    parser.add_argument("--required-completion")
    parser.add_argument("--required-completion-sha256")
    args = parser.parse_args()
    probe, candidates, checks = prepare()
    report = {"status":"PREFLIGHT_ONLY_NO_PROTOCOL_WRITTEN", "sourceManifestSHA256":MANIFEST,
        "sourceFiles":53, "instrumentSHA256":sources(probe)["tools/board-resource.mjs"],
        "spatialInstrumentSHA256":sources(probe)["tools/spatial-resource.mjs"], "approvedSourceChanges":APPROVED_CHANGES,
        "unchangedConditionHashes":checks,"allowedRegistrationKeys":sorted(ALLOWED),
        "preimagePaths":{str(k):str(v) for k,v in PREIMAGES.items()}, "execution":"NOT_RUN"}
    if not args.bind:
        print(json.dumps(report, indent=2))
        return
    require(args.parent_binding_go, "PARENT_BINDING_GO_REQUIRED_AFTER_ATTRIBUTION_REVIEW")
    require(args.required_completion is not None and re.fullmatch(r"\.local/spatial-apply/required-current-[0-9]+\.json",args.required_completion), "REQUIRED_COMPLETION_PATH")
    completion=Path(args.required_completion)
    require(not (ROOT/completion).is_symlink() and digest((ROOT/completion).read_bytes())==args.required_completion_sha256,"REQUIRED_COMPLETION_HASH")
    required=read(completion); current=sources(probe)
    for name,expected in current.items():
        require(digest(subprocess.check_output(["git","show","HEAD:"+name],cwd=ROOT))==expected,"SOURCE_NOT_AT_GIT_HEAD:"+name)
    require(type(required.get("exitCode")) is int and required["exitCode"]==0 and required.get("sourceUnchanged") is True,"REQUIRED_CHECK_NOT_GREEN")
    before,after=required.get("sourceBefore"),required.get("sourceAfter")
    omissions={"fly.toml","mise.toml","tools/board-resource-p7.mjs","tools/board-resource.mjs","tools/spatial-resource.mjs"}
    require(isinstance(before,dict) and before==after and set(current)-set(after)==omissions and all(after[n]==h for n,h in current.items() if n in after),"REQUIRED_CHECK_STALE_OR_INCOMPLETE")
    required_proof={"path":str(completion),"sha256":args.required_completion_sha256,"exitCode":0,"sourceUnchanged":True,"coveredFiles":48}
    report["requiredCheckEvidence"]=required_proof
    for candidate in candidates.values():candidate["sourceBinding"]["requiredCheckEvidence"]=required_proof
    for original, saved in PREIMAGES.items():
        exclusive(saved, (ROOT / original).read_bytes())
        require(digest((ROOT / saved).read_bytes()) == PINS[original], "PREIMAGE_COPY_MISMATCH")
    protected = {p:digest(p.read_bytes()) for p in (ROOT / B).iterdir()
                 if p.is_file() and p not in {ROOT / BASELINE_COPY, ROOT / MIXED}}
    sources(probe)
    for path, candidate in candidates.items():
        (ROOT / path).write_bytes(encode(candidate))
    (ROOT / BASELINE_COPY).write_bytes((ROOT / DEFAULT).read_bytes())
    exclusive(BASELINE_ENTRY, (ROOT / DEFAULT).read_bytes())
    exclusive(MIXED_COPY, (ROOT / MIXED).read_bytes())
    inspection_results = []
    for index, path in enumerate(ENTRIES.values()):
        run = subprocess.run([str(MISE),"exec","--","node","tools/board-resource.mjs","--protocol-file",str(path),"--inspect"],
                             cwd=ROOT,text=True,capture_output=True)
        exclusive(INSPECTIONS[index], run.stdout.encode())
        exclusive(INSPECTION_ERRORS[index], run.stderr.encode())
        parsed = json.loads(run.stdout)
        inspection_results.append({"path":str(path),"status":parsed.get("status"),"exitCode":run.returncode,
                                   "protocolSHA256":digest((ROOT / path).read_bytes())})
        require(run.returncode == 0 and parsed.get("status") == "READY", "INSPECTION_FAILED_STOP_NO_RETRY")
    sources(probe)
    require(all(digest(path.read_bytes()) == expected for path,expected in protected.items()), "PROTECTED_HISTORY_DRIFT")
    require((ROOT / DEFAULT).read_bytes() == (ROOT / BASELINE_COPY).read_bytes(), "BASELINE_COPY_MISMATCH")
    require((ROOT / DEFAULT).read_bytes() == (ROOT / BASELINE_ENTRY).read_bytes(), "BASELINE_ENTRY_MISMATCH")
    require((ROOT / MIXED).read_bytes() == (ROOT / MIXED_COPY).read_bytes(), "MIXED_COPY_MISMATCH")
    require(all(digest((ROOT / original).read_bytes()) == PINS[original]
                for original in PREIMAGES if original.suffixes[-2:] == [".results", ".json"]), "OLD_RESULT_MUTATED")
    report.update({"status":"REGISTERED_READY_FULL_EXECUTION_NOT_RUN", "inspections":inspection_results,
        "defaultAndDocsByteIdentical":True,"protectedHistoryUnchanged":True,"oldResultsUnchanged":True,
        "protectedHistoryFiles":len(protected),"preimageSHA256":{str(saved):PINS[original] for original,saved in PREIMAGES.items()},
        "freshExecutionEntryPoints":{str(k):str(v) for k,v in ENTRIES.items()},
        "entrypointMetadata":"Copies share canonical protocol bytes/SHA. These explicit alternate CLI paths produce fresh results while canonical old results remain untouched.",
        "fullRunCommands":[str(MISE) + " exec -- node tools/board-resource.mjs --protocol-file " + str(entry)
            + " --run --go " + digest((ROOT / canonical_path).read_bytes()) + " --freeze " + MANIFEST
            for canonical_path,entry in ENTRIES.items()]})
    exclusive(RECORD, encode(report))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        raise SystemExit(str(error))
