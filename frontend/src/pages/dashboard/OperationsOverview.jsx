import React, { useState } from 'react';
import { useBrightloop } from '../../context/BrightloopContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Plus,
  Bell,
  MoreHorizontal,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export const OperationsOverview = ({ onOpenNewSubModal }) => {
  const navigate = useNavigate();
  const {
    currentUser,
    metrics,
    subscriptions,
    invoices,
    payments,
    showToast
  } = useBrightloop();

  const [timeRange, setTimeRange] = useState('Last 12 months');
  const [toastVisible, setToastVisible] = useState(false);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Subscriptions requiring attention (overdue, renewals, payment issues)
  const attentionSubscriptions = subscriptions
    .filter(s => s.status === 'Active' || s.status === 'Quotation')
    .slice(0, 5);

  const handleNewSubClick = () => {
    if (onOpenNewSubModal) {
      onOpenNewSubModal();
    } else {
      navigate('/subscriptions');
    }
  };

  return (
    <div className="space-y-6">
      {/* Operations Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            OCTOBER 2026 · SYSTEM TELEMETRY
          </p>
          <h1 className="text-3xl font-bold font-serif text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            Good morning, {currentUser?.name?.split(' ')[0] || 'Alex'} <span className="text-[#f2a35c] text-xl">✦</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here’s what’s happening across your Brightloop subscription operations today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast('info', 'No unread system alerts')}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-500" />
          </button>
          <button
            onClick={handleNewSubClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#6e5de0] hover:bg-[#5c4bc4] text-white font-semibold rounded-xl text-sm shadow-md transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New subscription</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row matching the provided aesthetic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: MRR */}
        <div className="bg-[#fff9f4] border border-[#f5e8dd] rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-44">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              MONTHLY RECURRING REVENUE
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> 8.4%
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
              {formatCurrency(metrics.mrr || 48240)}
            </div>
            <p className="text-xs text-slate-500 mt-1">vs. {formatCurrency((metrics.mrr || 48240) * 0.92)} last month</p>
          </div>
          {/* Sparkline Visual */}
          <div className="flex items-end gap-1 h-7 pt-1">
            {[28, 42, 35, 58, 48, 68, 54, 76, 68, 84, 78, 100].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-t-sm transition-all ${i === 11 ? 'bg-[#ee8c6d]' : 'bg-[#f6b39a]'}`}
              />
            ))}
          </div>
        </div>

        {/* KPI 2: Active Subscriptions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-44">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              ACTIVE SUBSCRIPTIONS
            </span>
            <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              ◌
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
              {(metrics.activeSubscriptions || 1284).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 font-medium">+46</span> from last month
            </p>
          </div>
          <div className="flex items-end gap-1 h-6">
            {[40, 65, 80, 45, 70, 90, 50, 75, 95, 60].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-sm ${i % 3 === 0 ? 'bg-blue-400' : 'bg-blue-200'}`}
              />
            ))}
          </div>
        </div>

        {/* KPI 3: Outstanding Balance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-44">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              OUTSTANDING BALANCE
            </span>
            <span className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
              $
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
              {formatCurrency(metrics.totalOutstanding || 12860)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-rose-600 font-medium">{formatCurrency(metrics.overdueAmount || 3420)}</span> overdue
            </p>
          </div>
          <div className="w-full bg-[#f4e7d9] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#f0aa5b] h-full rounded-full"
              style={{ width: `${Math.min(100, Math.round(((metrics.overdueAmount || 3420) / (metrics.totalOutstanding || 12860)) * 100))}%` }}
            />
          </div>
        </div>

        {/* KPI 4: Payments Collected */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-44">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              PAYMENTS COLLECTED
            </span>
            <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              ✓
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
              {formatCurrency(metrics.totalCollected || 62104)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 font-medium">+12.6%</span> vs previous cycle
            </p>
          </div>
          <div className="flex items-end gap-1 h-6">
            {[45, 60, 85, 50, 70, 90, 55, 80, 100].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-sm ${i % 3 === 0 ? 'bg-emerald-500' : 'bg-emerald-200'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Middle Grid: Revenue Trend Chart & Activity List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Overview SVG Chart Panel */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Revenue overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">Monthly recurring revenue projection over time</p>
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 hover:bg-slate-100 cursor-pointer"
            >
              <option>Last 12 months</option>
              <option>Year to date (2026)</option>
              <option>Last 30 days</option>
            </select>
          </div>

          <div className="flex items-center gap-6 mt-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7665e8]" /> Recurring revenue
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d9d4fa]" /> One-time add-ons
            </span>
          </div>

          {/* SVG Visual */}
          <div className="h-56 mt-4 relative">
            <svg viewBox="0 0 620 210" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#7968ed" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#7968ed" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path stroke="#efedf3" strokeWidth="1" d="M0 14H620M0 78H620M0 142H620M0 206H620" />
              <path
                fill="url(#chartGradient)"
                d="M0 170 C25 160 37 155 55 161 S86 145 105 150 S133 141 155 144 S182 130 205 134 S232 116 258 125 S285 111 309 116 S335 100 360 108 S388 83 412 96 S438 88 464 79 S493 60 516 72 S544 49 570 59 S602 37 620 44 V210 H0Z"
              />
              <path
                fill="none"
                stroke="#7665e8"
                strokeWidth="2.5"
                d="M0 170 C25 160 37 155 55 161 S86 145 105 150 S133 141 155 144 S182 130 205 134 S232 116 258 125 S285 111 309 116 S335 100 360 108 S388 83 412 96 S438 88 464 79 S493 60 516 72 S544 49 570 59 S602 37 620 44"
              />
              <circle cx="516" cy="72" r="5" fill="#fff" stroke="#7665e8" strokeWidth="3" />
              <g className="filter drop-shadow-md">
                <rect x="469" y="15" rx="7" width="95" height="39" fill="#302e47" />
                <text x="480" y="31" fill="#b9b6c8" fontSize="8" fontFamily="DM Mono">OCT 2026</text>
                <text x="480" y="45" fill="#fff" fontWeight="bold" fontSize="11" fontFamily="DM Sans">
                  {formatCurrency(metrics.mrr || 48240)}
                </text>
              </g>
            </svg>
          </div>

          <div className="flex justify-between font-mono text-[10px] text-slate-400 mt-2 px-1">
            <span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span>
            <span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span>
          </div>
        </div>

        {/* Recent Activity Panel */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Recent activity</h2>
              <Link to="/invoices" className="text-xs font-semibold text-[#7261d9] hover:underline">
                View all
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              <div className="py-3 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                  ↑
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">Payment received</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Acme Inc. settled invoice <span className="font-semibold text-slate-700">INV-2026-0001</span>
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">2m ago</span>
              </div>

              <div className="py-3 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                  ＋
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">New subscription</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Northstar Labs joined <span className="font-semibold text-slate-700">Growth Plan</span>
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">18m ago</span>
              </div>

              <div className="py-3 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                  ↻
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">Subscription renewed</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Vertex Digital renewed <span className="font-semibold text-slate-700">Pro Enterprise</span>
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">1h ago</span>
              </div>

              <div className="py-3 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm shrink-0">
                  !
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">Invoice overdue</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Orbit Co. overdue on <span className="font-semibold text-slate-700">INV-2026-0003</span>
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">3h ago</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link
              to="/billing"
              className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-200 transition"
            >
              Open Batch Billing Engine <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Subscriptions Requiring Attention Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              Subscriptions requiring attention
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#eeeaff] text-[#7565df]">
                {attentionSubscriptions.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Keep your recurring billing pipeline moving smoothly</p>
          </div>
          <Link
            to="/subscriptions"
            className="text-xs font-semibold text-[#7261d9] hover:underline flex items-center gap-1"
          >
            View subscriptions <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">CUSTOMER</th>
                <th className="pb-3 font-semibold">PLAN</th>
                <th className="pb-3 font-semibold">STATUS</th>
                <th className="pb-3 font-semibold">NEXT BILLING</th>
                <th className="pb-3 font-semibold">AMOUNT</th>
                <th className="pb-3 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attentionSubscriptions.map((sub, idx) => {
                const total = (sub.lines || []).reduce((acc, l) => acc + (Number(l.total) || (l.quantity * l.unitPrice)), 0);
                const avatarBg = idx % 3 === 0 ? 'bg-[#e48b78]' : idx % 3 === 1 ? 'bg-[#63749a]' : 'bg-[#a0a873]';
                const initials = (sub.customerName || 'Customer')
                  .split(' ')
                  .map(w => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${avatarBg} text-white font-bold flex items-center justify-center text-xs shadow-sm`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{sub.customerName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{sub.subNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-600 font-medium">
                      {sub.planName || 'Monthly Agile'}
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-slate-800">
                      {sub.nextBillingDate ? sub.nextBillingDate : 'Today'}
                    </td>
                    <td className="py-3.5 font-mono font-bold text-slate-900">
                      {formatCurrency(total || 499)}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        to={`/subscriptions`}
                        className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs inline-flex items-center gap-1"
                      >
                        Manage <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OperationsOverview;
