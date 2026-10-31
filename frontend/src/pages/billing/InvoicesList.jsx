import React, { useState, useMemo } from 'react';
import { useBrightloop } from '../../context/BrightloopContext';
import { StatusRibbon } from '../../components/common/StatusRibbon';
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Mail,
  Printer,
  CreditCard,
  Eye,
  AlertCircle,
  Send,
  Building,
  Calendar,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const InvoicesList = () => {
  const {
    invoices,
    customers,
    updateInvoiceStatus,
    sendInvoiceEmail,
    recordPayment
  } = useBrightloop();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Email Preview Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [activeEmailInvoice, setActiveEmailInvoice] = useState(null);

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activePrintInvoice, setActivePrintInvoice] = useState(null);

  // Record Payment Quick Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payFormData, setPayFormData] = useState({
    amount: 0,
    method: 'Bank Transfer',
    reference: '',
    notes: ''
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredInvoices = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return invoices.filter(inv => {
      const cust = customers.find(c => c.id === inv.customerId);
      const matchesSearch = inv.invoiceNumber.toLowerCase().includes(q) ||
                            (cust?.name || '').toLowerCase().includes(q) ||
                            (inv.subscriptionId || '').toLowerCase().includes(q);

      const isOverdue = (inv.status === 'Draft' || inv.status === 'Confirmed') &&
                        inv.remainingAmount > 0 &&
                        inv.dueDate && inv.dueDate < todayStr;

      let matchesStatus = true;
      if (statusFilter === 'Overdue') {
        matchesStatus = isOverdue;
      } else if (statusFilter !== 'All') {
        matchesStatus = inv.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter, customers, todayStr]);

  const handleOpenEmailModal = (inv) => {
    setActiveEmailInvoice(inv);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!activeEmailInvoice) return;
    await sendInvoiceEmail(activeEmailInvoice.id);
    setIsEmailModalOpen(false);
  };

  const handleOpenPrintModal = (inv) => {
    setActivePrintInvoice(inv);
    setIsPrintModalOpen(true);
  };

  const handleOpenPayModal = (inv) => {
    setSelectedInvoice(inv);
    setPayFormData({
      amount: inv.remainingAmount,
      method: 'Bank Transfer',
      reference: `REF-${Date.now().toString().slice(-6)}`,
      notes: `Settlement for ${inv.invoiceNumber}`
    });
    setIsPayModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    await recordPayment({
      invoiceId: selectedInvoice.id,
      ...payFormData
    });
    setIsPayModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Customer Invoices & Status Pipeline</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-[#714B67] border border-purple-200">
              Odoo Billing
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track invoice lifecycle: <strong>Draft &rarr; Confirmed &rarr; Paid</strong>, dispatch client email notices, and print tax receipts.
          </p>
        </div>

        <Link
          to="/billing"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5d3d54] text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <Receipt className="w-4 h-4" />
          <span>Run Billing Day Batch</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by INV-2026-XXXX or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-[#714B67] focus:border-[#714B67]"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
          {['All', 'Draft', 'Confirmed', 'Paid', 'Overdue', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                statusFilter === st
                  ? st === 'Overdue'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'bg-[#714B67] text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800">
            Invoices Ledger ({filteredInvoices.length})
          </h3>
          <span className="text-xs text-slate-400">
            Real-time Status Pipeline
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Invoice Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status Ribbon</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => {
                const cust = customers.find(c => c.id === inv.customerId);
                const isOverdue = (inv.status === 'Draft' || inv.status === 'Confirmed') &&
                                  inv.remainingAmount > 0 &&
                                  inv.dueDate && inv.dueDate < todayStr;

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#714B67] flex items-center gap-1.5">
                      <span>{inv.invoiceNumber}</span>
                      {inv.emailSent && (
                        <span title="Dispatched to client via email" className="text-slate-400">
                          <Mail className="w-3 h-3 text-[#00A09D]" />
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div>{cust?.name || 'Customer Account'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{cust?.contactName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{inv.invoiceDate}</td>
                    <td className="py-3 px-4 font-mono">
                      <div className={isOverdue ? 'text-rose-600 font-bold flex items-center gap-1' : 'text-slate-600'}>
                        {isOverdue && <AlertCircle className="w-3 h-3 text-rose-500" />}
                        <span>{inv.dueDate}</span>
                      </div>
                      {isOverdue && (
                        <span className="text-[10px] font-bold uppercase text-rose-600">
                          OVERDUE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {/* Odoo Invoice Status Ribbon: Draft -> Confirmed -> Paid */}
                      <StatusRibbon
                        stages={['Draft', 'Confirmed', 'Paid']}
                        currentStage={inv.status}
                        onSelectStage={(newSt) => updateInvoiceStatus(inv.id, newSt)}
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ${Number(inv.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {inv.remainingAmount > 0 ? (
                        <span className={isOverdue ? 'text-rose-600' : 'text-amber-600'}>
                          ${Number(inv.remainingAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">$0.00 (Settled)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Send Email preview button */}
                        <button
                          onClick={() => handleOpenEmailModal(inv)}
                          className="p-1.5 text-slate-500 hover:text-[#714B67] hover:bg-slate-100 rounded transition"
                          title="Preview & Send Email Notice"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>

                        {/* Print Invoice button */}
                        <button
                          onClick={() => handleOpenPrintModal(inv)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                          title="Print / PDF View"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Pay button */}
                        {inv.remainingAmount > 0 && inv.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleOpenPayModal(inv)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold text-[11px] transition flex items-center gap-1"
                            title="Record Payment"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- EMAIL PREVIEW MODAL --- */}
      {isEmailModalOpen && activeEmailInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#714B67]" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Email Dispatch Preview: {activeEmailInvoice.invoiceNumber}
                </h3>
              </div>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div>
                  <span className="text-slate-400">To: </span>
                  <span className="font-semibold text-slate-800">
                    {customers.find(c => c.id === activeEmailInvoice.customerId)?.email}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Subject: </span>
                  <span className="font-semibold text-slate-800">
                    Brightloop Software Invoice {activeEmailInvoice.invoiceNumber} (Due: {activeEmailInvoice.dueDate})
                  </span>
                </div>
              </div>

              {/* Rich email body preview */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white shadow-inner font-sans">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-[#714B67] text-sm">Brightloop Software</span>
                  <span className="text-[10px] text-slate-400">Automated Notification</span>
                </div>
                <p className="text-slate-700">
                  Dear <strong>{customers.find(c => c.id === activeEmailInvoice.customerId)?.contactName}</strong>,
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Your new subscription billing invoice <strong>{activeEmailInvoice.invoiceNumber}</strong> for amount{' '}
                  <strong className="text-slate-900 font-mono">${activeEmailInvoice.totalAmount}</strong> is now ready.
                </p>
                <div className="p-3 bg-purple-50/50 rounded border border-purple-100 text-center">
                  <span className="text-xs text-slate-500 block mb-1">Amount Due:</span>
                  <span className="text-xl font-black text-[#714B67] font-mono">
                    ${activeEmailInvoice.remainingAmount.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Payment Terms: {activeEmailInvoice.paymentTerms}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  You can pay instantly via the Customer Portal without contacting support.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] text-white rounded-lg text-xs font-semibold hover:bg-[#5d3d54] shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Notification</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PRINT INVOICE MODAL (@media print) --- */}
      {isPrintModalOpen && activePrintInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[95vh] flex flex-col">
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
              <span className="text-xs font-bold text-slate-700">Official Invoice Print Preview</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67] text-white rounded-lg text-xs font-semibold hover:bg-[#5d3d54]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">✕</button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 overflow-y-auto flex-1 printable-card text-xs space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-[#714B67] text-white font-black flex items-center justify-center text-base">
                      B
                    </div>
                    <span className="text-lg font-black tracking-tight text-slate-900">Brightloop Software</span>
                  </div>
                  <p className="text-slate-500 mt-1">Enterprise Subscription Billing Suite</p>
                  <p className="text-slate-500">Odoo x Flux Hackathon 2026 Engine</p>
                </div>

                <div className="text-right">
                  <h2 className="text-2xl font-black text-slate-900 font-mono">{activePrintInvoice.invoiceNumber}</h2>
                  <p className="text-slate-600 font-semibold mt-1">Status: <span className="uppercase text-[#714B67]">{activePrintInvoice.status}</span></p>
                  <p className="text-slate-500 font-mono text-[11px]">Date: {activePrintInvoice.invoiceDate}</p>
                  <p className="text-slate-500 font-mono text-[11px]">Due: {activePrintInvoice.dueDate}</p>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Bill To:
                  </span>
                  {(() => {
                    const c = customers.find(x => x.id === activePrintInvoice.customerId);
                    return (
                      <div className="space-y-0.5 text-slate-700">
                        <p className="font-bold text-slate-900 text-sm">{c?.name}</p>
                        <p>Attn: {c?.contactName}</p>
                        <p>{c?.email}</p>
                        <p>{c?.address}</p>
                        <p className="font-mono text-[11px]">Tax ID: {c?.taxId}</p>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Contract Details:
                  </span>
                  <div className="space-y-0.5 text-slate-700">
                    <p>Subscription Ref: <strong className="font-mono text-[#714B67]">{activePrintInvoice.subscriptionId}</strong></p>
                    <p>Billing Cycle: <span className="font-mono">{activePrintInvoice.billingCycleDate}</span></p>
                    <p>Payment Terms: {activePrintInvoice.paymentTerms}</p>
                    <p>Idempotency Key: <span className="font-mono text-[10px] text-slate-400">{activePrintInvoice.idempotencyKey}</span></p>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-center">Tax %</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(activePrintInvoice.lines || []).map((l, i) => (
                      <tr key={i}>
                        <td className="p-3 font-semibold text-slate-800">{l.description}</td>
                        <td className="p-3 text-center font-mono">{l.quantity}</td>
                        <td className="p-3 text-right font-mono">${l.unitPrice}</td>
                        <td className="p-3 text-center">{l.taxRate}%</td>
                        <td className="p-3 text-right font-mono font-bold">${l.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Breakdown Totals */}
              <div className="flex justify-end">
                <div className="w-72 space-y-1.5 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">${activePrintInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  {activePrintInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount ({activePrintInvoice.discountCode || 'Promo'}):</span>
                      <span className="font-mono font-semibold">-${activePrintInvoice.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Applicable Taxes:</span>
                    <span className="font-mono font-semibold">${activePrintInvoice.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-base">
                    <span>Total Amount:</span>
                    <span className="font-mono text-[#714B67]">${activePrintInvoice.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                    <span>Amount Paid:</span>
                    <span className="font-mono font-semibold text-emerald-700">${activePrintInvoice.paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Balance Due:</span>
                    <span className="font-mono text-rose-600">${activePrintInvoice.remainingAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="pt-6 border-t border-slate-200 text-center text-slate-400 text-[11px]">
                Thank you for choosing Brightloop Software. Payment is due within agreed terms.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- QUICK RECORD PAYMENT MODAL --- */}
      {isPayModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                Record Payment for {selectedInvoice.invoiceNumber}
              </h3>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount ($) — Remaining: ${selectedInvoice.remainingAmount}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={selectedInvoice.remainingAmount}
                  value={payFormData.amount}
                  onChange={(e) => setPayFormData({ ...payFormData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payFormData.method}
                  onChange={(e) => setPayFormData({ ...payFormData, method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Bank Transfer">Bank Transfer (SWIFT / ACH)</option>
                  <option value="UPI">UPI (Unified Payments Interface)</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Cash">Cash / Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Reference</label>
                <input
                  type="text"
                  required
                  value={payFormData.reference}
                  onChange={(e) => setPayFormData({ ...payFormData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={payFormData.notes}
                  onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800"
                >
                  Record & Settle Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
