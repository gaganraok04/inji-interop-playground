import React from 'react';
import { ProtocolStep, StepExecutionStatus } from '../../types';
import { ProtocolStepCard } from './ProtocolStepCard';
import { ListOrdered } from 'lucide-react';

interface ProtocolFlowProps {
  steps: ProtocolStep[];
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
  stepStatuses: StepExecutionStatus[];
  isRunning: boolean;
}

export const ProtocolFlow: React.FC<ProtocolFlowProps> = ({
  steps,
  selectedStepIndex,
  onSelectStep,
  stepStatuses,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-parchment-200/80 pb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <ListOrdered className="w-4 h-4 text-copper-700" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-parchment-900 font-mono">
              PROTOCOL EXECUTION FLOW
            </h2>
            <p className="text-[11px] text-parchment-600">
              Vertical 8-stage sequence
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px] font-mono text-copper-800 bg-sand-100/90 px-2.5 py-1 rounded-md border border-parchment-300">
          <span className="w-2 h-2 rounded-full bg-copper-600" />
          <span>8 Stages</span>
        </div>
      </div>

      {/* Vertical list of steps */}
      <div className="space-y-2 relative flex-1 overflow-y-auto pr-0.5" role="list" aria-label="Protocol Steps">
        {steps.map((step, idx) => {
          const isSelected = selectedStepIndex === idx;
          const status = stepStatuses[idx] || 'PENDING';

          return (
            <React.Fragment key={step.step_id || idx}>
              <ProtocolStepCard
                step={step}
                index={idx}
                isSelected={isSelected}
                onSelect={() => onSelectStep(idx)}
                status={status}
              />
              {idx < steps.length - 1 && (
                <div className="flex justify-center my-0.5" aria-hidden="true">
                  <div className="w-0.5 h-1.5 bg-parchment-300" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
