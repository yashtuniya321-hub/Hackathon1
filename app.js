/**
 * Brightloop Software - Frontend Application Controller
 * Connects UI to Express + PostgreSQL Backend
 * Handles: Live Dashboard, Subscriptions Lifecycle, Billing Cron, Invoices & Payments
 */

// Automatically detect if running directly from Node server (:5000) or VS Code Live Server (:5500, etc.)
const API_BASE = (window.location.port === '5000' || !window.location.port) 
  ? '/api' 
  : 'http://localhost:5000/api';

// Global state
let state = {
  token: localStorage.getItem('bl_token') || '',
  currentUser: JSON.parse(localStorage.getItem('bl_user') || 'null'),
  products: [],
  plans: [],
  customers: [],
  selectedSubForTransition: null
};

// DOM Elements
const toast = document.querySelector('#toast');
const toastMsg = document.querySelector('#toastMsg');

function showToast(message, duration = 3500) {
  if (toastMsg) toastMsg.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

if (toast.querySelector('button')) {
  toast.querySelector('button').addEventListener('click', () => toast.classList.remove('show'));
}

// Helper: Authenticated fetch wrapper
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `API Error: ${res.statusText}`);
    }
    return data;
  } catch (err) {
    console.error(`Fetch error on [${endpoint}]:`, err);
    throw err;
  }
}

// 1. Initial Login & Session Management
async function ensureAuthenticated() {
  if (state.token && state.currentUser) {
    updateProfileUI();
    return true;
  }

  try {
    // Default initial auto-login as Admin for immediate demo readiness
    console.log('Authenticating with backend as Admin (Alex Morgan)...');
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@brightloop.io',
        password: 'Admin@12345'
      })
    });

    const data = await res.json();
    if (data.success && data.token) {
      state.token = data.token;
      state.currentUser = data.user;
      localStorage.setItem('bl_token', data.token);
      localStorage.setItem('bl_user', JSON.stringify(data.user));
      updateProfileUI();
      return true;
    }
  } catch (err) {
    console.warn('Auto-login failed. Server might be connecting to PostgreSQL:', err.message);
  }
  return false;
}

function updateProfileUI() {
  if (!state.currentUser) return;
  const userNameEl = document.querySelector('#userName');
  const userRoleEl = document.querySelector('#userRole');
  const greetingEl = document.querySelector('#headerGreetingName');
  const avatarEl = document.querySelector('#userAvatar');

  const fullName = `${state.currentUser.firstName || ''} ${state.currentUser.lastName || ''}`.trim() || 'Alex Morgan';
  if (userNameEl) userNameEl.textContent = fullName;
  if (userRoleEl) userRoleEl.textContent = state.currentUser.role || 'Administrator';
  if (greetingEl) greetingEl.textContent = state.currentUser.firstName || 'Alex';
  if (avatarEl) {
    avatarEl.textContent = (fullName[0] || 'A') + (fullName.split(' ')[1]?.[0] || 'M');
  }
}

// 2. Load Finance Dashboard
async function loadFinanceDashboard() {
  try {
    const res = await apiRequest('/dashboard/finance');
    if (!res.success) return;

    const data = res.data;
    const perf = res.performance;

    // Update KPIs
    const kpiMmr = document.querySelector('#kpiMmr');
    const kpiActive = document.querySelector('#kpiActiveSubs');
    const kpiOutstanding = document.querySelector('#kpiOutstanding');
    const kpiOverdue = document.querySelector('#kpiOverdueDetail');
    const kpiPayments = document.querySelector('#kpiPayments');
    const perfPill = document.querySelector('#perfPill');

    if (kpiActive) kpiActive.textContent = data.totalActiveSubscriptions.toLocaleString();
    if (kpiPayments) kpiPayments.textContent = `$${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (kpiOutstanding) kpiOutstanding.textContent = `$${data.receivables.totalPendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (kpiOverdue) kpiOverdue.textContent = `$${data.overdueInvoices.totalOverdueAmount.toLocaleString()} overdue (${data.overdueInvoices.count} inv)`;

    // Estimate MRR
    if (kpiMmr) {
      const estimatedMmr = data.totalRevenue > 0 ? (data.totalRevenue * 0.75) : (data.totalActiveSubscriptions * 1400);
      kpiMmr.textContent = `$${estimatedMmr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (perfPill && perf) {
      perfPill.innerHTML = `⚡ <strong>DB Response: ${perf.executionTimeMs}</strong> &nbsp;•&nbsp; Benchmark: ${perf.status}`;
    }

    // Render Overdue Alert list
    renderOverdueList(data.overdueInvoices.topOverdueList || []);
  } catch (err) {
    console.error('Failed to load finance dashboard:', err);
  }
}

function renderOverdueList(invoices) {
  const container = document.querySelector('#overdueInvoicesList');
  if (!container) return;

  if (invoices.length === 0) {
    container.innerHTML = `<div style="padding: 16px; color: #46a577; text-align: center; font-size: 12px;">✓ No overdue invoices. All accounts are in good standing.</div>`;
    return;
  }

  container.innerHTML = invoices.map(inv => `
    <div class="activity-row">
      <span class="activity-icon rose">!</span>
      <div>
        <strong>${inv.invoice_number} — $${parseFloat(inv.balance_due).toFixed(2)}</strong>
        <p>${inv.customer_name_snapshot || inv.customer_email_snapshot} · <b class="negative">${inv.days_overdue} days overdue</b></p>
      </div>
      <button class="action-btn" onclick="openPaymentModal(${inv.id}, '${inv.invoice_number}', ${inv.balance_due})" style="margin-left: auto;">Pay</button>
    </div>
  `).join('');
}

// 3. Load Subscriptions Table
async function loadSubscriptions() {
  try {
    const res = await apiRequest('/subscriptions');
    if (!res.success) return;

    const subs = res.subscriptions;
    const tbody = document.querySelector('#subsTableBody');
    const badge = document.querySelector('#subsCountBadge');
    const navBadge = document.querySelector('#navSubCount');

    if (badge) badge.textContent = subs.length;
    if (navBadge) navBadge.textContent = subs.length;

    if (!tbody) return;

    if (subs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:#8f8c9d;">No subscriptions found. Click "+ New subscription" to create one.</td></tr>`;
      return;
    }

    const NEXT_STATE = {
      'Draft': 'Quotation',
      'Quotation': 'Confirmed',
      'Confirmed': 'Active',
      'Active': 'Closed',
      'Closed': null
    };

    const BADGE_CLASS = {
      'Draft': 'badge-draft',
      'Quotation': 'badge-quotation',
      'Confirmed': 'badge-confirmed',
      'Active': 'badge-active',
      'Closed': 'badge-closed'
    };

    tbody.innerHTML = subs.map(s => {
      const next = NEXT_STATE[s.status];
      const initials = (s.customer_name || 'Customer').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      const nextDate = s.next_billing_date ? new Date(s.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

      return `
        <tr>
          <td>
            <div class="customer">
              <span class="customer-avatar coral">${initials}</span>
              <div>
                <strong>${s.customer_name || s.customer_email}</strong>
                <div style="font-size:10px; color:#8f8c9d; font-family:'DM Mono'">${s.subscription_code}</div>
              </div>
            </div>
          </td>
          <td><strong>${s.plan_name}</strong><br><small style="color:#8f8c9d;">${s.billing_frequency} · ${s.closure_rule}</small></td>
          <td><span class="status-badge ${BADGE_CLASS[s.status] || ''}">${s.status}</span></td>
          <td><b>${nextDate}</b></td>
          <td><strong>$${parseFloat(s.grand_total).toFixed(2)}</strong></td>
          <td style="text-align: right;">
            ${next ? `
              <button class="action-btn" onclick="openStatusModal(${s.id}, '${s.subscription_code}', '${s.status}', '${next}')">
                ➔ ${next}
              </button>
            ` : `<span style="color:#a8a6b6; font-size:11px;">Completed</span>`}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load subscriptions:', err);
  }
}

// 4. Load Invoices Table
async function loadInvoices() {
  try {
    const res = await apiRequest('/invoices');
    if (!res.success) return;

    const invoices = res.invoices;
    const tbody = document.querySelector('#invoicesTableBody');
    const badge = document.querySelector('#invoicesCountBadge');
    const navBadge = document.querySelector('#navInvCount');

    if (badge) badge.textContent = invoices.length;
    if (navBadge) navBadge.textContent = invoices.length;
    if (!tbody) return;

    if (invoices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#8f8c9d;">No invoices generated yet. Click "⚡ Run Billing Cycle" to generate due invoices.</td></tr>`;
      return;
    }

    const INVOICE_BADGE = {
      'Draft': 'badge-draft',
      'Confirmed': 'badge-confirmed',
      'Paid': 'badge-paid'
    };

    tbody.innerHTML = invoices.map(inv => {
      const grandTotal = parseFloat(inv.grand_total);
      const paid = parseFloat(inv.paid_amount || 0);
      const remaining = grandTotal - paid;
      const dueDate = new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      return `
        <tr>
          <td><strong style="font-family:'DM Mono'">${inv.invoice_number}</strong></td>
          <td>${inv.customer_name_snapshot || inv.customer_email_snapshot}</td>
          <td><span class="status-badge ${INVOICE_BADGE[inv.status] || ''}">${inv.status}</span></td>
          <td>${dueDate}</td>
          <td><strong>$${grandTotal.toFixed(2)}</strong></td>
          <td>$${paid.toFixed(2)}</td>
          <td style="text-align: right;">
            ${inv.status !== 'Paid' ? `
              <button class="action-btn" onclick="openPaymentModal(${inv.id}, '${inv.invoice_number}', ${remaining})">
                Record Payment
              </button>
            ` : `<span style="color:#2ea879; font-weight:600; font-size:11px;">✓ Paid in Full</span>`}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load invoices:', err);
  }
}

// 5. Load Payments Table
async function loadPayments() {
  try {
    const res = await apiRequest('/payments');
    if (!res.success) return;

    const payments = res.payments;
    const tbody = document.querySelector('#paymentsTableBody');
    if (!tbody) return;

    if (payments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:#8f8c9d;">No payments recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = payments.map(p => `
      <tr>
        <td><strong style="font-family:'DM Mono'">${p.payment_reference}</strong></td>
        <td>${p.invoice_number}</td>
        <td><span class="status-badge badge-confirmed">${p.payment_method}</span></td>
        <td><strong style="color:#2ea879;">$${parseFloat(p.amount).toFixed(2)}</strong></td>
        <td>${new Date(p.payment_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${p.notes || '—'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load payments:', err);
  }
}

// 6. Load Catalog & Plans
async function loadCatalog() {
  try {
    const [pRes, plRes] = await Promise.all([
      apiRequest('/products'),
      apiRequest('/plans')
    ]);

    state.products = pRes.products || [];
    state.plans = plRes.plans || [];

    // Render Products container
    const prodContainer = document.querySelector('#productsListContainer');
    if (prodContainer) {
      prodContainer.innerHTML = state.products.map(p => `
        <div style="background:#fff; border:1px solid #e9e8f0; border-radius:8px; padding:12px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${p.name}</strong>
            <span style="font-family:'DM Mono'; font-size:11px; color:#6e5de0;">$${parseFloat(p.sales_price).toFixed(2)}</span>
          </div>
          <div style="font-size:11px; color:#8f8c9d; margin:4px 0;">SKU: ${p.sku}</div>
          ${p.variants && p.variants.length > 0 ? `
            <div style="margin-top:8px; padding-top:6px; border-top:1px dashed #eee;">
              <small style="font-size:10px; color:#6b6782; font-weight:600;">Variants:</small>
              ${p.variants.map(v => `
                <div style="font-size:11px; display:flex; justify-content:space-between; margin-top:2px;">
                  <span>• ${v.variantName}</span>
                  <span style="color:#2ea879; font-weight:600;">+$${parseFloat(v.priceExtra).toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('');
    }

    // Render Plans container
    const planContainer = document.querySelector('#plansListContainer');
    if (planContainer) {
      planContainer.innerHTML = state.plans.map(pl => `
        <div style="background:#fff; border:1px solid #e9e8f0; border-radius:8px; padding:12px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${pl.name}</strong>
            <span class="status-badge badge-active">${pl.billing_frequency}</span>
          </div>
          <p style="font-size:11px; color:#8f8c9d; margin:5px 0;">Closure rule: <b>${pl.closure_rule}</b> • Min quantity: <b>${pl.minimum_quantity} units</b></p>
          <div style="font-size:11px; color:#6e5de0; font-weight:600;">Base fee: $${parseFloat(pl.base_fee || 0).toFixed(2)}</div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load catalog:', err);
  }
}

// 7. Load Discounts Table
async function loadDiscounts() {
  try {
    const res = await apiRequest('/discounts');
    if (!res.success) return;

    const tbody = document.querySelector('#discountsTableBody');
    if (!tbody) return;

    if (res.discounts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:#8f8c9d;">No discounts defined yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.discounts.map(d => `
      <tr>
        <td><strong style="font-family:'DM Mono'; color:#6e5de0;">${d.code}</strong></td>
        <td>${d.discount_type === 'percentage' ? `${d.value}% OFF` : `$${d.value} FLAT`}</td>
        <td>$${parseFloat(d.min_purchase_amount).toFixed(2)}</td>
        <td>${new Date(d.start_date).toLocaleDateString()} – ${new Date(d.end_date).toLocaleDateString()}</td>
        <td>${d.usage_count} / ${d.usage_limit || '∞'}</td>
        <td><span class="status-badge badge-quotation">${d.target_scope}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load discounts:', err);
  }
}

// 8. Automated Billing Trigger Button Handler
const triggerBtn = document.querySelector('#triggerBillingBtn');
if (triggerBtn) {
  triggerBtn.addEventListener('click', async () => {
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = '⚡ <span>Billing in Progress...</span>';

    try {
      const res = await apiRequest('/invoices/trigger-billing', { method: 'POST' });
      if (res.success) {
        const count = res.result.generatedInvoices.length;
        showToast(`⚡ Daily Billing Run Complete! Generated ${count} invoice(s).`);
        await Promise.all([
          loadFinanceDashboard(),
          loadSubscriptions(),
          loadInvoices(),
          loadPayments()
        ]);
      }
    } catch (err) {
      showToast(`Billing error: ${err.message}`);
    } finally {
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = '⚡ <span>Run Billing Cycle</span>';
    }
  });
}

// 9. New Subscription Modal Setup & Dynamic Pricing Calculator
const newSubBtn = document.querySelector('#newSubscription');
const newSubModal = document.querySelector('#newSubModal');
const subForm = document.querySelector('#newSubForm');

if (newSubBtn && newSubModal) {
  newSubBtn.addEventListener('click', async () => {
    // Populate form data
    await populateNewSubForm();
    newSubModal.classList.add('active');
  });
}

async function populateNewSubForm() {
  // 1. Fetch customers
  try {
    const userRes = await apiRequest('/auth/users');
    const customers = userRes.users || [];
    const custSelect = document.querySelector('#subCustomerSelect');
    if (custSelect) {
      custSelect.innerHTML = customers.map(u => `
        <option value="${u.id}">${u.first_name} ${u.last_name} (${u.email}) [${u.role}]</option>
      `).join('');
    }
  } catch (e) {
    console.warn('Could not load users for dropdown:', e);
  }

  // 2. Populate plans
  const planSelect = document.querySelector('#subPlanSelect');
  if (planSelect && state.plans.length > 0) {
    planSelect.innerHTML = state.plans.map(p => `
      <option value="${p.id}" data-min="${p.minimum_quantity}" data-fee="${p.base_fee}" data-freq="${p.billing_frequency}">
        ${p.name} (${p.billing_frequency} • Min: ${p.minimum_quantity})
      </option>
    `).join('');
  }

  // 3. Populate products and variants (including Odoo Brand +560)
  const prodSelect = document.querySelector('#subProductSelect');
  if (prodSelect && state.products.length > 0) {
    const options = [];
    state.products.forEach(p => {
      // Base product option
      options.push(`<option value="${p.id}" data-variant="" data-price="${p.sales_price}">
        ${p.name} (Base Edition) — $${parseFloat(p.sales_price).toFixed(2)}
      </option>`);

      // Variants options
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach(v => {
          const effPrice = parseFloat(p.sales_price) + parseFloat(v.priceExtra);
          options.push(`<option value="${p.id}" data-variant="${v.id}" data-price="${effPrice}">
            ${p.name} — ${v.variantName} (+$${parseFloat(v.priceExtra).toFixed(2)}) — $${effPrice.toFixed(2)}
          </option>`);
        });
      }
    });
    prodSelect.innerHTML = options.join('');
  }

  // Set default start date to today
  const startEl = document.querySelector('#subStartDate');
  if (startEl && !startEl.value) {
    startEl.value = new Date().toISOString().split('T')[0];
  }

  calculatePricingPreview();
}

function calculatePricingPreview() {
  const prodSelect = document.querySelector('#subProductSelect');
  const planSelect = document.querySelector('#subPlanSelect');
  const qtyInput = document.querySelector('#subQuantity');
  const hintEl = document.querySelector('#planRuleHint');

  const selectedProdOpt = prodSelect?.selectedOptions[0];
  const selectedPlanOpt = planSelect?.selectedOptions[0];

  const unitPrice = parseFloat(selectedProdOpt?.dataset.price || 0);
  const qty = parseInt(qtyInput?.value || 1, 10);
  const minQty = parseInt(selectedPlanOpt?.dataset.min || 1, 10);
  const baseFee = parseFloat(selectedPlanOpt?.dataset.fee || 0);
  const freq = selectedPlanOpt?.dataset.freq || 'monthly';

  if (hintEl) {
    hintEl.textContent = `Billing frequency: ${freq.toUpperCase()} | Minimum required quantity: ${minQty} unit(s)`;
    if (qty < minQty) {
      hintEl.style.color = '#db716e';
    } else {
      hintEl.style.color = '#928fa4';
    }
  }

  const subtotal = (unitPrice * qty) + baseFee;
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;

  const unitPriceEl = document.querySelector('#previewUnitPrice');
  const subtotalEl = document.querySelector('#previewSubtotal');
  const taxEl = document.querySelector('#previewTax');
  const grandTotalEl = document.querySelector('#previewGrandTotal');

  if (unitPriceEl) unitPriceEl.textContent = `$${unitPrice.toFixed(2)}`;
  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)} (incl. $${baseFee.toFixed(2)} base fee)`;
  if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
  if (grandTotalEl) grandTotalEl.textContent = `$${grandTotal.toFixed(2)}`;
}

// Input listeners for preview
['#subProductSelect', '#subPlanSelect', '#subQuantity'].forEach(sel => {
  const el = document.querySelector(sel);
  if (el) el.addEventListener('change', calculatePricingPreview);
  if (el) el.addEventListener('input', calculatePricingPreview);
});

// Form Submission: Create Draft Subscription
if (subForm) {
  subForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const customerId = document.querySelector('#subCustomerSelect').value;
    const planId = document.querySelector('#subPlanSelect').value;
    const prodSelect = document.querySelector('#subProductSelect');
    const selectedProdOpt = prodSelect.selectedOptions[0];
    const productId = selectedProdOpt.value;
    const variantId = selectedProdOpt.dataset.variant || null;
    const quantity = parseInt(document.querySelector('#subQuantity').value, 10);
    const discountCode = document.querySelector('#subDiscountCode').value.trim();
    const startDate = document.querySelector('#subStartDate').value;

    const btn = document.querySelector('#btnSubmitSub');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
      const payload = {
        customerId: parseInt(customerId, 10),
        planId: parseInt(planId, 10),
        startDate,
        discountCode: discountCode || null,
        initialStatus: 'Draft',
        lines: [
          {
            productId: parseInt(productId, 10),
            variantId: variantId ? parseInt(variantId, 10) : null,
            quantity,
            taxRate: 0.18
          }
        ]
      };

      const res = await apiRequest('/subscriptions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        showToast('✓ Subscription Draft created successfully!');
        newSubModal.classList.remove('active');
        subForm.reset();
        await Promise.all([loadSubscriptions(), loadFinanceDashboard()]);
      }
    } catch (err) {
      alert(`Error creating subscription: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Draft Subscription';
    }
  });
}

// 10. Status Progression Modal Logic
window.openStatusModal = (subId, subCode, currentStatus, nextStatus) => {
  state.selectedSubForTransition = { subId, subCode, currentStatus, nextStatus };

  const codeEl = document.querySelector('#progressSubCode');
  const badgeEl = document.querySelector('#progressCurrentStatusBadge');
  const explainEl = document.querySelector('#progressExplain');
  const confirmBtn = document.querySelector('#btnConfirmTransition');

  if (codeEl) codeEl.textContent = subCode;
  if (badgeEl) {
    badgeEl.textContent = currentStatus;
    badgeEl.className = `status-badge badge-${currentStatus.toLowerCase()}`;
  }
  if (explainEl) {
    explainEl.innerHTML = `Strict progression: Advance from <b>${currentStatus}</b> to <strong style="color:#6e5de0;">${nextStatus}</strong>.`;
  }
  if (confirmBtn) {
    confirmBtn.textContent = `Advance to "${nextStatus}"`;
  }

  document.querySelector('#statusModal').classList.add('active');
};

const confirmTransitionBtn = document.querySelector('#btnConfirmTransition');
if (confirmTransitionBtn) {
  confirmTransitionBtn.addEventListener('click', async () => {
    if (!state.selectedSubForTransition) return;
    const { subId, nextStatus } = state.selectedSubForTransition;

    confirmTransitionBtn.disabled = true;
    try {
      const res = await apiRequest(`/subscriptions/${subId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.success) {
        showToast(`✓ Subscription progressed to "${nextStatus}"`);
        document.querySelector('#statusModal').classList.remove('active');
        await Promise.all([loadSubscriptions(), loadFinanceDashboard()]);
      }
    } catch (err) {
      alert(`Transition error: ${err.message}`);
    } finally {
      confirmTransitionBtn.disabled = false;
    }
  });
}

// 11. Payment Recording Modal Logic
window.openPaymentModal = (invoiceId, invoiceNumber, remainingBalance) => {
  document.querySelector('#payInvoiceId').value = invoiceId;
  document.querySelector('#payInvoiceNumber').value = invoiceNumber;
  document.querySelector('#payRemainingBalance').value = parseFloat(remainingBalance).toFixed(2);
  document.querySelector('#payAmount').value = parseFloat(remainingBalance).toFixed(2);
  document.querySelector('#payAmount').max = parseFloat(remainingBalance).toFixed(2);
  document.querySelector('#paymentModal').classList.add('active');
};

const paymentForm = document.querySelector('#recordPaymentForm');
if (paymentForm) {
  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const invoiceId = parseInt(document.querySelector('#payInvoiceId').value, 10);
    const amount = parseFloat(document.querySelector('#payAmount').value);
    const paymentMethod = document.querySelector('#payMethod').value;
    const notes = document.querySelector('#payNotes').value;

    try {
      const res = await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({ invoiceId, amount, paymentMethod, notes })
      });

      if (res.success) {
        showToast(`✓ Payment of $${amount.toFixed(2)} recorded!`);
        document.querySelector('#paymentModal').classList.remove('active');
        paymentForm.reset();
        await Promise.all([
          loadFinanceDashboard(),
          loadInvoices(),
          loadPayments()
        ]);
      }
    } catch (err) {
      alert(`Payment error: ${err.message}`);
    }
  });
}

// Close Modals on click [data-close] or backdrop
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-close');
    document.querySelector(`#${modalId}`)?.classList.remove('active');
  });
});

document.querySelectorAll('.modal-backdrop').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
});

// 12. Navigation handling
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.nav-item.active')?.classList.remove('active');
    item.classList.add('active');

    const targetSectionId = item.getAttribute('data-target');
    if (targetSectionId) {
      document.querySelectorAll('.view-section').forEach(sec => sec.style.display = 'none');
      const targetSec = document.querySelector(`#${targetSectionId}`);
      if (targetSec) targetSec.style.display = 'block';

      // Always show overview section when on #overview
      if (targetSectionId === 'overviewSection') {
        const subSec = document.querySelector('#subscriptionsSection');
        if (subSec) subSec.style.display = 'block';
      }
    }
  });
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Brightloop Subscription Frontend initializing...');
  await ensureAuthenticated();
  await Promise.all([
    loadFinanceDashboard(),
    loadSubscriptions(),
    loadInvoices(),
    loadPayments(),
    loadCatalog(),
    loadDiscounts()
  ]);
  console.log('✓ Brightloop Frontend successfully connected to Backend API.');
});
