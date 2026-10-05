#!/usr/bin/env python3
"""Bounded local A/B trials. Preserves the user's model, configuration and sandbox."""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import threading
import tomllib
import time

ROOT = Path("/home/lizhi/comp4020/comp4020-ass2-Naaeeen")
RESEARCH = ROOT / "docs/harness-research"
EVAL = RESEARCH / "eval"
SCRATCH = Path("/tmp/a2-harness-research-ypetx37a")
CODEX = "/home/lizhi/.local/bin/codex"
PRINT_LOCK = threading.Lock()
EXPECTED_TRIAL_REGISTRATIONS: set[str] = set()


def emit(value):
    with PRINT_LOCK:
        print(json.dumps(value, ensure_ascii=False), flush=True)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def redact(text):
    text = re.sub(r"sk-[A-Za-z0-9_-]{20,}", "[REDACTED]", str(text))
    text = re.sub(r"(?i)(authorization:\s*(?:bearer\s+)?)[^\s\"']+", r"\1[REDACTED]", text)
    return text


def config_snapshot():
    path = Path("/home/lizhi/.codex/config.toml")
    raw = path.read_bytes()
    config = tomllib.loads(raw.decode())
    registrations = {}
    projects = config.get("projects", {})
    for workspace in EXPECTED_TRIAL_REGISTRATIONS:
        if workspace in projects:
            value = projects[workspace]
            if value != {"trust_level": "trusted"}:
                raise RuntimeError("Unexpected configuration for an evaluation workspace")
            registrations[workspace] = value
            del projects[workspace]
    # Only the client's normal trust registrations for this round's exact,
    # predeclared fixture paths are excluded. Every other setting is frozen.
    canonical = json.dumps(config, sort_keys=True, separators=(",", ":"), default=str)
    return {
        "effective_config_sha256": hashlib.sha256(canonical.encode()).hexdigest(),
        "raw_config_sha256": hashlib.sha256(raw).hexdigest(),
        "automatic_fixture_registrations": registrations,
    }


def fixed_environment():
    result = {"effective_config_sha256": config_snapshot()["effective_config_sha256"]}
    for name in ("AGENTS.md", "AGENTS.override.md"):
        path = Path("/home/lizhi/.codex") / name
        result[str(path)] = sha(path) if path.exists() else None
    return result


def call(args, cwd=ROOT, timeout=180):
    return subprocess.run(args, cwd=cwd, text=True, capture_output=True, timeout=timeout)


def read_json(path):
    return json.loads(Path(path).read_text())


def execute_agent(workspace, prompt, output_dir, timeout):
    final_path = output_dir / "final.txt"
    args = [CODEX, "exec", "--ephemeral", "--json", "--cd", str(workspace),
            "--output-last-message", str(final_path), "-"]
    started = time.monotonic()
    record = {"run_status": "RUNNING", "commands": [], "events": [], "usage": None,
              "exit_code": None, "elapsed_seconds": None, "stderr": ""}
    process = subprocess.Popen(args, cwd=workspace, stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               text=True, bufsize=1, start_new_session=True)

    def stdout_reader():
        for line in process.stdout:
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            kind = event.get("type")
            item = event.get("item", {})
            if kind == "turn.completed":
                record["usage"] = event.get("usage")
            if kind in ("thread.started", "turn.started", "turn.completed", "turn.failed", "error"):
                record["events"].append(event)
            elif kind == "item.completed" and item.get("type") == "command_execution":
                record["commands"].append({
                    "command": redact(item.get("command", "")),
                    "exit_code": item.get("exit_code"),
                    "output": redact(item.get("aggregated_output", ""))[-8000:],
                })
            elif kind == "item.completed" and item.get("type") == "file_change":
                record["events"].append({"type": kind, "item": {
                    "type": "file_change", "changes": item.get("changes"), "status": item.get("status")}})
            elif kind == "item.completed" and item.get("type") in ("mcp_tool_call", "web_search"):
                # Record tool identity only. Do not collect private remote contents or reasoning.
                record["events"].append({"type": kind, "item": {
                    key: item.get(key) for key in ("type", "server", "tool", "status")}})
            # Reasoning items and their text are intentionally discarded.

    def stderr_reader():
        for line in process.stderr:
            record["stderr"] = redact(record["stderr"] + line)[-4000:]

    readers = [threading.Thread(target=stdout_reader), threading.Thread(target=stderr_reader)]
    for thread in readers:
        thread.start()
    common = (
        "Work only in this isolated copy of the A2 repository. Preserve pre-existing user work. "
        "Do not access other project directories, personal credentials, or external account state. "
        "Do not push, publish, change settings, or perform other external writes. "
        "First read AGENTS.md and CLAUDE.md in this fixture, then use the project instructions and tools for the task below.\n\n"
    )
    process.stdin.write(common + prompt)
    process.stdin.close()
    try:
        process.wait(timeout=timeout)
        record["run_status"] = "COMPLETED" if process.returncode == 0 else "INFRA"
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=8)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=8)
        record["run_status"] = "TIMEOUT"
    for thread in readers:
        thread.join(timeout=10)
    record["exit_code"] = process.returncode
    record["elapsed_seconds"] = round(time.monotonic() - started, 3)
    record["final_exists"] = final_path.exists()
    if final_path.exists():
        final_path.write_text(redact(final_path.read_text()), encoding="utf-8")
    record["command_count"] = len(record["commands"])
    record["claude_read_observed"] = any(
        "CLAUDE.md" in cmd["command"] and
        any(word in cmd["command"] for word in ("cat", "sed", "read", "head", "python", "awk"))
        for cmd in record["commands"]
    )
    # This is a trace heuristic; a read flag alone is not behavioral success.
    (output_dir / "trace.json").write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n")
    return record, final_path


def trial(case_id, variant, harness, round_name, timeout, invariant_hashes, round_environment):
    identity = f"{round_name}-{case_id}-{variant}"
    workspace = SCRATCH / "trials" / identity
    output_dir = RESEARCH / "results" / round_name / identity
    if workspace.exists() or output_dir.exists():
        raise RuntimeError(f"Refusing to reuse trial state: {identity}")
    workspace.parent.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=False)
    before_env = fixed_environment()
    before_config_metadata = config_snapshot()
    if before_env != round_environment:
        raise RuntimeError("Global configuration differs from the frozen round state")
    if not all(Path(path).exists() and sha(path) == digest for path, digest in invariant_hashes.items()):
        raise RuntimeError("A frozen evaluator or candidate file changed before the trial")
    emit({"trial": identity, "state": "PREPARING"})
    prepared = call(["python3", str(EVAL / "fixtures.py"), "prepare", "--case", case_id,
                     "--dest", str(workspace), "--harness", str(harness)], timeout=240)
    (output_dir / "preparation.txt").write_text(redact(prepared.stdout + prepared.stderr))
    manifest_path = Path(str(workspace) + ".manifest.json")
    if prepared.returncode or not manifest_path.exists():
        record = {"trial": identity, "status": "INFRA", "stage": "fixture",
                  "exit_code": prepared.returncode}
        (output_dir / "result.json").write_text(json.dumps(record, indent=2) + "\n")
        emit(record)
        return record
    manifest = read_json(manifest_path)
    trusted_manifest = output_dir / "manifest.json"
    shutil.copy2(manifest_path, trusted_manifest)
    manifest_hash = sha(trusted_manifest)
    emit({"trial": identity, "state": "RUNNING"})
    trace, final_path = execute_agent(workspace, manifest["prompt"], output_dir, timeout)
    unchanged_grader = all(sha(path) == digest for path, digest in invariant_hashes.items())
    unchanged_environment = before_env == fixed_environment() == round_environment
    unchanged_manifest = sha(trusted_manifest) == manifest_hash
    if not unchanged_grader or not unchanged_manifest:
        grading = {"status": "INFRA", "violations": ["Evaluator files changed during trial"]}
    else:
        emit({"trial": identity, "state": "GRADING"})
        judged = call(["python3", str(EVAL / "grader.py"), "--case", case_id,
                       "--workspace", str(workspace), "--manifest", str(trusted_manifest),
                       "--trace", str(output_dir / "trace.json"), "--final", str(final_path)],
                      timeout=240)
        (output_dir / "grader-stdout.txt").write_text(redact(judged.stdout))
        (output_dir / "grader-stderr.txt").write_text(redact(judged.stderr))
        try:
            grading = json.loads(judged.stdout)
        except json.JSONDecodeError:
            grading = {"status": "INFRA", "violations": ["Grader did not return one JSON object"],
                       "grader_exit_code": judged.returncode}
    diff = call(["git", "diff", "--no-ext-diff", manifest["baseline_head"], "--", "."], cwd=workspace)
    (output_dir / "artifact.diff").write_text(redact(diff.stdout), encoding="utf-8")
    status = call(["git", "status", "--short"], cwd=workspace)
    (output_dir / "git-status.txt").write_text(status.stdout)
    if trace["run_status"] != "COMPLETED":
        final_status = trace["run_status"]
    elif not unchanged_environment or not unchanged_grader or not unchanged_manifest:
        final_status = "INFRA"
    else:
        final_status = grading.get("status", "INFRA")
    record = {
        "trial": identity, "execution_started": True, "round": round_name, "case_id": case_id, "variant": variant,
        "harness_sha256": sha(harness), "workspace": str(workspace),
        "status": final_status, "run_status": trace["run_status"], "grading": grading,
        "elapsed_seconds": trace["elapsed_seconds"], "usage": trace["usage"],
        "command_count": trace["command_count"], "claude_read_observed": trace["claude_read_observed"],
        "grader_unchanged": unchanged_grader, "environment_unchanged": unchanged_environment,
        "manifest_unchanged": unchanged_manifest, "manifest_sha256": manifest_hash,
        "confirmed_artifact_failure": grading.get("status") == "FAIL",
        "environment_hashes": before_env,
        "config_metadata_before": before_config_metadata,
        "config_metadata_after": config_snapshot(),
    }
    (output_dir / "result.json").write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n")
    emit({"trial": identity, "status": final_status, "seconds": trace["elapsed_seconds"],
          "commands": trace["command_count"], "usage": trace["usage"]})
    return record


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--round", required=True)
    parser.add_argument("--candidate", required=True, type=Path)
    parser.add_argument("--cases", default="D1,D2,D3,D4,D5,D6")
    parser.add_argument("--parallel", type=int, default=2)
    parser.add_argument("--timeout", type=int, default=480)
    parser.add_argument("--reverse", action="store_true")
    options = parser.parse_args()
    assert 1 <= options.parallel <= 2
    assert options.candidate.is_file()
    baseline = RESEARCH / "baseline.CLAUDE.md.txt"
    evaluator_paths = [EVAL / "fixtures.py", EVAL / "grader.py", EVAL / "protocol.json", EVAL / "run_trials.py"]
    invariants = {str(path): sha(path) for path in evaluator_paths + [baseline, options.candidate]}
    assert re.fullmatch(r"[a-z][a-z0-9_-]{0,39}", options.round)
    cases = options.cases.split(",")
    EXPECTED_TRIAL_REGISTRATIONS.update(
        str(SCRATCH / "trials" / f"{options.round}-{case}-{variant}")
        for case in cases for variant in ("A", "B")
    )
    round_environment = fixed_environment()
    config = tomllib.loads(Path("/home/lizhi/.codex/config.toml").read_text())
    protocol = read_json(EVAL / "protocol.json")
    valid_cases = {case["case_id"] for case in protocol["cases"]}
    assert all(case in valid_cases for case in cases)
    round_dir = RESEARCH / "results" / options.round
    round_dir.mkdir(parents=True, exist_ok=True)
    definition = {
        "round": options.round, "cases": cases, "parallel_case_pairs": options.parallel,
        "per_trial_timeout_seconds": options.timeout, "reverse": options.reverse,
        "evaluator_hashes": invariants, "baseline_sha256": sha(baseline),
        "candidate_sha256": sha(options.candidate), "environment_hashes": round_environment,
        "config_metadata_at_start": config_snapshot(),
        "configured_model": config.get("model"), "configured_effort": config.get("model_reasoning_effort"),
        "isolation": "new fixture and ephemeral agent for every trial",
        "latency_caveat": "two case pairs may share host resources; not a controlled speed benchmark",
    }
    definition_path = round_dir / "round-definition.json"
    assert not definition_path.exists(), "Do not overwrite a completed or active round"
    definition_path.write_text(json.dumps(definition, indent=2) + "\n")

    def pair(index_case):
        index, case = index_case
        variants = [("A", baseline), ("B", options.candidate)]
        if (index % 2 == 1) != options.reverse:
            variants.reverse()
        values = []
        for variant, harness in variants:
            try:
                values.append(trial(case, variant, harness, options.round, options.timeout, invariants, round_environment))
            except Exception as error:
                record = {"trial": f"{options.round}-{case}-{variant}", "status": "INFRA",
                          "error": redact(repr(error)), "execution_started": False}
                emit(record)
                values.append(record)
        return values

    records = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=options.parallel) as executor:
        futures = [executor.submit(pair, item) for item in enumerate(cases)]
        for future in concurrent.futures.as_completed(futures):
            records.extend(future.result())
            (round_dir / "summary.json").write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n")
    emit({"round": options.round, "finished_trials": len(records),
          "statuses": {status: sum(record["status"] == status for record in records)
                       for status in sorted({record["status"] for record in records})}})


if __name__ == "__main__":
    main()
