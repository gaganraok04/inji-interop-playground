import assert from 'node:assert/strict';
import { computeStepStatus } from '../src/components/console/stepStatusHelper.ts';

console.log('Running Step Status and Protocol Dependency Tests (Node.js)...');

// -----------------------------------------------------------------------------
// Test 1: Real Inji Stack 8-Step Completed Flow (e.g. REP-6756EFE0 / d246225f)
// -----------------------------------------------------------------------------
const realSessionSteps = [
  { step_id: 1, name: 'Issuer Discovery', status: 200, response: { issuer: 'https://certify.mosip.net' }, is_real: true },
  { step_id: 2, name: 'PAR Request', status: 201, response: { request_uri: 'urn:ietf:params:oauth:request_uri:123' }, is_real: true },
  { step_id: 3, name: 'Authorization', status: 200, response: { code: 'auth-code-xyz' }, is_real: true },
  { step_id: 4, name: 'Token Exchange', status: 200, response: { access_token: 'tok-abc' }, is_real: true },
  { step_id: 5, name: 'Credential Issuance', status: 200, response: { credential: 'eyJ...' }, is_real: true },
  { step_id: 6, name: 'Verifier Presentation Request', status: 200, response: { client_id: 'verifier-1', nonce: 'nonce-123' }, is_real: true },
  {
    step_id: 7,
    name: 'Direct Post VP Token',
    status: 200,
    request: {
      method: 'POST',
      body: {
        vp_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.dummy_vp',
        presentation_submission: { id: 'submission-1', definition_id: 'def-1' },
      },
    },
    response: { status: 'VP_RECEIVED' },
    is_real: true,
  },
  {
    step_id: 8,
    name: 'Cryptographic Verification',
    status: 200,
    request: { method: 'POST' },
    response: {
      test_passed: true,
      result: 'PASS',
      checks: [
        { name: 'Issuer Signature', status: 'PASS' },
        { name: 'Holder Signature', status: 'PASS' },
        { name: 'Expiration', status: 'PASS' },
      ],
    },
    is_real: true,
  },
];

assert.strictEqual(
  computeStepStatus(realSessionSteps[6], 6, realSessionSteps),
  'COMPLETED',
  'Real session Step 7 with vp_token in request body and HTTP 200 must be COMPLETED (not AWAITING)'
);

assert.strictEqual(
  computeStepStatus(realSessionSteps[7], 7, realSessionSteps),
  'COMPLETED',
  'Real session Step 8 with genuine verification PASS and Step 7 completed must be COMPLETED'
);

console.log('PASS: Real Inji stack completed session properly marks Step 7 and Step 8 as COMPLETED');

// -----------------------------------------------------------------------------
// Test 2: Simulated Mode 8-Step Completed Flow
// -----------------------------------------------------------------------------
const simSessionSteps = [
  { step_id: 1, name: 'Issuer Discovery', status: 200, response: {}, is_real: false },
  { step_id: 2, name: 'PAR Request', status: 201, response: {}, is_real: false },
  { step_id: 3, name: 'Authorization', status: 200, response: {}, is_real: false },
  { step_id: 4, name: 'Token Exchange', status: 200, response: {}, is_real: false },
  { step_id: 5, name: 'Credential Issuance', status: 200, response: { credential: 'mock_cred' }, is_real: false },
  { step_id: 6, name: 'Verifier Presentation Request', status: 200, response: {}, is_real: false },
  {
    step_id: 7,
    name: 'Direct Post VP Token',
    status: 200,
    request: {
      body: {
        vp_token: 'mock_vp_token',
      },
    },
    response: { status: 'VP_RECEIVED' },
    is_real: false,
  },
  {
    step_id: 8,
    name: 'Cryptographic Verification',
    status: 200,
    response: {
      test_passed: true,
      result: 'PASS',
    },
    is_real: false,
  },
];

assert.strictEqual(
  computeStepStatus(simSessionSteps[6], 6, simSessionSteps),
  'COMPLETED',
  'Simulation Step 7 must NOT be forced to AWAITING_CREDENTIAL when VP token is present'
);

assert.strictEqual(
  computeStepStatus(simSessionSteps[7], 7, simSessionSteps),
  'COMPLETED',
  'Simulation Step 8 must be COMPLETED when verification is positive and Step 7 is complete'
);

console.log('PASS: Simulation completed session properly marks Step 7 and Step 8 as COMPLETED');

// -----------------------------------------------------------------------------
// Test 3: Step 7 when Step 5 (Issuance) is Pending / Awaiting Authorization
// -----------------------------------------------------------------------------
const pendingIssuanceSteps = [
  { step_id: 1, name: 'Issuer Discovery', status: 200, response: {} },
  { step_id: 2, name: 'PAR Request', status: 201, response: {} },
  { step_id: 3, name: 'Authorization', status: 'AWAITING_AUTHORIZATION', response: {} },
  { step_id: 4, name: 'Token Exchange', status: null, response: {} },
  { step_id: 5, name: 'Credential Issuance', status: null, response: {} },
  { step_id: 6, name: 'Verifier Presentation Request', status: null, response: {} },
  {
    step_id: 7,
    name: 'Direct Post VP Token',
    status: 428,
    request: {},
    response: { status: 'AWAITING_CREDENTIAL', error: 'Precondition Required: Credential not yet issued' },
  },
  {
    step_id: 8,
    name: 'Cryptographic Verification',
    status: 428,
    response: { status: 'PENDING_VERIFICATION', result: 'PENDING' },
  },
];

assert.strictEqual(
  computeStepStatus(pendingIssuanceSteps[6], 6, pendingIssuanceSteps),
  'AWAITING_CREDENTIAL',
  'Step 7 must report AWAITING_CREDENTIAL when Step 5 credential is not yet issued'
);

assert.strictEqual(
  computeStepStatus(pendingIssuanceSteps[7], 7, pendingIssuanceSteps),
  'PENDING_VERIFICATION',
  'Step 8 must report PENDING_VERIFICATION (not PASS!) when Step 7 is pending and Step 8 is HTTP 428'
);

const unexecutedStep = { step_id: 8, status: null, response: {} };
assert.strictEqual(
  computeStepStatus(unexecutedStep, 7, pendingIssuanceSteps),
  'WAITING',
  'Unexecuted Step 8 with null status must report WAITING'
);

console.log('PASS: Dependent steps accurately show AWAITING_CREDENTIAL and PENDING_VERIFICATION');

// -----------------------------------------------------------------------------
// Test 4: False PASS Prevention — Step 8 reports HTTP 200 but verifier returned FAIL
// -----------------------------------------------------------------------------
const failedVerificationSteps = [
  ...realSessionSteps.slice(0, 7),
  {
    step_id: 8,
    name: 'Cryptographic Verification',
    status: 200, // HTTP transport succeeded
    response: {
      test_passed: false, // Verification failed!
      result: 'FAIL',
      error: 'Signature cryptographic check failed: invalid proof',
    },
  },
];

assert.strictEqual(
  computeStepStatus(failedVerificationSteps[7], 7, failedVerificationSteps),
  'FAILED',
  'Step 8 must report FAILED when verifier response is FAIL, regardless of HTTP 200'
);

console.log('PASS: HTTP 200 does not falsely produce PASS when verification check fails');

// -----------------------------------------------------------------------------
// Test 5: False PASS Prevention — Step 8 reports HTTP 200 but Step 7 was skipped or failed
// -----------------------------------------------------------------------------
const brokenChainSteps = [
  ...realSessionSteps.slice(0, 6),
  {
    step_id: 7,
    name: 'Direct Post VP Token',
    status: 400,
    error: 'Bad Request',
  },
  {
    step_id: 8,
    name: 'Cryptographic Verification',
    status: 200,
    response: {
      test_passed: true, // Should be rejected because prerequisite Step 7 failed
      result: 'PASS',
    },
  },
];

assert.notStrictEqual(
  computeStepStatus(brokenChainSteps[7], 7, brokenChainSteps),
  'COMPLETED',
  'Step 8 must not be COMPLETED if prerequisite Step 7 failed'
);

console.log('PASS: Step 8 enforces dependency on successful Step 7 completion');

// -----------------------------------------------------------------------------
// Test 6: Inconclusive / Missing verification payload with HTTP 200
// -----------------------------------------------------------------------------
const emptyResponseStep8 = [
  ...realSessionSteps.slice(0, 7),
  {
    step_id: 8,
    name: 'Cryptographic Verification',
    status: 200,
    response: {}, // Empty response with no positive verdict
  },
];

assert.strictEqual(
  computeStepStatus(emptyResponseStep8[7], 7, emptyResponseStep8),
  'FAILED',
  'Step 8 without verified positive result must not be marked COMPLETED'
);

console.log('PASS: Inconclusive Step 8 response with HTTP 200 defaults to FAILED rather than false PASS');

console.log('\nALL STEP STATUS TESTS PASSED (EXIT CODE 0).');
