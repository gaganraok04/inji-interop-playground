"""
MOSIP Inji Interoperability Playground - Backend API
MOSIP Decode 2026 - Problem Statement 2

REST JSON API with CORS and clean service abstractions.
Ready for real Inji API integrations.
"""

import re
import os
import json
import time
import uuid
import secrets
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import requests
from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv

# Clean up empty env vars passed by container environments
for var in ["INJI_CERTIFY_URL", "INJI_WALLET_URL", "INJI_VERIFY_URL", "MIMOTO_URL", "INJI_WEB_URL"]:
    if os.environ.get(var) == "":
        del os.environ[var]

# Load environment variables (.env defaults without overriding explicitly passed container env vars)
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path, override=False)
else:
    load_dotenv(override=False)

try:
    from services.certify_service import CertifyService
    from services.wallet_service import WalletService
    from services.verify_service import VerifyService
    from services.interoperability_service import InteroperabilityService
    from store.test_store import test_store
except (ImportError, ValueError):
    from backend.services.certify_service import CertifyService
    from backend.services.wallet_service import WalletService
    from backend.services.verify_service import VerifyService
    from backend.services.interoperability_service import InteroperabilityService
    from backend.store.test_store import test_store


def create_app(test_config=None) -> Flask:
    app = Flask(__name__)

    # Configuration
    app.config.from_mapping(
        SECRET_KEY=os.getenv("SECRET_KEY", "inji-playground-secret-key"),
        INJI_CERTIFY_URL=os.getenv("INJI_CERTIFY_URL", ""),
        INJI_WALLET_URL=os.getenv("INJI_WALLET_URL", ""),
        INJI_VERIFY_URL=os.getenv("INJI_VERIFY_URL", ""),
        MIMOTO_URL=os.getenv("MIMOTO_URL", "")
    )

    if test_config:
        app.config.update(test_config)

    # Enable CORS for all frontend origins in development
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Service instances
    certify_svc = CertifyService(app.config["INJI_CERTIFY_URL"])
    wallet_svc = WalletService(app.config["INJI_WALLET_URL"], app.config["MIMOTO_URL"])
    verify_svc = VerifyService(app.config["INJI_VERIFY_URL"])
    interop_svc = InteroperabilityService(certify_svc, wallet_svc, verify_svc)

    # Global Error Handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "error": "Bad Request",
            "message": str(error.description if hasattr(error, 'description') else error),
            "status": 400
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Not Found",
            "message": str(error.description if hasattr(error, 'description') else "Resource not found"),
            "status": 404
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "error": "Internal Server Error",
            "message": "An unexpected error occurred in the Inji Playground backend.",
            "status": 500
        }), 500

    # 1. Health Endpoint & Offline Diagnostics
    _diag_cache = {"ts": 0.0, "data": None}

    def _get_dependency_diagnostics(now_iso: str) -> Dict[str, Any]:
        nonlocal _diag_cache
        now_mono = time.monotonic()
        if _diag_cache["data"] and (now_mono - _diag_cache["ts"]) < 15.0:
            return _diag_cache["data"]

        # Probe the exact effective URLs used by the initialized service clients
        certify_base = certify_svc.certify_url
        verify_base = verify_svc.verify_url
        mimoto_base = wallet_svc.mimoto_url
        wallet_base = wallet_svc.wallet_url
        esignet_base = "https://esignet-mock.collab.mosip.net"

        deps = [
            ("inji_certify", certify_base, "/.well-known/openid-credential-issuer"),
            ("inji_verify", verify_base, "/did.json"),
            ("mimoto", mimoto_base, "/issuers"),
            ("inji_web", wallet_base, "/"),
            ("esignet", esignet_base, "/.well-known/openid-configuration")
        ]

        results = {}
        for name, base, probe in deps:
            configured = bool(base and base.strip())
            clean_url = (base.split("?")[0].rstrip("/") + probe) if configured else "Not configured"
            if not configured:
                results[name] = {
                    "configured": False,
                    "url": "Not configured",
                    "reachable": False,
                    "http_status": None,
                    "cause": "Service URL unconfigured in environment",
                    "diagnostic_timestamp": now_iso
                }
                continue

            reachable = False
            http_status = None
            cause = None
            try:
                r = requests.get(clean_url, timeout=(1.5, 2.5))
                http_status = r.status_code
                if r.status_code < 400:
                    reachable = True
                    cause = None
                else:
                    reachable = False
                    cause = f"HTTP {r.status_code} received from endpoint"
            except requests.exceptions.ConnectionError:
                reachable = False
                cause = "Target port closed / connection actively refused on host (WinError 10061)"
            except requests.exceptions.Timeout:
                reachable = False
                cause = "Connection timed out"
            except Exception as ex:
                reachable = False
                cause = f"{type(ex).__name__}: {str(ex)[:80]}"

            results[name] = {
                "configured": True,
                "url": clean_url,
                "reachable": reachable,
                "http_status": http_status,
                "cause": cause,
                "diagnostic_timestamp": now_iso
            }

        _diag_cache["ts"] = now_mono
        _diag_cache["data"] = results
        return results

    @app.route("/api/health", methods=["GET"])
    def health_check():
        now = datetime.now(timezone.utc).isoformat()
        certify_status = certify_svc.get_service_status()
        wallet_status = wallet_svc.get_service_status()
        verify_status = verify_svc.get_service_status()
        dependency_diagnostics = _get_dependency_diagnostics(now)

        real_stack_configured = certify_svc.is_configured() and verify_svc.is_configured()
        essential_deps_reachable = (
            dependency_diagnostics.get("inji_certify", {}).get("reachable") is True and
            dependency_diagnostics.get("inji_verify", {}).get("reachable") is True
        )
        real_stack_connected = (
            certify_status.get("status") == "UP" and
            verify_status.get("status") == "UP" and
            essential_deps_reachable
        )

        if real_stack_connected:
            runtime_mode = "REAL_INJI_STACK_ONLINE"
            runtime_label = "REAL INJI STACK"
        elif real_stack_configured:
            runtime_mode = "REAL_INJI_STACK_OFFLINE"
            runtime_label = "REAL INJI STACK (OFFLINE)"
        else:
            runtime_mode = "SANDBOX_MOCK"
            runtime_label = "SANDBOX MODE"

        return jsonify({
            "status": "ok",
            "timestamp": now,
            "project": "Inji Interoperability Playground",
            "hackathon": "MOSIP Decode 2026 - Problem Statement 2",
            "version": "1.0.0",
            "services": {
                "inji_certify": certify_status,
                "inji_wallet": wallet_status,
                "inji_verify": verify_status
            },
            "dependency_diagnostics": dependency_diagnostics,
            "sandbox_mode": not real_stack_connected,
            "real_stack_configured": real_stack_configured,
            "real_stack_connected": real_stack_connected,
            "runtime_mode": runtime_mode,
            "runtime_label": runtime_label,
            "disclaimer": (
                "REAL MOSIP INJI STACK CONNECTED: Live OpenID4VCI and OpenID4VP services operational."
                if real_stack_connected
                else (
                    "REAL MOSIP INJI STACK CONFIGURED: Endpoints configured; live services currently offline."
                    if real_stack_configured
                    else "Sandbox mode active."
                )
            )
        }), 200

    def _derive_session_verdict(t: dict) -> str:
        """
        Strictly derives truthful execution status ('PASS', 'FAIL', 'ERROR', or 'RUNNING')
        from actual recorded test state and verification evidence.
        HTTP 200 alone never establishes PASS; incomplete/failed tests never inherit PASS.
        """
        st = t.get("status")
        out = t.get("outcome")
        steps_list = t.get("steps") or []
        step_8 = steps_list[-1] if len(steps_list) >= 8 else {}
        step_8_res = step_8.get("response") or {}

        if st == "COMPLETED":
            has_verification_pass = (
                step_8_res.get("test_passed") is True
                or (
                    step_8_res.get("test_passed") is None
                    and (step_8_res.get("allChecksSuccessful") is True or out == "PASS")
                )
            )
            return "PASS" if (out == "PASS" and has_verification_pass) else "FAIL"
        if st in ["AUTHORIZATION_FAILED", "ERROR"]:
            return "ERROR"
        return "RUNNING"

    def _classify_session_state(t: dict, all_matches: Optional[List[dict]] = None) -> str:
        """
        Classifies session into one of: 'COMPLETED', 'ERROR', 'RUNNING', 'INCOMPLETE'.
        Distinguishes active OAuth flows from stale, abandoned, or interrupted sessions
        based on explicit lifecycle evidence (token consumption, callback status, step HTTP errors,
        and session supersession)—never age alone.
        """
        status = t.get("status")

        # 1. Reached terminal completion
        if status == "COMPLETED":
            return "COMPLETED"

        # 2. Terminal execution errors
        if status in ["AUTHORIZATION_FAILED", "ERROR", "FAILED"]:
            return "ERROR"

        # 3. Explicitly reset or cancelled sessions
        if status in ["RESET", "CANCELLED", "ABANDONED"]:
            return "INCOMPLETE"

        # 4. Check for unrecoverable interruption in recorded protocol steps
        steps = t.get("steps") or []
        step_3 = steps[2] if len(steps) > 2 else {}
        step_4 = steps[3] if len(steps) > 3 else {}

        # If authorization code was consumed, the one-time code cannot be reused.
        # If the test is not COMPLETED, it was interrupted/failed.
        if t.get("auth_code_consumed") is True:
            return "INCOMPLETE"

        # If callback was processed but did not reach COMPLETED
        if t.get("callback_processed") is True:
            return "INCOMPLETE"

        # If token exchange or credential issuance resulted in protocol error (HTTP 4xx or 5xx, excluding 428 Precondition Required)
        s3_status = step_3.get("status")
        s4_status = step_4.get("status")
        if (s3_status and s3_status >= 400 and s3_status != 428) or (s4_status and s4_status >= 400 and s4_status != 428):
            return "INCOMPLETE"

        # 5. Actively executing in-flight callback
        if t.get("callback_in_progress") is True or status == "RUNNING":
            return "RUNNING"

        # 6. Awaiting authorization or credential:
        # Distinguish genuinely active awaiting session from superseded/abandoned sessions.
        # If a newer test session was subsequently started for this combination/system,
        # the previous waiting session was abandoned/superseded.
        if status in ["AWAITING_AUTHORIZATION", "AWAITING_CREDENTIAL", "PENDING_VERIFICATION", "PENDING"]:
            if all_matches and len(all_matches) > 0:
                newest_session = all_matches[0]
                if newest_session.get("test_id") != t.get("test_id"):
                    return "INCOMPLETE"
            # It is the latest session, not superseded, and has no consumed code or step errors
            return "RUNNING"

        return "INCOMPLETE"

    def _is_verified_real_execution(t: dict) -> bool:
        """
        Confirms a test session is a genuine real-stack execution based on actual recorded
        service interactions (not merely configuration labels).
        """
        if t.get("is_simulation") is True or not t.get("is_real_stack"):
            return False
        steps_list = t.get("steps") or []
        return any(bool(s.get("is_real")) for s in steps_list)

    def _build_live_matrix():
        base_matrix = interop_svc.create_interop_matrix()
        all_tests = test_store.list_tests()
        active_tests = [t for t in all_tests if t.get("status") != "RESET"]
        enriched = []

        for item in base_matrix:
            combo_matches = [
                t for t in active_tests
                if (t.get("issuer") == item["issuer"] or (item["issuer"] == "Inji Certify" and t.get("issuer") in ["MOSIP Inji Certify", "Inji Certify"])) and
                   t.get("wallet") == item["wallet"] and
                   t.get("verifier") == item["verifier"] and
                   (t.get("credential_format") == item["format"] or
                    (t.get("credential_format") == "W3C VC" and item["format"] == "W3C VC"))
            ]

            real_matches = [t for t in combo_matches if _is_verified_real_execution(t)]
            sim_matches = [t for t in combo_matches if not _is_verified_real_execution(t)]

            # Demo/sandbox simulations must NEVER overwrite or masquerade as real Inji results
            effective_matches = real_matches if len(real_matches) > 0 else sim_matches

            if effective_matches:
                # Classify all sessions in effective_matches
                classified = [
                    (t, _classify_session_state(t, effective_matches), _derive_session_verdict(t))
                    for t in effective_matches
                ]

                # Metric breakdown:
                # attempt_count: all test sessions started
                attempt_count = len(effective_matches)
                # completed_matches: sessions that reached terminal completion
                completed_matches = [t for (t, state, _) in classified if state == "COMPLETED"]
                # error_matches: terminal execution errors
                error_matches = [t for (t, state, _) in classified if state == "ERROR"]
                # running_matches: genuinely active sessions
                running_matches = [t for (t, state, _) in classified if state == "RUNNING"]
                # incomplete_matches: abandoned, interrupted, or awaiting sessions not actively progressing
                incomplete_matches = [t for (t, state, _) in classified if state == "INCOMPLETE"]

                completed_count = len(completed_matches) + len(error_matches)
                running_count = len(running_matches)
                incomplete_count = len(incomplete_matches)
                error_count = len(error_matches)
                pass_count = sum(1 for (t, state, v) in classified if state == "COMPLETED" and v == "PASS")
                fail_count = sum(1 for (t, state, v) in classified if state == "COMPLETED" and v == "FAIL")

                # Separate real vs simulation metrics derived from persisted records
                real_classified = [(t, _classify_session_state(t, real_matches), _derive_session_verdict(t)) for t in real_matches]
                sim_classified = [(t, _classify_session_state(t, sim_matches), _derive_session_verdict(t)) for t in sim_matches]

                real_attempt_count = len(real_matches)
                real_completed_count = sum(1 for (_, state, _) in real_classified if state in ["COMPLETED", "ERROR"])
                real_pass_count = sum(1 for (_, state, v) in real_classified if state == "COMPLETED" and v == "PASS")
                real_fail_count = sum(1 for (_, state, v) in real_classified if state == "COMPLETED" and v == "FAIL")
                real_running_count = sum(1 for (_, state, _) in real_classified if state == "RUNNING")
                real_incomplete_count = sum(1 for (_, state, _) in real_classified if state == "INCOMPLETE")
                real_error_count = sum(1 for (_, state, _) in real_classified if state == "ERROR")

                simulation_attempt_count = len(sim_matches)
                simulation_completed_count = sum(1 for (_, state, _) in sim_classified if state in ["COMPLETED", "ERROR"])
                simulation_pass_count = sum(1 for (_, state, v) in sim_classified if state == "COMPLETED" and v == "PASS")
                simulation_fail_count = sum(1 for (_, state, v) in sim_classified if state == "COMPLETED" and v == "FAIL")
                simulation_running_count = sum(1 for (_, state, _) in sim_classified if state == "RUNNING")
                simulation_incomplete_count = sum(1 for (_, state, _) in sim_classified if state == "INCOMPLETE")
                simulation_error_count = sum(1 for (_, state, _) in sim_classified if state == "ERROR")

                # Latest attempt vs latest completed:
                # Latest attempt is the newest session started
                latest_attempt = effective_matches[0]
                latest_attempt_state = _classify_session_state(latest_attempt, effective_matches)
                latest_attempt_id = latest_attempt.get("test_id")
                latest_attempt_at = latest_attempt.get("updated_at") or latest_attempt.get("created_at")

                # Latest completed execution determines the matrix latest verdict
                latest_completed = completed_matches[0] if completed_matches else (error_matches[0] if error_matches else None)
                if latest_completed:
                    latest_verdict = _derive_session_verdict(latest_completed)
                    primary_test = latest_completed
                elif running_matches:
                    latest_verdict = "RUNNING"
                    primary_test = running_matches[0]
                else:
                    latest_verdict = "INCOMPLETE"
                    primary_test = latest_attempt

                is_real_combo = _is_verified_real_execution(primary_test)
                latest_tid = primary_test.get("test_id")
                latest_step8_res = (primary_test.get("steps") or [{}])[-1].get("response", {}) if primary_test.get("steps") else {}

                executions_history = []
                for (t, exec_state, v_stat) in classified[:25]:
                    tid = t.get("test_id") or ""
                    s8_res = (t.get("steps") or [{}])[-1].get("response", {}) if t.get("steps") else {}
                    verdict_display = v_stat if exec_state in ["COMPLETED", "ERROR"] else exec_state
                    executions_history.append({
                        "test_id": tid,
                        "report_id": f"REP-{tid[:8].upper()}" if tid else None,
                        "execution_state": exec_state,
                        "verdict": verdict_display,
                        "status": t.get("status"),
                        "display_status": verdict_display,
                        "outcome": v_stat if exec_state == "COMPLETED" else (t.get("outcome") or exec_state),
                        "expected_outcome": t.get("expected_outcome", "PASS"),
                        "credential_validity": t.get("credential_validity") or s8_res.get("credential_validity") or s8_res.get("validity_state"),
                        "verifier_result": t.get("verifier_result") or s8_res.get("verifier_result") or s8_res.get("result"),
                        "is_real_stack": _is_verified_real_execution(t),
                        "is_simulation": not _is_verified_real_execution(t),
                        "is_completed": exec_state == "COMPLETED",
                        "is_running": exec_state == "RUNNING",
                        "is_incomplete": exec_state == "INCOMPLETE",
                        "created_at": t.get("created_at"),
                        "updated_at": t.get("updated_at") or t.get("created_at"),
                        "duration_ms": t.get("duration_ms", 0.0)
                    })

                enriched.append({
                    **item,
                    "test_id": latest_tid,
                    "report_id": f"REP-{latest_tid[:8].upper()}" if latest_tid else None,
                    "raw_status": primary_test.get("status"),
                    "result": latest_verdict,
                    "latest_verdict": latest_verdict,
                    "display_status": latest_verdict,
                    "credential_validity": primary_test.get("credential_validity") or latest_step8_res.get("credential_validity") or latest_step8_res.get("validity_state"),
                    "verifier_result": primary_test.get("verifier_result") or latest_step8_res.get("verifier_result") or latest_step8_res.get("result"),
                    "expected_outcome": primary_test.get("expected_outcome", "PASS"),
                    "status": latest_verdict,
                    "is_real_stack": is_real_combo,
                    "is_simulation": not is_real_combo,
                    "mode": "REAL_INJI_STACK" if is_real_combo else "SIMULATION",
                    "attempt_count": attempt_count,
                    "completed_count": completed_count,
                    "running_count": running_count,
                    "incomplete_count": incomplete_count,
                    "pass_count": pass_count,
                    "fail_count": fail_count,
                    "error_count": error_count,
                    "execution_count": completed_count,
                    "real_attempt_count": real_attempt_count,
                    "real_completed_count": real_completed_count,
                    "real_pass_count": real_pass_count,
                    "real_fail_count": real_fail_count,
                    "real_running_count": real_running_count,
                    "real_incomplete_count": real_incomplete_count,
                    "real_error_count": real_error_count,
                    "real_execution_count": real_completed_count,
                    "simulation_attempt_count": simulation_attempt_count,
                    "simulation_completed_count": simulation_completed_count,
                    "simulation_pass_count": simulation_pass_count,
                    "simulation_fail_count": simulation_fail_count,
                    "simulation_running_count": simulation_running_count,
                    "simulation_incomplete_count": simulation_incomplete_count,
                    "simulation_error_count": simulation_error_count,
                    "simulation_execution_count": simulation_completed_count,
                    "latest_executed_at": primary_test.get("updated_at") or primary_test.get("created_at"),
                    "duration_ms": primary_test.get("duration_ms", 0.0),
                    "latest_attempt_id": latest_attempt_id,
                    "latest_attempt_report_id": f"REP-{latest_attempt_id[:8].upper()}" if latest_attempt_id else None,
                    "latest_attempt_status": latest_attempt.get("status"),
                    "latest_attempt_state": latest_attempt_state,
                    "latest_attempt_at": latest_attempt_at,
                    "latest_completed_id": latest_completed.get("test_id") if latest_completed else None,
                    "latest_completed_report_id": f"REP-{latest_completed['test_id'][:8].upper()}" if latest_completed else None,
                    "latest_completed_at": (latest_completed.get("updated_at") or latest_completed.get("created_at")) if latest_completed else None,
                    "executions": executions_history,
                    "is_demo_entry": False
                })
            else:
                enriched.append({
                    **item,
                    "test_id": None,
                    "report_id": None,
                    "raw_status": None,
                    "result": "—",
                    "latest_verdict": "NOT TESTED",
                    "display_status": "NOT TESTED",
                    "credential_validity": None,
                    "verifier_result": None,
                    "expected_outcome": None,
                    "status": "NOT_TESTED",
                    "is_real_stack": False,
                    "is_simulation": False,
                    "mode": "NOT_TESTED",
                    "attempt_count": 0,
                    "completed_count": 0,
                    "running_count": 0,
                    "incomplete_count": 0,
                    "pass_count": 0,
                    "fail_count": 0,
                    "error_count": 0,
                    "execution_count": 0,
                    "real_attempt_count": 0,
                    "real_completed_count": 0,
                    "real_execution_count": 0,
                    "real_pass_count": 0,
                    "real_fail_count": 0,
                    "real_running_count": 0,
                    "real_incomplete_count": 0,
                    "real_error_count": 0,
                    "simulation_attempt_count": 0,
                    "simulation_completed_count": 0,
                    "simulation_execution_count": 0,
                    "simulation_pass_count": 0,
                    "simulation_fail_count": 0,
                    "simulation_running_count": 0,
                    "simulation_incomplete_count": 0,
                    "simulation_error_count": 0,
                    "latest_executed_at": None,
                    "latest_attempt_id": None,
                    "latest_attempt_report_id": None,
                    "latest_attempt_status": None,
                    "latest_attempt_state": None,
                    "latest_attempt_at": None,
                    "latest_completed_id": None,
                    "latest_completed_report_id": None,
                    "latest_completed_at": None,
                    "executions": [],
                    "is_demo_entry": False
                })

        tested_only = [row for row in enriched if row.get("attempt_count", 0) > 0 or row.get("completed_count", 0) > 0 or row.get("execution_count", 0) > 0]
        latest_overall = active_tests[0] if active_tests else None

        return {
            "total": len(enriched),
            "tested_combinations_count": len(tested_only),
            "matrix": enriched,
            "tested_matrix": tested_only,
            "live_tests_count": len(active_tests),
            "latest_test_id": latest_overall.get("test_id") if latest_overall else None,
            "latest_updated_at": latest_overall.get("updated_at") if latest_overall else None,
            "total_attempts": sum(r.get("attempt_count", 0) for r in enriched),
            "total_completed": sum(r.get("completed_count", 0) for r in enriched),
            "total_running": sum(r.get("running_count", 0) for r in enriched),
            "total_incomplete": sum(r.get("incomplete_count", 0) for r in enriched),
            "total_pass": sum(r.get("pass_count", 0) for r in enriched),
            "total_fail": sum(r.get("fail_count", 0) for r in enriched),
            "total_error": sum(r.get("error_count", 0) for r in enriched),
        }

    # 2. Config Endpoint
    @app.route("/api/config", methods=["GET"])
    def get_config():
        options = interop_svc.get_supported_options()
        live_matrix = _build_live_matrix()
        return jsonify({
            "options": options,
            "matrix": live_matrix["matrix"],
            "environment": {
                "inji_certify_configured": certify_svc.is_configured(),
                "inji_wallet_configured": wallet_svc.is_configured(),
                "inji_verify_configured": verify_svc.is_configured(),
                "inji_certify_url": certify_svc.certify_url or None,
                "inji_wallet_url": wallet_svc.wallet_url or None,
                "inji_verify_url": verify_svc.verify_url or None,
                "mimoto_url": wallet_svc.mimoto_url or None
            }
        }), 200

    # 3. Start Test
    @app.route("/api/test/start", methods=["POST"])
    def start_test():
        t_start = time.perf_counter()
        data = request.get_json(silent=True) or {}
        issuer = data.get("issuer", "Inji Certify")
        wallet = data.get("wallet", "Inji Web")
        verifier = data.get("verifier", "Inji Verify")
        credential_format = data.get("credential_format", "W3C VC")
        expected_outcome = data.get("expected_outcome", "PASS")
        auth_code = data.get("auth_code") or data.get("code")
        code_verifier = data.get("code_verifier")
        credential = data.get("credential") or data.get("vc")

        # Normalize format name if needed
        valid_formats = ["W3C VC", "SD-JWT VC"]
        if credential_format not in valid_formats:
            credential_format = "W3C VC"

        # Unique session ID
        test_id = str(uuid.uuid4())

        # Real eSignet client registered web redirect URI (proxied by Inji Web on port 3004)
        web_redirect_uri = os.getenv("ESIGNET_REDIRECT_URI", "http://localhost:3004/redirect")

        # Generate PKCE pair and secure random state
        if code_verifier:
            active_code_verifier = code_verifier
            code_challenge = wallet_svc.derive_code_challenge(active_code_verifier)
        else:
            pkce = wallet_svc.generate_pkce_pair()
            active_code_verifier = pkce["code_verifier"]
            code_challenge = pkce["code_challenge"]
        oauth_state = f"state_{secrets.token_urlsafe(16)}"

        session_start_iso = datetime.now(timezone.utc).isoformat()

        # 1. Identify/create session in durable store before execution starts
        test_store.create_test(
            issuer=issuer,
            wallet=wallet,
            verifier=verifier,
            credential_format=credential_format,
            expected_outcome=expected_outcome,
            protocol_steps=[],
            test_id=test_id,
            code_verifier=active_code_verifier,
            oauth_state=oauth_state,
            redirect_uri=web_redirect_uri,
            code_challenge=code_challenge
        )

        # 2. Execute or model protocol steps with monotonic timing
        steps, is_real = interop_svc.generate_protocol_steps(
            issuer=issuer,
            wallet=wallet,
            verifier=verifier,
            format_type=credential_format,
            expected_outcome=expected_outcome,
            auth_code=auth_code,
            code_verifier=active_code_verifier,
            credential=credential,
            redirect_uri=web_redirect_uri,
            state=oauth_state,
            code_challenge=code_challenge
        )

        # Determine test status, credential validity, verifier result, and test verdict strictly from execution evidence
        credential_validity = None
        verifier_result = None
        if is_real and len(steps) >= 8:
            step_8 = steps[-1]
            step_8_res = step_8.get("response", {})
            if step_8.get("is_real") and step_8.get("status") == 200:
                all_ok = step_8_res.get("allChecksSuccessful", False)
                credential_validity = step_8_res.get("credential_validity") or step_8_res.get("validity_state") or ("VALID" if all_ok else "INVALID")
                verifier_result = step_8_res.get("verifier_result") or step_8_res.get("result") or ("PASS" if all_ok else "FAIL")
                outcome = step_8_res.get("test_outcome") or ("PASS" if all_ok else "FAIL")
                test_status = "COMPLETED"
                test_note = (
                    f"REAL MOSIP INJI STACK: Evaluated live by Inji Verify (port 8081). "
                    f"Expected Scenario: {expected_outcome} | Verifier Result: {verifier_result} | "
                    f"Credential Validity: {credential_validity} | Test Verdict: {outcome}."
                )
            else:
                outcome = "PENDING"
                if not auth_code:
                    test_status = "AWAITING_AUTHORIZATION"
                    test_note = "REAL MOSIP INJI STACK: Awaiting citizen OAuth authorization via eSignet redirect or callback."
                elif not credential:
                    test_status = "AWAITING_CREDENTIAL"
                    test_note = "REAL MOSIP INJI STACK: Awaiting issued credential for verification."
                else:
                    test_status = "PENDING_VERIFICATION"
                    test_note = "REAL MOSIP INJI STACK: Presentation submitted, awaiting verification completion."
        else:
            step_8_res = steps[-1].get("response", {}) if steps else {}
            credential_validity = step_8_res.get("credential_validity") or step_8_res.get("validity_state", "VALID")
            verifier_result = step_8_res.get("verifier_result") or step_8_res.get("result", "PASS")
            outcome = step_8_res.get("test_outcome", "PASS")
            test_status = "COMPLETED"
            test_note = (
                f"Simulated sandbox test completed. Expected Scenario: {expected_outcome} | "
                f"Verifier Result: {verifier_result} | Credential Validity: {credential_validity} | Test Verdict: {outcome}."
            )

        auth_url = steps[1].get("full_url") if len(steps) > 1 else None
        step_durations_ms = {
            s.get("step_id", f"step_{idx}"): round(float(s.get("duration_ms", 0.0) or 0.0), 1)
            for idx, s in enumerate(steps, 1)
        }
        total_duration_ms = round(sum(step_durations_ms.values()), 1) or round((time.perf_counter() - t_start) * 1000, 1)

        print(f"[STEP_TIMING] phase=start_test test_id={test_id} total_ms={total_duration_ms} steps={step_durations_ms}")

        completed_at = datetime.now(timezone.utc).isoformat() if test_status == "COMPLETED" else None

        test_store.update_test(test_id, {
            "status": test_status,
            "current_step_index": len(steps),
            "steps": steps,
            "outcome": outcome,
            "credential_validity": credential_validity,
            "verifier_result": verifier_result,
            "is_simulation": not is_real,
            "is_real_stack": is_real,
            "note": test_note,
            "authorization_url": auth_url,
            "redirect_uri": web_redirect_uri,
            "started_at": session_start_iso,
            "completed_at": completed_at,
            "duration_ms": total_duration_ms,
            "step_durations_ms": step_durations_ms
        })

        # Log timeline events in a single SQLite batch transaction
        batch_events = [
            {
                "event_type": f"STEP_{idx}_EXECUTED",
                "message": f"Executed protocol step {idx}: {step['name']} ({step['phase']})",
                "payload": {
                    "step_id": step["step_id"],
                    "endpoint": step["endpoint"],
                    "status": step["status"],
                    "is_real": step.get("is_real", False),
                    "duration_ms": step.get("duration_ms", 0.0)
                }
            }
            for idx, step in enumerate(steps, 1)
        ]
        batch_events.append({
            "event_type": "TEST_COMPLETED" if test_status == "COMPLETED" else "TEST_PENDING",
            "message": f"Test session {test_id} status: {test_status}, outcome: {outcome}",
            "payload": {"outcome": outcome, "is_real": is_real, "status": test_status, "duration_ms": total_duration_ms}
        })
        test_store.add_events_batch(test_id, batch_events)

        updated_test = test_store.get_test(test_id)
        return jsonify(updated_test), 200

    def _render_callback_redirect_html(test_id: str, outcome: Optional[str] = None) -> tuple:
        frontend_url = os.getenv("PLAYGROUND_FRONTEND_URL", "http://localhost:8080").rstrip("/")
        target_url = f"{frontend_url}/?test_id={test_id}#/console"
        verdict_label = f"Verification Complete ({outcome})" if outcome in ["PASS", "FAIL"] else "Authorization Complete"
        return f"""<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Inji Playground - {verdict_label}</title>
          <meta http-equiv="refresh" content="0;url={target_url}">
          <script>
            try {{
              var bc = new BroadcastChannel('inji_test_channel');
              bc.postMessage({{ type: 'TEST_UPDATED', test_id: '{test_id}', outcome: '{outcome or ""}' }});
              bc.close();
            }} catch (e) {{}}
            window.location.replace("{target_url}");
          </script>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf8f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #332;">
          <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 480px;">
            <div style="font-size: 40px; margin-bottom: 12px;">✅</div>
            <h2 style="color: #2e7d32; margin: 0 0 8px;">{verdict_label}</h2>
            <p style="color: #555; line-height: 1.5;">Protocol steps 3–8 executed for test session <code>{test_id}</code>.</p>
            <p style="color: #777; font-size: 14px;">Returning to Test Console immediately...</p>
            <a href="{target_url}" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background: #9c5c36; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">Open Test Console</a>
          </div>
        </body>
        </html>""", 200, {"Content-Type": "text/html"}

    def _process_oauth_callback(test_session, code, state, error, error_description):
        t_cb_start = time.perf_counter()
        test_id = test_session["test_id"]
        if error:
            test_store.update_test(test_id, {
                "status": "AUTHORIZATION_FAILED",
                "outcome": "FAIL",
                "error": f"{error}: {error_description}"
            })
            test_store.add_event(
                test_id=test_id,
                event_type="OAUTH_ERROR",
                message=f"OAuth authorization error: {error} - {error_description}",
                payload={"error": error, "error_description": error_description}
            )
            if request.method == "GET" and "text/html" in request.headers.get("Accept", ""):
                frontend_url = os.getenv("PLAYGROUND_FRONTEND_URL", "http://localhost:8080")
                return f"""<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;">
                <h2 style="color:#d9534f;">OAuth Authorization Error</h2>
                <p><b>{error}</b>: {error_description}</p>
                <p><a href="{frontend_url}">Return to Playground</a></p>
                </body></html>""", 400, {"Content-Type": "text/html"}
            return jsonify({"error": error, "message": error_description}), 400

        if not code:
            return jsonify({"error": "Bad Request", "message": "Missing 'code' query or body parameter."}), 400

        # Validate OAuth state parameter against stored state
        expected_state = test_session.get("oauth_state")
        state_match = bool(expected_state and state == expected_state)
        if expected_state and not state_match:
            test_store.add_event(
                test_id=test_id,
                event_type="STATE_MISMATCH",
                message="OAuth state mismatch.",
                payload={"state_match": False}
            )
            print(f"[OAUTH_CALLBACK] SAFE TRACE: test_id={test_id}, state_match=False, code_received={bool(code)}")
            return jsonify({
                "error": "invalid_state",
                "message": "OAuth CSRF state validation failed. State parameter mismatch."
            }), 400

        # Atomic idempotency guard: prevent duplicate token exchange, credential issuance, and VP submission
        claimed, current_session = test_store.claim_oauth_callback(test_id)
        if not claimed:
            existing = current_session or test_session
            print(
                f"[OAUTH_CALLBACK] IDEMPOTENT_SKIP: test_id={test_id}, "
                f"status={existing.get('status')}, outcome={existing.get('outcome')}, "
                f"callback_already_claimed=True"
            )
            if request.method == "GET" and "text/html" in request.headers.get("Accept", "") and "application/json" not in request.headers.get("Accept", ""):
                return _render_callback_redirect_html(test_id, existing.get("outcome"))
            return jsonify(existing), 200

        print(f"[OAUTH_CALLBACK] SAFE TRACE: test_id={test_id}, state_match=True, code_received={bool(code)}, claimed=True")

        # Retrieve stored PKCE code_verifier and redirect_uri
        stored_code_verifier = current_session.get("code_verifier") or test_session.get("code_verifier")
        code_verifier = (request.get_json(silent=True) or {}).get("code_verifier") or stored_code_verifier
        stored_challenge = current_session.get("code_challenge") or test_session.get("code_challenge")
        code_challenge = stored_challenge or (wallet_svc.derive_code_challenge(code_verifier) if code_verifier else None)
        redirect_uri = current_session.get("redirect_uri") or test_session.get("redirect_uri", "http://localhost:3004/redirect")
        existing_steps = current_session.get("steps") or test_session.get("steps")

        # Continue test with real authorization code & stored verifier, reusing Steps 1, 2, and 6
        steps, is_real = interop_svc.generate_protocol_steps(
            issuer=test_session["issuer"],
            wallet=test_session["wallet"],
            verifier=test_session["verifier"],
            format_type=test_session["credential_format"],
            expected_outcome=test_session["expected_outcome"],
            auth_code=code,
            code_verifier=code_verifier,
            redirect_uri=redirect_uri,
            state=state,
            code_challenge=code_challenge,
            existing_steps=existing_steps
        )

        token_step_status = steps[2]["status"] if len(steps) > 2 else None
        mimoto_res = steps[2].get("response", {}) if len(steps) > 2 else {}
        mimoto_status = mimoto_res.get("status") or token_step_status

        # Extract sanitized diagnostics from Mimoto response
        sanitized_error = None
        if isinstance(mimoto_res, dict):
            errors = mimoto_res.get("errors")
            if isinstance(errors, list) and len(errors) > 0 and isinstance(errors[0], dict):
                sanitized_error = errors[0].get("errorMessage") or errors[0].get("errorCode")
            elif mimoto_res.get("error_description"):
                sanitized_error = mimoto_res.get("error_description")
            elif mimoto_res.get("error"):
                sanitized_error = mimoto_res.get("error")
            elif mimoto_res.get("message"):
                sanitized_error = mimoto_res.get("message")

        if sanitized_error and isinstance(sanitized_error, str):
            sanitized_error = re.sub(r'(bearer\s+)[A-Za-z0-9_\-\.]+', r'\1[REDACTED]', sanitized_error, flags=re.IGNORECASE)
            sanitized_error = re.sub(r'(code=)[A-Za-z0-9_\-\.]+', r'\1[REDACTED]', sanitized_error, flags=re.IGNORECASE)
            sanitized_error = sanitized_error[:200]

        # Extract sanitized diagnostics from Certify response
        certify_res = steps[3].get("response", {}) if len(steps) > 3 else {}
        sanitized_certify_error = None
        if isinstance(certify_res, dict):
            raw_err = certify_res.get("error") or certify_res.get("message")
            if isinstance(raw_err, dict):
                sanitized_certify_error = raw_err.get("error_description") or raw_err.get("error") or str(raw_err)
            elif raw_err:
                sanitized_certify_error = str(raw_err)
        if sanitized_certify_error and isinstance(sanitized_certify_error, str):
            sanitized_certify_error = re.sub(r'(bearer\s+)[A-Za-z0-9_\-\.]+', r'\1[REDACTED]', sanitized_certify_error, flags=re.IGNORECASE)
            sanitized_certify_error = sanitized_certify_error[:200]

        credential_validity = None
        verifier_result = None
        expected_scenario = test_session.get("expected_outcome", "PASS")
        if is_real and len(steps) >= 8:
            step_8 = steps[-1]
            step_8_res = step_8.get("response", {})
            if step_8.get("is_real") and step_8.get("status") == 200:
                all_ok = step_8_res.get("allChecksSuccessful", False)
                credential_validity = step_8_res.get("credential_validity") or step_8_res.get("validity_state") or ("VALID" if all_ok else "INVALID")
                verifier_result = step_8_res.get("verifier_result") or step_8_res.get("result") or ("PASS" if all_ok else "FAIL")
                outcome = step_8_res.get("test_outcome") or ("PASS" if all_ok else "FAIL")
                test_status = "COMPLETED"
                test_note = (
                    f"REAL MOSIP INJI STACK: Evaluated live by Inji Verify (port 8081). "
                    f"Expected Scenario: {expected_scenario} | Verifier Result: {verifier_result} | "
                    f"Credential Validity: {credential_validity} | Test Verdict: {outcome}."
                )
            else:
                outcome = "PENDING"
                if steps[2].get("status") != 200:
                    test_status = "AWAITING_AUTHORIZATION"
                    err_suffix = f": {sanitized_error}" if sanitized_error else ""
                    test_note = f"REAL MOSIP INJI STACK: Token exchange pending/failed (HTTP {steps[2].get('status')}){err_suffix}."
                elif steps[4].get("status") != 200:
                    test_status = "AWAITING_CREDENTIAL"
                    err_suffix = f": {sanitized_certify_error}" if sanitized_certify_error else ""
                    test_note = f"REAL MOSIP INJI STACK: Token exchanged, awaiting issued credential from Inji Certify (HTTP {steps[3].get('status')}){err_suffix}."
                else:
                    test_status = "PENDING_VERIFICATION"
                    test_note = "REAL MOSIP INJI STACK: Presentation submitted, awaiting verification completion."
        else:
            step_8_res = steps[-1].get("response", {}) if steps else {}
            credential_validity = step_8_res.get("credential_validity") or step_8_res.get("validity_state", "VALID")
            verifier_result = step_8_res.get("verifier_result") or step_8_res.get("result", "PASS")
            outcome = step_8_res.get("test_outcome", "PASS")
            test_status = "COMPLETED"
            test_note = "OAuth callback processed."

        step_durations_ms = {
            s.get("step_id", f"step_{idx}"): round(float(s.get("duration_ms", 0.0) or 0.0), 1)
            for idx, s in enumerate(steps, 1)
        }
        total_duration_ms = round(sum(step_durations_ms.values()), 1) or round((time.perf_counter() - t_cb_start) * 1000, 1)

        print(
            f"[OAUTH_CALLBACK] SAFE TRACE: token_exchange_status={token_step_status}, "
            f"mimoto_status={mimoto_status}, test_status={test_status}, outcome={outcome}, "
            f"verifier_result={verifier_result}, credential_validity={credential_validity}"
        )
        print(f"[STEP_TIMING] phase=oauth_callback test_id={test_id} total_ms={total_duration_ms} steps={step_durations_ms}")

        cb_completed_at = datetime.now(timezone.utc).isoformat() if test_status == "COMPLETED" else None

        test_store.update_test(test_id, {
            "status": test_status,
            "current_step_index": len(steps),
            "steps": steps,
            "outcome": outcome,
            "credential_validity": credential_validity,
            "verifier_result": verifier_result,
            "note": test_note,
            "duration_ms": total_duration_ms,
            "step_durations_ms": step_durations_ms,
            "completed_at": cb_completed_at,
            "callback_processed": True,
            "callback_in_progress": False,
            "auth_code_consumed": True
        })

        cb_events = [
            {
                "event_type": f"STEP_{idx}_EXECUTED",
                "message": f"Callback executed protocol step {idx}: {step['name']} ({step['phase']})",
                "payload": {
                    "step_id": step["step_id"],
                    "endpoint": step["endpoint"],
                    "status": step["status"],
                    "is_real": step.get("is_real", False),
                    "duration_ms": step.get("duration_ms", 0.0)
                }
            }
            for idx, step in enumerate(steps, 1)
            if idx >= 3
        ]
        cb_events.append({
            "event_type": "AUTH_CODE_RECEIVED",
            "message": f"Received authorization code for test {test_id}. Status: {test_status}, outcome: {outcome}",
            "payload": {
                "code_received": bool(code),
                "state_match": True,
                "token_exchange_status": token_step_status,
                "sanitized_error": sanitized_error,
                "outcome": outcome,
                "credential_validity": credential_validity,
                "verifier_result": verifier_result,
                "status": test_status,
                "duration_ms": total_duration_ms
            }
        })
        test_store.add_events_batch(test_id, cb_events)

        # If accessed directly via browser redirect GET, return an instant redirect landing page
        if request.method == "GET" and "text/html" in request.headers.get("Accept", "") and "application/json" not in request.headers.get("Accept", ""):
            return _render_callback_redirect_html(test_id, outcome)

        return jsonify(test_store.get_test(test_id)), 200

    # 4. Generic OAuth Callback (Proxied from http://localhost:3004/redirect)
    @app.route("/api/oauth/callback", methods=["GET", "POST"])
    def generic_oauth_callback():
        body_json = request.get_json(silent=True) or {}
        code = request.args.get("code") or request.form.get("code") or body_json.get("code")
        state = request.args.get("state") or request.form.get("state") or body_json.get("state")
        error = request.args.get("error") or request.form.get("error") or body_json.get("error")
        error_description = request.args.get("error_description") or request.form.get("error_description") or body_json.get("error_description")

        if not state:
            return jsonify({"error": "missing_state", "message": "Missing 'state' parameter in OAuth callback."}), 400

        clean_state = str(state).strip()
        test_session = test_store.get_test_by_state(clean_state)
        print(f"[OAUTH_CALLBACK] SAFE TRACE: state_received=True, matched_session={bool(test_session)}, code_received={bool(code)}")

        if not test_session:
            return jsonify({
                "error": "invalid_state",
                "message": f"No active test session found matching OAuth state '{clean_state}'. State validation failed."
            }), 400

        return _process_oauth_callback(test_session, code, clean_state, error, error_description)

    # 5. Session-Specific OAuth Callback
    @app.route("/api/test/<test_id>/callback", methods=["GET", "POST"])
    def oauth_callback(test_id):
        test_session = test_store.get_test(test_id)
        if not test_session:
            return jsonify({"error": "Not Found", "message": f"Test session '{test_id}' not found."}), 404

        body_json = request.get_json(silent=True) or {}
        code = request.args.get("code") or request.form.get("code") or body_json.get("code")
        state = request.args.get("state") or request.form.get("state") or body_json.get("state")
        error = request.args.get("error") or request.form.get("error") or body_json.get("error")
        error_description = request.args.get("error_description") or request.form.get("error_description") or body_json.get("error_description")

        clean_state = str(state).strip() if state else None
        return _process_oauth_callback(test_session, code, clean_state, error, error_description)

    # 5. Direct Credential Verification Endpoint
    @app.route("/api/test/<test_id>/verify-credential", methods=["POST"])
    def verify_credential(test_id):
        test_session = test_store.get_test(test_id)
        if not test_session:
            return jsonify({"error": "Not Found", "message": f"Test session '{test_id}' not found."}), 404

        data = request.get_json(silent=True) or {}
        credential = data.get("credential") or data.get("vc")
        if not credential:
            return jsonify({"error": "Bad Request", "message": "Missing 'credential' in JSON payload."}), 400

        expected_outcome = data.get("expected_outcome", test_session.get("expected_outcome", "PASS"))

        steps, is_real = interop_svc.generate_protocol_steps(
            issuer=test_session["issuer"],
            wallet=test_session["wallet"],
            verifier=test_session["verifier"],
            format_type=test_session["credential_format"],
            expected_outcome=expected_outcome,
            credential=credential,
            existing_steps=test_session.get("steps")
        )

        credential_validity = None
        verifier_result = None
        if is_real and len(steps) >= 8:
            step_8 = steps[-1]
            step_8_res = step_8.get("response", {})
            if step_8.get("is_real") and step_8.get("status") == 200:
                all_ok = step_8_res.get("allChecksSuccessful", False)
                credential_validity = step_8_res.get("credential_validity") or step_8_res.get("validity_state") or ("VALID" if all_ok else "INVALID")
                verifier_result = step_8_res.get("verifier_result") or step_8_res.get("result") or ("PASS" if all_ok else "FAIL")
                outcome = step_8_res.get("test_outcome") or ("PASS" if all_ok else "FAIL")
                test_status = "COMPLETED"
                test_note = (
                    f"REAL INJI VERIFY: Expected Scenario: {expected_outcome} | "
                    f"Verifier Result: {verifier_result} | Credential Validity: {credential_validity} | "
                    f"Test Verdict: {outcome}."
                )
            else:
                outcome = "PENDING"
                test_status = "PENDING_VERIFICATION"
                test_note = "REAL INJI VERIFY: Pending verification completion."
        else:
            step_8_res = steps[-1].get("response", {}) if steps else {}
            credential_validity = step_8_res.get("credential_validity") or step_8_res.get("validity_state", "VALID")
            verifier_result = step_8_res.get("verifier_result") or step_8_res.get("result", "PASS")
            outcome = step_8_res.get("test_outcome", "PASS")
            test_status = "COMPLETED"
            test_note = "Simulated verification completed."

        step_durations_ms = {
            s.get("step_id", f"step_{idx}"): round(float(s.get("duration_ms", 0.0) or 0.0), 1)
            for idx, s in enumerate(steps, 1)
        }
        total_duration_ms = round(sum(step_durations_ms.values()), 1)

        test_store.update_test(test_id, {
            "status": test_status,
            "current_step_index": len(steps),
            "steps": steps,
            "outcome": outcome,
            "credential_validity": credential_validity,
            "verifier_result": verifier_result,
            "expected_outcome": expected_outcome,
            "note": test_note,
            "duration_ms": total_duration_ms,
            "step_durations_ms": step_durations_ms
        })

        test_store.add_event(
            test_id=test_id,
            event_type="CREDENTIAL_VERIFIED",
            message=f"Credential evaluated by Inji Verify. Status: {test_status}, outcome: {outcome}, validity: {credential_validity}",
            payload={
                "outcome": outcome,
                "credential_validity": credential_validity,
                "verifier_result": verifier_result,
                "expected_outcome": expected_outcome,
                "status": test_status,
                "duration_ms": total_duration_ms
            }
        )

        return jsonify(test_store.get_test(test_id)), 200

    # 4. Get Test by ID
    @app.route("/api/test/<test_id>", methods=["GET"])
    def get_test(test_id):
        test_session = test_store.get_test(test_id)
        if not test_session:
            return jsonify({"error": "Not Found", "message": f"Test session '{test_id}' not found."}), 404
        return jsonify(test_session), 200

    # 5. Get Test Events
    @app.route("/api/test/<test_id>/events", methods=["GET"])
    def get_test_events(test_id):
        test_session = test_store.get_test(test_id)
        if not test_session:
            return jsonify({"error": "Not Found", "message": f"Test session '{test_id}' not found."}), 404
        events = test_store.get_events(test_id)
        return jsonify({
            "test_id": test_id,
            "total_events": len(events),
            "events": events
        }), 200

    # 6. Get Test Report
    @app.route("/api/test/<test_id>/report", methods=["GET"])
    def get_test_report(test_id):
        test_session = test_store.get_test(test_id)
        if not test_session:
            return jsonify({"error": "Not Found", "message": f"Test session '{test_id}' not found."}), 404

        verdict = _derive_session_verdict(test_session)
        outcome = test_session.get("outcome", "PENDING")
        steps = test_session.get("steps", [])
        is_real = _is_verified_real_execution(test_session) or (
            bool(test_session.get("is_real_stack", False)) and any(bool(s.get("is_real")) for s in steps)
        )
        step_8_res = steps[-1].get("response", {}) if steps else {}
        credential_validity = (
            test_session.get("credential_validity")
            or step_8_res.get("credential_validity")
            or step_8_res.get("validity_state")
            or ("VALID" if verdict == "PASS" else "PENDING")
        )
        verifier_result = (
            test_session.get("verifier_result")
            or step_8_res.get("verifier_result")
            or step_8_res.get("result")
            or verdict
        )

        vci_steps = steps[:5]
        vci_ok = len(vci_steps) == 5 and all(0 < s.get("status", 0) < 400 for s in vci_steps)
        vp_ok = verdict == "PASS" and len(steps) >= 8 and all(0 < s.get("status", 0) < 400 for s in steps[5:8])

        def _evaluate_step_audit_result(idx: int, step_obj: dict) -> str:
            http_st = step_obj.get("status", 0)
            resp = step_obj.get("response", {}) if isinstance(step_obj.get("response"), dict) else {}
            if http_st == 428 or resp.get("status") in ("AWAITING_USER_AUTH", "WAITING_FOR_ISSUED_CREDENTIAL", "NOT_EXECUTED"):
                return "PENDING"
            if http_st <= 0 or http_st >= 400:
                return "FAIL"
            if idx == 7:
                step_test_outcome = resp.get("test_outcome") or resp.get("outcome")
                if step_test_outcome in ("FAIL", "ERROR") or verdict in ("FAIL", "ERROR"):
                    return "FAIL"
            return "PASS"

        completed_steps_count = sum(1 for s in steps if 0 < s.get("status", 0) < 400 and s.get("status") != 428)
        pending_steps_count = sum(1 for s in steps if s.get("status") == 428 or s.get("status", 0) <= 0)

        report = {
            "report_id": f"REP-{test_id[:8].upper()}",
            "test_id": test_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "issuer": test_session.get("issuer"),
                "wallet": test_session.get("wallet"),
                "verifier": test_session.get("verifier"),
                "credential_format": test_session.get("credential_format"),
                "expected_scenario": test_session.get("expected_outcome", "PASS"),
                "credential_validity": credential_validity,
                "verifier_result": verifier_result,
                "final_verdict": verdict if verdict in ("PASS", "FAIL", "ERROR") else outcome,
                "total_protocol_steps": len(steps),
                "steps_completed": test_session.get("current_step_index", 0),
                "total_duration_ms": test_session.get("duration_ms", 0.0),
                "started_at": test_session.get("started_at") or test_session.get("created_at"),
                "completed_at": test_session.get("completed_at") or (test_session.get("updated_at") if verdict in ("PASS", "FAIL", "ERROR") else None),
                "last_updated_at": test_session.get("updated_at"),
                "completed_steps_count": completed_steps_count,
                "pending_steps_count": pending_steps_count,
                "is_sandbox_simulation": not is_real
            },
            "standards_compliance": [
                {
                    "standard": "OpenID4VCI (Draft 13)",
                    "status": (
                        ("COMPLIANT_VERIFIED" if is_real else "COMPLIANT_SIMULATED")
                        if vci_ok else ("PENDING" if verdict == "RUNNING" else "NON_COMPLIANT")
                    ),
                    "covered_steps": ["Credential Offer", "Authorization", "Token Exchange", "Credential Request", "Credential Response"]
                },
                {
                    "standard": "OpenID4VP (Draft 20)",
                    "status": (
                        ("COMPLIANT_VERIFIED" if is_real else "COMPLIANT_SIMULATED")
                        if vp_ok else ("PENDING" if verdict == "RUNNING" else "NON_COMPLIANT")
                    ),
                    "covered_steps": ["Presentation Request", "VP Token", "Verification"]
                }
            ],
            "step_audit": [
                {
                    "step_name": s["name"],
                    "endpoint": s["endpoint"],
                    "method": s["method"],
                    "http_status": s["status"],
                    "duration_ms": s.get("duration_ms", 0.0),
                    "http_duration_ms": s.get("http_duration_ms", s.get("duration_ms", 0.0)),
                    "started_at": s.get("started_at") or test_session.get("created_at"),
                    "completed_at": s.get("completed_at"),
                    "error": s.get("error"),
                    "result": _evaluate_step_audit_result(idx, s)
                } for idx, s in enumerate(steps)
            ],
            "disclaimer": (
                "REAL MOSIP INJI STACK AUDIT: Live interaction verified across Inji Certify (port 8090/8091), Inji Web (port 3004), and Inji Verify (port 8081). Full cryptographic presentation and protocol compliance evaluated."
                if is_real
                else "DEMO SANDBOX REPORT: This audit was generated using simulated protocol interaction data for the Inji Interoperability Playground."
            )
        }
        return jsonify(report), 200

    # 7. Reset Test
    @app.route("/api/test/<test_id>/reset", methods=["POST"])
    def reset_test(test_id):
        test_session = test_store.get_test(test_id)
        if not test_session:
            return jsonify({"error": "Not Found", "message": f"Test session '{test_id}' not found."}), 404

        updated = test_store.reset_test(test_id)
        return jsonify({
            "message": f"Test {test_id} has been reset.",
            "test": updated
        }), 200

    # 8. List all tests (convenience endpoint)
    @app.route("/api/tests", methods=["GET"])
    def list_tests():
        tests = test_store.list_tests()
        return jsonify({
            "total": len(tests),
            "tests": tests
        }), 200

    # 9. Conformance Matrix Endpoint (derived from persisted tests & real events)
    @app.route("/api/matrix", methods=["GET"])
    def get_matrix():
        live_matrix = _build_live_matrix()
        return jsonify(live_matrix), 200

    # 10. Real-Time Server-Sent Events (SSE) Stream for Protocol Flow & Matrix Sync
    @app.route("/api/stream", methods=["GET"])
    def stream_updates():
        def event_generator():
            last_digest = None
            start_ts = time.time()
            # Keep stream open for up to 55s per cycle (EventSource auto-reconnects)
            while time.time() - start_ts < 55:
                try:
                    digest = test_store.get_state_digest()
                    if digest != last_digest:
                        last_digest = digest
                        payload = json.dumps({
                            "type": "STATE_DIGEST",
                            "digest": digest,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                        yield f"event: state_update\ndata: {payload}\n\n"
                    else:
                        yield ": heartbeat\n\n"
                except GeneratorExit:
                    break
                except Exception:
                    yield ": heartbeat\n\n"
                time.sleep(0.75)

        headers = {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
        return Response(stream_with_context(event_generator()), headers=headers)

    return app


# Application entry point for WSGI / development servers
app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True, threaded=True)
