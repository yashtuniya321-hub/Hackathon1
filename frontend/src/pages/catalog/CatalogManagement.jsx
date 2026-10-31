import React, { useState } from 'react';
import { useBrightloop } from '../../context/BrightloopContext';
import {
  Package,
  Plus,
  Repeat,
  Percent,
  Sliders,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  ShieldAlert,
  Sparkles,
  Info,
  Check
} from 'lucide-react';

export const CatalogManagement = () => {
  const {
    currentUser,
    products,
    createProduct,
    updateProduct,
    deleteProduct,
    plans,
    createPlan,
    updatePlan,
    deletePlan,
    taxRules,
    createTaxRule,
    deleteTaxRule
  } = useBrightloop();

  const isAdmin = currentUser?.role === 'Admin';
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'plans' | 'taxes'

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    type: 'Software',
    salesPrice: 450,
    costPrice: 120,
    notes: '',
    variants: []
  });

  // Variant helper inside product modal
  const [newVariant, setNewVariant] = useState({ name: '', brand: '', extraPrice: 0 });

  // Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    billingFrequency: 'monthly',
    cost: 499,
    minQuantity: 1,
    availableFrom: '2026-01-01',
    availableTo: '2026-12-31',
    autoClose: false,
    canCloseEarly: true,
    canPause: true,
    canRenew: true,
    description: ''
  });

  // Tax Modal State
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxForm, setTaxForm] = useState({
    name: '',
    rate: 18,
    description: ''
  });

  // --- Handlers for Products ---
  const handleOpenProductModal = (prod = null) => {
    if (!isAdmin) return;
    if (prod) {
      setEditingProduct(prod);
      setProductForm({
        name: prod.name,
        type: prod.type,
        salesPrice: prod.salesPrice,
        costPrice: prod.costPrice,
        notes: prod.notes || '',
        variants: prod.variants ? [...prod.variants] : []
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        type: 'Software',
        salesPrice: 500,
        costPrice: 150,
        notes: '',
        variants: []
      });
    }
    setNewVariant({ name: '', brand: '', extraPrice: 0 });
    setIsProductModalOpen(true);
  };

  const handleAddVariantToForm = () => {
    if (!newVariant.name) return;
    setProductForm(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: `var-${Date.now()}`,
          name: newVariant.name,
          brand: newVariant.brand || 'Custom',
          extraPrice: Number(newVariant.extraPrice) || 0
        }
      ]
    }));
    setNewVariant({ name: '', brand: '', extraPrice: 0 });
  };

  const handleRemoveVariantFromForm = (varId) => {
    setProductForm(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== varId)
    }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (editingProduct) {
      await updateProduct(editingProduct.id, productForm);
    } else {
      await createProduct(productForm);
    }
    setIsProductModalOpen(false);
  };

  // --- Handlers for Plans ---
  const handleOpenPlanModal = (plan = null) => {
    if (!isAdmin) return;
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({ ...plan });
    } else {
      setEditingPlan(null);
      setPlanForm({
        name: '',
        billingFrequency: 'monthly',
        cost: 299,
        minQuantity: 1,
        availableFrom: '2026-01-01',
        availableTo: '2026-12-31',
        autoClose: false,
        canCloseEarly: true,
        canPause: true,
        canRenew: true,
        description: ''
      });
    }
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (editingPlan) {
      await updatePlan(editingPlan.id, planForm);
    } else {
      await createPlan(planForm);
    }
    setIsPlanModalOpen(false);
  };

  // --- Handlers for Tax ---
  const handleSaveTax = async (e) => {
    e.preventDefault();
    await createTaxRule(taxForm);
    setIsTaxModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Product Catalog, Variants & Plans</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-[#714B67] border border-purple-200">
              Admin Protected
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure software products, brand price-delta variants (e.g. +560 Odoo edition), and plan lifecycle controls.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'products'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Products & Variants ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'plans'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Subscription Plans ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab('taxes')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'taxes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tax Rules ({taxRules.length})
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>
            <strong>Read-Only Mode:</strong> You are signed in as an operational role. Catalog modifications and plan governance require Admin elevation.
          </span>
        </div>
      )}

      {/* --- TAB 1: PRODUCTS & VARIANTS --- */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Configured Products</h3>
            {isAdmin && (
              <button
                onClick={() => handleOpenProductModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67] hover:bg-[#5d3d54] text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Product</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      prod.type === 'Variant Product'
                        ? 'bg-purple-100 text-[#714B67]'
                        : prod.type === 'Add-on'
                        ? 'bg-teal-50 text-[#00A09D]'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {prod.type}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenProductModal(prod)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteProduct(prod.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-1">{prod.name}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{prod.notes}</p>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-lg font-black text-slate-900">
                      ${prod.salesPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">
                      (Cost: ${prod.costPrice})
                    </span>
                  </div>

                  {/* Pricing Variants List */}
                  {prod.variants && prod.variants.length > 0 && (
                    <div className="border-t border-slate-100 pt-3 mt-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Brand Variants ({prod.variants.length})
                      </p>
                      <div className="space-y-1">
                        {prod.variants.map((v) => (
                          <div
                            key={v.id}
                            className={`flex items-center justify-between p-1.5 rounded text-xs ${
                              v.brand === 'Odoo'
                                ? 'bg-purple-50 text-[#714B67] border border-purple-200 font-semibold'
                                : 'bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {v.brand === 'Odoo' && <Sparkles className="w-3 h-3 text-[#714B67]" />}
                              <span>{v.name}</span>
                            </div>
                            <span className="font-mono">
                              {v.extraPrice > 0 ? `+$${v.extraPrice}` : '$0'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>ID: {prod.id}</span>
                  <span className="text-emerald-600 font-medium">In Catalog</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 2: SUBSCRIPTION PLANS & LIFECYCLE CONTROLS --- */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Subscription Plans & Strict Lifecycle Governance
            </h3>
            {isAdmin && (
              <button
                onClick={() => handleOpenPlanModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67] hover:bg-[#5d3d54] text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Configure Plan</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-[#00A09D] border border-teal-200">
                      {plan.billingFrequency}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenPlanModal(plan)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                          title="Edit Plan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePlan(plan.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-1">{plan.name}</h4>
                  <p className="text-xs text-slate-500 mb-3">{plan.description}</p>

                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">
                        ${plan.cost}
                      </span>
                      <span className="text-xs text-slate-500">/{plan.billingFrequency}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Min Seats: {plan.minQuantity || 1} • Window: {plan.availableFrom} to {plan.availableTo}
                    </p>
                  </div>

                  {/* Lifecycle Rules Checkbox Grid */}
                  <div className="border-t border-slate-100 pt-3 mt-2 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Lifecycle Controls
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Auto Close on Expiry:</span>
                      <span className={`font-semibold ${plan.autoClose ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {plan.autoClose ? 'Yes' : 'No'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Can Close Early:</span>
                      <span className={`font-semibold ${plan.canCloseEarly ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {plan.canCloseEarly ? 'Allowed' : 'Locked'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Can Pause:</span>
                      <span className={`font-semibold ${plan.canPause ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {plan.canPause ? 'Allowed' : 'Prohibited'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Can Renew:</span>
                      <span className={`font-semibold ${plan.canRenew ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {plan.canRenew ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  Plan ID: {plan.id}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 3: TAX RULES --- */}
      {activeTab === 'taxes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Admin Configured Tax Rules</h3>
              <p className="text-xs text-slate-500">Taxes are calculated automatically on subscriptions and invoice line items.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsTaxModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67] hover:bg-[#5d3d54] text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Tax Rule</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {taxRules.map((tax) => (
              <div key={tax.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-black text-slate-800 font-mono">
                    {tax.rate}%
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => deleteTaxRule(tax.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                      title="Delete tax rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">{tax.name}</h4>
                <p className="text-xs text-slate-500 mb-2">{tax.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">Active Rule</span>
                  <span className="text-slate-400 font-mono">{tax.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PRODUCT MODAL --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingProduct ? 'Edit Product & Pricing Variants' : 'Create New Product'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="e.g. Brightloop ERP Core Suite"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Type</label>
                  <select
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="Software">Software</option>
                    <option value="Add-on">Add-on</option>
                    <option value="Variant Product">Variant Product</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Base Sales Price ($)</label>
                  <input
                    type="number"
                    required
                    value={productForm.salesPrice}
                    onChange={(e) => setProductForm({ ...productForm, salesPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    required
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={productForm.notes}
                    onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="Internal description"
                  />
                </div>
              </div>

              {/* Dynamic Variants Section */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    Dynamic Variants & Brand Price-Adjustments
                  </label>
                  <span className="text-[11px] text-slate-500">
                    e.g. "Odoo" adds +560 to base price
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  {productForm.variants.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">{v.name}</span>
                        <span className="text-slate-500 ml-2">Brand: {v.brand}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-[#714B67]">
                          +${v.extraPrice}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantFromForm(v.id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Variant Form */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                  <input
                    type="text"
                    placeholder="Variant Name"
                    value={newVariant.name}
                    onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Brand (e.g. Odoo)"
                    value={newVariant.brand}
                    onChange={(e) => setNewVariant({ ...newVariant, brand: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  />
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder="Extra Price"
                      value={newVariant.extraPrice}
                      onChange={(e) => setNewVariant({ ...newVariant, extraPrice: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddVariantToForm}
                      className="px-3 py-1.5 bg-[#714B67] text-white rounded text-xs font-semibold whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#714B67] text-white rounded-lg text-xs font-semibold hover:bg-[#5d3d54]"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PLAN MODAL --- */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingPlan ? 'Edit Subscription Plan' : 'Configure New Subscription Plan'}
              </h3>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="e.g. Quarterly Growth Plan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Frequency</label>
                  <select
                    value={planForm.billingFrequency}
                    onChange={(e) => setPlanForm({ ...planForm, billingFrequency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Base Plan Cost ($)</label>
                  <input
                    type="number"
                    required
                    value={planForm.cost}
                    onChange={(e) => setPlanForm({ ...planForm, cost: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Seats</label>
                  <input
                    type="number"
                    required
                    value={planForm.minQuantity}
                    onChange={(e) => setPlanForm({ ...planForm, minQuantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Available From</label>
                  <input
                    type="date"
                    required
                    value={planForm.availableFrom}
                    onChange={(e) => setPlanForm({ ...planForm, availableFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Available To</label>
                  <input
                    type="date"
                    required
                    value={planForm.availableTo}
                    onChange={(e) => setPlanForm({ ...planForm, availableTo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Exact Lifecycle Controls Switches */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-xs font-bold text-slate-800">
                  Lifecycle Controls (Strictly Enforced on Subscriptions)
                </p>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.autoClose}
                    onChange={(e) => setPlanForm({ ...planForm, autoClose: e.target.checked })}
                    className="rounded text-[#714B67] focus:ring-[#714B67]"
                  />
                  <span><strong>Auto Close:</strong> Automatically close subscription on reach of end date</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.canCloseEarly}
                    onChange={(e) => setPlanForm({ ...planForm, canCloseEarly: e.target.checked })}
                    className="rounded text-[#714B67] focus:ring-[#714B67]"
                  />
                  <span><strong>Can Close Early:</strong> Allow staff/customer to close before expiry</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.canPause}
                    onChange={(e) => setPlanForm({ ...planForm, canPause: e.target.checked })}
                    className="rounded text-[#714B67] focus:ring-[#714B67]"
                  />
                  <span><strong>Can Pause:</strong> Allow pausing billing and services</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.canRenew}
                    onChange={(e) => setPlanForm({ ...planForm, canRenew: e.target.checked })}
                    className="rounded text-[#714B67] focus:ring-[#714B67]"
                  />
                  <span><strong>Can Renew:</strong> Allow subscription extension & renewal</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#714B67] text-white rounded-lg text-xs font-semibold hover:bg-[#5d3d54]"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- TAX MODAL --- */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Add Tax Rule</h3>
              <button onClick={() => setIsTaxModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleSaveTax} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Name</label>
                <input
                  type="text"
                  required
                  value={taxForm.name}
                  onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                  placeholder="e.g. Sales Tax 8.25%"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Percentage Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={taxForm.rate}
                  onChange={(e) => setTaxForm({ ...taxForm, rate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTaxModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#714B67] text-white rounded-lg text-xs font-semibold"
                >
                  Create Tax
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
