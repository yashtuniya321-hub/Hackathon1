import React from 'react';
import { Check } from 'lucide-react';

export const StatusRibbon = ({
  stages = ['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'],
  currentStage = 'Draft',
  onSelectStage,
  disabled = false,
  closedCancelled = false
}) => {
  const currentIndex = stages.indexOf(currentStage);

  return (
    <div className="inline-flex items-center bg-slate-100 rounded border border-slate-200 overflow-hidden text-xs shadow-sm">
      {stages.map((stage, idx) => {
        const isActive = stage.toLowerCase() === currentStage.toLowerCase();
        const isPassed = currentIndex > idx;
        const isFuture = currentIndex < idx;

        let bgClass = 'bg-slate-100 text-slate-500 hover:bg-slate-200';
        if (isActive) {
          if (stage === 'Active' || stage === 'Paid') {
            bgClass = 'bg-emerald-700 text-white font-semibold shadow-inner';
          } else if (stage === 'Closed' || stage === 'Cancelled') {
            bgClass = 'bg-slate-700 text-white font-semibold shadow-inner';
          } else {
            bgClass = 'bg-[#714B67] text-white font-semibold shadow-inner';
          }
        } else if (isPassed) {
          bgClass = 'bg-slate-200 text-slate-700 hover:bg-slate-300';
        }

        return (
          <button
            key={stage}
            type="button"
            disabled={disabled}
            onClick={() => onSelectStage && onSelectStage(stage)}
            className={`status-ribbon-step flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed ${bgClass}`}
            title={`Set status to ${stage}`}
          >
            {isPassed && <Check className="w-3.5 h-3.5 opacity-80" />}
            <span>{stage}</span>
          </button>
        );
      })}
    </div>
  );
};
