import React from 'react';
import { Play, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { TestResultOutcome } from '../types';

interface FlowControlProps {
  onStartTest: () => void;
  onResetTest: () => void;
  isLoading: boolean;
  hasActiveTest: boolean;
  expectedOutcome: TestResultOutcome;
  setExpectedOutcome: (val: TestResultOutcome) => void;
}

export const FlowControl: React.FC<FlowControlProps> = ({
  onStartTest,
  onResetTest,
  isLoading,
  hasActiveTest,
  expectedOutcome,
  setExpectedOutcome,
}) => {
  const outcomes: TestResultOutcome[] = [
    'PASS',
    'FAIL',
    'VALID',
    'INVALID',
    'VALID BUT EXPIRED',
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Simulation Scenario Selector */}
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Simulation Outcome Scenario:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {outcomes.map((outcome) => (
            <button
              key={outcome}
              type="button"
              disabled={isLoading}
              onClick={() => setExpectedOutcome(outcome)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                expectedOutcome === outcome
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {outcome}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
        <button
          type="button"
          onClick={onResetTest}
          disabled={isLoading || !hasActiveTest}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center space-x-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Test</span>
        </button>

        <button
          type="button"
          onClick={onStartTest}
          disabled={isLoading}
          className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 flex items-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center"
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Test</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
