import React, { useState } from 'react';
import { useBrightloop } from '../../context/BrightloopContext';
import { FileSpreadsheet, Plus, Trash2, ArrowRight, Layers, CheckCircle2, Clock } from 'lucide-react';

export const QuotationTemplates = () => {
  const { templates, plans, products, taxRules, createTemplate, deleteTemplate } = useBrightloop();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    planId: '',
    validityDays: 30,
    description: '',
    lines: []
  });

  const [newLine, setNewLine] = useState({
    productId: '',
    variantId: '',
    quantity: 1,
    taxId: ''
  });

  const handleOpenModal = () => {
    setFormData({
      name: '',
      planId: plans[0]?.id || '',
      validityDays: 30,
      description: '',
      lines: []
    });
    setNewLine({
      productId: products[0]?.id || '',
      variantId: '',
      quantity: 1,
      taxId: taxRules[0]?.id || ''
    });
    setIsModalOpen(true);
  };

  const handleAddLine = () => {
    if (!newLine.productId) return;
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { ...newLine }]
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await createTemplate(formData);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Quotation Templates</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-[#00A09D] border border-teal-200">
              Sales Fast-Track
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pre-configure standard customer packages with default plan, product lines, variants, and validity windows.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5d3d54] text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation Template</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {templates.map((tmpl) => {
          const linkedPlan = plans.find(p => p.id === tmpl.planId);

          return (
            <div key={tmpl.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-[#714B67]">
                    {linkedPlan?.billingFrequency || 'Standard'} Plan
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-1">{tmpl.name}</h3>
                </div>
                <button
                  onClick={() => deleteTemplate(tmpl.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                  title="Delete template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4">{tmpl.description}</p>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Linked Plan:</span>
                  <span className="font-semibold text-slate-800">{linkedPlan?.name || 'Custom'}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Offer Validity:
                  </span>
                  <span className="font-semibold text-slate-800">{tmpl.validityDays} Days</span>
                </div>
              </div>

              {/* Product Lines preview */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Pre-configured Lines ({tmpl.lines?.length || 0})
                </p>
                <div className="space-y-1.5">
                  {(tmpl.lines || []).map((line, idx) => {
                    const prod = products.find(p => p.id === line.productId);
                    const variant = prod?.variants?.find(v => v.id === line.variantId);
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 border border-slate-100">
                        <span className="text-slate-800 font-medium">
                          {prod?.name || 'Software Line'} {variant ? `(${variant.name})` : ''}
                        </span>
                        <span className="font-mono text-slate-600">
                          Qty: {line.quantity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                <span className="text-[11px] text-[#00A09D] font-semibold">
                  Ready to deploy in Subscriptions
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Create Quotation Template</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Standard SME Retail Pack"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Plan</label>
                  <select
                    value={formData.planId}
                    onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (${p.cost}/{p.billingFrequency})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    value={formData.validityDays}
                    onChange={(e) => setFormData({ ...formData, validityDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary for sales representatives"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {/* Add Lines */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">Configure Product Lines</label>
                </div>

                <div className="flex gap-2 mb-2">
                  <select
                    value={newLine.productId}
                    onChange={(e) => setNewLine({ ...newLine, productId: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (${p.salesPrice})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={newLine.quantity}
                    onChange={(e) => setNewLine({ ...newLine, quantity: Number(e.target.value) })}
                    className="w-20 px-2 py-1.5 border border-slate-300 rounded text-xs"
                    placeholder="Qty"
                  />
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-3 py-1.5 bg-[#714B67] text-white rounded text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1">
                  {formData.lines.map((l, idx) => {
                    const prod = products.find(p => p.id === l.productId);
                    return (
                      <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-50 border rounded text-xs">
                        <span>{prod?.name} (Qty: {l.quantity})</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== idx) })}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#714B67] text-white rounded-lg text-xs font-semibold"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
