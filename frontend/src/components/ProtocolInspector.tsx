import React, { useState } from 'react';
import { ProtocolStep } from '../types';
import {
  Code,
  Copy,
  Check,
  Info,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface ProtocolInspectorProps {
  step: ProtocolStep | null;
  stepNumber: number;
}

export const ProtocolInspector: React.FC<ProtocolInspectorProps> = ({
  step,
  stepNumber,
}) => {
  const [activeTab, setActiveTab] = useState<'response' | 'request'>('response');
  const [copied, setCopied] = useState(false);

  if (!step) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500">
        <Code className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select a protocol step from the timeline above to inspect its details.</p>
      </div>
    );
  }

  const payloadToDisplay = activeTab === 'request' ? step.request : step.response;
  const jsonString = JSON.stringify(payloadToDisplay, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'POST':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  const getStatusBadgeClass = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    }
    if (status >= 300 && status < 400) {
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-800';
    }
    return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="w-6 h-6 rounded-md bg-sky-600 text-white font-bold text-xs flex items-center justify-center">
              {stepNumber}
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {step.name}
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {step.phase}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {step.description}
              </p>
            </div>
          </div>

          {/* Step Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {/* Method */}
            <span
              className={`px-2 py-0.5 rounded border font-bold ${getMethodBadgeClass(
                step.method
              )}`}
            >
              {step.method}
            </span>

            {/* HTTP Status */}
            <span
              className={`px-2 py-0.5 rounded border font-semibold ${getStatusBadgeClass(
                step.status
              )}`}
            >
              {step.status} {step.status === 200 ? 'OK' : step.status === 302 ? 'FOUND' : 'STATUS'}
            </span>

            {/* Timestamp */}
            <span className="flex items-center space-x-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded text-[11px]">
              <Calendar className="w-3 h-3" />
              <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
            </span>
          </div>
        </div>

        {/* Endpoint URL */}
        <div className="mt-3 flex items-center space-x-2 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
          <span className="text-slate-400 select-none">Endpoint:</span>
          <span className="font-semibold text-sky-600 dark:text-sky-400 break-all">
            {step.endpoint}
          </span>
        </div>
      </div>

      {/* Demo Sandbox Alert Notice */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-5 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>UI Demo / Sandbox Payload:</strong> Formatted in compliance with OpenID4VCI & OpenID4VP specifications. Real Inji APIs will provide live payloads when configured.
          </span>
        </div>
        <span className="hidden sm:inline-block font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-amber-200/60 dark:bg-amber-900/60 rounded">
          Simulated Sandbox
        </span>
      </div>

      {/* Payload Tabs & Controls */}
      <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('response')}
            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'response'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Response Payload</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'request'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Request Headers & Body</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="text-xs px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center space-x-1 transition-colors"
          title="Copy payload to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy JSON</span>
            </>
          )}
        </button>
      </div>

      {/* Code Inspector Content */}
      <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto max-h-96">
        <pre className="text-emerald-400 whitespace-pre">
          {jsonString}
        </pre>
      </div>
    </div>
  );
};
