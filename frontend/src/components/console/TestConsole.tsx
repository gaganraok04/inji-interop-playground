import React from 'react';
import {
  IssuerOption,
  WalletOption,
  VerifierOption,
  CredentialFormat,
  TestResultOutcome,
  TestSession,
  InteropMatrixItem,
  HealthStatus,
  ProtocolStep,
  StepExecutionStatus,
  ConsoleView,
} from '../../types';
import { ConsoleHeader } from './ConsoleHeader';
import { TriadConfiguration } from './TriadConfiguration';
import { ProtocolFlow } from './ProtocolFlow';
import { SequenceFlow } from './SequenceFlow';
import { ProtocolInspector } from './ProtocolInspector';
import { TestResultPanel } from './TestResultPanel';
import { QuickPresetsSection } from './QuickPresetsSection';
import { ProtocolFlowPage } from './ProtocolFlowPage';
import { MatrixPage, MatrixRowConfig } from './MatrixPage';

interface TestConsoleProps {
  onBackToLanding: () => void;
  activeView: ConsoleView;
  onSelectView: (view: ConsoleView) => void;
  health: HealthStatus | null;
  healthLoading: boolean;
  healthError?: string | null;
  onRefreshHealth: () => void;
  // Configuration
  issuer: IssuerOption;
  setIssuer: (val: IssuerOption) => void;
  wallet: WalletOption;
  setWallet: (val: WalletOption) => void;
  verifier: VerifierOption;
  setVerifier: (val: VerifierOption) => void;
  format: CredentialFormat;
  setFormat: (val: CredentialFormat) => void;
  scenario: TestResultOutcome;
  setScenario: (val: TestResultOutcome) => void;
  executionMode: 'animated' | 'instant';
  setExecutionMode: (val: 'animated' | 'instant') => void;
  // Execution
  onStartTest: () => void;
  onResetTest: () => void;
  isLoading: boolean;
  testSession: TestSession | null;
  steps: ProtocolStep[];
  selectedStepIndex: number;
  onSelectStep: (idx: number) => void;
  stepStatuses: StepExecutionStatus[];
  matrix: InteropMatrixItem[];
  onSelectMatrixRow: (config: MatrixRowConfig) => void;
}

export const TestConsole: React.FC<TestConsoleProps> = ({
  onBackToLanding,
  activeView,
  onSelectView,
  health,
  healthLoading,
  healthError,
  onRefreshHealth,
  issuer,
  setIssuer,
  wallet,
  setWallet,
  verifier,
  setVerifier,
  format,
  setFormat,
  scenario,
  setScenario,
  executionMode,
  setExecutionMode,
  onStartTest,
  onResetTest,
  isLoading,
  testSession,
  steps,
  selectedStepIndex,
  onSelectStep,
  stepStatuses,
  matrix,
  onSelectMatrixRow,
}) => {
  return (
    <div className="min-h-screen bg-parchment-100 text-parchment-900 flex flex-col font-sans selection:bg-copper-100 selection:text-copper-900">
      {/* Console Header with Brand Logo (Home link), Views [Test Console | Protocol Flow | Matrix], and API Status */}
      <ConsoleHeader
        onNavigateHome={onBackToLanding}
        activeView={activeView}
        onSelectView={onSelectView}
        health={health}
        healthLoading={healthLoading}
        healthError={healthError}
        onRefreshHealth={onRefreshHealth}
      />

      {/* View Switcher Content */}
      {activeView === 'protocol-flow' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <ProtocolFlowPage
            steps={steps}
            issuer={issuer}
            wallet={wallet}
            verifier={verifier}
            testSession={testSession}
            stepStatuses={stepStatuses}
            selectedStepIndex={selectedStepIndex}
            onSelectStep={onSelectStep}
          />
        </main>
      )}

      {activeView === 'matrix' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <MatrixPage
            matrix={matrix}
            activeTestId={testSession?.test_id}
            onSelectRow={(config: MatrixRowConfig) => {
              onSelectMatrixRow(config);
              if (!config.targetView) {
                onSelectView('console');
              } else {
                onSelectView(config.targetView);
              }
            }}
          />
        </main>
      )}

      {activeView === 'console' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* 1. Quick Triad Configuration Glass Card */}
          <TriadConfiguration
            issuer={issuer}
            setIssuer={setIssuer}
            wallet={wallet}
            setWallet={setWallet}
            verifier={verifier}
            setVerifier={setVerifier}
            format={format}
            setFormat={setFormat}
            scenario={scenario}
            setScenario={setScenario}
            executionMode={executionMode}
            setExecutionMode={setExecutionMode}
            onStartTest={onStartTest}
            onResetTest={onResetTest}
            isLoading={isLoading}
            hasActiveTest={!!testSession}
          />

          {/* 2. Main Workspace: 3-Column Desktop Layout
              - LEFT: Vertical Protocol Flow (8 stages with number, icon, title, method/endpoint, status)
              - CENTER: Live Interaction Flow (Inji Certify -> Inji Web -> Inji Verify message vector flow)
              - RIGHT: Protocol Inspector (Request, Response, Headers, Raw JSON with syntax viewer)
          */}
          <section aria-label="Main Protocol Workspace" className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
            {/* Left Column: Vertical Protocol Execution Flow */}
            <div className="min-w-0 h-full flex flex-col">
              <ProtocolFlow
                steps={steps}
                selectedStepIndex={selectedStepIndex}
                onSelectStep={onSelectStep}
                stepStatuses={stepStatuses}
                isRunning={isLoading}
              />
            </div>

            {/* Center Column: Live Interaction Sequence Flow */}
            <div className="min-w-0 h-full flex flex-col">
              <SequenceFlow
                issuer={issuer}
                wallet={wallet}
                verifier={verifier}
                steps={steps}
                stepStatuses={stepStatuses}
                selectedStepIndex={selectedStepIndex}
                onSelectStep={onSelectStep}
                isRunning={isLoading}
              />
            </div>

            {/* Right Column: Protocol Inspector */}
            <div className="min-w-0 h-full flex flex-col">
              <ProtocolInspector
                step={steps[selectedStepIndex] || null}
                stepNumber={selectedStepIndex + 1}
              />
            </div>
          </section>

          {/* 3. Dedicated Sandbox Test Result Panel */}
          <section aria-label="Test Results">
            <TestResultPanel
              testSession={testSession}
              isRunning={isLoading}
              onRunAgain={onStartTest}
              issuer={issuer}
              wallet={wallet}
              verifier={verifier}
              format={format}
            />
          </section>

          {/* 4. Quick Test Presets (Replaces duplicate full matrix) */}
          <section aria-label="Quick Test Presets">
            <QuickPresetsSection
              onApplyPreset={onSelectMatrixRow}
              onOpenFullMatrix={() => onSelectView('matrix')}
            />
          </section>
        </main>
      )}

      {/* Console Footer */}
      <footer className="border-t border-parchment-300 bg-cream py-6 text-xs text-parchment-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-parchment-900">Inji Interoperability Playground</span>
            <span>•</span>
            <span>MOSIP Decode 2026 Problem Statement 2</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px] text-parchment-600">
            <span>OpenID4VCI & OpenID4VP Sandbox</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
