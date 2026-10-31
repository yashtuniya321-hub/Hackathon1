import React, { useState } from 'react';
import { useBrightloop } from '../../context/BrightloopContext';
import {
  CalendarCheck,
  Play,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Clock,
  ArrowRight,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const BillingEngine = () => {
  const {
    subscriptions,
    invoices,
    billingLogs,
    runBillingDay,
    renderDuration
  } = useBrightloop();

  const [billingDate, setBillingDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunResult, setLastRunResult] = useState(null);

  // Analyze how many subscriptions are currently due for billing
  const activeSubs = subscriptions.filter(s => s.status === 'Active');
  const targetDateObj = new Date(billingDate);

  const dueSubscriptions = activeSubs.filter(sub => {
    const due = sub.nextBillingDate ? new Date(sub.nextBillingDate) : new Date(sub.startDate);
    return due <= targetDateObj;
  });

  const handleExecuteBilling = async () => {
    setIsRunning(true);
    setLastRunResult(null);
    try {
      const res = await runBillingDay(billingDate);
      setLastRunResult(res);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Automated "Run Billing Day" Engine</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Idempotency Protected
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Batch billing cycle engine with automatic invoice generation, discount calculation, and strict <code>(subscriptionId, billingCycleDate)</code> duplicate prevention.
          </p>
        </div>

        <Link
          to="/invoices"
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition"
        >
          <Receipt className="w-4 h-4 text-[#714B67]" />
          <span>View All Invoices</span>
        </Link>
      </div>

      {/* Interactive Engine Run Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Billing Day Controller */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Batch Billing Execution Controls</h3>
              <p className="text-xs text-slate-500">Select target billing date to evaluate all due active contracts</p>
            </div>
            <span className="text-xs font-mono bg-purple-50 text-[#714B67] px-2.5 py-1 rounded-md font-semibold">
              Cycle SLA: &lt; 2000ms
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Billing Date
              </label>
              <input
                type="date"
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Finds all Active subscriptions with Next Billing Date &le; {billingDate}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-medium">Eligible Active Subscriptions:</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {dueSubscriptions.length}
                </span>
                <span className="text-xs text-slate-500">
                  of {activeSubs.length} active total
                </span>
              </div>
            </div>
          </div>

          {/* Idempotency Safeguard Notice */}
          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-2 text-[#714B67] font-bold">
              <ShieldCheck className="w-4 h-4 text-[#714B67]" />
              <span>Zero Double-Billing Safeguard Active</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Each invoice is assigned an immutable compound key: <code>subscriptionId + '_' + billingCycleDate</code>.
              Running the batch engine repeatedly will <strong>never create duplicate invoices</strong> or charge a customer twice,
              nor skip any unbilled active subscription.
            </p>
          </div>

          {/* Action Trigger Button */}
          <div className="pt-2">
            <button
              onClick={handleExecuteBilling}
              disabled={isRunning || dueSubscriptions.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#714B67] hover:bg-[#5d3d54] disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow-md shadow-[#714B67]/20 transition cursor-pointer"
            >
              <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>
                {isRunning
                  ? 'Executing Billing Day Engine...'
                  : dueSubscriptions.length === 0
                  ? 'No Active Subscriptions Due for this Date'
                  : `Run Billing Day (Process ${dueSubscriptions.length} Subscriptions)`}
              </span>
            </button>
          </div>

          {/* Immediate Run Feedback */}
          {lastRunResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-3 animate-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Batch Billing Cycle Successfully Completed</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-700">
                  Duration: {renderDuration}ms
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                  <span className="text-slate-500 block text-[10px]">Invoices Generated:</span>
                  <span className="text-lg font-bold text-emerald-700 font-mono">
                    {lastRunResult.createdCount}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                  <span className="text-slate-500 block text-[10px]">Duplicates Safeguarded (Skipped):</span>
                  <span className="text-lg font-bold text-amber-600 font-mono">
                    {lastRunResult.skippedCount}
                  </span>
                </div>
              </div>

              {lastRunResult.invoices?.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-bold text-slate-700 block">Generated Invoices:</span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {lastRunResult.invoices.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200 text-xs">
                        <span className="font-mono font-semibold text-[#714B67]">{inv.invoiceNumber}</span>
                        <span className="text-slate-600">Sub: {inv.subscriptionId}</span>
                        <span className="font-mono font-bold text-slate-900">${inv.totalAmount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Historical Execution Logs */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm">Execution Audit Logs</h3>
            <span className="text-xs text-slate-400 font-mono">
              {billingLogs.length} Runs
            </span>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto">
            {billingLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">
                No previous automated billing runs recorded. Click "Run Billing Day" to initiate.
              </p>
            ) : (
              billingLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800">
                      {log.billingDate}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.runTimestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Generated Invoices:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      +{log.invoicesCreated}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Duplicates Safeguarded:</span>
                    <span className="font-mono font-bold text-amber-600">
                      {log.skippedAlreadyBilled}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
