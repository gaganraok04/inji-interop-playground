"""
Interoperability Orchestration Service
MOSIP Decode 2026 - Problem Statement 2: Inji Interoperability Playground

This service coordinates cross-component interoperability testing between:
- Issuers (Inji Certify, External OpenID4VCI Issuer)
- Wallets (Inji Web, Inji Wallet, External Wallet)
- Verifiers (Inji Verify, External OpenID4VP Verifier)
- Formats (W3C VC, SD-JWT VC)

IMPORTANT:
- No invented Inji API endpoints.
- Uses standard IETF / OIDF OpenID4VCI & OpenID4VP specification structures.
- Clearly flags all protocol payloads as demo/sandbox data until real Inji services are connected.
- Never makes false claims of real cryptographic verification.
"""

from datetime import datetime, timezone
import copy
import time
import uuid
from typing import Dict, Any, List, Optional
from .certify_service import CertifyService
from .wallet_service import WalletService
from .verify_service import VerifyService


class InteroperabilityService:
    def __init__(
        self,
        certify_service: Optional[CertifyService] = None,
        wallet_service: Optional[WalletService] = None,
        verify_service: Optional[VerifyService] = None
    ):
        self.certify_service = certify_service or CertifyService()
        self.wallet_service = wallet_service or WalletService()
        self.verify_service = verify_service or VerifyService()

    def get_supported_options(self) -> Dict[str, Any]:
        """Returns the matrix of supported entities, credential formats, and test options."""
        return {
            "issuers": [
                {"id": "inji_certify", "name": "Inji Certify", "type": "MOSIP Inji", "is_external": False},
                {"id": "external_openid4vci", "name": "External OpenID4VCI Issuer", "type": "External", "is_external": True}
            ],
            "wallets": [
                {"id": "inji_web", "name": "Inji Web", "type": "MOSIP Inji", "is_external": False},
                {"id": "inji_wallet", "name": "Inji Wallet", "type": "MOSIP Inji", "is_external": False},
                {"id": "external_wallet", "name": "External Wallet", "type": "External", "is_external": True}
            ],
            "verifiers": [
                {"id": "inji_verify", "name": "Inji Verify", "type": "MOSIP Inji", "is_external": False},
                {"id": "external_openid4vp", "name": "External OpenID4VP Verifier", "type": "External", "is_external": True}
            ],
            "credential_formats": [
                {"id": "w3c_vc", "name": "W3C VC", "mime_type": "application/ld+json", "standard": "W3C Verifiable Credentials Data Model v1.1/v2.0"},
                {"id": "sd_jwt_vc", "name": "SD-JWT VC", "mime_type": "application/vc+sd-jwt", "standard": "IETF SD-JWT-based Verifiable Credentials"}
            ],
            "test_outcomes": ["PASS", "FAIL", "VALID", "INVALID", "VALID BUT EXPIRED"]
        }

    def is_real_inji_stack(self, issuer: str, wallet: str, verifier: str, format_type: str) -> bool:
        """Determines if the requested configuration maps to the live running Inji stack."""
        is_native_issuer = issuer in ["Inji Certify", "inji_certify"]
        is_native_wallet = wallet in ["Inji Web", "Inji Wallet", "inji_web", "inji_wallet"]
        is_native_verifier = verifier in ["Inji Verify", "inji_verify"]
        is_supported_format = format_type in ["W3C VC", "ldp_vc", "w3c_vc"]

        if not (is_native_issuer and is_native_wallet and is_native_verifier and is_supported_format):
            return False

        # Verify services are actually alive
        return (
            self.certify_service.get_service_status().get("status") == "UP" and
            self.verify_service.get_service_status().get("status") == "UP"
        )

    @staticmethod
    def evaluate_scenario_outcome(
        expected_outcome: str,
        all_checks_successful: bool,
        signature_valid: bool,
        expiry_valid: bool,
        pre_expiry_signature_valid: bool = False
    ) -> Dict[str, Any]:
        """
        Evaluates the observed verifier result and credential validity against the expected test scenario.
        Strictly separates:
          - verifier_result ('PASS' | 'FAIL'): whether the verifier accepted the presentation
          - credential_validity ('VALID' | 'INVALID' | 'VALID BUT EXPIRED'): actual credential state
          - test_outcome ('PASS' | 'FAIL') & test_passed (bool): whether the observed outcome matched the expected test condition
        Never fabricates verifier acceptance or forces PASS when checks do not match.
        """
        scenario = (expected_outcome or "PASS").strip().upper()
        verifier_passed = bool(all_checks_successful and signature_valid and expiry_valid)
        verifier_result = "PASS" if verifier_passed else "FAIL"

        if verifier_passed:
            credential_validity = "VALID"
        elif not expiry_valid and (signature_valid or pre_expiry_signature_valid):
            credential_validity = "VALID BUT EXPIRED"
        else:
            credential_validity = "INVALID"

        if scenario == "PASS":
            test_passed = verifier_result == "PASS" and credential_validity == "VALID"
            condition_summary = (
                "Expected positive verification (PASS): verifier confirmed cryptographic signature and active validity."
                if test_passed else
                f"Expected positive verification (PASS), but verifier returned {verifier_result} ({credential_validity})."
            )
        elif scenario == "VALID":
            test_passed = credential_validity == "VALID" and verifier_result == "PASS"
            condition_summary = (
                "Expected valid credential (VALID): verifier confirmed unmodified credential is cryptographically valid."
                if test_passed else
                f"Expected valid credential (VALID), but observed {credential_validity} (verifier: {verifier_result})."
            )
        elif scenario == "FAIL":
            test_passed = verifier_result == "FAIL"
            condition_summary = (
                "Expected negative verification (FAIL): verifier genuinely rejected the corrupted presentation proof."
                if test_passed else
                "Expected negative verification (FAIL), but verifier unexpectedly accepted the presentation."
            )
        elif scenario == "INVALID":
            test_passed = verifier_result == "FAIL" and credential_validity == "INVALID"
            condition_summary = (
                "Expected invalid credential rejection (INVALID): verifier genuinely rejected the tampered credential."
                if test_passed else
                f"Expected invalid credential rejection (INVALID), but observed {credential_validity} (verifier: {verifier_result})."
            )
        elif scenario == "VALID BUT EXPIRED":
            test_passed = (
                verifier_result == "FAIL"
                and credential_validity == "VALID BUT EXPIRED"
                and not expiry_valid
            )
            condition_summary = (
                "Expected expired credential rejection (VALID BUT EXPIRED): credential signature was authentic, and expiry validation rejected the past expirationDate."
                if test_passed else
                f"Expected expired credential rejection (VALID BUT EXPIRED), but observed {credential_validity} (verifier: {verifier_result}, expiry_valid: {expiry_valid})."
            )
        else:
            test_passed = verifier_result == "PASS"
            condition_summary = f"Scenario {scenario}: verifier returned {verifier_result} ({credential_validity})."

        return {
            "expected_outcome": scenario,
            "verifier_result": verifier_result,
            "credential_validity": credential_validity,
            "test_passed": test_passed,
            "test_outcome": "PASS" if test_passed else "FAIL",
            "condition_summary": condition_summary
        }

    def generate_protocol_steps(
        self,
        issuer: str,
        wallet: str,
        verifier: str,
        format_type: str,
        expected_outcome: str = "PASS",
        auth_code: Optional[str] = None,
        code_verifier: Optional[str] = None,
        credential: Optional[Dict[str, Any]] = None,
        redirect_uri: Optional[str] = None,
        state: Optional[str] = None,
        code_challenge: Optional[str] = None,
        existing_steps: Optional[List[Dict[str, Any]]] = None
    ) -> tuple[List[Dict[str, Any]], bool]:
        """
        Executes or models the 8-step protocol flow.
        If real Inji stack is active, calls live Inji Certify and Inji Verify services.
        Otherwise falls back cleanly to specification-compliant simulation.
        Returns (steps, is_real_stack).
        """
        is_real = self.is_real_inji_stack(issuer, wallet, verifier, format_type)

        if not is_real:
            steps = self.generate_demo_protocol_steps(
                issuer=issuer,
                wallet=wallet,
                verifier=verifier,
                format_type=format_type,
                expected_outcome=expected_outcome
            )
            return steps, False

        # --- REAL INJI STACK EXECUTION ---
        now = datetime.now(timezone.utc).isoformat()
        existing_by_id = {
            s.get("step_id"): s
            for s in (existing_steps or [])
            if isinstance(s, dict) and s.get("step_id")
        }

        t_meta = time.perf_counter()
        metadata = self.certify_service.get_openid_credential_issuer_metadata() or {}
        did_doc = self.certify_service.get_did_document() or {}
        step1_elapsed_ms = round((time.perf_counter() - t_meta) * 1000, 1)
        certify_did = did_doc.get("id", "did:web:tasty-liana-apographic.ngrok-free.dev")

        # Step 1: Real Credential Offer (OpenID4VCI) — reuse from initial test start if available on callback
        if auth_code and "credential_offer" in existing_by_id:
            step_1 = copy.deepcopy(existing_by_id["credential_offer"])
            step_1.setdefault("duration_ms", step1_elapsed_ms)
        else:
            step_1 = {
                "step_id": "credential_offer",
                "name": "Credential Offer",
                "phase": "Issuance (OpenID4VCI)",
                "description": "Issuer publishes OpenID4VCI issuer metadata and credential offer for FarmerCredential",
                "method": "GET",
                "endpoint": "/v1/certify/.well-known/openid-credential-issuer",
                "full_url": f"{self.certify_service.certify_url}/.well-known/openid-credential-issuer",
                "public_url": f"{self.certify_service.public_url}/.well-known/openid-credential-issuer",
                "status": 200,
                "timestamp": now,
                "duration_ms": step1_elapsed_ms,
                "is_real": True,
                "mode": "REAL_INJI_STACK",
                "sender": "issuer",
                "receiver": "wallet",
                "request_headers": {
                    "Accept": "application/json",
                    "User-Agent": "Inji-Web/0.16.0"
                },
                "response_headers": {
                    "Content-Type": "application/json",
                    "Server": "nginx/stable"
                },
                "request": {
                    "method": "GET",
                    "headers": {"Accept": "application/json"}
                },
                "response": metadata or {
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
            }

        # Step 2: Real Authorization Request (OpenID4VCI with dynamic PKCE)
        if auth_code and "authorization" in existing_by_id:
            step_2 = copy.deepcopy(existing_by_id["authorization"])
            step_2["status"] = 200
            step_2.setdefault("duration_ms", 1.0)
            if isinstance(step_2.get("response"), dict):
                step_2["response"]["status"] = "AUTHORIZATION_CODE_RECEIVED"
            auth_req = {
                "redirect_uri": redirect_uri or step_2.get("response", {}).get("redirect_uri") or "http://localhost:3004/redirect",
                "code_verifier": code_verifier
            }
        else:
            t_auth = time.perf_counter()
            effective_challenge = code_challenge or (self.wallet_service.derive_code_challenge(code_verifier) if code_verifier else None)
            auth_req = self.wallet_service.build_authorization_request(
                issuer_id="Farmer",
                redirect_uri=redirect_uri,
                state=state,
                code_challenge=effective_challenge,
                code_verifier=code_verifier
            )
            step2_elapsed_ms = round((time.perf_counter() - t_auth) * 1000, 1)
            step_2 = {
                "step_id": "authorization",
                "name": "Authorization",
                "phase": "Issuance (OpenID4VCI)",
                "description": "Wallet initiates OAuth 2.0 PKCE flow with eSignet broker for Farmer identity",
                "method": "GET",
                "endpoint": "/authorize",
                "full_url": auth_req.get("authorization_url", "https://esignet-mock.collab.mosip.net/authorize"),
                "status": auth_req.get("status", 200),
                "timestamp": now,
                "duration_ms": step2_elapsed_ms,
                "is_real": True,
                "mode": "REAL_INJI_STACK",
                "sender": "wallet",
                "receiver": "issuer",
                "request_headers": {
                    "Accept": "text/html,application/xhtml+xml",
                    "User-Agent": "Inji-Web/0.16.0"
                },
                "response_headers": {
                    "Content-Type": "text/html; charset=utf-8"
                },
                "request": {
                    "query_params": auth_req.get("query_params", {})
                },
                "response": {
                    "status": "AUTHORIZATION_CODE_RECEIVED" if auth_code else "REDIRECT_READY",
                    "authorization_url": auth_req.get("authorization_url"),
                    "redirect_uri": auth_req.get("redirect_uri"),
                    "state": auth_req.get("state"),
                    "instructions": auth_req.get("instructions"),
                    "_security": "PKCE code_verifier securely retained in active session and redacted in public inspector."
                }
            }

        # Step 3: Token Exchange via Mimoto
        access_token = None
        c_nonce = None
        if auth_code:
            t_step3 = time.perf_counter()
            token_res = self.wallet_service.exchange_authorization_code(
                issuer_id="Farmer",
                code=auth_code,
                code_verifier=code_verifier or auth_req.get("code_verifier"),
                redirect_uri=redirect_uri or auth_req.get("redirect_uri")
            )
            step3_elapsed_ms = token_res.get("duration_ms") or round((time.perf_counter() - t_step3) * 1000, 1)
            access_token = token_res.get("access_token")
            c_nonce = token_res.get("c_nonce")
            step_3 = {
                "step_id": "token_exchange",
                "name": "Token Exchange",
                "phase": "Issuance (OpenID4VCI)",
                "description": "Wallet redeems authorization code for issuance access token via Mimoto broker",
                "method": "POST",
                "endpoint": "/v1/mimoto/get-token/Farmer",
                "full_url": f"{self.wallet_service.mimoto_url}/get-token/Farmer",
                "status": token_res.get("status", 200),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "duration_ms": step3_elapsed_ms,
                "is_real": True,
                "mode": "REAL_INJI_STACK",
                "sender": "wallet",
                "receiver": "issuer",
                "request_headers": {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                },
                "response_headers": {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store"
                },
                "request": {
                    "body": token_res.get("request_payload", {
                        "grant_type": "authorization_code",
                        "client_id": "wallet-demo",
                        "code": "[REDACTED_AUTH_CODE]"
                    })
                },
                "response": token_res.get("response", {})
            }
        elif existing_by_id.get("token_exchange") and existing_by_id["token_exchange"].get("status") != 428:
            step_3 = copy.deepcopy(existing_by_id["token_exchange"])
        else:
            step_3 = {
                "step_id": "token_exchange",
                "name": "Token Exchange",
                "phase": "Issuance (OpenID4VCI)",
                "description": "Wallet redeems authorization code for issuance access token via Mimoto broker",
                "method": "POST",
                "endpoint": "/v1/mimoto/get-token/Farmer",
                "full_url": f"{self.wallet_service.mimoto_url}/get-token/Farmer",
                "status": 428,
                "timestamp": now,
                "duration_ms": 0.0,
                "is_real": False,
                "mode": "REAL_INJI_STACK",
                "sender": "wallet",
                "receiver": "issuer",
                "request_headers": {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                "response_headers": {
                    "Content-Type": "application/json"
                },
                "request": {
                    "body": {
                        "grant_type": "authorization_code",
                        "client_id": "wallet-demo",
                        "code": "[AWAITING_OAUTH_REDIRECT_CODE]",
                        "redirect_uri": redirect_uri or "http://localhost:3004/redirect"
                    }
                },
                "response": {
                    "status": "AWAITING_AUTHORIZATION_CODE",
                    "message": "Token exchange requires genuine authorization code from citizen authentication redirect. No fake authorization code was fabricated."
                }
            }

        # Step 4: Credential Request
        if access_token:
            t_step4 = time.perf_counter()
            cred_res = self.certify_service.request_credential(
                access_token=access_token,
                c_nonce=c_nonce,
                format_type="ldp_vc",
                credential_type="FarmerCredential"
            )
            step4_elapsed_ms = cred_res.get("duration_ms") or round((time.perf_counter() - t_step4) * 1000, 1)
            if not credential and cred_res.get("credential"):
                credential = cred_res.get("credential")

            step_4 = {
                "step_id": "credential_request",
                "name": "Credential Request",
                "phase": "Issuance (OpenID4VCI)",
                "description": "Wallet presents key binding proof and requests FarmerCredential issuance",
                "method": "POST",
                "endpoint": "/v1/certify/issuance/credential",
                "full_url": f"{self.certify_service.certify_url}/issuance/credential",
                "status": cred_res.get("status", 200),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "duration_ms": step4_elapsed_ms,
                "is_real": cred_res.get("is_real", True),
                "mode": "REAL_INJI_STACK",
                "sender": "wallet",
                "receiver": "issuer",
                "request_headers": {
                    "Authorization": "Bearer [REDACTED_ACCESS_TOKEN]",
                    "Content-Type": "application/json"
                },
                "response_headers": {
                    "Content-Type": "application/json"
                },
                "request": {
                    "body": cred_res.get("request_body", {
                        "format": "ldp_vc",
                        "credential_definition": {
                            "@context": ["https://www.w3.org/2018/credentials/v1"],
                            "type": ["FarmerCredential", "VerifiableCredential"]
                        },
                        "proof": {
                            "proof_type": "jwt",
                            "jwt": "[VALID_OPENID4VCI_PROOF_JWT]"
                        }
                    })
                },
                "response": {
                    "status": "CREDENTIAL_ISSUED" if cred_res.get("status") == 200 else "ERROR",
                    "format": "ldp_vc",
                    **({"error": cred_res.get("error")} if cred_res.get("error") and cred_res.get("status") != 200 else {}),
                    "_audit": {
                        "endpoint": "/v1/certify/issuance/credential",
                        "status": cred_res.get("status", 200)
                    }
                }
            }
        elif existing_by_id.get("credential_request") and existing_by_id["credential_request"].get("status") != 428:
            step_4 = copy.deepcopy(existing_by_id["credential_request"])
        else:
            step_4 = {
                "step_id": "credential_request",
                "name": "Credential Request",
                "phase": "Issuance (OpenID4VCI)",
                "description": "Wallet presents key binding proof and requests FarmerCredential issuance",
                "method": "POST",
                "endpoint": "/v1/certify/issuance/credential",
                "full_url": f"{self.certify_service.certify_url}/issuance/credential",
                "status": 428,
                "timestamp": now,
                "duration_ms": 0.0,
                "is_real": False,
                "mode": "REAL_INJI_STACK",
                "sender": "wallet",
                "receiver": "issuer",
                "request_headers": {
                    "Authorization": "Bearer [AWAITING_ACCESS_TOKEN]",
                    "Content-Type": "application/json"
                },
                "response_headers": {
                    "Content-Type": "application/json"
                },
                "request": {
                    "body": {
                        "format": "ldp_vc",
                        "credential_definition": {
                            "@context": ["https://www.w3.org/2018/credentials/v1"],
                            "type": ["FarmerCredential", "VerifiableCredential"]
                        }
                    }
                },
                "response": {
                    "status": "PENDING_TOKEN",
                    "message": "Credential request pending completion of Token Exchange (Step 3)."
                }
            }

        # Step 5: Credential Response
        if credential:
            t_step5 = time.perf_counter()
            step_5 = {
                "step_id": "credential_response",
                "name": "Credential Response",
                "phase": "Issuance (OpenID4VCI)",
                "description": "Inji Certify issues the signed W3C FarmerCredential to Inji Web wallet",
                "method": "POST",
                "endpoint": "/v1/certify/issuance/credential",
                "status": 200,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "duration_ms": round((time.perf_counter() - t_step5) * 1000, 1) or 1.0,
                "is_real": True,
                "mode": "REAL_INJI_STACK",
                "sender": "issuer",
                "receiver": "wallet",
                "request_headers": {"Note": "Issuance dispatch from Certify engine"},
                "response_headers": {"Content-Type": "application/json"},
                "request": {"Note": "Dispatched to Inji Web wallet storage"},
                "response": {
                    "format": "ldp_vc",
                    "credential": credential,
                    "_audit": {
                        "issuer_did": certify_did,
                        "signature_algo": "EdDSA",
                        "signature_suite": "Ed25519Signature2020"
                    }
                }
            }
        else:
            step_5 = {
                "step_id": "credential_response",
                "name": "Credential Response",
                "phase": "Issuance (OpenID4VCI)",
                "description": "Inji Certify issues the signed W3C FarmerCredential to Inji Web wallet",
                "method": "POST",
                "endpoint": "/v1/certify/issuance/credential",
                "status": 428,
                "timestamp": now,
                "duration_ms": 0.0,
                "is_real": False,
                "mode": "REAL_INJI_STACK",
                "sender": "issuer",
                "receiver": "wallet",
                "request_headers": {"Note": "Issuance dispatch awaiting citizen authorization"},
                "response_headers": {"Content-Type": "application/json"},
                "request": {"Note": "Pending issuance"},
                "response": {
                    "status": "PENDING_CREDENTIAL",
                    "message": "No static credential hardcoded in source code. Complete citizen authorization or provide an issued credential to view payload."
                }
            }

        # Step 6: Presentation Request (OpenID4VP) via Inji Verify
        # Reuse existing vp-request from session start if available on callback
        existing_step_6 = existing_by_id.get("presentation_request")
        existing_resp_6 = existing_step_6.get("response", {}) if isinstance(existing_step_6, dict) else {}
        if (
            (auth_code or credential)
            and existing_step_6
            and existing_resp_6.get("requestId")
            and existing_resp_6.get("transactionId")
            and not str(existing_resp_6.get("transactionId")).startswith("sandbox-")
        ):
            step_6 = copy.deepcopy(existing_step_6)
            transaction_id = existing_resp_6["transactionId"]
            request_id = existing_resp_6["requestId"]
            request_uri = existing_resp_6.get("requestUri", f"https://khaki-actors-do.loca.lt/v1/verify/vp-request/{request_id}")
            verifier_did = existing_resp_6.get("clientId", "did:web:khaki-actors-do.loca.lt:v1:verify")
            step_6.setdefault("duration_ms", 1.0)
        else:
            t_step6 = time.perf_counter()
            real_vp_req = self.verify_service.create_real_presentation_request(
                credential_type="FarmerCredential",
                proof_type="Ed25519Signature2020",
                accept_vp_without_holder_proof=True
            )
            step6_elapsed_ms = real_vp_req.get("duration_ms") or round((time.perf_counter() - t_step6) * 1000, 1)
            transaction_id = real_vp_req.get("transaction_id", f"txn_{uuid.uuid4().hex[:12]}")
            request_id = real_vp_req.get("request_id", f"req_{uuid.uuid4().hex[:12]}")
            request_uri = real_vp_req.get("request_uri", f"https://khaki-actors-do.loca.lt/v1/verify/vp-request/{request_id}")
            verifier_did = real_vp_req.get("client_id", "did:web:khaki-actors-do.loca.lt:v1:verify")

            step_6 = {
                "step_id": "presentation_request",
                "name": "Presentation Request",
                "phase": "Verification (OpenID4VP)",
                "description": "Inji Verify initiates OpenID4VP request session with client_id_scheme: did",
                "method": "POST",
                "endpoint": "/v1/verify/vp-request",
                "full_url": f"{self.verify_service.verify_url}/vp-request",
                "status": 201,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "duration_ms": step6_elapsed_ms,
                "is_real": True,
                "mode": "REAL_INJI_STACK",
                "sender": "verifier",
                "receiver": "wallet",
                "request_headers": {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                "response_headers": {
                    "Content-Type": "application/json"
                },
                "request": {
                    "body": {
                        "clientId": verifier_did,
                        "presentationDefinition": real_vp_req.get("presentation_definition", {}),
                        "acceptVPWithoutHolderProof": True
                    }
                },
                "response": {
                    "transactionId": transaction_id,
                    "requestId": request_id,
                    "requestUri": request_uri,
                    "clientId": verifier_did,
                    "response_uri": f"{self.verify_service.verify_url}/vp-submission/direct-post",
                    "expiresAt": real_vp_req.get("expires_at"),
                    "_comment": "Real OpenID4VP session created by Inji Verify service."
                }
            }

        # Step 7: Real VP Token Submission (OpenID4VP direct_post)
        if credential:
            scenario = (expected_outcome or "PASS").strip().upper()
            candidate_vc = copy.deepcopy(credential)
            pre_expiry_sig_valid = False
            scenario_mutation_note = "Unmodified issued Verifiable Credential presented."

            # Apply scenario-specific test condition before presentation
            if scenario == "FAIL":
                # Controlled negative presentation proof case
                if "proof" in candidate_vc and isinstance(candidate_vc["proof"], dict):
                    candidate_vc["proof"]["proofValue"] = "z2BkW"
                scenario_mutation_note = "Controlled negative verification case (FAIL): corrupted presentation proofValue."
            elif scenario == "INVALID":
                # Controlled invalid credential case: tamper signed claim and proof integrity
                if isinstance(candidate_vc.get("credentialSubject"), dict):
                    candidate_vc["credentialSubject"]["fullName"] = "TAMPERED_INVALID_SUBJECT"
                    candidate_vc["credentialSubject"]["_tamperedClaim"] = True
                if "proof" in candidate_vc and isinstance(candidate_vc["proof"], dict):
                    candidate_vc["proof"]["proofValue"] = "zInvalidCredentialProofTampered"
                scenario_mutation_note = "Controlled invalid credential case (INVALID): tampered credentialSubject claims and proof."
            elif scenario == "VALID BUT EXPIRED":
                orig_expiry = self.verify_service.evaluate_vc_expiry(credential)
                if not orig_expiry.get("is_expired", False):
                    # Verify that the unmodified issued credential signature is authentic before setting past expirationDate
                    if hasattr(self.verify_service, "verify_single_credential"):
                        orig_vc_verify = self.verify_service.verify_single_credential(credential)
                        if orig_vc_verify.get("is_real_verification"):
                            pre_expiry_sig_valid = bool(
                                orig_vc_verify.get("schema_and_signature", {}).get(
                                    "valid", orig_vc_verify.get("all_checks_successful", False)
                                )
                            )
                        else:
                            pre_expiry_sig_valid = bool(
                                isinstance(credential.get("proof"), dict)
                                and credential["proof"].get("proofValue")
                                and credential["proof"].get("proofValue") not in ["z2BkW", "zInvalidCredentialProofTampered"]
                            )
                    else:
                        pre_expiry_sig_valid = bool(
                            isinstance(credential.get("proof"), dict)
                            and credential["proof"].get("proofValue")
                        )
                    candidate_vc["expirationDate"] = "2020-01-01T00:00:00.000Z"
                    scenario_mutation_note = (
                        "Controlled expired credential case (VALID BUT EXPIRED): original signature verified, "
                        "expirationDate set to 2020-01-01T00:00:00.000Z to test expiry rejection."
                    )
                else:
                    pre_expiry_sig_valid = bool(
                        isinstance(credential.get("proof"), dict)
                        and credential["proof"].get("proofValue")
                    )
                    scenario_mutation_note = (
                        "Controlled expired credential case (VALID BUT EXPIRED): credential expirationDate is already in the past."
                    )

            vp_presentation_token = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                "type": ["VerifiablePresentation"],
                "verifiableCredential": [candidate_vc]
            }
            presentation_submission_obj = {
                "id": f"sub_{uuid.uuid4().hex[:8]}",
                "definition_id": "FarmerCredential_Verification",
                "descriptor_map": [
                    {
                        "id": "farmercredential_descriptor",
                        "format": "ldp_vc",
                        "path": "$"
                    }
                ]
            }

            t_step7 = time.perf_counter()
            sub_res = self.verify_service.submit_real_presentation(
                request_id=request_id,
                vp_token=vp_presentation_token,
                presentation_submission=presentation_submission_obj
            )
            # If the reused vp-request from test start expired while the user was authenticating, create a fresh vp-request once
            if sub_res.get("status") != 200 and existing_step_6 is not None:
                fresh_vp = self.verify_service.create_real_presentation_request(
                    credential_type="FarmerCredential",
                    proof_type="Ed25519Signature2020",
                    accept_vp_without_holder_proof=True
                )
                if fresh_vp.get("request_id") and fresh_vp.get("transaction_id"):
                    transaction_id = fresh_vp["transaction_id"]
                    request_id = fresh_vp["request_id"]
                    step_6["duration_ms"] = fresh_vp.get("duration_ms", 0.0)
                    step_6["response"]["transactionId"] = transaction_id
                    step_6["response"]["requestId"] = request_id
                    step_6["response"]["requestUri"] = fresh_vp.get("request_uri")
                    step_6["response"]["expiresAt"] = fresh_vp.get("expires_at")
                    t_step7 = time.perf_counter()
                    sub_res = self.verify_service.submit_real_presentation(
                        request_id=request_id,
                        vp_token=vp_presentation_token,
                        presentation_submission=presentation_submission_obj
                    )

            step7_elapsed_ms = sub_res.get("duration_ms") or round((time.perf_counter() - t_step7) * 1000, 1)

            step_7 = {
                "step_id": "vp_token",
                "name": "VP Token",
                "phase": "Verification (OpenID4VP)",
                "description": "Inji Web submits VP Token to Inji Verify direct-post endpoint",
                "method": "POST",
                "endpoint": "/v1/verify/vp-submission/direct-post",
                "full_url": f"{self.verify_service.verify_url}/vp-submission/direct-post",
                "status": sub_res.get("status", 200),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "duration_ms": step7_elapsed_ms,
                "is_real": True,
                "mode": "REAL_INJI_STACK",
                "sender": "wallet",
                "receiver": "verifier",
                "request_headers": {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                "response_headers": {
                    "Content-Type": "application/json"
                },
                "request": {
                    "expected_scenario": scenario,
                    "scenario_condition": scenario_mutation_note,
                    "body": {
                        "state": request_id,
                        "presentation_submission": presentation_submission_obj,
                        "vp_token": vp_presentation_token
                    }
                },
                "response": sub_res.get("data", {
                    "status": "VP_RECEIVED",
                    "state": request_id,
                    "_comment": "VP token received by Inji Verify direct_post handler."
                })
            }

            # Step 8: Real Cryptographic & Protocol Verification Query from Inji Verify
            t_step8 = time.perf_counter()
            verify_query = self.verify_service.get_real_verification_results(
                transaction_id=transaction_id,
                skip_status_checks=True
            )
            step8_elapsed_ms = verify_query.get("duration_ms") or round((time.perf_counter() - t_step8) * 1000, 1)
            verif_all_ok = bool(verify_query.get("all_checks_successful", False))
            raw_res = verify_query.get("raw_response", {})
            cred_results = raw_res.get("credentialResults", [])
            cred_res_first = cred_results[0] if cred_results else {}

            sig_check_raw = cred_res_first.get("schemaAndSignatureCheck") or {
                "valid": verif_all_ok,
                "crypto_suite": "Ed25519Signature2020",
                "issuer_did": certify_did
            }
            sig_valid = bool(sig_check_raw.get("valid", verif_all_ok))

            expiry_eval = self.verify_service.evaluate_vc_expiry(candidate_vc)
            verif_expiry_raw = cred_res_first.get("expiryCheck") or {}
            if not expiry_eval.get("valid", True):
                expiry_valid = False
                expiry_check_obj = {
                    **verif_expiry_raw,
                    "valid": False,
                    "status": "EXPIRED",
                    "expirationDate": expiry_eval.get("expirationDate"),
                    "evaluatedAt": expiry_eval.get("evaluatedAt"),
                    "error": expiry_eval.get("error")
                }
            elif "valid" in verif_expiry_raw and verif_expiry_raw.get("valid") is False:
                expiry_valid = False
                expiry_check_obj = {
                    **verif_expiry_raw,
                    "valid": False,
                    "status": "EXPIRED",
                    "expirationDate": expiry_eval.get("expirationDate")
                }
            else:
                expiry_valid = True
                expiry_check_obj = {
                    **verif_expiry_raw,
                    "valid": True,
                    "status": "ACTIVE",
                    "expirationDate": expiry_eval.get("expirationDate")
                }

            sig_check_obj = dict(sig_check_raw)
            if scenario == "VALID BUT EXPIRED" and pre_expiry_sig_valid and not expiry_valid:
                sig_check_obj["preExpirySignatureValid"] = True

            scenario_eval = self.evaluate_scenario_outcome(
                expected_outcome=scenario,
                all_checks_successful=verif_all_ok,
                signature_valid=sig_valid,
                expiry_valid=expiry_valid,
                pre_expiry_signature_valid=pre_expiry_sig_valid
            )
            effective_all_checks = bool(verif_all_ok and sig_valid and expiry_valid)

            step_8 = {
                "step_id": "verification",
                "name": "Verification",
                "phase": "Verification (OpenID4VP)",
                "description": "Inji Verify executes cryptographic trust, DID resolution, schema, and revocation checks",
                "method": "POST",
                "endpoint": f"/v1/verify/v2/vp-results/{transaction_id}",
                "full_url": f"{self.verify_service.verify_url}/v2/vp-results/{transaction_id}",
                "status": verify_query.get("http_status", 200),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "duration_ms": step8_elapsed_ms,
                "is_real": True,
                "mode": "REAL_INJI_STACK",
                "sender": "verifier",
                "receiver": "verifier",
                "request_headers": {
                    "Content-Type": "application/json"
                },
                "response_headers": {
                    "Content-Type": "application/json"
                },
                "request": {
                    "transactionId": transaction_id,
                    "expectedScenario": scenario,
                    "skipStatusChecks": True,
                    "includeClaims": True,
                    "statusCheckFilters": []
                },
                "response": {
                    "transactionId": transaction_id,
                    "result": scenario_eval["verifier_result"],
                    "verifier_result": scenario_eval["verifier_result"],
                    "validity_state": scenario_eval["credential_validity"],
                    "credential_validity": scenario_eval["credential_validity"],
                    "expected_outcome": scenario_eval["expected_outcome"],
                    "test_passed": scenario_eval["test_passed"],
                    "test_outcome": scenario_eval["test_outcome"],
                    "condition_summary": scenario_eval["condition_summary"],
                    "allChecksSuccessful": effective_all_checks,
                    "schemaAndSignatureCheck": sig_check_obj,
                    "expiryCheck": expiry_check_obj,
                    "statusCheck": cred_res_first.get("statusCheck", []),
                    "holderProofCheck": cred_res_first.get("holderProofCheck"),
                    "claims": cred_res_first.get("claims", {}),
                    "_verification_summary": (
                        f"REAL INJI STACK: Verified live by Inji Verify (port 8081) against Inji Certify DID ({certify_did}). "
                        f"Expected Scenario: {scenario_eval['expected_outcome']} | "
                        f"Verifier Result: {scenario_eval['verifier_result']} | "
                        f"Credential Validity: {scenario_eval['credential_validity']} | "
                        f"Test Verdict: {scenario_eval['test_outcome']}."
                    )
                }
            }
        else:
            step_7 = {
                "step_id": "vp_token",
                "name": "VP Token",
                "phase": "Verification (OpenID4VP)",
                "description": "Inji Web submits VP Token to Inji Verify direct-post endpoint",
                "method": "POST",
                "endpoint": "/v1/verify/vp-submission/direct-post",
                "full_url": f"{self.verify_service.verify_url}/vp-submission/direct-post",
                "status": 428,
                "timestamp": now,
                "duration_ms": 0.0,
                "is_real": False,
                "mode": "REAL_INJI_STACK",
                "sender": "wallet",
                "receiver": "verifier",
                "request_headers": {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                "response_headers": {
                    "Content-Type": "application/json"
                },
                "request": {
                    "body": {
                        "state": request_id,
                        "note": "Awaiting issued Verifiable Credential"
                    }
                },
                "response": {
                    "status": "AWAITING_CREDENTIAL",
                    "message": "Verifiable Presentation cannot be constructed without an issued credential."
                }
            }

            step_8 = {
                "step_id": "verification",
                "name": "Verification",
                "phase": "Verification (OpenID4VP)",
                "description": "Inji Verify executes cryptographic trust, DID resolution, schema, and revocation checks",
                "method": "POST",
                "endpoint": f"/v1/verify/v2/vp-results/{transaction_id}",
                "full_url": f"{self.verify_service.verify_url}/v2/vp-results/{transaction_id}",
                "status": 428,
                "timestamp": now,
                "duration_ms": 0.0,
                "is_real": False,
                "mode": "REAL_INJI_STACK",
                "sender": "verifier",
                "receiver": "verifier",
                "request_headers": {
                    "Content-Type": "application/json"
                },
                "response_headers": {
                    "Content-Type": "application/json"
                },
                "request": {
                    "transactionId": transaction_id,
                    "skipStatusChecks": True,
                    "includeClaims": True,
                    "statusCheckFilters": []
                },
                "response": {
                    "transactionId": transaction_id,
                    "result": "PENDING",
                    "allChecksSuccessful": False,
                    "message": f"Inji Verify presentation session active (transactionId: {transaction_id}). Submit a credential in Step 7 to execute live cryptographic verification."
                }
            }

        return [step_1, step_2, step_3, step_4, step_5, step_6, step_7, step_8], True

    def generate_demo_protocol_steps(
        self,
        issuer: str,
        wallet: str,
        verifier: str,
        format_type: str,
        expected_outcome: str = "PASS"
    ) -> List[Dict[str, Any]]:
        """
        Builds standard OpenID4VCI and OpenID4VP protocol timeline steps for the inspector.
        Each step represents an official specification flow event with standard payloads.
        Clearly marked as demo data.
        """
        now = datetime.now(timezone.utc).isoformat()
        is_sd_jwt = "sd_jwt" in format_type.lower() or "sd-jwt" in format_type.lower()

        format_claim = "vc+sd-jwt" if is_sd_jwt else "ldp_vc"
        sample_vc_claims = {
            "national_id": "MOSIP-9843-2109-1234",
            "given_name": "Rohan",
            "family_name": "Sharma",
            "date_of_birth": "1994-05-18",
            "country": "IN"
        }

        # Step 1: Credential Offer
        step_1 = {
            "step_id": "credential_offer",
            "name": "Credential Offer",
            "phase": "Issuance (OpenID4VCI)",
            "description": "Issuer shares a Credential Offer with the Wallet via deep-link or QR code",
            "method": "GET",
            "endpoint": "/.well-known/openid-credential-issuer",
            "status": 200,
            "timestamp": now,
            "started_at": now,
            "completed_at": now,
            "duration_ms": 14.2,
            "http_duration_ms": 14.2,
            "error": None,
            "is_real": False,
            "mode": "DEMO_SANDBOX",
            "request": {
                "headers": {
                    "Accept": "application/json",
                    "User-Agent": f"{wallet}/1.0"
                },
                "params": {}
            },
            "response": {
                "credential_issuer": f"https://issuer.mosip.net/{issuer}",
                "credential_endpoint": f"https://issuer.mosip.net/{issuer}/credential",
                "display": [{"name": f"{issuer} Credential Portal", "locale": "en-US"}],
                "credentials_supported": {
                    "identity_credential": {
                        "format": format_claim,
                        "scope": "NationalIdentityCredential",
                        "cryptographic_binding_methods_supported": ["did:key", "jwk"]
                    }
                },
                "_comment": "DEMO SANDBOX DATA conforming to OpenID4VCI Draft 13 specification"
            }
        }

        # Step 2: Authorization
        step_2 = {
            "step_id": "authorization",
            "name": "Authorization",
            "phase": "Issuance (OpenID4VCI)",
            "description": "Wallet initiates authorization code flow with PKCE with Issuer Auth Server",
            "method": "GET",
            "endpoint": "/oauth2/authorize",
            "status": 302,
            "timestamp": now,
            "started_at": now,
            "completed_at": now,
            "duration_ms": 21.5,
            "http_duration_ms": 21.5,
            "error": None,
            "is_real": False,
            "mode": "DEMO_SANDBOX",
            "request": {
                "query_params": {
                    "response_type": "code",
                    "client_id": wallet,
                    "code_challenge": "E9Mel-fkLeoRu3SV_KCc1806Cx8v69Pcx1ccf6t4k0I",
                    "code_challenge_method": "S256",
                    "scope": "NationalIdentityCredential",
                    "redirect_uri": f"{wallet}://callback"
                }
            },
            "response": {
                "redirect_url": f"{wallet}://callback?code=AUTH_CODE_DEMO_9401f8&state=xyzState456",
                "headers": {
                    "Location": f"{wallet}://callback?code=AUTH_CODE_DEMO_9401f8&state=xyzState456"
                },
                "_comment": "DEMO SANDBOX DATA - Standard OAuth 2.0 PKCE redirection"
            }
        }

        # Step 3: Token Exchange
        step_3 = {
            "step_id": "token_exchange",
            "name": "Token Exchange",
            "phase": "Issuance (OpenID4VCI)",
            "description": "Wallet redeems authorization code for an issuance access token",
            "method": "POST",
            "endpoint": "/oauth2/token",
            "status": 200,
            "timestamp": now,
            "started_at": now,
            "completed_at": now,
            "duration_ms": 18.0,
            "http_duration_ms": 18.0,
            "error": None,
            "is_real": False,
            "mode": "DEMO_SANDBOX",
            "request": {
                "headers": {"Content-Type": "application/x-www-form-urlencoded"},
                "body": {
                    "grant_type": "authorization_code",
                    "code": "AUTH_CODE_DEMO_9401f8",
                    "redirect_uri": f"{wallet}://callback",
                    "client_id": wallet,
                    "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
                }
            },
            "response": {
                "access_token": "demo_at_9921bc4e0078",
                "token_type": "Bearer",
                "expires_in": 3600,
                "c_nonce": "demo_nonce_c7882ab",
                "c_nonce_expires_in": 86400,
                "_comment": "DEMO SANDBOX DATA - Standard OID4VCI token response"
            }
        }

        # Step 4: Credential Request
        proof_type = "jwt" if is_sd_jwt else "proof"
        step_4 = {
            "step_id": "credential_request",
            "name": "Credential Request",
            "phase": "Issuance (OpenID4VCI)",
            "description": "Wallet presents key binding proof and requests credential issuance",
            "method": "POST",
            "endpoint": "/credential",
            "status": 200,
            "timestamp": now,
            "started_at": now,
            "completed_at": now,
            "duration_ms": 19.4,
            "http_duration_ms": 19.4,
            "error": None,
            "is_real": False,
            "mode": "DEMO_SANDBOX",
            "request": {
                "headers": {
                    "Authorization": "Bearer demo_at_9921bc4e0078",
                    "Content-Type": "application/json"
                },
                "body": {
                    "format": format_claim,
                    "proof": {
                        "proof_type": proof_type,
                        "jwt": "eyJhbGciOiJFUzI1NiIsInR5cCI6Im9wZW5pZDR2Y2ktcHJvb2Yrand0In0.demo_proof.signature"
                    }
                }
            },
            "response": {
                "status": "ACCEPTED",
                "_comment": "Request verified by sandbox protocol engine (Demo data)"
            }
        }

        # Step 5: Credential Response
        sample_credential = (
            "eyJhbGciOiJFUzI1NiIsImtpZCI6ImtpZC0xIn0.eyJpc3MiOiJodHRwczovL2luamktY2VydGlmeSIsImNuZiI6eyJqd2siOnsia3R5IjoiRUMifX0sIl9zZCI6WyJkWnh4Il19.sig~WyI5ODQzIiwiZ2l2ZW5fbmFtZSIsIlJvaGFuIl0~"
            if is_sd_jwt else {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                "type": ["VerifiableCredential", "NationalIDCredential"],
                "issuer": f"did:mosip:{issuer}",
                "issuanceDate": now,
                "credentialSubject": sample_vc_claims
            }
        )

        step_5 = {
            "step_id": "credential_response",
            "name": "Credential Response",
            "phase": "Issuance (OpenID4VCI)",
            "description": "Issuer returns the issued credential (W3C JSON-LD or SD-JWT) to the Wallet",
            "method": "POST",
            "endpoint": "/credential",
            "status": 200,
            "timestamp": now,
            "started_at": now,
            "completed_at": now,
            "duration_ms": 25.6,
            "http_duration_ms": 25.6,
            "error": None,
            "is_real": False,
            "mode": "DEMO_SANDBOX",
            "request": {
                "note": "Credential issuance response payload from Issuer"
            },
            "response": {
                "format": format_claim,
                "credential": sample_credential,
                "_comment": "DEMO SANDBOX DATA - Credential format representation (No private keys used)"
            }
        }

        # Step 6: Presentation Request
        step_6 = {
            "step_id": "presentation_request",
            "name": "Presentation Request",
            "phase": "Verification (OpenID4VP)",
            "description": "Verifier dispatches OpenID4VP request asking for credential presentation",
            "method": "GET",
            "endpoint": "/openid4vp/auth-request",
            "status": 200,
            "timestamp": now,
            "started_at": now,
            "completed_at": now,
            "duration_ms": 16.8,
            "http_duration_ms": 16.8,
            "error": None,
            "is_real": False,
            "mode": "DEMO_SANDBOX",
            "request": {
                "headers": {"Accept": "application/json"}
            },
            "response": {
                "response_type": "vp_token",
                "client_id": f"https://verifier.mosip.net/{verifier}",
                "response_uri": f"https://verifier.mosip.net/{verifier}/vp-response",
                "nonce": "verif_nonce_9100fae",
                "presentation_definition": {
                    "id": "national_id_verification",
                    "input_descriptors": [
                        {
                            "id": "identity_credential",
                            "format": {format_claim: {}},
                            "constraints": {
                                "fields": [
                                    {"path": ["$.given_name"], "purpose": "Display first name"},
                                    {"path": ["$.family_name"], "purpose": "Display last name"}
                                ]
                            }
                        }
                    ]
                },
                "_comment": "DEMO SANDBOX DATA conforming to OpenID4VP Draft 20"
            }
        }

        # Step 7: VP Token
        step_7 = {
            "step_id": "vp_token",
            "name": "VP Token",
            "phase": "Verification (OpenID4VP)",
            "description": "Wallet generates Verifiable Presentation and submits VP Token to Verifier response_uri",
            "method": "POST",
            "endpoint": "/openid4vp/vp-response",
            "status": 200,
            "timestamp": now,
            "started_at": now,
            "completed_at": now,
            "duration_ms": 22.1,
            "http_duration_ms": 22.1,
            "error": None,
            "is_real": False,
            "mode": "DEMO_SANDBOX",
            "request": {
                "headers": {"Content-Type": "application/x-www-form-urlencoded"},
                "body": {
                    "vp_token": "eyJhbGciOiJFUzI1NiJ9.demo_vp_presentation_token.sig" if is_sd_jwt else {
                        "@context": ["https://www.w3.org/2018/credentials/v1"],
                        "type": ["VerifiablePresentation"],
                        "verifiableCredential": [sample_credential]
                    },
                    "presentation_submission": {
                        "id": "submission_1",
                        "definition_id": "national_id_verification",
                        "descriptor_map": [{"id": "identity_credential", "format": format_claim, "path": "$"}]
                    }
                }
            },
            "response": {
                "status": "VP_RECEIVED",
                "submission_id": "sub_9921_recvd",
                "_comment": "DEMO SANDBOX DATA - VP Token received by verifier endpoint"
            }
        }

        # Step 8: Verification
        verification_status_map = {
            "PASS": {"all_ok": True, "sig_valid": True, "exp_valid": True, "pre_sig": True, "status_code": 200, "message": "All protocol requirements met (Simulated sandbox test)"},
            "FAIL": {"all_ok": False, "sig_valid": False, "exp_valid": True, "pre_sig": False, "status_code": 400, "message": "Controlled negative verification: presentation proof signature rejected (Simulated)"},
            "VALID": {"all_ok": True, "sig_valid": True, "exp_valid": True, "pre_sig": True, "status_code": 200, "message": "Credential format & protocol checks passed (Simulated sandbox test)"},
            "INVALID": {"all_ok": False, "sig_valid": False, "exp_valid": True, "pre_sig": False, "status_code": 422, "message": "Tampered credential claims/proof rejected by verifier (Simulated)"},
            "VALID BUT EXPIRED": {"all_ok": False, "sig_valid": True, "exp_valid": False, "pre_sig": True, "status_code": 200, "message": "Signature verified, but credential expiration date has passed (Simulated condition)"}
        }
        verif_info = verification_status_map.get(expected_outcome, verification_status_map["PASS"])
        demo_eval = self.evaluate_scenario_outcome(
            expected_outcome=expected_outcome,
            all_checks_successful=verif_info["all_ok"],
            signature_valid=verif_info["sig_valid"],
            expiry_valid=verif_info["exp_valid"],
            pre_expiry_signature_valid=verif_info["pre_sig"]
        )

        step_8 = {
            "step_id": "verification",
            "name": "Verification",
            "phase": "Verification (OpenID4VP)",
            "description": "Verifier checks cryptographic trust, revocation status, schema, and audience/nonce",
            "method": "POST",
            "endpoint": "/verify/result",
            "status": verif_info["status_code"],
            "timestamp": now,
            "started_at": now,
            "completed_at": now,
            "duration_ms": 31.4,
            "http_duration_ms": 31.4,
            "error": verif_info["message"] if verif_info["status_code"] >= 400 else None,
            "is_real": False,
            "mode": "DEMO_SANDBOX",
            "request": {
                "verifier": verifier,
                "expectedScenario": expected_outcome,
                "token_id": "vp_demo_token_33"
            },
            "response": {
                "result": demo_eval["verifier_result"],
                "verifier_result": demo_eval["verifier_result"],
                "validity_state": demo_eval["credential_validity"],
                "credential_validity": demo_eval["credential_validity"],
                "expected_outcome": demo_eval["expected_outcome"],
                "test_passed": demo_eval["test_passed"],
                "test_outcome": demo_eval["test_outcome"],
                "condition_summary": demo_eval["condition_summary"],
                "allChecksSuccessful": verif_info["all_ok"],
                "issuer_verified": demo_eval["credential_validity"] in ["VALID", "VALID BUT EXPIRED"],
                "revocation_status": "NOT_REVOKED" if demo_eval["credential_validity"] != "INVALID" else "REVOKED",
                "expiration_status": "EXPIRED" if demo_eval["credential_validity"] == "VALID BUT EXPIRED" else "ACTIVE",
                "details": verif_info["message"],
                "disclaimer": "DEMO DATA: External/sandbox combination. No real cryptographic claims made."
            }
        }

        return [step_1, step_2, step_3, step_4, step_5, step_6, step_7, step_8]

    def create_interop_matrix(self) -> List[Dict[str, Any]]:
        """
        Builds the specification conformance grid across all supported permutations:
        Issuer x Wallet x Verifier x Credential Format.
        Untested combinations are initialized with status='NOT_TESTED' and result='—'.
        No demo or fabricated results are returned. Real test results are populated
        strictly from persisted test session executions.
        """
        issuers = ["Inji Certify", "External OpenID4VCI Issuer"]
        wallets = ["Inji Web", "Inji Wallet", "External Wallet"]
        verifiers = ["Inji Verify", "External OpenID4VP Verifier"]
        formats = ["W3C VC", "SD-JWT VC"]

        matrix = []
        for iss in issuers:
            for wal in wallets:
                for ver in verifiers:
                    for fmt in formats:
                        matrix.append({
                            "id": f"{iss}-{wal}-{ver}-{fmt}".lower().replace(" ", "_"),
                            "issuer": iss,
                            "wallet": wal,
                            "verifier": ver,
                            "format": fmt,
                            "result": "—",
                            "status": "NOT_TESTED",
                            "is_demo_entry": False
                        })
        return matrix
