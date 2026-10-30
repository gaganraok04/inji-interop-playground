import {
  HealthStatus,
  TestSession,
  TestEvent,
  TestReport,
  IssuerOption,
  WalletOption,
  VerifierOption,
  CredentialFormat,
  TestResultOutcome,
  InteropMatrixItem,
} from '../types';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Health check failed with status: ${res.status}`);
    }
    return res.json();
  },

  async getConfig(): Promise<{
    options: Record<string, any>;
    matrix: InteropMatrixItem[];
    environment: Record<string, any>;
  }> {
    const res = await fetch(`${API_BASE}/api/config`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to load playground configuration: ${res.status}`);
    }
    return res.json();
  },

  async startTest(payload: {
    issuer: IssuerOption;
    wallet: WalletOption;
    verifier: VerifierOption;
    credential_format: CredentialFormat;
    expected_outcome: TestResultOutcome;
  }): Promise<TestSession> {
    const res = await fetch(`${API_BASE}/api/test/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to start test session: ${res.statusText}`);
    }
    return res.json();
  },

  async getTest(testId: string): Promise<TestSession> {
    const res = await fetch(`${API_BASE}/api/test/${encodeURIComponent(testId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to get test session ${testId}: ${res.status}`);
    }
    return res.json();
  },

  async getTestEvents(testId: string): Promise<{ test_id: string; total_events: number; events: TestEvent[] }> {
    const res = await fetch(`${API_BASE}/api/test/${encodeURIComponent(testId)}/events`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch test events: ${res.status}`);
    }
    return res.json();
  },

  async getTestReport(testId: string): Promise<TestReport> {
    const res = await fetch(`${API_BASE}/api/test/${encodeURIComponent(testId)}/report`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to generate test report: ${res.status}`);
    }
    return res.json();
  },

  async resetTest(testId: string): Promise<{ message: string; test: TestSession }> {
    const res = await fetch(`${API_BASE}/api/test/${encodeURIComponent(testId)}/reset`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Failed to reset test: ${res.status}`);
    }
    return res.json();
  },

  async listTests(): Promise<{ total: number; tests: TestSession[] }> {
    const res = await fetch(`${API_BASE}/api/tests`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to list tests: ${res.status}`);
    }
    return res.json();
  },

  async getMatrix(): Promise<{
    total: number;
    tested_combinations_count?: number;
    matrix: InteropMatrixItem[];
    tested_matrix?: InteropMatrixItem[];
    live_tests_count: number;
    latest_test_id?: string | null;
    latest_updated_at?: string | null;
  }> {
    const res = await fetch(`${API_BASE}/api/matrix`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to load matrix: ${res.status}`);
    }
    return res.json();
  },
};
