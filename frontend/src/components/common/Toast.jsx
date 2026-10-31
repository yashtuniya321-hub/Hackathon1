import React from 'react';
import { useBrightloop } from '../../context/BrightloopContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const Toast = () => {
  const { toastMessage, showToast } = useBrightloop();

  if (!toastMessage) return null;

  const { type, message } = toastMessage;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-[#00A09D] flex-shrink-0" />
  };

  const borders = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-teal-200 bg-teal-50 text-teal-950'
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md animate-fade-in transition-all">
      <div className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${borders[type] || borders.info}`}>
        {icons[type] || icons.info}
        <div className="text-sm font-medium leading-snug flex-1">
          {message}
        </div>
        <button
          onClick={() => showToast(null, null)}
          className="text-slate-400 hover:text-slate-700 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
