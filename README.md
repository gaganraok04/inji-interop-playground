# Inji Interoperability Playground

**A Unified Sandbox for Verifiable Credential Interoperability Testing**  
*MOSIP Decode 2026 — Problem Statement 2*

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0+-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

## 📌 1. Project Title & Overview

The **Inji Interoperability Playground** is an open-standard, developer-focused sandbox designed to evaluate end-to-end credential interoperability across the **MOSIP Inji** ecosystem and external identity components.

It provides a unified, interactive dashboard to test, inspect, and validate conformance and cryptographic exchange across:
- **Credential Issuers**: MOSIP Inji Certify and external OpenID4VCI issuers.
- **Digital Wallets**: MOSIP Inji Web, Inji Wallet (mobile/Mimoto), and external standard wallets.
- **Verifiers / Relying Parties**: MOSIP Inji Verify and external OpenID4VP verifiers.
- **Credential Formats**: W3C Verifiable Credentials (JSON-LD) and IETF SD-JWT VC (Selective Disclosure).

---

## 🎯 2. Problem Statement (MOSIP Decode 2026 – PS2)

In decentralized digital identity ecosystems, interoperability between different issuers, digital identity wallets, and relying party verifiers is critical. However, developers and system integrators face significant hurdles:
- **Protocol Disparities**: Testing across OpenID4VCI (issuance) and OpenID4VP (presentation/verification) specifications often requires running multiple disparate services with proprietary configurations.
- **Format Incompatibilities**: Verifying W3C JSON-LD versus IETF SD-JWT formats requires distinct signature validation algorithms and key schemas.
- **Opaque Debugging**: When an issuance or verification handshake fails (e.g., token signature errors, proof-of-possession mismatches, or schema discrepancies), diagnosing the exact failure point is complex and time-consuming.

---

## 💡 3. Proposed Solution

The **Inji Interoperability Playground** provides an automated, visual, and rigorous testing framework:
1. **End-to-End Orchestration**: Automatically runs the full 8-stage issuance-to-verification lifecycle.
2. **Dual-Stack Execution**: Operates against either live Inji backend microservices (Inji Certify, Inji Web, Inji Verify, Mimoto) or an in-memory conformance sandbox mode.
3. **Live Triad Visualization**: Real-time directional vector visualization showing message exchange between Issuer $\leftrightarrow$ Wallet $\leftrightarrow$ Verifier.
4. **Deep Protocol Inspection**: Inspects HTTP requests, responses, headers, and cryptographic artifacts (DIDs, JWKs, tokens, proofs) for every protocol step.
5. **Auditable Reports**: Generates downloadable interoperability reports with step-by-step audit logs.

---

## ✨ 4. Key Features

- **8-Stage Conformance Protocol**: Full support for OpenID4VCI Draft 13 / Final and OpenID4VP draft specifications.
- **Live Interaction Flow**: Visual sequence dashboard mapping HTTP interactions and protocol states across actors.
- **Dual Credential Formats**: Support for `ldp_vc` (W3C Linked Data Proof VC) and `vc+sd-jwt` (Selective Disclosure JWT).
- **DID Resolution & Cryptographic Verification**: Live integration with `did:web` and RSA/Ed25519 key verification.
- **Interactive Protocol Inspector**: Syntax-highlighted payload viewer with live timing and status badges.
- **Persistent Test History**: SQLite-backed test execution store with exportable JSON/HTML reports.

---

## 🛠️ 5. Technology Stack

- **Frontend**:
  - React 18 with TypeScript 5.6
  - Vite 5.4 build tool
  - Tailwind CSS 3.4 for UI styling
  - Lucide React for consistent icons
- **Backend**:
  - Python 3.11+
  - Flask 3.0+ REST API
  - Requests & Cryptography libraries
  - SQLite persistent database store
- **Infrastructure & Orchestration**:
  - Docker & Docker Compose
  - Nginx reverse proxy
  - Ngrok public tunnel support for external `did:web` resolution

---

## 🏛️ 6. System Architecture

```
                  ┌──────────────────────────────────────────┐
                  │        Inji Interop Playground UI         │
                  │         (React / Vite / Tailwind)        │
                  └─────────────────────┬────────────────────┘
                                        │ HTTP REST (/api)
                                        ▼
                  ┌──────────────────────────────────────────┐
                  │        Playground Backend Service        │
                  │             (Python / Flask)             │
                  └──────┬──────────────┬──────────────┬─────┘
                         │              │              │
       OpenID4VCI        │              │              │ OpenID4VP
    ┌────────────────────┘              │              └────────────────────┐
    ▼                                   ▼                                   ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│     Inji Certify     │     │  Inji Web / Mimoto   │     │     Inji Verify      │
│   (Credential Issuer)│     │  (Identity Wallet)   │     │    (Relying Party)   │
│   Port: 8090 / 8091  │     │   Port: 3004 / 8099  │     │      Port: 8081      │
└──────────────────────┘     └──────────────────────┘     └──────────────────────┘
```

### The 8-Stage Protocol Sequence:
1. **Credential Offer**: Issuer publishes credential metadata via `/.well-known/openid-credential-issuer`.
2. **Authorization Request**: Wallet initiates authorization using PKCE with the issuer.
3. **Token Exchange**: Wallet exchanges the authorization code for an OAuth2 access token.
4. **Credential Request**: Wallet requests credential issuance with Key Proof of Possession.
5. **Credential Response**: Issuer delivers the signed Verifiable Credential.
6. **Presentation Request**: Verifier generates OpenID4VP authorization request with Presentation Definition.
7. **VP Token Submission**: Wallet constructs and submits Verifiable Presentation (VP Token).
8. **Verification**: Verifier validates cryptographic signatures, issuer DIDs, and status lists.

---

## 📁 7. Project Directory Structure

```
mosip-inji-playground/
├── backend/
│   ├── app.py                      # Flask application factory & route blueprints
│   ├── run.py                      # Backend startup entrypoint
│   ├── requirements.txt            # Python dependencies
│   ├── services/                   # Protocol & integration services
│   │   ├── certify_service.py      # Inji Certify OpenID4VCI client
│   │   ├── wallet_service.py       # Inji Web / Mimoto wallet integration
│   │   ├── verify_service.py       # Inji Verify OpenID4VP verifier engine
│   │   └── interoperability_service.py # Matrix & test orchestrator
│   └── store/                      # SQLite persistent session store
│       └── test_store.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── console/
│   │   │   │   ├── TestConsole.tsx         # Main 3-column workspace
│   │   │   │   ├── ProtocolFlow.tsx        # Vertical 8-stage sequence
│   │   │   │   ├── SequenceFlow.tsx        # Live Interaction Flow dashboard
│   │   │   │   ├── ProtocolInspector.tsx   # Request/response JSON viewer
│   │   │   │   └── TestResultPanel.tsx     # Session result & summary
│   │   │   ├── Header.tsx
│   │   │   └── ConfigurationPanel.tsx
│   │   ├── services/api.ts         # Frontend API client
│   │   └── types/index.ts          # Core TypeScript definitions
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docker/
│   ├── Dockerfile.backend          # Flask Python container
│   ├── Dockerfile.frontend         # Nginx production React container
│   ├── nginx.conf                  # Nginx proxy configuration
│   └── docker-compose.yml          # Playground multi-container orchestration
├── docs/
│   ├── ARCHITECTURE.md             # Detailed protocol architecture
│   └── API_SPECIFICATION.md        # REST API endpoints & schemas
├── data/                           # Local SQLite database directory
├── .env.example                    # Environment variable template
└── README.md                       # Project documentation
```

---

## ⚙️ 8. Prerequisites

- **Docker Desktop**: v24+ (with Docker Compose v2)
- **Node.js**: v18.0+ (tested on Node 20 / 22)
- **Python**: 3.10+ (tested on Python 3.11)
- **Git**

---

## 🚀 9. Installation Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/gaganraok04/inji-interop-playground.git
cd inji-interop-playground
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

---

## 🔧 10. Configuration & Environment Variables

Key parameters configured in `.env`:

```env
# Backend Server Configuration
FLASK_ENV=development
PORT=5000
DATABASE_PATH=data/test_store.db

# Live Inji Microservices Stack
INJI_CERTIFY_URL=http://localhost:8090
CERTIFY_NGINX_URL=http://localhost:8091
INJI_WALLET_URL=http://localhost:3004
INJI_VERIFY_URL=http://localhost:8081
MIMOTO_URL=http://localhost:8099

# Public Issuer DID (ngrok tunnel or domain)
ISSUER_DID_URL=https://<your-subdomain>.ngrok-free.dev/.well-known/did.json
```

---

## 💻 11. How to Run Frontend & Backend

### Option A: Using Docker (Recommended)

Run the full playground stack with one command:
```bash
docker compose -f docker/docker-compose.yml up -d --build
```
- **Frontend Dashboard**: `http://127.0.0.1:8080`
- **Backend API**: `http://127.0.0.1:5000`

### Option B: Local Development Mode

**1. Run Backend:**
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python run.py
```

**2. Run Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔗 12. Integration with Inji Certify, Inji Verify & Mimoto

The playground communicates with live Inji services using standard REST interfaces:
- **Inji Certify (`:8090` / `:8091`)**: Resolves issuer metadata, fetches public DID documents via `/.well-known/did.json`, and issues credentials through `/v1/certify/issuance/credential`.
- **Mimoto (`:8099`)**: Handles wallet authentication, identity binding, and OAuth token exchanges.
- **Inji Web (`:3004`)**: Provides the wallet presentation interface and credential storage.
- **Inji Verify (`:8081`)**: Validates VP tokens against presentation definitions and verifies public cryptographic signatures.

---

## 📖 13. API Documentation Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and Inji dependency connectivity |
| `GET` | `/api/config` | Retrieves supported issuers, wallets, verifiers, and matrix |
| `POST` | `/api/test/start` | Initiates an interoperability test session |
| `GET` | `/api/test/<test_id>` | Retrieves session status, step outcomes, and payloads |
| `GET` | `/api/test/<test_id>/events` | Returns real-time execution event logs |
| `GET` | `/api/test/<test_id>/report` | Exports full interoperability test report |
| `POST` | `/api/test/<test_id>/reset` | Resets active test session |

---

## 🧪 14. Testing Instructions

Run backend unit and integration tests:
```bash
cd backend
pytest -v
```

Run frontend production build verification:
```bash
cd frontend
npm run build
```

---

## 🔒 15. Security Considerations

- **Real Cryptographic Verification**: The sandbox verifies real signatures and does not bypass cryptographic validation.
- **DID Document Resolution**: Uses standard `did:web` resolution with TLS verification.
- **PKCE Enforcement**: Enforces RFC 7636 Proof Key for Code Exchange during authorization handshakes.
- **Safe Credential Handling**: Private keys and access tokens are never logged or exposed in client bundles.

---

## 🔮 16. Future Enhancements

- [ ] Support for **mDoc / ISO 18013-5** mobile driving license format.
- [ ] Automated CI/CD interoperability regression test suite.
- [ ] Multi-tenant conformance badges and exportable PDF certificates.
- [ ] Integration with hardware-backed key storage (Secure Enclave / Android KeyStore).

---

## 👥 17. Team & Acknowledgements

- **Event**: MOSIP Decode 2026 Hackathon
- **Problem Statement**: Problem Statement 2 – Verifiable Credential Interoperability
- **Developed by**: Inji Interop Playground Team
- **Acknowledgements**: Special thanks to the **MOSIP Community** and the **Inji Open Source Project** maintainers.

---

## 📜 License

This project is licensed under the **MIT License**.
