"""
Comprehensive Automated Test Suite:
MOSIP Inji Interoperability Protocol Flow, State Persistence, and Matrix Aggregation
MOSIP Decode 2026 - Problem Statement 2: Inji Interoperability Playground

Covers:
1. Callback persistence across backend restarts
2. Unknown-state rejection (400 invalid_state)
3. Token-exchange failure (Step 3 = 400, Steps 4-5 remain 428 pending, outcome = PENDING)
4. Pending credential issuance (Step 5 remains 428, status = AWAITING_CREDENTIAL)
5. Verification cryptographic evaluation (strictly verifier-driven PASS or FAIL)
6. Matrix aggregation from persisted sessions (pending tests not counted as pass/fail)

NOTE: Mocks used here are for automated unit/integration test isolation only.
"""

import os
import sys
import json
import tempfile
import urllib.parse
from unittest.mock import patch, MagicMock

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from store.test_store import DurableTestStore, test_store
from app import create_app


def run_comprehensive_tests():
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_interop.db")
    os.environ["TEST_STORE_DB_PATH"] = db_path
    test_store.configure_db_path(db_path)

    # Unit/integration test isolation mocks for live stack readiness & metadata
    mock_certify_status = {
        "service": "Inji Certify / OpenID4VCI Issuer",
        "configured": True,
        "status": "UP",
        "is_real": True,
        "supported_protocols": ["OpenID4VCI Draft 13"],
        "supported_credentials": ["FarmerCredential"]
    }
    mock_verify_status = {
        "service": "Inji Verify / OpenID4VP Verifier",
        "configured": True,
        "status": "UP",
        "is_real": True,
        "supported_protocols": ["OpenID4VP Draft 20", "direct_post"]
    }
    mock_certify_metadata = {
        "credential_issuer": "http://certify-nginx:80",
        "authorization_servers": ["https://esignet-mock.collab.mosip.net"],
        "credential_endpoint": "http://certify-nginx:80/v1/certify/issuance/credential",
        "credential_configurations_supported": {
            "FarmerCredential": {
                "format": "ldp_vc",
                "scope": "mock_identity_vc_ldp",
                "credential_signing_alg_values_supported": ["EdDSA"],
                "proof_types_supported": {"jwt": {"proof_signing_alg_values_supported": ["RS256", "ES256"]}}
            }
        }
    }
    mock_certify_did = {"id": "did:web:tasty-liana-apographic.ngrok-free.dev"}
    mock_verify_did = {"id": "did:web:khaki-actors-do.loca.lt:v1:verify"}
    mock_vp_req = {
        "mode": "REAL_INJI_STACK",
        "status": "REQUEST_CREATED",
        "transaction_id": "test_txn_12345",
        "request_id": "test_req_67890",
        "request_uri": "https://khaki-actors-do.loca.lt/v1/verify/vp-request/test_req_67890",
        "expires_at": "2030-01-01T00:00:00.000Z",
        "client_id": "did:web:khaki-actors-do.loca.lt:v1:verify",
        "presentation_definition": {"id": "farmer_presentation"},
        "is_real": True,
        "duration_ms": 1.0
    }
    mock_mimoto_issuers = [{"issuer_id": "Farmer", "client_id": "wallet-demo"}]

    patches = [
        patch("services.certify_service.CertifyService.get_service_status", return_value=mock_certify_status),
        patch("services.verify_service.VerifyService.get_service_status", return_value=mock_verify_status),
        patch("services.certify_service.CertifyService.get_openid_credential_issuer_metadata", return_value=mock_certify_metadata),
        patch("services.certify_service.CertifyService.get_did_document", return_value=mock_certify_did),
        patch("services.verify_service.VerifyService.get_did_document", return_value=mock_verify_did),
        patch("services.verify_service.VerifyService.create_real_presentation_request", return_value=mock_vp_req),
        patch("services.wallet_service.WalletService.get_issuers_from_mimoto", return_value=mock_mimoto_issuers),
        patch("services.wallet_service.WalletService.check_inji_web_alive", return_value=True),
    ]
    for p in patches:
        p.start()

    try:
        app = create_app()
        client = app.test_client()

        print("\n========================================================")
        print("RUNNING COMPREHENSIVE AUTOMATED INTEROPERABILITY TESTS")
        print("========================================================")

        # -------------------------------------------------------------------------
        # TEST 1: Test Start & Initial State Verification
        # -------------------------------------------------------------------------
        print("\n[TEST 1] Starting new test session...")
        res = client.post("/api/test/start", json={
            "issuer": "Inji Certify",
            "wallet": "Inji Web",
            "verifier": "Inji Verify",
            "credential_format": "W3C VC",
            "expected_outcome": "PASS"
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        init_data = res.get_json()
        test_id1 = init_data["test_id"]
        oauth_state1 = init_data["oauth_state"]
        assert test_id1, "Missing test_id"
        assert oauth_state1, "Missing oauth_state"
        assert init_data["status"] == "AWAITING_AUTHORIZATION"
        assert init_data["outcome"] == "PENDING"
        # Steps 3, 4, 5, 7, 8 must be HTTP 428 pending
        steps = init_data["steps"]
        assert steps[2]["status"] == 428, "Step 3 should be 428"
        assert steps[3]["status"] == 428, "Step 4 should be 428"
        assert steps[4]["status"] == 428, "Step 5 should be 428"
        assert steps[6]["status"] == 428, "Step 7 should be 428"
        assert steps[7]["status"] == 428, "Step 8 should be 428"
        print(f"  PASS: Test {test_id1} created in AWAITING_AUTHORIZATION state with Steps 3,4,5,7,8 at 428.")

        # -------------------------------------------------------------------------
        # TEST 2: Unknown-state rejection
        # -------------------------------------------------------------------------
        print("\n[TEST 2] Testing unknown state rejection...")
        bad_cb = client.get("/api/oauth/callback?state=state_fabricated_unknown_999&code=test_code")
        assert bad_cb.status_code == 400
        assert bad_cb.get_json().get("error") == "invalid_state"
        print("  PASS: Unknown state correctly rejected with HTTP 400 invalid_state.")

        # -------------------------------------------------------------------------
        # TEST 3: Callback Persistence Across Simulated Backend Restart
        # -------------------------------------------------------------------------
        print("\n[TEST 3] Testing callback persistence across backend restarts...")
        # Simulate restart by instantiating new store on the exact same DB
        restarted_store = DurableTestStore(db_path=test_store._db_path)
        located_session = restarted_store.get_test_by_state(oauth_state1)
        assert located_session is not None, f"Failed to locate session after restart in {test_store._db_path}!"
        assert located_session["test_id"] == test_id1
        print(f"  PASS: Session {test_id1} and OAuth state {oauth_state1} survived restart.")

        # -------------------------------------------------------------------------
        # TEST 4: Token-Exchange Failure Handling
        # -------------------------------------------------------------------------
        print("\n[TEST 4] Testing token-exchange failure handling...")
        # Mock Mimoto token exchange returning HTTP 400 error
        mock_mimoto_err = {
            "status": 400,
            "is_real": True,
            "access_token": None,
            "c_nonce": None,
            "response": {
                "errors": [{"errorCode": "invalid_grant", "errorMessage": "Authorization code expired or already consumed"}]
            }
        }
        with patch("services.wallet_service.WalletService.exchange_authorization_code", return_value=mock_mimoto_err):
            cb_res = client.get(f"/api/oauth/callback?state={oauth_state1}&code=consumed_test_code")
            assert cb_res.status_code == 200
            cb_data = cb_res.get_json()
            assert cb_data["test_id"] == test_id1
            assert cb_data["status"] == "AWAITING_AUTHORIZATION"
            assert cb_data["outcome"] == "PENDING"
            # Step 3 must be 400
            assert cb_data["steps"][2]["status"] == 400
            # Steps 4 & 5 must remain 428 and NOT completed
            assert cb_data["steps"][3]["status"] == 428, "Step 4 must remain 428 when token exchange fails"
            assert cb_data["steps"][4]["status"] == 428, "Step 5 must remain 428 when token exchange fails"
            assert cb_data["steps"][3]["is_real"] is False
            assert cb_data["steps"][4]["is_real"] is False
            print("  PASS: Failed token exchange kept Steps 4 & 5 at 428 (PENDING), outcome at PENDING.")

        # -------------------------------------------------------------------------
        # TEST 5: Successful Token Exchange with Pending Credential Issuance
        # -------------------------------------------------------------------------
        print("\n[TEST 5] Testing successful token exchange with pending credential issuance...")
        res_t2 = client.post("/api/test/start", json={
            "issuer": "Inji Certify",
            "wallet": "Inji Web",
            "verifier": "Inji Verify",
            "credential_format": "W3C VC",
            "expected_outcome": "PASS"
        })
        t2_data = res_t2.get_json()
        test_id2 = t2_data["test_id"]
        oauth_state2 = t2_data["oauth_state"]

        mock_token_success = {
            "status": 200,
            "is_real": True,
            "access_token": "mock_test_token_12345",
            "c_nonce": "mock_nonce_67890",
            "response": {"access_token": "[REDACTED_ACCESS_TOKEN]"}
        }
        mock_certify_pending = {
            "status": 500,
            "is_real": True,
            "error": "Certify key rotation in progress",
            "credential": None
        }
        with patch("services.wallet_service.WalletService.exchange_authorization_code", return_value=mock_token_success), \
             patch("services.certify_service.CertifyService.request_credential", return_value=mock_certify_pending):
            cb2 = client.get(f"/api/oauth/callback?state={oauth_state2}&code=valid_test_code")
            assert cb2.status_code == 200
            cb2_data = cb2.get_json()
            assert cb2_data["status"] == "AWAITING_CREDENTIAL"
            assert cb2_data["outcome"] == "PENDING"
            assert cb2_data["steps"][2]["status"] == 200
            assert cb2_data["steps"][3]["status"] == 500
            assert cb2_data["steps"][4]["status"] == 428
            print("  PASS: Token exchange succeeded (200), Certify pending kept Step 5 at 428 (AWAITING_CREDENTIAL).")

        # -------------------------------------------------------------------------
        # TEST 6: Scenario Selector & Cryptographic Verification Result Handling
        #         (PASS, FAIL, VALID, INVALID, VALID BUT EXPIRED)
        # -------------------------------------------------------------------------
        print("\n[TEST 6] Testing Scenario Selector & separation of test verdict vs credential validity...")
        mock_signed_vc = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            "type": ["VerifiableCredential", "FarmerCredential"],
            "issuer": "did:web:tasty-liana-apographic.ngrok-free.dev",
            "expirationDate": "2030-01-01T00:00:00.000Z",
            "credentialSubject": {"id": "did:key:123", "fullName": "Test Farmer"},
            "proof": {"type": "Ed25519Signature2020", "proofValue": "mock_sig"}
        }

        mock_verify_pass = {
            "all_checks_successful": True,
            "http_status": 200,
            "raw_response": {
                "allChecksSuccessful": True,
                "credentialResults": [{
                    "schemaAndSignatureCheck": {"valid": True},
                    "expiryCheck": {"valid": True}
                }]
            }
        }
        mock_verify_fail = {
            "all_checks_successful": False,
            "http_status": 200,
            "raw_response": {
                "allChecksSuccessful": False,
                "credentialResults": [{
                    "schemaAndSignatureCheck": {"valid": False},
                    "expiryCheck": {"valid": True}
                }]
            }
        }

        # Case 6A: Scenario PASS with real verifier acceptance -> verifier_result=PASS, credential_validity=VALID, outcome=PASS
        with patch("services.verify_service.VerifyService.get_real_verification_results", return_value=mock_verify_pass):
            ver_res = client.post(f"/api/test/{test_id2}/verify-credential", json={
                "credential": mock_signed_vc,
                "expected_outcome": "PASS"
            })
            assert ver_res.status_code == 200
            ver_data = ver_res.get_json()
            assert ver_data["verifier_result"] == "PASS"
            assert ver_data["credential_validity"] == "VALID"
            assert ver_data["outcome"] == "PASS"
            assert ver_data["status"] == "COMPLETED"
            print("  PASS: Scenario PASS confirmed (verifier_result=PASS, credential_validity=VALID, outcome=PASS).")

        # Case 6B: Scenario VALID with real verifier acceptance -> verifier_result=PASS, credential_validity=VALID, outcome=PASS
        with patch("services.verify_service.VerifyService.get_real_verification_results", return_value=mock_verify_pass):
            ver_valid = client.post(f"/api/test/{test_id2}/verify-credential", json={
                "credential": mock_signed_vc,
                "expected_outcome": "VALID"
            }).get_json()
            assert ver_valid["verifier_result"] == "PASS"
            assert ver_valid["credential_validity"] == "VALID"
            assert ver_valid["outcome"] == "PASS"
            print("  PASS: Scenario VALID confirmed (verifier_result=PASS, credential_validity=VALID, outcome=PASS).")

        # Case 6C: Scenario FAIL (corrupted presentation proof) rejected by verifier -> verifier_result=FAIL, credential_validity=INVALID, outcome=PASS (negative test passed!)
        with patch("services.verify_service.VerifyService.get_real_verification_results", return_value=mock_verify_fail):
            ver_neg_fail = client.post(f"/api/test/{test_id2}/verify-credential", json={
                "credential": mock_signed_vc,
                "expected_outcome": "FAIL"
            }).get_json()
            assert ver_neg_fail["verifier_result"] == "FAIL"
            assert ver_neg_fail["credential_validity"] == "INVALID"
            assert ver_neg_fail["outcome"] == "PASS", "Negative test FAIL must pass when rejection is genuinely observed"
            submitted_vc = ver_neg_fail["steps"][6]["request"]["body"]["vp_token"]["verifiableCredential"][0]
            assert submitted_vc["proof"]["proofValue"] == "z2BkW"
            print("  PASS: Scenario FAIL confirmed (corrupted proof rejected -> verifier_result=FAIL, credential_validity=INVALID, outcome=PASS).")

        # Case 6D: Scenario INVALID (tampered credential claims) rejected by verifier -> verifier_result=FAIL, credential_validity=INVALID, outcome=PASS
        with patch("services.verify_service.VerifyService.get_real_verification_results", return_value=mock_verify_fail):
            ver_neg_invalid = client.post(f"/api/test/{test_id2}/verify-credential", json={
                "credential": mock_signed_vc,
                "expected_outcome": "INVALID"
            }).get_json()
            assert ver_neg_invalid["verifier_result"] == "FAIL"
            assert ver_neg_invalid["credential_validity"] == "INVALID"
            assert ver_neg_invalid["outcome"] == "PASS", "Negative test INVALID must pass when rejection is genuinely observed"
            submitted_vc_inv = ver_neg_invalid["steps"][6]["request"]["body"]["vp_token"]["verifiableCredential"][0]
            assert submitted_vc_inv["credentialSubject"].get("_tamperedClaim") is True
            print("  PASS: Scenario INVALID confirmed (tampered credential rejected -> verifier_result=FAIL, credential_validity=INVALID, outcome=PASS).")

        # Case 6E: Scenario VALID BUT EXPIRED -> authentic signature + expired timestamp rejected -> verifier_result=FAIL, credential_validity=VALID BUT EXPIRED, outcome=PASS
        mock_single_vc_ok = {
            "is_real_verification": True,
            "all_checks_successful": True,
            "schema_and_signature": {"valid": True}
        }
        with patch("services.verify_service.VerifyService.verify_single_credential", return_value=mock_single_vc_ok), \
             patch("services.verify_service.VerifyService.get_real_verification_results", return_value=mock_verify_fail):
            ver_expired = client.post(f"/api/test/{test_id2}/verify-credential", json={
                "credential": mock_signed_vc,
                "expected_outcome": "VALID BUT EXPIRED"
            }).get_json()
            assert ver_expired["verifier_result"] == "FAIL"
            assert ver_expired["credential_validity"] == "VALID BUT EXPIRED"
            assert ver_expired["outcome"] == "PASS", "VALID BUT EXPIRED test must pass when expiry validation rejects it"
            assert ver_expired["steps"][7]["response"]["expiryCheck"]["valid"] is False
            assert ver_expired["steps"][7]["response"]["expiryCheck"]["status"] == "EXPIRED"
            print("  PASS: Scenario VALID BUT EXPIRED confirmed (expiry rejected -> verifier_result=FAIL, credential_validity=VALID BUT EXPIRED, outcome=PASS).")

        # Case 6F: Expected PASS but verifier returns False -> verifier_result=FAIL, credential_validity=INVALID, outcome=FAIL
        with patch("services.verify_service.VerifyService.get_real_verification_results", return_value=mock_verify_fail):
            ver_fail_res = client.post(f"/api/test/{test_id2}/verify-credential", json={
                "credential": mock_signed_vc,
                "expected_outcome": "PASS"
            })
            assert ver_fail_res.status_code == 200
            ver_fail_data = ver_fail_res.get_json()
            assert ver_fail_data["verifier_result"] == "FAIL"
            assert ver_fail_data["credential_validity"] == "INVALID"
            assert ver_fail_data["outcome"] == "FAIL", f"Outcome must be FAIL when PASS expected but verifier rejected, got {ver_fail_data['outcome']}"
            assert ver_fail_data["status"] == "COMPLETED"
            print("  PASS: Expected PASS with verifier rejection -> outcome=FAIL, credential_validity=INVALID.")

        # -------------------------------------------------------------------------
        # TEST 7: Matrix Aggregation from Persisted Sessions
        # -------------------------------------------------------------------------
        print("\n[TEST 7] Testing Matrix aggregation from persisted sessions...")
        matrix_res = client.get("/api/matrix")
        assert matrix_res.status_code == 200
        matrix_json = matrix_res.get_json()
        assert "matrix" in matrix_json
        matrix_items = matrix_json["matrix"]
        assert len(matrix_items) > 0

        # Find row corresponding to Inji Certify -> Inji Web -> Inji Verify (W3C VC)
        matching_row = next((
            r for r in matrix_items
            if r["issuer"] == "Inji Certify" and
               r["wallet"] == "Inji Web" and
               r["verifier"] == "Inji Verify" and
               r["format"] == "W3C VC"
        ), None)
        assert matching_row is not None, "Matrix row not found"
        # The latest session (test_id2) was evaluated to COMPLETED / FAIL
        assert matching_row["test_id"] == test_id2
        assert matching_row["status"] == "FAIL"
        assert matching_row["latest_verdict"] == "FAIL"
        assert matching_row["attempt_count"] >= 2
        assert matching_row["completed_count"] >= 1
        assert matching_row["execution_count"] >= 1
        assert matching_row["fail_count"] >= 1
        assert matching_row["is_real_stack"] is True
        assert matching_row["mode"] == "REAL_INJI_STACK"
        assert len(matching_row["executions"]) >= 2
        print(f"  PASS: Matrix row correctly aggregated with test_id={test_id2}, status={matching_row['status']}, execution_count={matching_row['execution_count']}.")

        # Verify /api/test/<id>/report does NOT mark Step 8 as PASS when outcome is FAIL
        rep_fail = client.get(f"/api/test/{test_id2}/report").get_json()
        assert rep_fail["summary"]["final_verdict"] == "FAIL"
        assert rep_fail["step_audit"][7]["result"] == "FAIL", "Step 8 audit result must be FAIL when verification verdict is FAIL"
        vp_compliance = next(c for c in rep_fail["standards_compliance"] if "OpenID4VP" in c["standard"])
        assert vp_compliance["status"] == "NON_COMPLIANT"
        print("  PASS: Report endpoint enforces truthful Step 8 FAIL and OpenID4VP NON_COMPLIANT when test outcome is FAIL.")

        # Verify simulated/demo run cannot overwrite a real Inji stack execution on the same combination
        from store.test_store import test_store as active_store
        sim_id = "sim-test-no-overwrite-001"
        active_store.create_test(
            issuer="Inji Certify",
            wallet="Inji Web",
            verifier="Inji Verify",
            credential_format="W3C VC",
            expected_outcome="PASS",
            test_id=sim_id,
        )
        active_store.update_test(
            sim_id,
            {
                "status": "COMPLETED",
                "outcome": "PASS",
                "is_simulation": True,
                "is_real_stack": False,
            },
        )
        matrix_after_sim = client.get("/api/matrix").get_json()
        row_after_sim = next(
            r for r in matrix_after_sim["matrix"]
            if r["issuer"] == "Inji Certify" and r["wallet"] == "Inji Web" and r["verifier"] == "Inji Verify" and r["format"] == "W3C VC"
        )
        assert row_after_sim["test_id"] == test_id2, "Simulated session must NEVER overwrite a real Inji execution on Matrix row"
        assert row_after_sim["latest_verdict"] == "FAIL", "Real FAIL must not be overwritten by simulated PASS"
        assert row_after_sim["is_real_stack"] is True
        print("  PASS: Simulated test sessions cannot overwrite or masquerade as real Inji results in the Matrix.")

        # Create a pending session and verify matrix does NOT mark it as FAIL
        res_pending = client.post("/api/test/start", json={
            "issuer": "Inji Certify",
            "wallet": "Inji Wallet",
            "verifier": "Inji Verify",
            "credential_format": "W3C VC",
            "expected_outcome": "PASS"
        })
        pending_id = res_pending.get_json()["test_id"]
        matrix_res2 = client.get("/api/matrix").get_json()
        row_pending = next((
            r for r in matrix_res2["matrix"]
            if r["issuer"] == "Inji Certify" and
               r["wallet"] == "Inji Wallet" and
               r["verifier"] == "Inji Verify" and
               r["format"] == "W3C VC"
        ), None)
        assert row_pending is not None
        assert row_pending["status"] in ["PENDING", "RUNNING"]
        assert row_pending["display_status"] == "RUNNING"
        assert row_pending["raw_status"] == "AWAITING_AUTHORIZATION"
        assert row_pending["attempt_count"] == 1
        assert row_pending["completed_count"] == 0
        print("  PASS: Incomplete/pending tests are NOT counted as successes or failures in the Matrix.")

        # Verify tested_matrix only includes tested combinations
        assert all(r["attempt_count"] > 0 for r in matrix_res2["tested_matrix"])
        assert len(matrix_res2["tested_matrix"]) == matrix_res2["tested_combinations_count"]

        # Verify an untested combination is NOT_TESTED with no fabricated PASS or demo flag
        untested_row = next((
            r for r in matrix_res2["matrix"]
            if r["issuer"] == "External OpenID4VCI Issuer" and
               r["wallet"] == "External Wallet" and
               r["verifier"] == "External OpenID4VP Verifier" and
               r["format"] == "SD-JWT VC"
        ), None)
        assert untested_row is not None
        assert untested_row["status"] == "NOT_TESTED", f"Expected NOT_TESTED, got {untested_row['status']}"
        assert untested_row["display_status"] == "NOT TESTED"
        assert untested_row["result"] == "—"
        assert untested_row["is_demo_entry"] is False
        assert untested_row["test_id"] is None
        print("  PASS: Untested combinations are strictly NOT_TESTED with zero fabricated results.")

        print("\n========================================================")
        print("ALL 7 COMPREHENSIVE AUTOMATED TEST SCENARIOS PASSED!")
        print("========================================================\n")

    finally:
        for p in patches:
            p.stop()
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


if __name__ == "__main__":
    run_comprehensive_tests()
