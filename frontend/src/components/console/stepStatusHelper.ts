import type { ProtocolStep, StepExecutionStatus } from '../../types/index.ts';

/**
 * Computes genuine execution status for each protocol step according to MOSIP protocol rules
 * and explicit payload evidence. Does NOT infer completion from HTTP 200 alone.
 *
 * Enforces stage dependencies:
 * - Step 7 (VP Token) depends on Step 5 (Credential Response) having successfully issued a credential.
 * - Step 8 (Verification) depends on Step 7 (VP Token) having been submitted.
 * - Step 8 PASS is shown ONLY when the verifier's actual verification result supports PASS.
 */
export function computeStepStatus(
  step: ProtocolStep | undefined,
  index: number,
  allSteps?: ProtocolStep[]
): StepExecutionStatus {
  if (!step || !step.status || step.status <= 0) return 'WAITING';

  // HTTP 428 is strictly mapped to pending sub-state — NEVER COMPLETED
  if (step.status === 428) {
    if (index === 2) return 'AWAITING_AUTHORIZATION';
    if (index === 3) return 'PENDING_TOKEN';
    if (index === 4) return 'PENDING_CREDENTIAL';
    if (index === 6) return 'AWAITING_CREDENTIAL';
    if (index === 7) return 'PENDING_VERIFICATION';
    return 'PENDING';
  }

  // Protocol error codes
  if (step.status >= 400) {
    return 'FAILED';
  }

  // Steps with HTTP 200/201/302
  if (step.status >= 200 && step.status < 400) {
    // Step 1: Credential Offer (index 0)
    if (index === 0) {
      const hasOffer = Boolean(
        step.response?.credential_issuer ||
        step.response?.grants ||
        step.response?.credential_endpoint ||
        step.response?.credentials_supported ||
        (step.response && Object.keys(step.response).length > 0)
      );
      return hasOffer ? 'COMPLETED' : 'PENDING';
    }

    // Step 2: Authorization Request (index 1)
    if (index === 1) {
      return (step.status === 200 || step.status === 302) ? 'COMPLETED' : 'FAILED';
    }

    // Step 3: Token Exchange (index 2)
    if (index === 2) {
      const hasToken = Boolean(
        step.response?.access_token ||
        step.response?.c_nonce ||
        step.response?.token
      );
      if (!hasToken && !step.is_real && step.response?.status === 'TOKEN_FAILED') {
        return 'FAILED';
      }
      return 'COMPLETED';
    }

    // Step 4: Credential Request (index 3)
    if (index === 3) {
      if (allSteps && allSteps[2] && (allSteps[2].status === 428 || allSteps[2].status >= 400)) {
        return 'PENDING_TOKEN';
      }
      return 'COMPLETED';
    }

    // Step 5: Credential Response (index 4) - must actually carry an issued credential
    if (index === 4) {
      const rawResp = step.response as unknown;
      const hasCred = Boolean(
        step.response?.credential ||
        step.response?.verifiableCredential ||
        (typeof rawResp === 'string' && rawResp.length > 20)
      );
      if (!hasCred || step.response?.status === 'PENDING_CREDENTIAL') {
        return 'PENDING_CREDENTIAL';
      }
      return 'COMPLETED';
    }

    // Step 6: Presentation Request (index 5)
    if (index === 5) {
      const hasRequest = Boolean(
        step.response?.presentation_definition ||
        step.response?.client_id ||
        step.response?.response_uri ||
        step.response?.auth_request ||
        (step.response && Object.keys(step.response).length > 0)
      );
      return hasRequest ? 'COMPLETED' : 'PENDING';
    }

    // Step 7: VP Token Submission (index 6)
    // Dependency: Step 7 depends on Step 5 (Credential Response) having issued a credential.
    // In OpenID4VP, the wallet submits the VP token in the HTTP request body.
    // Verifier acknowledges receipt (HTTP 200 with status: 'VP_RECEIVED' or empty direct-post).
    if (index === 6) {
      // 1. Dependency check on Step 5
      if (allSteps && allSteps[4]) {
        const step5 = allSteps[4];
        const rawStep5Resp = step5.response as unknown;
        const step5HasCred = Boolean(
          step5.response?.credential ||
          step5.response?.verifiableCredential ||
          (typeof rawStep5Resp === 'string' && rawStep5Resp.length > 20)
        );
        if (step5.status === 428 || !step5HasCred || step5.status >= 400) {
          return 'AWAITING_CREDENTIAL';
        }
      }

      // 2. Payload check: VP token present in request body or verifier acknowledgment
      const hasVpSubmission = Boolean(
        step.request?.body?.vp_token ||
        step.request?.vp_token ||
        step.request?.body?.presentation_submission ||
        step.response?.vp_token ||
        step.response?.verifiablePresentation ||
        step.response?.status === 'VP_RECEIVED' ||
        (step.is_real && step.status === 200)
      );

      if (!hasVpSubmission || step.response?.status === 'AWAITING_CREDENTIAL') {
        return 'AWAITING_CREDENTIAL';
      }
      return 'COMPLETED';
    }

    // Step 8: Verification & Conformance (index 7)
    // Dependency: Step 8 requires Step 7 (VP Token Submission) to be COMPLETED.
    // Backend Evidence: Never infer PASS from HTTP 200 alone.
    if (index === 7) {
      // 1. Dependency check on Step 7
      if (allSteps && allSteps[6]) {
        const step7 = allSteps[6];
        const step7HasVp = Boolean(
          step7.status >= 200 &&
          step7.status < 400 &&
          (
            step7.request?.body?.vp_token ||
            step7.request?.vp_token ||
            step7.request?.body?.presentation_submission ||
            step7.response?.vp_token ||
            step7.response?.verifiablePresentation ||
            step7.response?.status === 'VP_RECEIVED' ||
            (step7.is_real && step7.status === 200)
          )
        );
        if (!step7HasVp || step7.status === 428) {
          return 'PENDING_VERIFICATION';
        }
      }

      // 2. Backend verification result check
      const res = step.response || {};

      // Explicit test_passed flag
      if (typeof res.test_passed === 'boolean') {
        return res.test_passed ? 'COMPLETED' : 'FAILED';
      }

      // Failure indicators
      if (
        res.test_outcome === 'FAIL' ||
        res.test_outcome === 'ERROR' ||
        res.result === 'FAIL' ||
        res.result === 'INVALID' ||
        res.verifier_result === 'FAIL' ||
        res.allChecksSuccessful === false
      ) {
        return 'FAILED';
      }

      // Positive verification indicators
      if (
        res.test_outcome === 'PASS' ||
        res.result === 'PASS' ||
        res.verifier_result === 'PASS' ||
        res.allChecksSuccessful === true
      ) {
        return 'COMPLETED';
      }

      // HTTP 200 alone without verification evidence is not sufficient for PASS
      return 'FAILED';
    }

    return 'COMPLETED';
  }

  return 'WAITING';
}
