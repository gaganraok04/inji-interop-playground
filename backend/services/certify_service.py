"""
Certify Service Interface
MOSIP Decode 2026 - Problem Statement 2: Inji Interoperability Playground

This service defines the interface for interacting with Credential Issuers:
- MOSIP Inji Certify
- External OpenID4VCI Issuers

IMPORTANT:
- No invented Inji API endpoints.
- No fake cryptography implementation.
- Real Inji Certify APIs will be wired in future iterations using OpenID4VCI specifications.
"""

import os
import time
from typing import Dict, Any, Optional
import requests


class CertifyService:
    def __init__(self, certify_url: Optional[str] = None):
        self.certify_url = (certify_url or os.getenv("INJI_CERTIFY_URL") or "http://localhost:8090/v1/certify").rstrip("/")
        self.nginx_url = (os.getenv("INJI_CERTIFY_NGINX_URL") or "http://localhost:8091").rstrip("/")
        self.public_url = (os.getenv("INJI_CERTIFY_PUBLIC_URL") or "https://tasty-liana-apographic.ngrok-free.dev").rstrip("/")
        self._cached_metadata: Optional[Dict[str, Any]] = None
        self._metadata_cached_at: float = 0.0
        self._cached_did: Optional[Dict[str, Any]] = None
        self._did_cached_at: float = 0.0
        self._cache_ttl: float = 300.0
        self._session = requests.Session()

    def is_configured(self) -> bool:
        """Checks if real Inji Certify endpoint is configured via environment."""
        return bool(self.certify_url.strip())

    def _candidate_urls(self, path: str) -> list:
        candidates = []
        for base in [self.certify_url, self.nginx_url, self.public_url]:
            if not base:
                continue
            url = f"{base}{path}"
            if url not in candidates:
                candidates.append(url)
            if "localhost" in base:
                docker_url = f"{base.replace('localhost', 'host.docker.internal')}{path}"
                if docker_url not in candidates:
                    candidates.append(docker_url)
        return candidates

    def get_openid_credential_issuer_metadata(self, force_refresh: bool = False) -> Optional[Dict[str, Any]]:
        """Queries live Inji Certify OpenID4VCI metadata endpoint with safe TTL caching."""
        now = time.monotonic()
        if not force_refresh and self._cached_metadata and (now - self._metadata_cached_at) < self._cache_ttl:
            return self._cached_metadata

        for url in self._candidate_urls("/.well-known/openid-credential-issuer"):
            try:
                resp = self._session.get(url, timeout=(2.0, 4.0))
                if resp.status_code == 200:
                    data = resp.json()
                    self._cached_metadata = data
                    self._metadata_cached_at = time.monotonic()
                    if url.endswith("/.well-known/openid-credential-issuer"):
                        base = url[:-len("/.well-known/openid-credential-issuer")].rstrip("/")
                        if base.endswith("/v1/certify"):
                            self.certify_url = base
                    return data
            except Exception:
                continue
        return self._cached_metadata

    def get_did_document(self, force_refresh: bool = False) -> Optional[Dict[str, Any]]:
        """Queries live Inji Certify DID document endpoint with safe TTL caching."""
        now = time.monotonic()
        if not force_refresh and self._cached_did and (now - self._did_cached_at) < self._cache_ttl:
            return self._cached_did

        for url in self._candidate_urls("/.well-known/did.json"):
            try:
                resp = self._session.get(url, timeout=(2.0, 4.0))
                if resp.status_code == 200:
                    data = resp.json()
                    self._cached_did = data
                    self._did_cached_at = time.monotonic()
                    return data
            except Exception:
                continue
        return self._cached_did

    def get_service_status(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Returns the operational status of the live Inji Certify integration."""
        configured = self.is_configured()
        metadata = self.get_openid_credential_issuer_metadata(force_refresh=force_refresh) if configured else None
        did_doc = self.get_did_document(force_refresh=force_refresh) if configured else None
        is_live = bool(metadata and did_doc)

        did_id = did_doc.get("id", "did:web:tasty-liana-apographic.ngrok-free.dev") if did_doc else None
        supported_configs = list(metadata.get("credential_configurations_supported", {}).keys()) if metadata else ["FarmerCredential"]

        return {
            "service": "Inji Certify / OpenID4VCI Issuer",
            "configured": configured,
            "status": "UP" if is_live else ("CONFIGURED_UNREACHABLE" if configured else "UNCONFIGURED"),
            "url": self.certify_url or "Not configured (Sandbox mode)",
            "public_url": self.public_url,
            "did": did_id,
            "is_real": is_live,
            "supported_protocols": ["OpenID4VCI Draft 13"],
            "supported_credentials": supported_configs,
            "supported_formats": ["ldp_vc (W3C VC)"],
            "signature_suite": "Ed25519Signature2020",
            "signature_algo": "EdDSA",
            "note": "Connected to real Inji Certify stack." if is_live else "In sandbox mode until live services are reachable."
        }

    def initiate_credential_offer(self, issuer_type: str, format_type: str, subject_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Initiates a Credential Offer for the specified credential format.
        Uses real Inji Certify metadata when available.
        """
        metadata = self.get_openid_credential_issuer_metadata()
        did_doc = self.get_did_document()

        if metadata and did_doc:
            did_id = did_doc.get("id", "did:web:tasty-liana-apographic.ngrok-free.dev")
            configs = metadata.get("credential_configurations_supported", {})
            farmer_config = configs.get("FarmerCredential", {})

            return {
                "mode": "REAL_INJI_STACK",
                "issuer_type": "Inji Certify",
                "issuer_did": did_id,
                "credential_issuer": metadata.get("credential_issuer", "http://certify-nginx:80"),
                "authorization_server": (metadata.get("authorization_servers") or ["https://esignet-mock.collab.mosip.net"])[0],
                "credential_endpoint": metadata.get("credential_endpoint", "http://certify-nginx:80/v1/certify/issuance/credential"),
                "format": farmer_config.get("format", "ldp_vc"),
                "credential_type": ["FarmerCredential", "VerifiableCredential"],
                "signature_algo": farmer_config.get("credential_signing_alg_values_supported", ["EdDSA"])[0],
                "status": "OFFER_AVAILABLE",
                "spec_reference": "OpenID for Verifiable Credential Issuance (OpenID4VCI Draft 13)",
                "is_real": True
            }

        return {
            "mode": "DEMO_SANDBOX",
            "issuer_type": issuer_type,
            "format": format_type,
            "status": "OFFER_CREATED",
            "message": "Credential offer generated for sandbox protocol simulation.",
            "spec_reference": "OpenID for Verifiable Credential Issuance (OpenID4VCI)",
            "is_real": False
        }

    def process_credential_request(self, token: str, format_type: str, proof_jwt: Optional[str] = None) -> Dict[str, Any]:
        """Processes credential request against the issuer metadata."""
        metadata = self.get_openid_credential_issuer_metadata()
        if metadata:
            return {
                "mode": "REAL_INJI_STACK",
                "format": format_type,
                "status": "ISSUANCE_METADATA_VERIFIED",
                "credential_endpoint": metadata.get("credential_endpoint", "/v1/certify/issuance/credential"),
                "is_real": True
            }

        return {
            "mode": "DEMO_SANDBOX",
            "format": format_type,
            "status": "ISSUANCE_PENDING",
            "message": "Credential request prepared for sandbox protocol simulation.",
            "is_real": False
        }

    def _create_proof_jwt(self, c_nonce: Optional[str] = None, audience: Optional[str] = None) -> tuple:
        """Generates an ephemeral EC P-256 key pair and signs an OpenID4VCI proof JWT."""
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
        import base64
        import json
        import time

        def b64u(b: bytes) -> str:
            return base64.urlsafe_b64encode(b).decode("ascii").rstrip("=")

        private_key = ec.generate_private_key(ec.SECP256R1())
        public_key = private_key.public_key()
        pub_numbers = public_key.public_numbers()

        x_bytes = pub_numbers.x.to_bytes(32, byteorder="big")
        y_bytes = pub_numbers.y.to_bytes(32, byteorder="big")

        header = {
            "alg": "ES256",
            "typ": "openid4vci-proof+jwt",
            "jwk": {
                "kty": "EC",
                "crv": "P-256",
                "x": b64u(x_bytes),
                "y": b64u(y_bytes)
            }
        }

        claims = {
            "aud": audience or "http://certify-nginx:80",
            "iat": int(time.time()),
            "nonce": c_nonce or ""
        }

        h_b64 = b64u(json.dumps(header).encode("utf-8"))
        c_b64 = b64u(json.dumps(claims).encode("utf-8"))
        sig_in = f"{h_b64}.{c_b64}".encode("ascii")

        der_sig = private_key.sign(sig_in, ec.ECDSA(hashes.SHA256()))
        r, s = decode_dss_signature(der_sig)
        raw_sig = r.to_bytes(32, byteorder="big") + s.to_bytes(32, byteorder="big")

        proof_jwt = f"{h_b64}.{c_b64}.{b64u(raw_sig)}"
        return proof_jwt, header["jwk"]

    def request_credential(
        self,
        access_token: str,
        c_nonce: Optional[str] = None,
        format_type: str = "ldp_vc",
        credential_type: str = "FarmerCredential"
    ) -> Dict[str, Any]:
        """
        Submits OpenID4VCI credential request to live Inji Certify /v1/certify/issuance/credential
        using the genuine Bearer access token and a dynamic ES256 proof JWT.
        Automatically handles nonce negotiation if Certify returns invalid_nonce.
        """
        metadata = self.get_openid_credential_issuer_metadata() or {}
        aud = metadata.get("credential_issuer", "http://certify-nginx:80")
        configs = metadata.get("credential_configurations_supported", {})
        cred_config = configs.get(credential_type, {})
        cred_def = cred_config.get("credential_definition", {})
        contexts = cred_def.get("@context") or ["https://www.w3.org/2018/credentials/v1"]
        types = cred_def.get("type") or [credential_type, "VerifiableCredential"]

        proof_jwt, jwk = self._create_proof_jwt(c_nonce=c_nonce, audience=aud)

        req_body = {
            "format": format_type,
            "credential_definition": {
                "@context": contexts,
                "type": types
            },
            "proof": {
                "proof_type": "jwt",
                "jwt": proof_jwt
            }
        }
        sanitized_req_body = {
            "format": format_type,
            "credential_definition": req_body["credential_definition"],
            "proof": {
                "proof_type": "jwt",
                "jwt": "[VALID_OPENID4VCI_PROOF_JWT]"
            }
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        candidate_endpoints = []
        for base in [self.certify_url, self.nginx_url, self.public_url]:
            if not base:
                continue
            b = base.rstrip("/")
            path = "/issuance/credential" if b.endswith("/v1/certify") else "/v1/certify/issuance/credential"
            url = f"{b}{path}"
            if url not in candidate_endpoints:
                candidate_endpoints.append(url)
            if "localhost" in b:
                docker_url = f"{b.replace('localhost', 'host.docker.internal')}{path}"
                if docker_url not in candidate_endpoints:
                    candidate_endpoints.append(docker_url)

        last_error = None
        last_status = 500
        t_start = time.perf_counter()
        for endpoint in candidate_endpoints:
            try:
                resp = self._session.post(endpoint, json=req_body, headers=headers, timeout=(3.05, 12.0))
                if resp.status_code == 404:
                    continue

                resp_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}

                # If Certify returns 401 invalid_token immediately after issuance, Inji Certify's
                # AccessTokenValidationFilter rejects tokens where iat >= Instant.now() with 0 clock-skew tolerance.
                # A brief wait (1.5s) allows the container clock to advance strictly past iat, satisfying iat.isBefore(now).
                if resp.status_code == 401 and (resp_json.get("error") == "invalid_token" or "invalid_token" in str(resp_json)):
                    time.sleep(1.5)
                    resp = self._session.post(endpoint, json=req_body, headers=headers, timeout=(3.05, 12.0))
                    resp_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}

                # If Certify requires new c_nonce challenge, re-sign and retry immediately (bounded to 1 retry)
                if resp.status_code == 400 and (resp_json.get("error") == "invalid_nonce" or "nonce" in str(resp_json.get("error", ""))):
                    new_nonce = resp_json.get("c_nonce")
                    if new_nonce:
                        proof_jwt, _ = self._create_proof_jwt(c_nonce=new_nonce, audience=aud)
                        req_body["proof"]["jwt"] = proof_jwt
                        resp = self._session.post(endpoint, json=req_body, headers=headers, timeout=(3.05, 12.0))
                        resp_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}

                elapsed_ms = round((time.perf_counter() - t_start) * 1000, 2)
                if endpoint.endswith("/v1/certify/issuance/credential"):
                    self.certify_url = endpoint[:-len("/issuance/credential")].rstrip("/")

                sanitized_req_body = {
                    "format": format_type,
                    "credential_definition": req_body["credential_definition"],
                    "proof": {
                        "proof_type": "jwt",
                        "jwt": "[VALID_OPENID4VCI_PROOF_JWT]"
                    }
                }

                if resp.status_code == 200:
                    credential = resp_json.get("credential")
                    return {
                        "is_real": True,
                        "status": 200,
                        "duration_ms": elapsed_ms,
                        "endpoint": endpoint,
                        "credential": credential,
                        "request_body": sanitized_req_body,
                        "response": resp_json
                    }
                else:
                    last_status = resp.status_code
                    last_error = resp_json if resp_json else {"error": resp.text[:200]}
                    return {
                        "is_real": True,
                        "status": last_status,
                        "duration_ms": elapsed_ms,
                        "endpoint": endpoint,
                        "request_body": sanitized_req_body,
                        "error": last_error,
                        "response": last_error
                    }
            except Exception as e:
                last_error = str(e)
                continue

        elapsed_ms = round((time.perf_counter() - t_start) * 1000, 2)
        return {
            "is_real": True,
            "status": last_status,
            "duration_ms": elapsed_ms,
            "request_body": sanitized_req_body,
            "error": last_error or "Failed to connect to Certify credential issuance endpoint"
        }
