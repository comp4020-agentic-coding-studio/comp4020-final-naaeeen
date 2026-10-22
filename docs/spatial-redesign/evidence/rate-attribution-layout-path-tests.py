#!/usr/bin/env python3
"""Pure PATH controls; no child processes or protocol writes."""
import os
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("rate-attribution-layout-register.py")
api = {"__file__": str(SCRIPT.resolve()), "__name__": "registration_path_controls"}
exec(compile(SCRIPT.read_text(), str(SCRIPT), "exec"), api)


class InspectorPathControls(unittest.TestCase):
    def test_empty_path_keeps_verified_absolute_inspector(self):
        with patch.dict(os.environ, {"PATH": ""}):
            command = api["inspector_command"](api["output_paths"]()[0])
        self.assertEqual(command[0], "/home/lizhi/.local/bin/mise")
        self.assertEqual(command[-1], "--inspect")
        self.assertNotIn("--bootstrap-calibration", command)
        self.assertNotIn("--run", command)

    def test_missing_known_installation_rejects_before_protocol_write(self):
        installed = api["MISE"]
        try:
            api["MISE"] = Path("/nonexistent-registration-control/mise")
            with self.assertRaisesRegex(ValueError, "VERIFIED_MISE_INSTALLATION_UNAVAILABLE"):
                api["inspector_command"](api["output_paths"]()[0])
        finally:
            api["MISE"] = installed

    def test_registered_destination_remains_exclusive(self):
        with self.assertRaisesRegex(ValueError, "OUTPUT_PATH_ALREADY_EXISTS"):
            api["require_unused"](api["output_paths"]())


if __name__ == "__main__":
    unittest.main(verbosity=2)
