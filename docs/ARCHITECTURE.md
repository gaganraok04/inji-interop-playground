# Architecture & Design

## Inji Interoperability Playground
**MOSIP Decode 2026 — Problem Statement 2**
*A Unified Sandbox for Verifiable Credential Interoperability Testing*

---

## 1. System Overview

The **Inji Interoperability Playground** provides an automated, standardized testbed for evaluating interoperability across Verifiable Credential ecosystems involving MOSIP Inji and external standards-compliant components.

```
       [ Credential Issuer ]
        (Inji Certify / OID4VCI)
                  |
          OpenID4VCI (Issuance)
                  v
       [ Digital Identity Wallet ]
   (Inji Web / Inji Wallet / External)
                  |
          OpenID4VP (Presentation)
                  v
       [ Relying Party Verifier ]
        (Inji Verify / OID4VP)
```

---

## 2. Core Design Principles

1. **Strict Specification Adherence**:
   - Flows strictly mirror the **OpenID for Verifiable Credential Issuance (OpenID4VCI Draft 13)** and **OpenID for Verifiable Presentations (OpenID4VP Draft 20)** specifications.
2. **Zero Synthetic / Fake APIs**:
   - No mock endpoints are fabricated as real Inji APIs.
   - Clean service layers (`certify_service.py`, `wallet_service.py`, `verify_service.py`, `interoperability_service.py`) cleanly abstract interaction logic and contain explicit `TODO` markers for production endpoint wiring.
3. **No Fake Cryptographic Verification Claims**:
   - The UI and API clearly label simulation phases as demo/sandbox evaluations until real Inji Verify and cryptographic Trust Registries are wired.
4. **Credential Format Flexibility**:
   - Full support for both **W3C Verifiable Credentials (JSON-LD)** and **IETF SD-JWT VC (Selective Disclosure)**.

---

## 3. Protocol Lifecycle (The 8 Standard Steps)

| Step # | Protocol Step | Phase | Standard Endpoint / Method | Description |
|---|---|---|---|---|
| **1** | **Credential Offer** | OID4VCI Issuance | `GET /.well-known/openid-credential-issuer` | Issuer advertises supported formats, crypto binding, and credential scopes. |
| **2** | **Authorization** | OID4VCI Issuance | `GET /oauth2/authorize` | Wallet executes authorization code flow with PKCE code challenge. |
| **3** | **Token Exchange** | OID4VCI Issuance | `POST /oauth2/token` | Wallet presents code verifier to receive DPoP/Bearer access token and issuance `c_nonce`. |
| **4** | **Credential Request** | OID4VCI Issuance | `POST /credential` | Wallet issues signed key-binding proof requesting credential payload. |
| **5** | **Credential Response** | OID4VCI Issuance | `POST /credential` | Issuer delivers signed W3C VC or SD-JWT VC to wallet storage. |
| **6** | **Presentation Request**| OID4VP Verification | `GET /openid4vp/auth-request` | Verifier dispatches request definition with input constraints. |
| **7** | **VP Token** | OID4VP Verification | `POST /openid4vp/vp-response` | Wallet compiles Verifiable Presentation submission to Verifier. |
| **8** | **Verification** | OID4VP Verification | `POST /verify/result` | Verifier cryptographically audits signatures, trust roots, and revocation status. |

---

## 4. Component Layout

```
mosip-inji-playground/
├── backend/
│   ├── app.py                      # Flask Application & REST API Routes
│   ├── run.py                      # Backend Server Entrypoint
│   ├── requirements.txt            # Python Dependencies
│   ├── services/
│   │   ├── certify_service.py      # Issuer Interface (Inji Certify / OID4VCI)
│   │   ├── wallet_service.py       # Wallet Interface (Inji Web / Mimoto / External)
│   │   ├── verify_service.py       # Verifier Interface (Inji Verify / OID4VP)
│   │   └── interoperability_service.py # Interop orchestrator & matrix generator
│   └── store/
│       └── test_store.py           # In-memory thread-safe session store
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx          # Top nav, status, dark mode
│   │   │   ├── ConfigurationPanel.tsx # 3-column triad & format selector
│   │   │   ├── FlowControl.tsx     # Test execution & scenario triggers
│   │   │   ├── ProtocolTimeline.tsx # Interactive 8-step timeline
│   │   │   ├── ProtocolInspector.tsx# Step-by-step inspector (headers, payload)
│   │   │   ├── MermaidDiagram.tsx  # Dynamic Mermaid.js sequence flow
│   │   │   ├── ResultPanel.tsx     # Verdict banner (PASS, FAIL, VALID, etc.)
│   │   │   └── InteroperabilityMatrix.tsx # Filterable matrix permutations
│   │   ├── services/api.ts         # Backend API client
│   │   ├── types/index.ts          # Strongly typed domain models
│   │   ├── App.tsx                 # Root application dashboard
│   │   └── main.tsx                # React DOM mount
├── docs/
│   ├── ARCHITECTURE.md
│   └── API_SPECIFICATION.md
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── nginx.conf
│   └── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 5. Future Real Inji Integrations

When connecting to production MOSIP and Inji deployments, the environment variables provide endpoint targets:
- `INJI_CERTIFY_URL`: Live Inji Certify instance for OID4VCI issuing.
- `INJI_WALLET_URL`: Target Inji Web application origin.
- `MIMOTO_URL`: Inji mobile backend service for wallet-to-issuer protocol exchanges.
- `INJI_VERIFY_URL`: Live Inji Verify instance for offline/online credential verification.
