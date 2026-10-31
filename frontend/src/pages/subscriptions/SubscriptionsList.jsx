import React, { useState, useMemo } from 'react';
import { useBrightloop } from '../../context/BrightloopContext';
import { StatusRibbon } from '../../components/common/StatusRibbon';
import {
  Repeat,
  Search,
  Filter,
  Plus,
  Play,
  Pause,
  RotateCw,
  XCircle,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const SubscriptionsList = () => {
  const {
    subscriptions,
    plans,
    products,
    customers,
    taxRules,
    discounts,
    templates,
    createSubscription,
    updateSubscription,
    advanceSubscriptionStatus,
    pauseSubscription,
    closeSubscriptionEarly,
    renewSubscription,
    setRenderDuration
  } = useBrightloop();

  // Search, filter & pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Selected subscription for detail view drawer/modal
  const [selectedSub, setSelectedSub] = useState(null);

  // New Subscription Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSubCustomer, setNewSubCustomer] = useState(customers[0]?.id || '');
  const [newSubPlan, setNewSubPlan] = useState(plans[0]?.id || '');
  const [newSubDiscount, setNewSubDiscount] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [newSubLines, setNewSubLines] = useState([
    {
      productId: products[0]?.id || '',
      variantId: '',
      quantity: 1,
      taxRate: 18
    }
  ]);

  // Memoized filter and pagination for sub-2-second performance with thousands of subscriptions
  const { filteredSubs, filterDuration } = useMemo(() => {
    const t0 = performance.now();
    const query = searchTerm.toLowerCase();

    const res = subscriptions.filter(sub => {
      const cust = customers.find(c => c.id === sub.customerId);
      const matchesSearch = sub.subNumber.toLowerCase().includes(query) ||
                            (cust?.name || '').toLowerCase().includes(query) ||
                            (cust?.contactName || '').toLowerCase().includes(query);

      const matchesStatus = selectedStatus === 'All' || sub.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });

    const elapsed = Math.round((performance.now() - t0) * 10) / 10;
    return { filteredSubs: res, filterDuration: elapsed };
  }, [subscriptions, searchTerm, selectedStatus, customers]);

  // Update SLA benchmark cleanly via effect
  React.useEffect(() => {
    if (filterDuration > 0) {
      setRenderDuration(filterDuration);
    }
  }, [filterDuration, setRenderDuration]);

  // Pagination slice
  const totalPages = Math.ceil(filteredSubs.length / pageSize) || 1;
  const paginatedSubs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubs.slice(start, start + pageSize);
  }, [filteredSubs, currentPage, pageSize]);

  // Handle template selection in new subscription
  const handleApplyTemplate = (tmplId) => {
    setSelectedTemplateId(tmplId);
    if (!tmplId) return;

    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) return;

    setNewSubPlan(tmpl.planId);
    if (tmpl.lines && tmpl.lines.length > 0) {
      setNewSubLines(tmpl.lines.map(l => {
        const prod = products.find(p => p.id === l.productId);
        const tax = taxRules.find(t => t.id === l.taxId);
        return {
          productId: l.productId,
          variantId: l.variantId || '',
          quantity: l.quantity || 1,
          taxRate: tax?.rate || 18
        };
      }));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const plan = plans.find(p => p.id === newSubPlan);

    // Build structured line items
    const lines = newSubLines.map((line, idx) => {
      const prod = products.find(p => p.id === line.productId);
      const variant = prod?.variants?.find(v => v.id === line.variantId);
      const basePrice = prod?.salesPrice || 0;
      const variantExtra = variant ? variant.extraPrice : 0;
      const unitPrice = basePrice + variantExtra;
      const total = unitPrice * line.quantity;

      return {
        id: `line-${idx + 1}-${Date.now()}`,
        productId: line.productId,
        productName: prod?.name || 'Software',
        variantId: line.variantId || null,
        variantName: variant?.name || null,
        quantity: line.quantity,
        basePrice,
        variantExtra,
        unitPrice,
        taxRate: line.taxRate || 18,
        total
      };
    });

    const newSub = await createSubscription({
      customerId: newSubCustomer,
      planId: newSubPlan,
      discountId: newSubDiscount || null,
      paymentTerms: 'Net 15',
      lines
    });

    setIsCreateModalOpen(false);
    setSelectedSub(newSub);
  };

  const activeSubRecord = selectedSub
    ? subscriptions.find(s => s.id === selectedSub.id) || selectedSub
    : null;

  const activeSubPlan = activeSubRecord
    ? plans.find(p => p.id === activeSubRecord.planId)
    : null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Subscription Lifecycle Pipeline</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-[#714B67] border border-purple-200">
              5-Stage Odoo Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage contract progression: <strong>Draft &rarr; Quotation &rarr; Confirmed &rarr; Active &rarr; Closed</strong> with strict plan rule enforcement.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5d3d54] text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Subscription</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by SUB-2026-XXXX or customer name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-[#714B67] focus:border-[#714B67]"
          />
        </div>

        {/* Stage Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
          {['All', 'Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setSelectedStatus(st);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                selectedStatus === st
                  ? 'bg-[#714B67] text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">
              Subscription Records ({filteredSubs.length.toLocaleString()})
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Sub Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Start / Expiry</th>
                <th className="py-3 px-4">Status Ribbon</th>
                <th className="py-3 px-4 text-right">Contract Value</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSubs.map((sub) => {
                const cust = customers.find(c => c.id === sub.customerId);
                const plan = plans.find(p => p.id === sub.planId);
                const subTotal = (sub.lines || []).reduce((acc, l) => acc + (Number(l.total) || (l.quantity * l.unitPrice)), 0);

                return (
                  <tr
                    key={sub.id}
                    onClick={() => setSelectedSub(sub)}
                    className="hover:bg-purple-50/40 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#714B67] flex items-center gap-1.5">
                      <span>{sub.subNumber}</span>
                      {sub.isPaused && (
                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-sans font-bold">
                          PAUSED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div>{cust?.name || 'Customer'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{cust?.contactName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {plan?.name || 'Custom Plan'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      <div>{sub.startDate}</div>
                      <div className="text-[10px] text-slate-400">to {sub.expiryDate}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusRibbon
                        currentStage={sub.status}
                        onSelectStage={(newSt) => advanceSubscriptionStatus(sub.id, newSt)}
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      ${subTotal.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSub(sub);
                        }}
                        className="px-2.5 py-1 text-[#714B67] hover:bg-[#714B67]/10 rounded font-medium transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- SUBSCRIPTION DETAIL & LIFECYCLE MODAL --- */}
      {activeSubRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in">
            {/* Header with Odoo 5-stage Ribbon */}
            <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 font-mono">
                    {activeSubRecord.subNumber}
                  </h3>
                  {activeSubRecord.isPaused && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      PAUSED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Customer: <strong>{customers.find(c => c.id === activeSubRecord.customerId)?.name}</strong>
                </p>
              </div>

              {/* Status Ribbon with 5 stages */}
              <div className="flex items-center gap-2">
                <StatusRibbon
                  stages={['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed']}
                  currentStage={activeSubRecord.status}
                  onSelectStage={(st) => advanceSubscriptionStatus(activeSubRecord.id, st)}
                />
                <button
                  onClick={() => setSelectedSub(null)}
                  className="p-1 text-slate-400 hover:text-slate-800 text-lg font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Plan Rule Enforcement Actions Toolbar */}
            <div className="px-6 py-2.5 bg-purple-50/50 border-b border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Lock className="w-3.5 h-3.5 text-[#714B67]" />
                <span className="font-semibold">Linked Plan Rules:</span>
                <span className="text-slate-500">
                  {activeSubPlan?.name} (Pause: {activeSubPlan?.canPause ? 'Yes' : 'No'}, Close Early: {activeSubPlan?.canCloseEarly ? 'Yes' : 'No'}, Renew: {activeSubPlan?.canRenew ? 'Yes' : 'No'})
                </span>
              </div>

              {/* Plan Rule Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Pause Button - Checked against plan.canPause */}
                <button
                  type="button"
                  disabled={!activeSubPlan?.canPause}
                  onClick={() => pauseSubscription(activeSubRecord.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition ${
                    activeSubPlan?.canPause
                      ? activeSubRecord.isPaused
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title={activeSubPlan?.canPause ? 'Toggle Pause' : 'Prohibited: Linked plan forbids pausing'}
                >
                  {activeSubRecord.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  <span>{activeSubRecord.isPaused ? 'Resume' : 'Pause'}</span>
                  {!activeSubPlan?.canPause && <Lock className="w-2.5 h-2.5 text-slate-400 ml-1" />}
                </button>

                {/* Close Early Button - Checked against plan.canCloseEarly */}
                <button
                  type="button"
                  disabled={!activeSubPlan?.canCloseEarly || activeSubRecord.status === 'Closed'}
                  onClick={() => closeSubscriptionEarly(activeSubRecord.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition ${
                    activeSubPlan?.canCloseEarly && activeSubRecord.status !== 'Closed'
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title={activeSubPlan?.canCloseEarly ? 'Close Subscription' : 'Locked: Contract forbids early closure'}
                >
                  <XCircle className="w-3 h-3" />
                  <span>Close Early</span>
                  {!activeSubPlan?.canCloseEarly && <Lock className="w-2.5 h-2.5 text-slate-400 ml-1" />}
                </button>

                {/* Renew Button - Checked against plan.canRenew */}
                <button
                  type="button"
                  disabled={!activeSubPlan?.canRenew}
                  onClick={() => renewSubscription(activeSubRecord.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition ${
                    activeSubPlan?.canRenew
                      ? 'bg-[#00A09D] hover:bg-[#008784] text-white shadow-xs'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title={activeSubPlan?.canRenew ? 'Extend Expiry by 1 Year' : 'Plan renewal disabled'}
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Renew +1 Yr</span>
                  {!activeSubPlan?.canRenew && <Lock className="w-2.5 h-2.5 text-slate-400 ml-1" />}
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block mb-0.5">Start Date:</span>
                  <span className="font-semibold text-slate-800 font-mono">{activeSubRecord.startDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Expiry Date:</span>
                  <span className="font-semibold text-slate-800 font-mono">{activeSubRecord.expiryDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Next Billing Day:</span>
                  <span className="font-semibold text-[#714B67] font-mono">{activeSubRecord.nextBillingDate || 'Pending'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Payment Terms:</span>
                  <span className="font-semibold text-slate-800">{activeSubRecord.paymentTerms || 'Immediate'}</span>
                </div>
              </div>

              {/* Line Items Table with Exact Calculations */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">Contract Line Items</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Product & Variant</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Base Price</th>
                        <th className="p-2.5 text-right">Variant Extra</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-center">Tax %</th>
                        <th className="p-2.5 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(activeSubRecord.lines || []).map((line, i) => {
                        const unitPrice = (line.basePrice || 0) + (line.variantExtra || 0);
                        const lineTot = Number(line.total) || (unitPrice * line.quantity);

                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5">
                              <div className="font-semibold text-slate-800">
                                {line.productName || 'Software License'}
                              </div>
                              {line.variantName && (
                                <div className="text-[11px] text-[#714B67] font-medium">
                                  Variant: {line.variantName}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-mono">{line.quantity}</td>
                            <td className="p-2.5 text-right font-mono text-slate-600">${line.basePrice}</td>
                            <td className="p-2.5 text-right font-mono text-[#714B67]">
                              {line.variantExtra > 0 ? `+$${line.variantExtra}` : '$0'}
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold">${unitPrice}</td>
                            <td className="p-2.5 text-center text-slate-500">{line.taxRate || 18}%</td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">${lineTot.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      ${(activeSubRecord.lines || []).reduce((acc, l) => acc + (Number(l.total) || (l.quantity * l.unitPrice)), 0).toLocaleString()}
                    </span>
                  </div>
                  {activeSubRecord.discountId && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Applied Discount:</span>
                      <span className="font-semibold">{discounts.find(d => d.id === activeSubRecord.discountId)?.code || 'Active Rule'}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Total Cycle:</span>
                    <span className="font-mono text-[#714B67]">
                      ${(activeSubRecord.lines || []).reduce((acc, l) => acc + (Number(l.total) || (l.quantity * l.unitPrice)), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Created under Odoo x Flux Hackathon 2026 Engine
              </span>
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE NEW SUBSCRIPTION MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-[#714B67]" />
                <h3 className="font-bold text-slate-800 text-sm">Create New Subscription Contract</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Optional Start From Template */}
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <label className="block text-xs font-bold text-teal-950 mb-1">
                  Start From Quotation Template (Optional)
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-teal-300 rounded-lg text-xs bg-white text-slate-800"
                >
                  <option value="">Choose a template to pre-fill lines...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.validityDays} Days Validity)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer</label>
                  <select
                    value={newSubCustomer}
                    onChange={(e) => setNewSubCustomer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.contactName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Plan</label>
                  <select
                    value={newSubPlan}
                    onChange={(e) => setNewSubPlan(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${p.cost}/{p.billingFrequency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Apply Discount Rule</label>
                  <select
                    value={newSubDiscount}
                    onChange={(e) => setNewSubDiscount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="">No Discount</option>
                    {discounts.filter(d => d.active).map(d => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name} ({d.type === 'percentage' ? `${d.value}%` : `$${d.value}`} off)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Lines Builder */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 text-xs">Contract Product Lines</span>
                  <button
                    type="button"
                    onClick={() => setNewSubLines([...newSubLines, { productId: products[0]?.id || '', variantId: '', quantity: 1, taxRate: 18 }])}
                    className="text-[#714B67] hover:underline font-semibold"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="space-y-2">
                  {newSubLines.map((line, idx) => {
                    const selProd = products.find(p => p.id === line.productId);

                    return (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Line #{idx + 1}</span>
                          {newSubLines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setNewSubLines(newSubLines.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-500 block mb-0.5">Product</label>
                            <select
                              value={line.productId}
                              onChange={(e) => {
                                const newPId = e.target.value;
                                const updated = [...newSubLines];
                                updated[idx].productId = newPId;
                                updated[idx].variantId = '';
                                setNewSubLines(updated);
                              }}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            >
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (${p.salesPrice})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Seats / Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => {
                                const updated = [...newSubLines];
                                updated[idx].quantity = Number(e.target.value) || 1;
                                setNewSubLines(updated);
                              }}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                          </div>

                          {selProd?.variants && selProd.variants.length > 0 && (
                            <div className="col-span-3">
                              <label className="text-[10px] text-slate-500 block mb-0.5">Brand Variant (Price Delta)</label>
                              <select
                                value={line.variantId}
                                onChange={(e) => {
                                  const updated = [...newSubLines];
                                  updated[idx].variantId = e.target.value;
                                  setNewSubLines(updated);
                                }}
                                className="w-full px-2 py-1.5 border border-purple-300 rounded text-xs bg-purple-50/50 text-[#714B67] font-semibold"
                              >
                                <option value="">Standard Edition ($0)</option>
                                {selProd.variants.map(v => (
                                  <option key={v.id} value={v.id}>
                                    {v.name} (+${v.extraPrice} {v.brand === 'Odoo' ? '★ ODOO BRAND' : ''})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#714B67] text-white rounded-lg text-xs font-semibold hover:bg-[#5d3d54]"
                >
                  Create in Draft Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
