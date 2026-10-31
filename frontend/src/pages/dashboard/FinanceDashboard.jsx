import React, { useState } from 'react';
import { useBrightloop } from '../../context/BrightloopContext';
import { OperationsOverview } from './OperationsOverview';
import {
  TrendingUp,
  DollarSign,
  Repeat,
  AlertTriangle,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Send,
  PieChart,
  BarChart3,
  ExternalLink,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const FinanceDashboard = () => {
  const {
    metrics,
    subscriptions,
    plans,
    invoices,
    payments,
    renderDuration,
    backendStatus,
    triggerStressTest,
    showToast
  } = useBrightloop();

  const [activeTab, setActiveTab] = useState('operations'); // 'operations' | 'finance'
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate2500 = () => {
    setIsSimulating(true);
    setTimeout(() => {
      triggerStressTest(2500);
      setIsSimulating(false);
    }, 50);
  };

  // Status breakdown calculations
  const statusCounts = subscriptions.reduce((acc, sub) => {
    acc[sub.status] = (acc[sub.status] || 0) + 1;
    return acc;
  }, {});

  // Plan distribution calculations
  const planCounts = subscriptions.reduce((acc, sub) => {
    const p = plans.find(plan => plan.id === sub.planId);
    const name = p?.name || 'Custom Plan';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* View Switcher: Operations Overview vs Finance Intelligence */}
      <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('operations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'operations'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="text-[#f2a35c]">✦</span> Operations Overview
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'finance'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#714B67]" /> Finance Lead & SLA
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 pr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>PostgreSQL API Connected (:4000)</span>
        </div>
      </div>

      {activeTab === 'operations' ? (
        <OperationsOverview />
      ) : (
        <>
          {/* Executive Welcome & Performance SLA Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Finance Lead Dashboard</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#714B67]/10 text-[#714B67] border border-[#714B67]/20">
              Executive View
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time subscription revenue intelligence, ARR / MRR metrics, and automated cash collection telemetry.
          </p>
        </div>

        {/* SLA & Stress Test Controls */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <Activity className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-slate-400 block text-[10px]">Benchmark SLA:</span>
              <span className="font-mono font-bold text-slate-800">
                {renderDuration}ms (&lt; 2000ms SLA)
              </span>
            </div>
          </div>

          <button
            onClick={handleSimulate2500}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5d3d54] text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Zap className={`w-4 h-4 ${isSimulating ? 'animate-spin text-amber-300' : 'text-amber-400'}`} />
            <span>Simulate 2,500 Subscriptions</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Subscriptions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Subscriptions
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#714B67] flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.activeSubsCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">
              / {metrics.totalSubsCount.toLocaleString()} total
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Live Contracts
            </span>
            <Link to="/subscriptions" className="text-[#714B67] hover:underline font-medium">
              View All &rarr;
            </Link>
          </div>
        </div>

        {/* Monthly Recurring Revenue (MRR) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Monthly Recurring (MRR)
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00A09D] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              ${metrics.mrr.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-400">/mo</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-mono">
              ARR: ${(metrics.arr).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-emerald-600 font-medium">Annualized</span>
          </div>
        </div>

        {/* Collected vs Outstanding Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cash Collected
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 font-mono">
              ${metrics.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Owed: <strong className="text-amber-600 font-mono">${metrics.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </span>
            <Link to="/invoices" className="text-slate-600 hover:underline">
              Ledger &rarr;
            </Link>
          </div>
        </div>

        {/* Overdue Exposure Alert Card */}
        <div className={`rounded-xl border p-5 shadow-sm transition ${
          metrics.overdueCount > 0
            ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Overdue Risk
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700 font-mono">
              ${metrics.overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-rose-600 font-semibold">
              ({metrics.overdueCount} accounts)
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px]">
            <span className="text-rose-800 font-medium">Needs Attention</span>
            <Link to="/payments" className="text-rose-700 hover:underline font-bold">
              Chase Now &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Section: Pipeline Distribution & Overdue Chasing Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Pipeline Stage Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm">
              5-Stage Pipeline Distribution
            </h3>
            <span className="text-xs text-slate-400 font-mono">Odoo Flow</span>
          </div>

          <div className="space-y-3">
            {['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'].map((stage) => {
              const count = statusCounts[stage] || 0;
              const percentage = Math.round((count / (metrics.totalSubsCount || 1)) * 100);

              const colors = {
                Draft: 'bg-slate-400',
                Quotation: 'bg-amber-500',
                Confirmed: 'bg-[#00A09D]',
                Active: 'bg-emerald-600',
                Closed: 'bg-slate-700'
              };

              return (
                <div key={stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{stage}</span>
                    <span className="font-mono text-slate-500">
                      {count.toLocaleString()} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[stage] || 'bg-slate-400'} transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Plan Breakdown */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Subscriptions by Plan
            </h4>
            <div className="space-y-1.5 text-xs">
              {Object.entries(planCounts).map(([planName, count]) => (
                <div key={planName} className="flex items-center justify-between p-2 rounded bg-slate-50">
                  <span className="text-slate-800 font-medium">{planName}</span>
                  <span className="font-mono font-bold text-[#714B67]">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Immediate Action Items (Overdue Invoices) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                High Priority: Overdue Invoices Requiring Chase
              </h3>
              <p className="text-xs text-slate-500">
                Invoices past due terms without complete payment settlement
              </p>
            </div>
            <Link
              to="/payments"
              className="text-xs font-semibold text-[#714B67] hover:underline"
            >
              Open Chaser &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Subscription</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Owed</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.overdueInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-400">
                      No overdue accounts! All customer invoices are settled or within payment terms.
                    </td>
                  </tr>
                ) : (
                  metrics.overdueInvoices.slice(0, 5).map((inv) => (
                    <tr key={inv.id} className="hover:bg-rose-50/20">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#714B67]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">
                        {inv.subscriptionId}
                      </td>
                      <td className="py-2.5 px-3 text-rose-600 font-mono font-semibold">
                        {inv.dueDate}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                        ${inv.remainingAmount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Link
                          to="/payments"
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Chase</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Shortcuts */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-3">
            <Link
              to="/billing"
              className="p-3 rounded-lg bg-purple-50/60 border border-purple-100 text-center hover:bg-purple-50 transition"
            >
              <span className="block font-bold text-[#714B67] text-xs">Run Billing Day</span>
              <span className="text-[10px] text-slate-500">Auto-generate due cycle</span>
            </Link>
            <Link
              to="/subscriptions"
              className="p-3 rounded-lg bg-teal-50/60 border border-teal-100 text-center hover:bg-teal-50 transition"
            >
              <span className="block font-bold text-[#00A09D] text-xs">Manage Subscriptions</span>
              <span className="text-[10px] text-slate-500">Review 5-stage pipeline</span>
            </Link>
            <Link
              to="/catalog"
              className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center hover:bg-slate-100 transition"
            >
              <span className="block font-bold text-slate-800 text-xs">Product Catalog</span>
              <span className="text-[10px] text-slate-500">+560 Odoo variant & plans</span>
            </Link>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
