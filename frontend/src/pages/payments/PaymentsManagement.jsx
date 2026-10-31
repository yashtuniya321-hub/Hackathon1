import React, { useState } from 'react';
import { useBrightloop } from '../../context/BrightloopContext';
import {
  CreditCard,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Send,
  Calendar,
  Building,
  DollarSign,
  ArrowRight,
  Receipt,
  Clock,
  Search
} from 'lucide-react';

export const PaymentsManagement = () => {
  const {
    payments,
    invoices,
    customers,
    recordPayment,
    showToast
  } = useBrightloop();

  const [activeTab, setActiveTab] = useState('overdue'); // 'overdue' | 'all-payments' | 'outstanding'
  const [searchTerm, setSearchTerm] = useState('');

  // New Payment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: '',
    method: 'Bank Transfer',
    reference: '',
    notes: ''
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Overdue Invoices: Status is Draft/Confirmed, remainingAmount > 0, and dueDate < today
  const overdueInvoices = invoices.filter(inv => {
    return (inv.status === 'Draft' || inv.status === 'Confirmed') &&
           inv.remainingAmount > 0 &&
           inv.dueDate && inv.dueDate < todayStr;
  });

  // Outstanding Unpaid Invoices (including non-overdue)
  const outstandingInvoices = invoices.filter(inv => {
    return (inv.status === 'Draft' || inv.status === 'Confirmed') && inv.remainingAmount > 0;
  });

  const handleOpenPaymentModal = (invoice = null) => {
    const targetInv = invoice || outstandingInvoices[0];
    if (!targetInv) {
      showToast('info', 'No unpaid invoices currently available to settle.');
      return;
    }

    setFormData({
      invoiceId: targetInv.id,
      amount: targetInv.remainingAmount,
      method: 'Bank Transfer',
      reference: `PAY-TXN-${Date.now().toString().slice(-6)}`,
      notes: `Settlement for ${targetInv.invoiceNumber}`
    });
    setIsModalOpen(true);
  };

  const handleChaseCustomer = (inv) => {
    const cust = customers.find(c => c.id === inv.customerId);
    showToast('warning', `Overdue payment reminder dispatched to ${cust?.contactName} (${cust?.email}) for $${inv.remainingAmount}`);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    await recordPayment(formData);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Payments & Overdue Revenue Chaser</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
              {overdueInvoices.length} Overdue Accounts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Capture incoming payments across Bank Transfer, UPI, Cards, and aggressively chase aging invoices to eliminate bad debt.
          </p>
        </div>

        <button
          onClick={() => handleOpenPaymentModal()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5d3d54] text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* KPI Overdue Alert Ribbon */}
      {overdueInvoices.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-rose-900 text-sm">
                Attention Required: {overdueInvoices.length} invoices are past due
              </h4>
              <p className="text-xs text-rose-700">
                Total Overdue Exposure:{' '}
                <strong className="font-mono text-rose-900">
                  ${overdueInvoices.reduce((acc, i) => acc + Number(i.remainingAmount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>
                . Initiate reminders or record incoming bank settlements.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              overdueInvoices.forEach(inv => handleChaseCustomer(inv));
              showToast('success', `Bulk dunning notice sent to all ${overdueInvoices.length} overdue clients!`);
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Chase All Overdue Clients</span>
          </button>
        </div>
      )}

      {/* Tab Controls */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
            activeTab === 'overdue'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Overdue Invoices ({overdueInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('outstanding')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
            activeTab === 'outstanding'
              ? 'bg-[#714B67] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>All Outstanding Invoices ({outstandingInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all-payments')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
            activeTab === 'all-payments'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Settled Payments Ledger ({payments.length})</span>
        </button>
      </div>

      {/* --- TAB 1: OVERDUE INVOICES LIST --- */}
      {activeTab === 'overdue' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50/50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice Number</th>
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Invoice Total</th>
                  <th className="py-3 px-4 text-right">Overdue Balance</th>
                  <th className="py-3 px-4 text-center">Chase & Settle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      Great news! No overdue invoices found. All client balances are up to date.
                    </td>
                  </tr>
                ) : (
                  overdueInvoices.map((inv) => {
                    const cust = customers.find(c => c.id === inv.customerId);
                    return (
                      <tr key={inv.id} className="hover:bg-rose-50/30 transition">
                        <td className="py-3 px-4 font-mono font-bold text-[#714B67]">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{cust?.name}</div>
                          <div className="text-[10px] text-slate-500">{cust?.email}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-rose-600">
                          {inv.dueDate}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                          ${inv.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                          ${inv.remainingAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleChaseCustomer(inv)}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded font-semibold text-xs transition flex items-center gap-1"
                              title="Send Reminder Notice"
                            >
                              <Send className="w-3 h-3" />
                              <span>Chase</span>
                            </button>
                            <button
                              onClick={() => handleOpenPaymentModal(inv)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs transition flex items-center gap-1"
                              title="Record Settlement"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Settle</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 2: OUTSTANDING INVOICES --- */}
      {activeTab === 'outstanding' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Terms</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Remaining</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outstandingInvoices.map((inv) => {
                  const cust = customers.find(c => c.id === inv.customerId);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-[#714B67]">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{cust?.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{inv.dueDate}</td>
                      <td className="py-3 px-4 text-slate-500">{inv.paymentTerms}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">${inv.totalAmount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">${inv.remainingAmount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenPaymentModal(inv)}
                          className="px-2.5 py-1 bg-[#714B67] hover:bg-[#5d3d54] text-white rounded font-semibold text-xs"
                        >
                          Record Payment
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: SETTLED PAYMENTS LEDGER --- */}
      {activeTab === 'all-payments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Payment Ref</th>
                  <th className="py-3 px-4">Invoice Settled</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4">Reference Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((pay) => {
                  const cust = customers.find(c => c.id === pay.customerId);
                  const inv = invoices.find(i => i.id === pay.invoiceId);

                  return (
                    <tr key={pay.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">{pay.paymentNumber}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#714B67]">{inv?.invoiceNumber || pay.invoiceId}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{cust?.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {pay.method}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{pay.paymentDate}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">
                        +${Number(pay.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-500 truncate max-w-xs">{pay.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Record Incoming Payment</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Invoice</label>
                <select
                  value={formData.invoiceId}
                  onChange={(e) => {
                    const inv = outstandingInvoices.find(i => i.id === e.target.value);
                    setFormData({
                      ...formData,
                      invoiceId: e.target.value,
                      amount: inv ? inv.remainingAmount : formData.amount
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {outstandingInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — Balance: ${inv.remainingAmount} ({customers.find(c => c.id === inv.customerId)?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Bank Transfer">Bank Transfer (SWIFT / Wire / ACH)</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Cash">Cash / Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Reference</label>
                <input
                  type="text"
                  required
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800"
                >
                  Save & Apply Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
