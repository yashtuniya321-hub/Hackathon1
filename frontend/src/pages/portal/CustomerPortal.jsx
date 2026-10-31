import React, { useState } from 'react';
import { useBrightloop } from '../../context/BrightloopContext';
import {
  ExternalLink,
  ShieldCheck,
  Receipt,
  CreditCard,
  Package,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  User,
  ArrowRight,
  Plus
} from 'lucide-react';

export const CustomerPortal = () => {
  const {
    currentUser,
    subscriptions,
    plans,
    products,
    invoices,
    customers,
    updateSubscription,
    recordPayment,
    showToast
  } = useBrightloop();

  // Find customer profile linked to the logged in user or default to Apex Retail Labs
  const currentCustId = currentUser?.customerId || customers[0]?.id;
  const currentCustomer = customers.find(c => c.id === currentCustId) || customers[0];

  // Customer only sees THEIR subscriptions
  const mySubscriptions = subscriptions.filter(s => s.customerId === currentCustId);
  // Customer only sees THEIR invoices
  const myInvoices = invoices.filter(i => i.customerId === currentCustId);

  // Available add-ons from products catalog
  const availableAddons = products.filter(p => p.type === 'Add-on');

  // Payment modal state
  const [selectedPayInvoice, setSelectedPayInvoice] = useState(null);
  const [payMethod, setPayMethod] = useState('Card');
  const [isPaying, setIsPaying] = useState(false);

  // Toggle add-on on/off on active subscription
  const handleToggleAddon = async (sub, addonProd) => {
    const existingIndex = (sub.lines || []).findIndex(l => l.productId === addonProd.id);

    let updatedLines = [...(sub.lines || [])];

    if (existingIndex >= 0) {
      // Turn off add-on
      updatedLines.splice(existingIndex, 1);
      showToast('info', `Disabled add-on "${addonProd.name}" from subscription ${sub.subNumber}`);
    } else {
      // Turn on add-on
      updatedLines.push({
        id: `addon-line-${Date.now()}`,
        productId: addonProd.id,
        productName: addonProd.name,
        variantId: null,
        variantName: null,
        quantity: 1,
        basePrice: addonProd.salesPrice,
        variantExtra: 0,
        unitPrice: addonProd.salesPrice,
        taxRate: 18,
        total: addonProd.salesPrice
      });
      showToast('success', `Activated add-on "${addonProd.name}" (+$${addonProd.salesPrice}/mo) on ${sub.subNumber}`);
    }

    await updateSubscription(sub.id, { lines: updatedLines });
  };

  const handlePayMyInvoice = async (e) => {
    e.preventDefault();
    if (!selectedPayInvoice) return;

    setIsPaying(true);
    try {
      await recordPayment({
        invoiceId: selectedPayInvoice.id,
        amount: selectedPayInvoice.remainingAmount,
        method: payMethod,
        reference: `PORTAL-PAY-${Date.now().toString().slice(-6)}`,
        notes: `Customer self-service online settlement via ${payMethod}`
      });
      showToast('success', `Payment of $${selectedPayInvoice.remainingAmount} successful! Invoice settled.`);
      setSelectedPayInvoice(null);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Customer Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#714B67] to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs">
            Customer Self-Service Portal
          </span>
          <h2 className="text-2xl font-black mt-2 tracking-tight">
            {currentCustomer?.name}
          </h2>
          <p className="text-xs text-white/80 mt-1 flex items-center gap-2">
            <span>Primary Contact: {currentCustomer?.contactName} ({currentCustomer?.email})</span>
            <span>•</span>
            <span>Tax ID: {currentCustomer?.taxId}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3 rounded-xl text-right">
            <span className="text-[10px] text-white/70 block uppercase font-medium">Active Licenses</span>
            <span className="text-xl font-black font-mono">
              {mySubscriptions.filter(s => s.status === 'Active').length} Contracts
            </span>
          </div>
        </div>
      </div>

      {/* Customer Subscriptions & Add-on Management Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#714B67]" />
            <span>My Subscriptions & Add-on License Toggles</span>
          </h3>
          <span className="text-xs text-slate-500">
            Toggle modules on/off anytime without contacting support
          </span>
        </div>

        {mySubscriptions.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            No active subscriptions found for this account.
          </div>
        ) : (
          <div className="space-y-4">
            {mySubscriptions.map((sub) => {
              const plan = plans.find(p => p.id === sub.planId);
              const subTotal = (sub.lines || []).reduce((acc, l) => acc + (Number(l.total) || (l.quantity * l.unitPrice)), 0);

              return (
                <div key={sub.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-[#714B67]">{sub.subNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          sub.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {sub.status}
                        </span>
                        {sub.isPaused && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            PAUSED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Plan: <strong>{plan?.name}</strong> • Frequency: {plan?.billingFrequency} • Next Renewal: {sub.expiryDate}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-black text-slate-900 font-mono">
                        ${subTotal.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 block">/{plan?.billingFrequency}</span>
                    </div>
                  </div>

                  {/* Active Lines */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-2">Included Products & Editions:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(sub.lines || []).map((line, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-800">{line.productName}</span>
                            {line.variantName && (
                              <span className="text-[11px] text-[#714B67] block">
                                {line.variantName}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-slate-700">
                            Qty: {line.quantity} (${line.unitPrice})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Self-Service Add-ons Toggles */}
                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#00A09D]" />
                        <span>Self-Service Add-on Modules (Instant Activation)</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Changes apply automatically to next invoice
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {availableAddons.map((addon) => {
                        const isEnabled = (sub.lines || []).some(l => l.productId === addon.id);

                        return (
                          <div
                            key={addon.id}
                            className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition ${
                              isEnabled
                                ? 'bg-teal-50/60 border-teal-300'
                                : 'bg-slate-50/50 border-slate-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900">{addon.name}</span>
                                <span className="font-mono font-bold text-slate-800">+${addon.salesPrice}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">
                                {addon.notes}
                              </p>
                            </div>

                            <button
                              onClick={() => handleToggleAddon(sub, addon)}
                              className={`w-full py-1.5 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
                                isEnabled
                                  ? 'bg-[#00A09D] hover:bg-[#008784] text-white shadow-xs'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                              }`}
                            >
                              {isEnabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                              <span>{isEnabled ? 'Active (Click to Remove)' : 'Add to Subscription'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer Invoices & Payment Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#714B67]" />
            <span>My Invoices & Statements</span>
          </h3>
          <span className="text-xs text-slate-500">
            Pay online directly using Card or UPI
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No invoices currently issued for your account.
                    </td>
                  </tr>
                ) : (
                  myInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-[#714B67]">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{inv.invoiceDate}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{inv.dueDate}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        ${Number(inv.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {(Number(inv.remainingAmount) || 0) > 0 ? (
                          <span className="text-rose-600">${Number(inv.remainingAmount || 0).toFixed(2)}</span>
                        ) : (
                          <span className="text-emerald-600">$0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {inv.remainingAmount > 0 ? (
                          <button
                            onClick={() => setSelectedPayInvoice(inv)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs shadow-xs transition"
                          >
                            Pay Online
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-semibold text-xs flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Online Payment Modal */}
      {selectedPayInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                Pay Invoice {selectedPayInvoice.invoiceNumber}
              </h3>
              <button onClick={() => setSelectedPayInvoice(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handlePayMyInvoice} className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 text-center">
                <span className="text-xs text-slate-500 block mb-1">Amount to Pay</span>
                <span className="text-3xl font-black text-[#714B67] font-mono">
                  ${Number(selectedPayInvoice.remainingAmount || 0).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Choose Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Card', 'UPI', 'Bank Transfer'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition ${
                        payMethod === m
                          ? 'border-[#714B67] bg-purple-50 text-[#714B67]'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {payMethod === 'Card' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    defaultValue="4242 •••• •••• 4242"
                    placeholder="Card Number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      defaultValue="12/28"
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                    <input
                      type="password"
                      required
                      defaultValue="888"
                      placeholder="CVC"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              {payMethod === 'UPI' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Virtual Payment Address (VPA)</label>
                  <input
                    type="text"
                    required
                    defaultValue="user@okaxis"
                    placeholder="yourname@upi"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPayInvoice(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {isPaying ? 'Processing...' : `Authorize $${Number(selectedPayInvoice.remainingAmount || 0).toFixed(2)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
