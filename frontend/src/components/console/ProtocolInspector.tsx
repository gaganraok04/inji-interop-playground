import React, { useState } from 'react';
import { ProtocolStep } from '../../types';
import {
  Code,
  Copy,
  Check,
  Download,
  AlignLeft,
  Info,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface ProtocolInspectorProps {
  step: ProtocolStep | null;
  stepNumber: number;
}

type TabType = 'request' | 'response' | 'headers' | 'raw_json';

export const ProtocolInspector: React.FC<ProtocolInspectorProps> = ({
  step,
  stepNumber,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('response');
  const [copied, setCopied] = useState(false);
  const [formatted, setFormatted] = useState(true);

  if (!step) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-parchment-600 shadow-warm-sm h-full flex flex-col justify-center items-center">
        <Code className="w-8 h-8 mx-auto mb-2 opacity-40 text-copper-700" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-parchment-800">
          PROTOCOL INSPECTOR
        </h3>
        <p className="text-xs text-parchment-600 mt-1">
          Select any protocol step to inspect its request, response, and headers.
        </p>
      </div>
    );
  }

  // Determine what to display based on active tab
  const getPayloadForTab = () => {
    switch (activeTab) {
      case 'request':
        return step.request;
      case 'response':
        return step.response;
      case 'headers':
        return {
          request_headers: step.request_headers || step.request?.headers || {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          response_headers: step.response_headers || {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            Date: step.timestamp ? new Date(step.timestamp).toUTCString() : '—',
            Server: step.is_real ? 'MOSIP-Inji-Live' : 'Inji-Sandbox-Engine',
          },
        };
      case 'raw_json':
      default:
        return {
          step_number: stepNumber,
          step_id: step.step_id,
          name: step.name,
          phase: step.phase,
          method: step.method,
          endpoint: step.endpoint,
          full_url: step.full_url,
          mode: step.mode,
          is_real: step.is_real,
          status: step.status,
          duration_ms: step.duration_ms,
          timestamp: step.timestamp,
          request: step.request,
          response: step.response,
        };
    }
  };

  const payload = getPayloadForTab();
  const jsonString = formatted
    ? JSON.stringify(payload, null, 2)
    : JSON.stringify(payload);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `step-${stepNumber}-${step.step_id}-${activeTab}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: 'request', label: 'Request' },
    { id: 'response', label: 'Response' },
    { id: 'headers', label: 'Headers' },
    { id: 'raw_json', label: 'Raw JSON' },
  ];

  // Render code with developer line numbers
  const lines = jsonString.split('\n');

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-warm-sm flex flex-col h-full">
      {/* Header bar */}
      <div className="px-5 py-3.5 border-b border-parchment-200/80 bg-sand-50/70 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="w-6 h-6 rounded-lg bg-copper-700 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
              #{stepNumber}
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-parchment-900 font-mono">
                  PROTOCOL INSPECTOR
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sand-200 text-parchment-900 font-mono">
                  {step.name}
                </span>
              </div>
              <p className="text-[11px] text-parchment-700 mt-0.5">
                Inspect request, response and details for the selected step.
              </p>
            </div>
          </div>

          {/* Badges: Method, Status, Timing */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-copper-100 border border-copper-300 text-copper-900 font-bold text-[11px]">
              {step.method}
            </span>
            <span
              className={`px-2 py-0.5 rounded border font-semibold text-[11px] ${
                step.status <= 0
                  ? 'bg-sand-200 border-parchment-300 text-parchment-700'
                  : step.status < 400
                  ? 'bg-[#EDF7F1] border-[#B7E4C7] text-[#2D6A4F]'
                  : step.status === 428
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-[#FFE4E6] border-[#FECDD3] text-[#9F1239]'
              }`}
            >
              {step.status <= 0
                ? 'NOT TESTED'
                : `${step.status} ${step.status === 200 ? 'OK' : step.status === 302 ? 'FOUND' : step.status === 428 ? 'AWAITING' : 'ERROR'}`}
            </span>
            {typeof step.duration_ms === 'number' && step.duration_ms > 0 ? (
              <span className="px-2 py-0.5 rounded bg-sand-100 border border-parchment-300 text-copper-800 font-semibold text-[11px]" title="Step duration">
                Duration: {step.duration_ms >= 1000
                  ? `${(step.duration_ms / 1000).toFixed(2)}s`
                  : `${Math.round(step.duration_ms)}ms`}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-sand-50 border border-parchment-200 text-parchment-500 font-normal text-[11px]">
                Duration: —
              </span>
            )}
            {typeof step.http_duration_ms === 'number' && step.http_duration_ms > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-[11px]" title="HTTP round-trip latency">
                HTTP: {Math.round(step.http_duration_ms)}ms
              </span>
            )}
            {step.started_at ? (
              <span className="flex items-center space-x-1 text-parchment-700 bg-cream border border-parchment-300 px-2 py-0.5 rounded text-[11px]" title={`Started: ${step.started_at}`}>
                <Clock className="w-3 h-3 text-copper-600" />
                <span>{new Date(step.started_at).toLocaleTimeString()}</span>
              </span>
            ) : step.timestamp ? (
              <span className="flex items-center space-x-1 text-parchment-700 bg-cream border border-parchment-300 px-2 py-0.5 rounded text-[11px]">
                <Clock className="w-3 h-3 text-copper-600" />
                <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
              </span>
            ) : (
              <span className="text-parchment-400 text-[11px]">Time: —</span>
            )}
          </div>
        </div>

        {/* Error banner if step recorded an error */}
        {step.error && (
          <div className="mt-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-rose-900 text-xs font-mono">
            <strong>Error:</strong> {step.error}
          </div>
        )}

        {/* Endpoint path */}
        <div className="mt-2.5 flex items-center space-x-2 bg-cream px-3 py-1 rounded-lg border border-parchment-300 text-[11px] font-mono text-parchment-800">
          <span className="text-parchment-600 select-none font-medium">Endpoint:</span>
          <span className="font-semibold text-copper-800 break-all">{step.full_url || step.endpoint}</span>
        </div>
      </div>

      {/* Prominent Live Inji vs Sandbox Demo Badge */}
      {step.is_real ? (
        <div className="bg-emerald-50/90 border-b border-emerald-200 px-5 py-1.5 flex items-center justify-between text-xs text-emerald-900 shrink-0">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px]">
              <strong>Live Inji Service Event:</strong> Real OpenID4VCI / OpenID4VP payload.
            </span>
          </div>
          <span className="text-[11px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800">
            Real Inji Stack Event
          </span>
        </div>
      ) : step.status > 0 ? (
        <div className="bg-sand-100/90 border-b border-parchment-300 px-5 py-1.5 flex items-center justify-between text-xs text-parchment-800 shrink-0">
          <div className="flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-copper-700 shrink-0" />
            <span className="text-[11px]">
              <strong>Simulated Data:</strong> OpenID4VCI & OpenID4VP sandbox payload.
            </span>
          </div>
          <span className="text-[11px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-cream border border-parchment-300 text-copper-900">
            Sandbox Simulation
          </span>
        </div>
      ) : (
        <div className="bg-sand-100/90 border-b border-parchment-300 px-5 py-1.5 flex items-center justify-between text-xs text-parchment-700 shrink-0">
          <div className="flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-parchment-500 shrink-0" />
            <span className="text-[11px]">
              <strong>Awaiting Execution:</strong> Start a test or select a recorded execution.
            </span>
          </div>
          <span className="text-[11px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-cream border border-parchment-300 text-parchment-700">
            NOT TESTED
          </span>
        </div>
      )}

      {/* Protocol Dependency Notice if Step 7 or Step 8 is pending */}
      {stepNumber === 7 && step.status === 428 && (
        <div className="bg-amber-50/90 border-b border-amber-200 px-5 py-2 flex items-start space-x-2 text-xs text-amber-900 shrink-0">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>Protocol Dependency (Step 7):</strong> Awaiting issued credential from Step 5 (Credential Response).
            The wallet cannot construct and submit an OpenID4VP Verifiable Presentation without a valid issued Verifiable Credential.
          </span>
        </div>
      )}
      {stepNumber === 8 && step.status === 428 && (
        <div className="bg-amber-50/90 border-b border-amber-200 px-5 py-2 flex items-start space-x-2 text-xs text-amber-900 shrink-0">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>Protocol Dependency (Step 8):</strong> Awaiting VP Token submission from Step 7 before cryptographic verification can execute.
          </span>
        </div>
      )}

      {/* Tab Navigation & Action Toolbar */}
      <div
        role="tablist"
        aria-label="Inspector Tabs"
        className="px-4 py-2 border-b border-parchment-200/80 bg-sand-50/40 flex flex-wrap items-center justify-between gap-2 shrink-0"
      >
        {/* The 4 Tabs: Request, Response, Headers, Raw JSON */}
        <div className="flex items-center space-x-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 ${
                  isActive
                    ? 'bg-copper-700 text-white shadow-warm-sm'
                    : 'text-parchment-700 hover:text-parchment-900 hover:bg-cream/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Copy, Download, Format */}
        <div className="flex items-center space-x-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFormatted(!formatted)}
            className="px-2.5 py-1 rounded-lg border border-parchment-300 bg-cream hover:bg-sand-100 text-parchment-800 flex items-center space-x-1 text-[11px] font-medium transition-colors"
            title="Toggle JSON formatting"
          >
            <AlignLeft className="w-3 h-3 text-copper-700" />
            <span className="hidden sm:inline">{formatted ? 'Compact' : 'Format'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-2.5 py-1 rounded-lg border border-parchment-300 bg-cream hover:bg-sand-100 text-parchment-800 flex items-center space-x-1 text-[11px] font-medium transition-colors"
            title="Download payload as JSON"
          >
            <Download className="w-3 h-3 text-copper-700" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-lg border border-parchment-300 bg-cream hover:bg-sand-100 text-parchment-800 flex items-center space-x-1 text-[11px] font-medium transition-colors"
            title="Copy payload to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-800 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-copper-700" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Developer-style JSON Viewer with Line Numbers and Warm Syntax */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="p-3.5 bg-[#231A12] text-[#F4ECE0] font-mono text-xs overflow-y-auto flex-1 min-h-0"
      >
        <div className="flex min-h-full">
          {/* Line Numbers */}
          <div className="select-none pointer-events-none text-[#A89887] text-right pr-3 border-r border-[#3E2F23] mr-3 space-y-0.5 text-[11px] shrink-0 font-mono">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* JSON Content */}
          <div className="flex-1 overflow-x-auto min-w-0">
            <pre className="whitespace-pre text-[#E8DCC8] leading-tight text-[11px]">
              {jsonString}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
