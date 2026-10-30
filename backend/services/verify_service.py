"""
Verify Service Interface
MOSIP Decode 2026 - Problem Statement 2: Inji Interoperability Playground

This service defines the interface for interacting with Verifiers:
- MOSIP Inji Verify
- External OpenID4VP Verifiers

IMPORTANT:
- No invented Inji API endpoints.
- No fake cryptography implementation.
- No fake claims that a real credential was verified.
- Real Inji Verify APIs will be connected in future iterations.
"""

import os
import time
from typing import Dict, Any, Optional
import requests


class VerifyService:
    _CACHE_TTL_SEC = 300.0

    def __init__(self, verify_url: Optional[str] = None):
        self.verify_url = (verify_url or os.getenv("INJI_VERIFY_URL") or "http://localhost:8081/v1/verify").rstrip("/")
        self.public_url = (os.getenv("INJI_VERIFY_PUBLIC_URL") or "https://khaki-actors-do.loca.lt").rstrip("/")
        self.verifier_did = f"did:web:{self.public_url.replace('https://', '').replace('http://', '')}:v1:verify"
        self._cached_did: Optional[Dict[str, Any]] = None
        self._cached_did_ts: float = 0.0
        self._session = requests.Session()

    def is_configured(self) -> bool:
        """Checks if real Inji Verify endpoint is configured."""
        return bool(self.verify_url.strip())

    def _candidate_bases(self) -> list:
        bases = [self.verify_url]
        if "localhost" in self.verify_url:
            bases.append(self.verify_url.replace("localhost", "host.docker.internal"))
        return bases

    def get_did_document(self, force_refresh: bool = False) -> Optional[Dict[str, Any]]:
        """Queries live Inji Verify DID document (with short-lived TTL cache)."""
        now_ts = time.monotonic()
        if not force_refresh and self._cached_did and (now_ts - self._cached_did_ts) < self._CACHE_TTL_SEC:
            return self._cached_did

        for base in self._candidate_bases():
            url = f"{base}/did.json"
            try:
                resp = self._session.get(url, timeout=(2.5, 4.0))
                if resp.status_code == 200:
                    data = resp.json()
                    self._cached_did = data
                    self._cached_did_ts = time.monotonic()
                    # If candidate succeeded, update self.verify_url to working base
                    self.verify_url = base
                    return data
            except Exception:
                pass
        return self._cached_did

    def get_service_status(self) -> Dict[str, Any]:
        """Returns the operational status of the live Inji Verify integration."""
        configured = self.is_configured()
        did_doc = self.get_did_document() if configured else None
        is_live = bool(did_doc)

        return {
            "service": "Inji Verify / OpenID4VP Verifier",
            "configured": configured,
            "status": "UP" if is_live else ("CONFIGURED_UNREACHABLE" if configured else "UNCONFIGURED"),
            "url": self.verify_url or "Not configured (Sandbox mode)",
            "public_url": self.public_url,
            "verifier_did": did_doc.get("id", self.verifier_did) if did_doc else self.verifier_did,
            "is_real": is_live,
            "supported_protocols": ["OpenID4VP Draft 20", "direct_post"],
            "supported_formats": ["ldp_vc (W3C VC)", "vc+sd-jwt (SD-JWT VC)"],
            "verification_outcomes": ["PASS", "FAIL", "VALID", "INVALID"],
            "note": "Connected to real Inji Verify stack." if is_live else "In sandbox mode until live services are reachable."
        }

    def create_real_presentation_request(
        self,
        credential_type: str = "FarmerCredential",
        proof_type: str = "Ed25519Signature2020",
        accept_vp_without_holder_proof: bool = True
    ) -> Dict[str, Any]:
        """
        Calls real Inji Verify POST /vp-request to create an authorization request session.
        """
        t0 = time.perf_counter()
        presentation_def = {
            "id": f"{credential_type}_Verification",
            "name": f"{credential_type} Verification",
            "purpose": f"Relying party is requesting your {credential_type} for interoperability verification",
            "format": {
                "ldp_vc": {
                    "proof_type": [proof_type]
                }
            },
            "input_descriptors": [
                {
                    "id": f"{credential_type.lower()}_descriptor",
                    "format": {
                        "ldp_vc": {
                            "proof_type": [proof_type]
                        }
                    },
                    "constraints": {
                        "fields": [
                            {
                                "path": ["$.type"],
                                "filter": {
                                  "type": "object",
                                  "pattern": credential_type
                                }
                            }
                        ]
                    }
                }
            ]
        }

        body = {
            "clientId": self.verifier_did,
            "presentationDefinition": presentation_def,
            "acceptVPWithoutHolderProof": accept_vp_without_holder_proof,
            "responseCodeValidationRequired": False
        }

        for base in self._candidate_bases():
            try:
                resp = self._session.post(f"{base}/vp-request", json=body, timeout=(2.5, 5.0))
                if resp.status_code == 201:
                    self.verify_url = base
                    data = resp.json()
                    return {
                        "mode": "REAL_INJI_STACK",
                        "status": "REQUEST_CREATED",
                        "transaction_id": data.get("transactionId"),
                        "request_id": data.get("requestId"),
                        "request_uri": data.get("requestUri"),
                        "expires_at": data.get("expiresAt"),
                        "client_id": self.verifier_did,
                        "presentation_definition": presentation_def,
                        "is_real": True,
                        "duration_ms": round((time.perf_counter() - t0) * 1000, 1)
                    }
            except Exception:
                pass

        return {
            "mode": "DEMO_SANDBOX",
            "status": "FALLBACK_REQUEST_CREATED",
            "transaction_id": f"sandbox-{os.urandom(4).hex()}",
            "is_real": False,
            "duration_ms": round((time.perf_counter() - t0) * 1000, 1)
        }

    def generate_presentation_request(self, verifier_type: str, format_type: str) -> Dict[str, Any]:
        """Creates an OpenID4VP presentation request using real Verify if available."""
        if self.is_configured():
            return self.create_real_presentation_request()

        return {
            "mode": "DEMO_SANDBOX",
            "verifier_type": verifier_type,
            "format": format_type,
            "status": "REQUEST_CREATED",
            "message": "Presentation request formulated for sandbox protocol simulation.",
            "is_real": False
        }

    def submit_real_presentation(
        self,
        request_id: str,
        vp_token: Any,
        presentation_submission: Any
    ) -> Dict[str, Any]:
        """
        Submits a Verifiable Presentation to real Inji Verify POST /vp-submission/direct-post.
        Uses application/x-www-form-urlencoded as per OpenID4VP Direct Post specification.
        """
        import json
        t0 = time.perf_counter()
        form_data = {
            "state": request_id,
            "presentation_submission": json.dumps(presentation_submission) if isinstance(presentation_submission, dict) else presentation_submission,
            "vp_token": json.dumps(vp_token) if isinstance(vp_token, (dict, list)) else vp_token
        }
        for base in self._candidate_bases():
            try:
                resp = self._session.post(
                    f"{base}/vp-submission/direct-post",
                    data=form_data,
                    timeout=(3.05, 8.0)
                )
                duration_ms = round((time.perf_counter() - t0) * 1000, 1)
                if resp.status_code == 200:
                    self.verify_url = base
                    return {
                        "mode": "REAL_INJI_STACK",
                        "status": 200,
                        "state": request_id,
                        "is_real": True,
                        "duration_ms": duration_ms,
                        "data": resp.json() if resp.text else {}
                    }
                else:
                    return {
                        "mode": "REAL_INJI_STACK",
                        "status": resp.status_code,
                        "error": resp.text,
                        "is_real": True,
                        "duration_ms": duration_ms
                    }
            except Exception:
                pass

        return {
            "mode": "DEMO_SANDBOX",
            "status": 500,
            "error": "Failed to connect to Inji Verify direct-post endpoint",
            "is_real": False,
            "duration_ms": round((time.perf_counter() - t0) * 1000, 1)
        }

    def get_real_verification_results(self, transaction_id: str, skip_status_checks: bool = True) -> Dict[str, Any]:
        """Queries real Inji Verify POST /v2/vp-results/{transactionId}."""
        t0 = time.perf_counter()
        body = {
            "skipStatusChecks": skip_status_checks,
            "statusCheckFilters": [],
            "includeClaims": True
        }
        for base in self._candidate_bases():
            try:
                resp = self._session.post(f"{base}/v2/vp-results/{transaction_id}", json=body, timeout=(3.05, 25.0))
                duration_ms = round((time.perf_counter() - t0) * 1000, 1)
                if resp.status_code == 200:
                    self.verify_url = base
                    data = resp.json()
                    all_ok = data.get("allChecksSuccessful", False)
                    return {
                        "mode": "REAL_INJI_STACK",
                        "status": "VERIFIED",
                        "http_status": 200,
                        "result": "PASS" if all_ok else "FAIL",
                        "all_checks_successful": all_ok,
                        "credential_results": data.get("credentialResults", []),
                        "transaction_id": transaction_id,
                        "is_real_verification": True,
                        "duration_ms": duration_ms,
                        "raw_response": data
                    }
                elif resp.status_code == 404:
                    return {
                        "mode": "REAL_INJI_STACK",
                        "status": "NOT_FOUND",
                        "http_status": 404,
                        "result": "PENDING_OR_NOT_FOUND",
                        "is_real_verification": True,
                        "duration_ms": duration_ms,
                        "error": "No VP submission found for transaction"
                    }
            except Exception:
                pass

        return {
            "mode": "DEMO_SANDBOX",
            "status": "UNAVAILABLE",
            "result": "NOT RUN",
            "is_real_verification": False,
            "duration_ms": round((time.perf_counter() - t0) * 1000, 1)
        }

    def evaluate_vc_expiry(self, vc_payload: Any) -> Dict[str, Any]:
        """
        Evaluates RFC 3339 / W3C VC expirationDate or validUntil against current UTC time.
        Returns genuine expiry validation status without fabricating signature results.
        """
        from datetime import datetime, timezone
        if not isinstance(vc_payload, dict):
            return {
                "valid": True,
                "is_expired": False,
                "status": "ACTIVE",
                "expirationDate": None
            }

        exp_str = vc_payload.get("expirationDate") or vc_payload.get("validUntil")
        if not exp_str or not isinstance(exp_str, str):
            return {
                "valid": True,
                "is_expired": False,
                "status": "ACTIVE",
                "expirationDate": None
            }

        try:
            normalized = exp_str.strip()
            if normalized.endswith("Z"):
                normalized = normalized[:-1] + "+00:00"
            exp_dt = datetime.fromisoformat(normalized)
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            now_dt = datetime.now(timezone.utc)
            is_expired = exp_dt <= now_dt
            result: Dict[str, Any] = {
                "valid": not is_expired,
                "is_expired": is_expired,
                "status": "EXPIRED" if is_expired else "ACTIVE",
                "expirationDate": exp_str,
                "evaluatedAt": now_dt.isoformat()
            }
            if is_expired:
                result["error"] = {
                    "errorCode": "ERR_VC_EXPIRED",
                    "errorMessage": f"Credential expirationDate ({exp_str}) has passed."
                }
            return result
        except Exception as e:
            return {
                "valid": False,
                "is_expired": True,
                "status": "EXPIRED",
                "expirationDate": exp_str,
                "error": {
                    "errorCode": "ERR_INVALID_EXPIRATION_DATE",
                    "errorMessage": f"Invalid expirationDate format: {exp_str} ({e})"
                }
            }

    def verify_single_credential(self, vc_payload: Any) -> Dict[str, Any]:
        """Calls real Inji Verify POST /v2/vc-verification for direct VC verification."""
        vc_string = vc_payload if isinstance(vc_payload, str) else requests.compat.json.dumps(vc_payload)
        body = {
            "verifiableCredential": vc_string,
            "skipStatusChecks": True,
            "statusCheckFilters": [],
            "includeClaims": True
        }
        for base in self._candidate_bases():
            try:
                resp = self._session.post(f"{base}/v2/vc-verification", json=body, timeout=(3.05, 25.0))
                if resp.status_code == 200:
                    self.verify_url = base
                    data = resp.json()
                    all_ok = data.get("allChecksSuccessful", False)
                    return {
                        "mode": "REAL_INJI_STACK",
                        "status": "VERIFIED",
                        "result": "PASS" if all_ok else "FAIL",
                        "all_checks_successful": all_ok,
                        "schema_and_signature": data.get("schemaAndSignatureCheck", {}),
                        "expiry_check": data.get("expiryCheck", {}),
                        "status_check": data.get("statusCheck", []),
                        "claims": data.get("claims", {}),
                        "is_real_verification": True
                    }
            except Exception:
                pass

        return {
            "mode": "REAL_INJI_STACK",
            "status": "ERROR",
            "result": "FAIL",
            "all_checks_successful": False,
            "error": "Failed to reach Inji Verify /v2/vc-verification",
            "is_real_verification": False
        }

    def verify_presentation_token(self, vp_token: Dict[str, Any], format_type: str) -> Dict[str, Any]:
        """Evaluates a submitted Verifiable Presentation."""
        if self.is_configured():
            vc = vp_token.get("verifiableCredential") or vp_token
            return self.verify_single_credential(vc)

        return {
            "mode": "DEMO_SANDBOX",
            "status": "SIMULATED_EVALUATION",
            "result": "VALID",
            "is_real_verification": False,
            "disclaimer": "DEMO DATA ONLY: Real Inji Verify service not configured. No cryptographic verification performed.",
            "format": format_type
        }
