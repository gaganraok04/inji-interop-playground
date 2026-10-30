import React, { useState } from 'react';
import { TestReport } from '../../types';
import { X, CheckCircle2, Download, Copy, Check, ShieldAlert } from 'lucide-react';

interface ReportModalProps {
  report: TestReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  const jsonReport = JSON.stringify(report, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonReport], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${report.report_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-parchment-900/40 backdrop-blur-sm">
      <div className="bg-cream border border-parchment-300 rounded-2xl shadow-warm-lg max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-parchment-200 bg-sand-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-copper-600" />
            <h3 className="text-base font-bold text-parchment-900">
              Interoperability Audit Report ({report.report_id})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-parchment-600 hover:text-parchment-900 hover:bg-sand-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-parchment-800">
          {/* Summary Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-sand-50 border border-parchment-200">
              <span className="text-[10px] text-parchment-500 uppercase font-mono">Issuer</span>
              <div className="font-bold text-parchment-900 mt-0.5 truncate">{report.summary.issuer}</div>
            </div>
            <div className="p-3 rounded-lg bg-sand-50 border border-parchment-200">
              <span className="text-[10px] text-parchment-500 uppercase font-mono">Wallet</span>
              <div className="font-bold text-parchment-900 mt-0.5 truncate">{report.summary.wallet}</div>
            </div>
            <div className="p-3 rounded-lg bg-sand-50 border border-parchment-200">
              <span className="text-[10px] text-parchment-500 uppercase font-mono">Verifier</span>
              <div className="font-bold text-parchment-900 mt-0.5 truncate">{report.summary.verifier}</div>
            </div>
            <div className="p-3 rounded-lg bg-sand-50 border border-parchment-200">
              <span className="text-[10px] text-parchment-500 uppercase font-mono">Expected Scenario</span>
              <div className="font-bold text-copper-800 mt-0.5">{report.summary.expected_scenario || 'PASS'}</div>
            </div>
            <div className="p-3 rounded-lg bg-sand-50 border border-parchment-200">
              <span className="text-[10px] text-parchment-500 uppercase font-mono">Credential Validity</span>
              <div className="font-bold text-parchment-900 mt-0.5">{report.summary.credential_validity || 'VALID'}</div>
            </div>
            <div className="p-3 rounded-lg bg-sand-50 border border-parchment-200">
              <span className="text-[10px] text-parchment-500 uppercase font-mono">Test Verdict</span>
              <div className={`font-bold mt-0.5 ${report.summary.final_verdict === 'PASS' ? 'text-emerald-800' : 'text-rose-800'}`}>
                {report.summary.final_verdict}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-sand-50 border border-parchment-200">
              <span className="text-[10px] text-parchment-500 uppercase font-mono">Started / Elapsed</span>
              <div className="font-bold text-parchment-900 mt-0.5 font-mono">
                {report.started_at ? new Date(report.started_at).toLocaleTimeString() : '—'}
                {typeof report.duration_ms === 'number' && report.duration_ms > 0 ? ` (${(report.duration_ms / 1000).toFixed(2)}s)` : ''}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-sand-50 border border-parchment-200">
              <span className="text-[10px] text-parchment-500 uppercase font-mono">Completed Steps</span>
              <div className="font-bold text-emerald-800 mt-0.5 font-mono">
                {report.completed_steps_count ?? report.summary.steps_completed ?? 0} / {report.summary.total_protocol_steps ?? 8}
              </div>
            </div>
          </div>

          {/* Step Audit Breakdown if available */}
          {report.step_audit && report.step_audit.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-copper-800">
                Protocol Steps Execution Audit
              </h4>
              <div className="border border-parchment-200 rounded-lg overflow-hidden bg-white text-[11px] font-mono">
                <table className="w-full text-left">
                  <thead className="bg-sand-100 text-parchment-700 text-[10px] uppercase">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Step</th>
                      <th className="p-2">Method & Endpoint</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Duration</th>
                      <th className="p-2">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-parchment-100">
                    {report.step_audit.map((step, idx) => (
                      <tr key={idx} className="hover:bg-sand-50">
                        <td className="p-2 text-parchment-500">{idx + 1}</td>
                        <td className="p-2 font-sans font-bold text-parchment-900">{step.step_name}</td>
                        <td className="p-2 text-parchment-700 truncate max-w-[200px]">{step.method} {step.endpoint}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            step.http_status > 0 && step.http_status < 400
                              ? 'bg-emerald-100 text-emerald-800'
                              : step.http_status === 428
                              ? 'bg-amber-100 text-amber-800'
                              : step.http_status > 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-sand-100 text-parchment-600'
                          }`}>
                            {step.http_status > 0 ? step.http_status : '—'}
                          </span>
                        </td>
                        <td className="p-2 text-parchment-600">
                          {typeof step.duration_ms === 'number' && step.duration_ms > 0
                            ? `${Math.round(step.duration_ms)}ms`
                            : '—'}
                        </td>
                        <td className="p-2">
                          <span className={`font-bold ${step.result === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {step.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Standards Compliance List */}
          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-copper-800">
              Standards Conformance Audit
            </h4>
            <div className="space-y-1.5">
              {report.standards_compliance.map((sc, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-sand-100/70 border border-parchment-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold font-mono">{sc.standard}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cream border border-parchment-300 font-semibold text-emerald-800">
                    {sc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Type Disclaimer Box */}
          {report.summary.is_sandbox_simulation === false ? (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start space-x-2 text-[11px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase tracking-wider text-[10px] block text-emerald-800 font-mono mb-0.5">
                  LIVE MOSIP INJI STACK AUDIT
                </span>
                <span>{report.disclaimer}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-sand-100 border border-parchment-300 text-parchment-700 flex items-start space-x-2 text-[11px]">
              <ShieldAlert className="w-4 h-4 text-copper-700 shrink-0 mt-0.5" />
              <span>{report.disclaimer}</span>
            </div>
          )}

          {/* Raw JSON View */}
          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-copper-800">
              Full Audit JSON Document
            </h4>
            <div className="p-3 bg-[#231A12] text-[#E5DEC9] rounded-lg font-mono text-[11px] max-h-48 overflow-y-auto">
              <pre>{jsonReport}</pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-parchment-200 bg-sand-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg border border-parchment-300 bg-cream hover:bg-sand-100 text-parchment-800 text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-copper-700" />
                <span>Copy JSON</span>
              </>
            )}
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-lg bg-copper-600 hover:bg-copper-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-parchment-300 bg-sand-100 hover:bg-sand-200 text-parchment-800 text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
