"""
Unit Tests for Conformance Matrix Execution Accounting
MOSIP Decode 2026 - Problem Statement 2: Inji Interoperability Playground

Validates:
1. attempt_count: all test sessions started
2. completed_count: sessions that reached a terminal state
3. running_count: genuinely active sessions
4. incomplete_count: abandoned, interrupted, or awaiting sessions not actively progressing
5. pass_count & fail_count: completed tests with supported verdicts only
6. error_count: terminal execution errors
7. AWAITING_AUTHORIZATION and AWAITING_CREDENTIAL sessions are NOT counted as completed or PASS
8. Distinction of active OAuth flow from superseded/abandoned sessions
9. Latest verdict comes from latest completed execution, not erased by newer incomplete attempt
10. Separation of real-stack and simulation metrics
"""

import os
import sys
import tempfile
import json
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from store.test_store import DurableTestStore, test_store
from app import create_app


class TestMatrixExecutionAccounting(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_accounting.db")
        os.environ["TEST_STORE_DB_PATH"] = self.db_path
        test_store.configure_db_path(self.db_path)

        # Set up isolated Flask client
        self.app = create_app()
        self.client = self.app.test_client()

    def test_matrix_metrics_and_lifecycle_accounting(self):
        # 1. Initially all rows in matrix should have 0 counts and NOT TESTED status
        res = self.client.get("/api/matrix")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["total_attempts"], 0)
        self.assertEqual(data["total_completed"], 0)
        self.assertEqual(data["tested_combinations_count"], 0)

        # 2. Create an initial session that completes with PASS
        s1 = test_store.create_test(
            issuer="Inji Certify",
            wallet="Inji Web",
            verifier="Inji Verify",
            credential_format="W3C VC",
            expected_outcome="PASS",
            test_id="test-pass-001"
        )
        # Update s1 to be a completed real test with PASS verification
        test_store.update_test("test-pass-001", {
            "status": "COMPLETED",
            "outcome": "PASS",
            "is_real_stack": True,
            "is_simulation": False,
            "steps": [
                {"id": "step_1", "status": 200, "is_real": True},
                {"id": "step_2", "status": 302, "is_real": True},
                {"id": "step_3", "status": 200, "is_real": True},
                {"id": "step_4", "status": 200, "is_real": True},
                {"id": "step_5", "status": 200, "is_real": True, "response": {"credential": "signed_jwt"}},
                {"id": "step_6", "status": 200, "is_real": True},
                {"id": "step_7", "status": 200, "is_real": True},
                {"id": "step_8", "status": 200, "is_real": True, "response": {"test_passed": True, "allChecksSuccessful": True, "result": "PASS"}}
            ]
        })

        import time
        time.sleep(0.02)
        # 3. Create a second session that completes with FAIL (negative scenario)
        s2 = test_store.create_test(
            issuer="Inji Certify",
            wallet="Inji Web",
            verifier="Inji Verify",
            credential_format="W3C VC",
            expected_outcome="PASS",
            test_id="test-fail-002"
        )
        test_store.update_test("test-fail-002", {
            "status": "COMPLETED",
            "outcome": "FAIL",
            "is_real_stack": True,
            "is_simulation": False,
            "steps": [
                {"id": "step_1", "status": 200, "is_real": True},
                {"id": "step_2", "status": 302, "is_real": True},
                {"id": "step_3", "status": 200, "is_real": True},
                {"id": "step_4", "status": 200, "is_real": True},
                {"id": "step_5", "status": 200, "is_real": True},
                {"id": "step_6", "status": 200, "is_real": True},
                {"id": "step_7", "status": 200, "is_real": True},
                {"id": "step_8", "status": 200, "is_real": True, "response": {"test_passed": False, "allChecksSuccessful": False, "result": "FAIL"}}
            ]
        })

        # Check matrix with 1 PASS and 1 FAIL
        res = self.client.get("/api/matrix")
        d = res.get_json()
        row = d["tested_matrix"][0]
        self.assertEqual(row["attempt_count"], 2)
        self.assertEqual(row["completed_count"], 2)
        self.assertEqual(row["pass_count"], 1)
        self.assertEqual(row["fail_count"], 1)
        self.assertEqual(row["running_count"], 0)
        self.assertEqual(row["incomplete_count"], 0)
        self.assertEqual(row["latest_verdict"], "FAIL")  # s2 is newer and completed

        time.sleep(0.02)
        # 4. Now create an incomplete session (e.g. AWAITING_AUTHORIZATION that had token error)
        s3 = test_store.create_test(
            issuer="Inji Certify",
            wallet="Inji Web",
            verifier="Inji Verify",
            credential_format="W3C VC",
            test_id="test-incomplete-003"
        )
        test_store.update_test("test-incomplete-003", {
            "status": "AWAITING_AUTHORIZATION",
            "outcome": "PENDING",
            "auth_code_consumed": True,
            "is_real_stack": True,
            "is_simulation": False,
            "steps": [
                {"id": "step_1", "status": 200, "is_real": True},
                {"id": "step_2", "status": 200, "is_real": True},
                {"id": "step_3", "status": 400, "is_real": True},
                {"id": "step_4", "status": 428},
                {"id": "step_5", "status": 428},
                {"id": "step_6", "status": 201},
                {"id": "step_7", "status": 428},
                {"id": "step_8", "status": 428}
            ]
        })

        time.sleep(0.02)
        # 5. Now create an actively RUNNING session (newest, awaiting user authorization, not consumed)
        s4 = test_store.create_test(
            issuer="Inji Certify",
            wallet="Inji Web",
            verifier="Inji Verify",
            credential_format="W3C VC",
            test_id="test-running-004"
        )
        test_store.update_test("test-running-004", {
            "status": "AWAITING_AUTHORIZATION",
            "outcome": "PENDING",
            "auth_code_consumed": False,
            "callback_processed": False,
            "is_real_stack": True,
            "is_simulation": False,
            "steps": [
                {"id": "step_1", "status": 200, "is_real": True},
                {"id": "step_2", "status": 200, "is_real": True},
                {"id": "step_3", "status": 428},
                {"id": "step_4", "status": 428},
                {"id": "step_5", "status": 428},
                {"id": "step_6", "status": 201},
                {"id": "step_7", "status": 428},
                {"id": "step_8", "status": 428}
            ]
        })

        res = self.client.get("/api/matrix")
        d = res.get_json()
        row = d["tested_matrix"][0]

        # Verify metrics accounting
        self.assertEqual(row["attempt_count"], 4)
        self.assertEqual(row["completed_count"], 2)
        self.assertEqual(row["running_count"], 1)      # test-running-004 is active
        self.assertEqual(row["incomplete_count"], 1)   # test-incomplete-003 has consumed code / 400
        self.assertEqual(row["pass_count"], 1)
        self.assertEqual(row["fail_count"], 1)
        self.assertEqual(row["error_count"], 0)

        # Requirement 4: The latest completed verdict ("FAIL" from test-fail-002) MUST NOT be erased
        # by the newer running/incomplete attempt test-running-004!
        self.assertEqual(row["latest_verdict"], "FAIL")
        self.assertEqual(row["display_status"], "FAIL")
        self.assertEqual(row["latest_completed_id"], "test-fail-002")
        self.assertEqual(row["latest_attempt_id"], "test-running-004")
        self.assertEqual(row["latest_attempt_status"], "AWAITING_AUTHORIZATION")
        self.assertEqual(row["latest_attempt_state"], "RUNNING")

        # Verify history preservation: all 4 executions preserved with states
        execs = row["executions"]
        self.assertEqual(len(execs), 4)
        self.assertEqual(execs[0]["test_id"], "test-running-004")
        self.assertEqual(execs[0]["execution_state"], "RUNNING")
        self.assertEqual(execs[1]["test_id"], "test-incomplete-003")
        self.assertEqual(execs[1]["execution_state"], "INCOMPLETE")
        self.assertEqual(execs[2]["test_id"], "test-fail-002")
        self.assertEqual(execs[2]["execution_state"], "COMPLETED")
        self.assertEqual(execs[3]["test_id"], "test-pass-001")
        self.assertEqual(execs[3]["execution_state"], "COMPLETED")

    def test_health_runtime_mode_and_labels(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("real_stack_configured", data)
        self.assertIn("real_stack_connected", data)
        self.assertIn("runtime_mode", data)
        self.assertIn("runtime_label", data)
        self.assertIn("sandbox_mode", data)

        if data["real_stack_connected"]:
            self.assertEqual(data["runtime_mode"], "REAL_INJI_STACK_ONLINE")
            self.assertEqual(data["runtime_label"], "REAL INJI STACK")
        elif data["real_stack_configured"]:
            self.assertEqual(data["runtime_mode"], "REAL_INJI_STACK_OFFLINE")
            self.assertEqual(data["runtime_label"], "REAL INJI STACK (OFFLINE)")
        else:
            self.assertEqual(data["runtime_mode"], "SANDBOX_MOCK")
            self.assertEqual(data["runtime_label"], "SANDBOX MODE")


if __name__ == "__main__":
    unittest.main()
