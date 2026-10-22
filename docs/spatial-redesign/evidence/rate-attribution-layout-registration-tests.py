#!/usr/bin/env python3
"""Service-free registration controls. No protocol is written or inspected."""
import copy
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("rate-attribution-layout-register.py")
api = {"__file__": str(SCRIPT.resolve()), "__name__": "registration_controls"}
exec(compile(SCRIPT.read_text(), str(SCRIPT), "exec"), api)


class RegistrationControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base, cls.hashes, cls.report = api["prepare"]()

    def candidate(self):
        return api["build_candidate"](self.base, self.hashes, self.report, {"scope": "synthetic gate control"})

    def required(self):
        after = {k:v for k,v in self.hashes.items() if k not in api["REQUIRED_OMISSIONS"]}
        return {"exitCode": 0, "sourceUnchanged": True, "finishedAt": 1,
                "sourceBefore": copy.deepcopy(after), "sourceAfter": after}

    def test_preflight_preserves_history_and_creates_no_outputs(self):
        before = api["protected_history"]()
        _, _, report = api["prepare"]()
        self.assertEqual(report["status"], "PREFLIGHT_ONLY_NO_PROTOCOL_WRITTEN")
        self.assertEqual(len(report["mixedConditionHashes"]), 11)
        self.assertEqual(report["routeMaximumRows"], 194)
        api["require_unused"](api["output_paths"]())
        self.assertEqual(api["protected_history"](), before)

    def test_valid_candidate_has_exact_53_files_and_all_11_groups(self):
        candidate = self.candidate()
        self.assertEqual(candidate["sourceFiles"], self.base["sourceFiles"])
        for key in api["MIXED_GROUPS"]:
            self.assertEqual(candidate[key], self.base[key])
        api["validate_candidate"](self.base, candidate)

    def test_consistently_shortened_hash_list_is_rejected(self):
        candidate = self.candidate()
        removed = candidate["sourceFiles"].pop()
        del candidate["sourceHashes"][removed]
        with self.assertRaisesRegex(ValueError, "SOURCE_ALLOWLIST_DRIFT"):
            api["validate_candidate"](self.base, candidate)

    def test_each_mixed_group_mutation_is_rejected(self):
        for key in api["MIXED_GROUPS"]:
            with self.subTest(key=key):
                candidate = self.candidate()
                candidate[key] = {"synthetic": "mutated condition"}
                with self.assertRaisesRegex(ValueError, "CONDITION_DRIFT:" + key):
                    api["validate_candidate"](self.base, candidate)

    def test_route_and_execution_metadata_mutations_are_rejected(self):
        candidate = self.candidate()
        candidate["rateAttribution"]["maximumRows"] = 195
        with self.assertRaisesRegex(ValueError, "CONDITION_DRIFT:rateAttribution"):
            api["validate_candidate"](self.base, candidate)
        for key, value in [("maximumExecutions", 2), ("retry", True), ("unreviewed", None)]:
            with self.subTest(key=key):
                candidate = self.candidate()
                candidate["rateAttributionRegistration"][key] = value
                with self.assertRaisesRegex(ValueError, "RATE_METADATA"):
                    api["validate_candidate"](self.base, candidate)
        candidate = self.candidate()
        candidate["memoryDiagnosticRegistration"]["order"] = ["REPEAT"]
        with self.assertRaisesRegex(ValueError, "MEMORY_DIAGNOSTIC_METADATA_DRIFT"):
            api["validate_candidate"](self.base, candidate)

    def test_green_required_record_is_accepted_with_explicit_coverage(self):
        observed = api["validate_required"](self.required(), self.hashes)
        self.assertEqual(observed["coveredResourceFiles"], 48)
        self.assertEqual(len(observed["directlyVerifiedOmissions"]), 5)

    def test_failed_incomplete_or_changed_required_records_are_rejected(self):
        mutations = [
            ("exitCode", 1, "REQUIRED_CHECK_NOT_GREEN"),
            ("exitCode", False, "REQUIRED_CHECK_NOT_GREEN"),
            ("sourceUnchanged", False, "REQUIRED_CHECK_SOURCE_CHANGED"),
            ("finishedAt", float("nan"), "REQUIRED_CHECK_NOT_COMPLETED"),
            ("finishedAt", None, "REQUIRED_CHECK_NOT_COMPLETED"),
            ("sourceBefore", {}, "REQUIRED_CHECK_MAP_DRIFT"),
        ]
        for key, value, code in mutations:
            with self.subTest(key=key, value=value):
                record = self.required()
                record[key] = value
                with self.assertRaisesRegex(ValueError, code):
                    api["validate_required"](record, self.hashes)

    def test_stale_or_reduced_required_source_maps_are_rejected(self):
        for reduced in [False, True]:
            with self.subTest(reduced=reduced):
                record = self.required()
                if reduced:
                    del record["sourceAfter"]["public/house-ui.js"]
                else:
                    record["sourceAfter"]["public/house-ui.js"] = "0" * 64
                record["sourceBefore"] = copy.deepcopy(record["sourceAfter"])
                with self.assertRaisesRegex(ValueError, "REQUIRED_CHECK_(COVERAGE|STALE_SOURCE)"):
                    api["validate_required"](record, self.hashes)

    def test_existing_file_and_dangling_symlink_are_rejected(self):
        with tempfile.TemporaryDirectory(prefix="registration-pure-") as directory:
            root = Path(directory)
            path = Path("unused.json")
            (root / path).write_text("synthetic collision")
            with self.assertRaisesRegex(ValueError, "OUTPUT_PATH_ALREADY_EXISTS"):
                api["require_unused"]([path], root)
            (root / path).unlink()
            (root / path).symlink_to(root / "absent-target")
            with self.assertRaisesRegex(ValueError, "OUTPUT_PATH_ALREADY_EXISTS"):
                api["require_unused"]([path], root)


if __name__ == "__main__":
    unittest.main(verbosity=2)
