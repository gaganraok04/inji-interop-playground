export type IssuerOption = 'Inji Certify' | 'External OpenID4VCI Issuer';
export type WalletOption = 'Inji Web' | 'Inji Wallet' | 'External Wallet';
export type VerifierOption = 'Inji Verify' | 'External OpenID4VP Verifier';
export type CredentialFormat = 'W3C VC' | 'SD-JWT VC';
export type TestResultOutcome = 'PASS' | 'FAIL' | 'VALID' | 'INVALID' | 'VALID BUT EXPIRED' | 'PENDING';

export type StepExecutionStatus =
  | 'PENDING'
  | 'WAITING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'AWAITING_AUTHORIZATION'
  | 'PENDING_TOKEN'
  | 'PENDING_CREDENTIAL'
  | 'AWAITING_CREDENTIAL'
  | 'PENDING_VERIFICATION';

export type ConsoleView = 'console' | 'protocol-flow' | 'matrix';

export interface ProtocolStep {
  step_id: string;
  name: string;
  phase: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | string;
  endpoint: string;
  status: number;
  timestamp: string;
  request: Record<string, any>;
  response: Record<string, any>;
  request_headers?: Record<string, string>;
  response_headers?: Record<string, string>;
  sender?: 'issuer' | 'wallet' | 'verifier' | 'certify' | 'verify';
  receiver?: 'issuer' | 'wallet' | 'verifier' | 'certify' | 'verify';
  senderLabel?: string;
  receiverLabel?: string;
  executionStatus?: StepExecutionStatus;
  is_real?: boolean;
  mode?: string;
  full_url?: string;
  duration_ms?: number;
  http_duration_ms?: number;
  waiting_duration_ms?: number;
  started_at?: string;
  completed_at?: string;
  error?: string | null;
}

export interface TestSession {
  test_id: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string | null;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'RESET' | 'AWAITING_AUTHORIZATION' | 'AWAITING_CREDENTIAL' | 'PENDING_VERIFICATION' | 'AUTHORIZATION_FAILED' | string;
  issuer: IssuerOption;
  wallet: WalletOption;
  verifier: VerifierOption;
  credential_format: CredentialFormat;
  expected_outcome: TestResultOutcome;
  current_step_index: number;
  total_steps: number;
  completed_steps_count?: number;
  pending_steps_count?: number;
  steps: ProtocolStep[];
  outcome: TestResultOutcome | null;
  credential_validity?: string | null;
  verifier_result?: string | null;
  error?: string | null;
  is_simulation: boolean;
  is_real_stack?: boolean;
  note: string;
  duration_ms?: number;
  step_durations_ms?: Record<string, number>;
  authorization_url?: string;
  redirect_uri?: string;
}

export interface TestEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  message: string;
  payload?: Record<string, any>;
}

export interface TestReport {
  report_id: string;
  test_id: string;
  generated_at: string;
  started_at?: string;
  completed_at?: string | null;
  last_updated_at?: string;
  duration_ms?: number;
  completed_steps_count?: number;
  pending_steps_count?: number;
  summary: {
    issuer: string;
    wallet: string;
    verifier: string;
    credential_format: string;
    expected_scenario?: string;
    credential_validity?: string;
    verifier_result?: string;
    final_verdict: TestResultOutcome;
    total_protocol_steps: number;
    steps_completed?: number;
    total_duration_ms?: number;
    started_at?: string;
    completed_at?: string | null;
    last_updated_at?: string;
    completed_steps_count?: number;
    pending_steps_count?: number;
    is_sandbox_simulation: boolean;
  };
  standards_compliance: Array<{
    standard: string;
    status: string;
    covered_steps: string[];
  }>;
  step_audit: Array<{
    step_name: string;
    endpoint: string;
    method: string;
    http_status: number;
    duration_ms?: number;
    http_duration_ms?: number;
    started_at?: string;
    completed_at?: string;
    error?: string | null;
    result: string;
  }>;
  disclaimer: string;
}

export interface MatrixExecutionRecord {
  test_id: string;
  report_id: string;
  verdict: 'PASS' | 'FAIL' | 'ERROR' | 'RUNNING' | 'NOT TESTED' | string;
  execution_state?: 'COMPLETED' | 'ERROR' | 'RUNNING' | 'INCOMPLETE' | string;
  outcome?: string | null;
  credential_validity?: string | null;
  verifier_result?: string | null;
  expected_outcome?: string | null;
  status: string;
  is_real_stack: boolean;
  is_simulation: boolean;
  is_completed?: boolean;
  is_running?: boolean;
  is_incomplete?: boolean;
  duration_ms: number;
  created_at?: string;
  updated_at?: string;
}

export interface InteropMatrixItem {
  id: string;
  issuer: string;
  wallet: string;
  verifier: string;
  format: string;
  result: TestResultOutcome | string;
  credential_validity?: string | null;
  verifier_result?: string | null;
  expected_outcome?: string | null;
  status: 'PASS' | 'FAIL' | 'PENDING' | 'RUNNING' | 'ERROR' | 'NOT_TESTED' | 'NOT TESTED' | string;
  display_status?: 'PASS' | 'FAIL' | 'RUNNING' | 'ERROR' | 'NOT TESTED' | string;
  latest_verdict?: 'PASS' | 'FAIL' | 'RUNNING' | 'ERROR' | 'NOT TESTED' | string;
  is_demo_entry: boolean;
  is_real_stack?: boolean;
  is_simulation?: boolean;
  mode?: 'REAL_INJI_STACK' | 'SIMULATION' | 'NOT_TESTED' | string;
  test_id?: string | null;
  report_id?: string | null;
  raw_status?: string;
  attempt_count?: number;
  completed_count?: number;
  incomplete_count?: number;
  error_count?: number;
  execution_count?: number;
  real_attempt_count?: number;
  real_completed_count?: number;
  real_execution_count?: number;
  real_pass_count?: number;
  real_fail_count?: number;
  real_running_count?: number;
  real_incomplete_count?: number;
  real_error_count?: number;
  simulation_attempt_count?: number;
  simulation_completed_count?: number;
  simulation_execution_count?: number;
  simulation_pass_count?: number;
  simulation_fail_count?: number;
  simulation_running_count?: number;
  simulation_incomplete_count?: number;
  simulation_error_count?: number;
  pass_count?: number;
  fail_count?: number;
  running_count?: number;
  latest_executed_at?: string | null;
  duration_ms?: number;
  latest_attempt_id?: string | null;
  latest_attempt_report_id?: string | null;
  latest_attempt_status?: string | null;
  latest_attempt_state?: string | null;
  latest_attempt_at?: string | null;
  latest_completed_id?: string | null;
  latest_completed_report_id?: string | null;
  latest_completed_at?: string | null;
  executions?: MatrixExecutionRecord[];
}

export interface HealthStatus {
  status: string;
  project: string;
  hackathon: string;
  version: string;
  timestamp: string;
  services: {
    inji_certify: { configured: boolean; url: string; service: string; status?: string };
    inji_wallet: { configured: boolean; wallet_url: string; mimoto_url: string; service: string; status?: string };
    inji_verify: { configured: boolean; url: string; service: string; status?: string };
  };
  sandbox_mode: boolean;
  real_stack_connected?: boolean;
  real_stack_configured?: boolean;
  runtime_mode?: 'REAL_INJI_STACK' | 'REAL_INJI_STACK_ONLINE' | 'REAL_INJI_STACK_OFFLINE' | 'SANDBOX_MODE' | string;
  runtime_label?: string;
  disclaimer: string;
}

export type PageRoute = 'landing' | 'console';
