# REST API Specification

## Inji Interoperability Playground Backend

Base URL: `http://localhost:5000/api`

---

### 1. `GET /api/health`
Checks health of the backend and status of configured Inji service URLs.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "project": "Inji Interoperability Playground",
  "hackathon": "MOSIP Decode 2026 - Problem Statement 2",
  "version": "1.0.0",
  "services": {
    "inji_certify": { "configured": false, "service": "Inji Certify / OpenID4VCI Issuer" },
    "inji_wallet": { "configured": false, "service": "Inji Wallet / Mimoto" },
    "inji_verify": { "configured": false, "service": "Inji Verify / OpenID4VP Verifier" }
  },
  "sandbox_mode": true
}
```

---

### 2. `GET /api/config`
Retrieves matrix options, entity capabilities, supported formats, and precalculated interoperability matrix.

**Response `200 OK`**:
```json
{
  "options": {
    "issuers": [...],
    "wallets": [...],
    "verifiers": [...],
    "credential_formats": [...]
  },
  "matrix": [...],
  "environment": {
    "inji_certify_configured": false,
    "inji_wallet_configured": false,
    "inji_verify_configured": false
  }
}
```

---

### 3. `POST /api/test/start`
Starts an interoperability test run for a given triad and credential format.

**Request Body**:
```json
{
  "issuer": "Inji Certify",
  "wallet": "Inji Web",
  "verifier": "Inji Verify",
  "credential_format": "SD-JWT VC",
  "expected_outcome": "PASS"
}
```

**Response `201 Created`**:
```json
{
  "test_id": "8fa2409b-640b-4d4c-a1f7-bc8d4889c2be",
  "status": "COMPLETED",
  "outcome": "PASS",
  "issuer": "Inji Certify",
  "wallet": "Inji Web",
  "verifier": "Inji Verify",
  "credential_format": "SD-JWT VC",
  "steps": [ ... 8 protocol steps ... ]
}
```

---

### 4. `GET /api/test/<test_id>`
Retrieves full details and steps for an existing test session.

**Response `200 OK`**:
Returns test session object.

---

### 5. `GET /api/test/<test_id>/events`
Returns chronological timeline events generated during test execution.

---

### 6. `GET /api/test/<test_id>/report`
Generates an interoperability audit report summarizing OID4VCI/OID4VP compliance.

---

### 7. `POST /api/test/<test_id>/reset`
Resets the session state back to IDLE.
