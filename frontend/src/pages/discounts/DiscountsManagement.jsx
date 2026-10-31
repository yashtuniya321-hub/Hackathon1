import React, { useState } from 'react';
import { useBrightloop } from '../../context/BrightloopContext';
import {
  Percent,
  Plus,
  Trash2,
  Calendar,
  Layers,
  AlertCircle,
  CheckCircle2,
  Lock,
  Tag,
  Clock,
  Sparkles
} from 'lucide-react';

export const DiscountsManagement = () => {
  const { currentUser, discounts, createDiscount, updateDiscount, deleteDiscount, products } = useBrightloop();
  const isAdmin = currentUser?.role === 'Admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'percentage', // 'percentage' | 'fixed'
    value: 15,
    minPurchaseAmount: 1000,
    minSeats: 1,
    scope: 'subscription', // 'subscription' | 'product'
    targetProductId: '',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    maxUses: 50,
    description: ''
  });

  const handleOpenModal = () => {
    if (!isAdmin) return;
    setFormData({
      code: '',
      name: '',
      type: 'percentage',
      value: 15,
      minPurchaseAmount: 500,
      minSeats: 1,
      scope: 'subscription',
      targetProductId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      maxUses: 50,
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleSaveDiscount = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    await createDiscount({
      ...formData,
      code: formData.code.toUpperCase().replace(/\s+/g, '')
    });
    setIsModalOpen(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Admin Discount Engine</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-[#714B67] border border-purple-200">
              Admin Protected
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create automated coupon rules with volume thresholds, auto-application on billing cycles, and automatic expiration.
          </p>
        </div>

        <div>
          {isAdmin ? (
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5d3d54] text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Discount Rule</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Admin Only Configuration</span>
            </div>
          )}
        </div>
      </div>

      {/* Discount Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {discounts.map((disc) => {
          const isExpired = disc.endDate && disc.endDate < todayStr;
          const isMaxedOut = disc.maxUses && disc.currentUses >= disc.maxUses;
          const isAvailable = disc.active && !isExpired && !isMaxedOut;

          return (
            <div
              key={disc.id}
              className={`bg-white rounded-xl border p-5 shadow-sm transition flex flex-col justify-between ${
                isAvailable
                  ? 'border-slate-200 hover:border-purple-300'
                  : 'border-slate-200 bg-slate-50/70 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-purple-100 text-[#714B67] font-mono font-bold text-xs rounded-md border border-purple-200">
                      {disc.code}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      disc.scope === 'subscription' ? 'bg-teal-50 text-[#00A09D]' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {disc.scope}
                    </span>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => deleteDiscount(disc.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete discount"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="font-bold text-slate-800 text-sm mb-1">{disc.name}</h3>
                <p className="text-xs text-slate-500 mb-3">{disc.description}</p>

                {/* Concession Value */}
                <div className="mb-4">
                  <span className="text-2xl font-black text-slate-900">
                    {disc.type === 'percentage' ? `${disc.value}% OFF` : `$${disc.value} OFF`}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Requires min spend ${disc.minPurchaseAmount} or {disc.minSeats} seats
                  </p>
                </div>

                {/* Usage meter */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Usage Progress:</span>
                    <span className="font-semibold text-slate-700">
                      {disc.currentUses || 0} / {disc.maxUses} uses
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#714B67] h-full transition-all"
                      style={{ width: `${Math.min(100, ((disc.currentUses || 0) / (disc.maxUses || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Expiry and auto-application badge */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Valid through:
                    </span>
                    <span className="font-mono">{disc.endDate}</span>
                  </div>
                  {disc.targetProductId && (
                    <div className="text-slate-500 truncate">
                      Applies to: {products.find(p => p.id === disc.targetProductId)?.name || disc.targetProductId}
                    </div>
                  )}
                </div>
              </div>

              {/* Status footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                {isAvailable ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Auto-Applies on Billing
                  </span>
                ) : isExpired ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    <AlertCircle className="w-3 h-3" /> Expired Date
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <AlertCircle className="w-3 h-3" /> Max Uses Reached
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">ID: {disc.id}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Discount Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Create Admin Discount Rule</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveDiscount} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. BRIGHTFLUX25"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Hackathon Concession"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Value ({formData.type === 'percentage' ? '%' : '$'})
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Spend ($)</label>
                  <input
                    type="number"
                    value={formData.minPurchaseAmount}
                    onChange={(e) => setFormData({ ...formData, minPurchaseAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Seats</label>
                  <input
                    type="number"
                    value={formData.minSeats}
                    onChange={(e) => setFormData({ ...formData, minSeats: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (Auto-Expiry)</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Scope</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="subscription">Entire Subscription Subtotal</option>
                    <option value="product">Specific Product Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Uses</label>
                  <input
                    type="number"
                    required
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                {formData.scope === 'product' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Product</label>
                    <select
                      value={formData.targetProductId}
                      onChange={(e) => setFormData({ ...formData, targetProductId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">Select product to discount...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (${p.salesPrice})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Approved by CFO for enterprise accounts"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#714B67] text-white rounded-lg text-xs font-semibold hover:bg-[#5d3d54]"
                >
                  Create Discount Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
