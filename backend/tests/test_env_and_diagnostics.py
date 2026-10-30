"""
Unit Tests for Environment Precedence and Health Diagnostics
MOSIP Decode 2026 - Problem Statement 2: Inji Interoperability Playground

Validates:
1. Docker Compose environment variables are NOT overwritten by .env (override=False).
2. Health diagnostics probe the effective service URLs rather than hardcoded localhost.
3. Health check does not report REAL_INJI_STACK_ONLINE if dependencies are unreachable.
4. Correct classification into REAL_INJI_STACK_ONLINE vs REAL_INJI_STACK_OFFLINE.
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app


class TestEnvPrecedenceAndDiagnostics(unittest.TestCase):
    def test_container_env_precedence(self):
        """Verify that explicitly set environment variables take precedence over .env defaults."""
        custom_certify = "http://custom-host:8090/v1/certify"
        custom_verify = "http://custom-host:8081/v1/verify"
        custom_mimoto = "http://custom-host:8099/v1/mimoto"
        custom_wallet = "http://custom-host:3004"

        with patch.dict(os.environ, {
            "INJI_CERTIFY_URL": custom_certify,
            "INJI_VERIFY_URL": custom_verify,
            "MIMOTO_URL": custom_mimoto,
            "INJI_WALLET_URL": custom_wallet,
        }):
            app = create_app()
            # Environment variables should be preserved, not overwritten by .env
            self.assertEqual(os.environ.get("INJI_CERTIFY_URL"), custom_certify)
            self.assertEqual(os.environ.get("INJI_VERIFY_URL"), custom_verify)
            self.assertEqual(os.environ.get("MIMOTO_URL"), custom_mimoto)
            self.assertEqual(os.environ.get("INJI_WALLET_URL"), custom_wallet)

    def test_health_diagnostics_use_effective_urls(self):
        """Verify that dependency diagnostics probe the effective configured URLs."""
        test_certify = "http://host.docker.internal:8090/v1/certify"
        test_verify = "http://host.docker.internal:8081/v1/verify"
        test_mimoto = "http://host.docker.internal:8099/v1/mimoto"
        test_wallet = "http://host.docker.internal:3004"

        with patch.dict(os.environ, {
            "INJI_CERTIFY_URL": test_certify,
            "INJI_VERIFY_URL": test_verify,
            "MIMOTO_URL": test_mimoto,
            "INJI_WALLET_URL": test_wallet,
        }):
            app = create_app()
            client = app.test_client()

            with patch("requests.get") as mock_get:
                # Mock a successful response for all probes
                mock_resp = MagicMock()
                mock_resp.status_code = 200
                mock_get.return_value = mock_resp

                res = client.get("/api/health")
                self.assertEqual(res.status_code, 200)
                data = res.get_json()

                diagnostics = data.get("dependency_diagnostics", {})
                self.assertIn("inji_certify", diagnostics)
                self.assertIn("inji_verify", diagnostics)
                self.assertIn("mimoto", diagnostics)
                self.assertIn("inji_web", diagnostics)

                # Confirm the probed URLs reflect host.docker.internal, not localhost
                self.assertTrue(diagnostics["inji_certify"]["url"].startswith(test_certify))
                self.assertTrue(diagnostics["inji_verify"]["url"].startswith(test_verify))
                self.assertTrue(diagnostics["mimoto"]["url"].startswith(test_mimoto))
                self.assertTrue(diagnostics["inji_web"]["url"].startswith(test_wallet))

    def test_unreachable_dependencies_prevent_false_online(self):
        """Verify that unreachable dependencies force REAL_INJI_STACK_OFFLINE even if configured."""
        with patch.dict(os.environ, {
            "INJI_CERTIFY_URL": "http://host.docker.internal:8090/v1/certify",
            "INJI_VERIFY_URL": "http://host.docker.internal:8081/v1/verify",
        }):
            app = create_app()
            client = app.test_client()

            # Simulate network connection refused
            with patch("requests.get", side_effect=Exception("Connection refused")):
                res = client.get("/api/health")
                self.assertEqual(res.status_code, 200)
                data = res.get_json()

                self.assertFalse(data["real_stack_connected"])
                self.assertEqual(data["runtime_mode"], "REAL_INJI_STACK_OFFLINE")
                self.assertEqual(data["runtime_label"], "REAL INJI STACK (OFFLINE)")


if __name__ == "__main__":
    unittest.main()
