import http from 'http';
import app from '../app.js';
import { runSeed } from './seed.js';
import { query } from '../config/db.js';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

let server;
let baseUrl;

// Test JWT Tokens for RBAC testing
const adminToken = jwt.sign(
  { id: 'usr-admin-01', email: 'admin@brightloop.com', role: 'admin', customer_id: null },
  ENV.JWT_SECRET,
  { expiresIn: '1h' }
);

const staffToken = jwt.sign(
  { id: 'usr-staff-02', email: 'staff@brightloop.com', role: 'staff', customer_id: null },
  ENV.JWT_SECRET,
  { expiresIn: '1h' }
);

const customerToken = jwt.sign(
  { id: 'usr-cust-01', email: 'elena@apexretail.io', role: 'customer', customer_id: 'cust-apex-01' },
  ENV.JWT_SECRET,
  { expiresIn: '1h' }
);

async function apiRequest(endpoint, { method = 'GET', body = null, token = adminToken } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json();
  return { status: res.status, data, headers: res.headers };
}

async function runTestSuite() {
  console.log('\n========================================================================');
  console.log('🧪 Brightloop Software Backend Integration & Billing Engine Test Suite');
  console.log('========================================================================\n');

  // 1. Seed database with realistic accounts, rules, and 2,500 subscriptions
  console.log('--- Step 0: Seeding Database with 2,500+ Records ---');
  await runSeed({ count: 2500 });

  // Start temporary test server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server active on ${baseUrl}\n`);
      resolve();
    });
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // TEST 1: Variant price addition (+560 Odoo brand variant)
    console.log('--- TEST 1: Product Variant Price Addition (+560 Odoo Brand) ---');
    const prodRes = await apiRequest('/api/products/prod-001', { token: adminToken });
    assert(prodRes.status === 200, 'Product prod-001 retrieved');
    const odooVariant = prodRes.data.data.variants.find(v => v.brand === 'Odoo');
    assert(odooVariant !== undefined, 'Odoo brand variant exists');
    assert(Number(odooVariant.price_extra) === 560, `Odoo variant adds exactly +560 (Actual: +${odooVariant.price_extra})`);

    // Verify sub-2026-0002 has unit_price = 1200 + 560 = 1760
    const subRes = await apiRequest('/api/subscriptions/sub-2026-0002', { token: adminToken });
    const odooLine = subRes.data.data.lines.find(l => l.variant_id === 'var-core-odoo');
    assert(odooLine !== undefined, 'Subscription line with Odoo variant found');
    assert(odooLine.unit_price === 1760, `Unit price is 1200 + 560 = 1760 (Actual: ${odooLine.unit_price})`);
    assert(odooLine.total === 1760 * 8, `Line total is 1760 * 8 = 14080 (Actual: ${odooLine.total})`);

    // TEST 2: RBAC Strict Permissions
    console.log('\n--- TEST 2: RBAC Strict Permissions (Admin vs Staff vs Customer) ---');
    // Staff attempting to create staff -> MUST be rejected (403 Forbidden)
    const staffTryStaff = await apiRequest('/api/staff', {
      method: 'POST',
      body: { name: 'Hacker Staff', email: 'hacker@brightloop.com' },
      token: staffToken
    });
    assert(staffTryStaff.status === 403, 'Staff role prohibited from creating staff accounts (403 Forbidden)');

    // Admin creating staff -> MUST succeed (201 Created)
    const adminCreateStaff = await apiRequest('/api/staff', {
      method: 'POST',
      body: { name: 'E2E Staff Member', email: 'e2e.staff@brightloop.com', role: 'staff' },
      token: adminToken
    });
    assert(adminCreateStaff.status === 201, 'Admin role successfully created staff member (201 Created)');

    // Customer scoping: customer requesting all subscriptions only receives their own customer_id
    const customerSubs = await apiRequest('/api/subscriptions', { token: customerToken });
    assert(customerSubs.status === 200, 'Customer fetched subscriptions');
    const allBelongToCustomer = customerSubs.data.data.every(s => s.customer_id === 'cust-apex-01');
    assert(allBelongToCustomer, 'Customer strictly scoped to their own customer_id (cannot access other accounts)');

    // TEST 3: Batch Billing Day & Zero Double-Billing (Idempotency Key Safeguard)
    console.log('\n--- TEST 3: Batch Billing Day & Idempotency Safeguard ---');
    const billingDate = '2026-10-01';

    // First billing day run: should create invoices for due subscriptions
    console.log(`  Executing Run 1 on ${billingDate}...`);
    const run1 = await apiRequest('/api/billing/run', {
      method: 'POST',
      body: { target_date: billingDate },
      token: staffToken
    });
    assert(run1.status === 200, 'First batch billing executed successfully');
    const run1Created = run1.data.data.invoicesCreated;
    assert(run1Created > 0, `Run 1 created ${run1Created} invoices for due active subscriptions`);
    assert(run1.data.data.slaCompliant === true, `Run 1 completed in ${run1.data.data.executionTimeMs}ms (< 2000ms SLA)`);

    // Second billing day run on SAME date: MUST skip all already-billed subscriptions (0 duplicates created!)
    console.log(`  Executing Run 2 immediately on ${billingDate} to test idempotency...`);
    const run2 = await apiRequest('/api/billing/run', {
      method: 'POST',
      body: { target_date: billingDate },
      token: staffToken
    });
    assert(run2.status === 200, 'Second batch billing call responded');
    assert(run2.data.data.invoicesCreated === 0, `Zero double-billing verified: 0 invoices created on second run (Actual: ${run2.data.data.invoicesCreated})`);
    assert(run2.data.data.duplicatesSkipped >= run1Created, `All previous cycles safely skipped via idempotency safeguard (Skipped: ${run2.data.data.duplicatesSkipped})`);

    // TEST 4: Automatic Discount Rules & Auto-Depletion when max_uses reached
    console.log('\n--- TEST 4: Discount Engine Auto-Application & Quota Depletion ---');
    // Create special test discount with max_uses = 1
    const testDiscRes = await apiRequest('/api/discounts', {
      method: 'POST',
      body: {
        code: 'TESTLIMIT1',
        name: 'Single-Use Test Voucher',
        type: 'fixed',
        value: 100,
        min_purchase_amount: 50,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        max_uses: 1
      },
      token: adminToken
    });
    assert(testDiscRes.status === 201, 'Created single-use discount TESTLIMIT1 (max_uses = 1)');
    const discId = testDiscRes.data.data.id;

    // Create a subscription with this discount due on 2026-11-01
    const newSubRes = await apiRequest('/api/subscriptions', {
      method: 'POST',
      body: {
        customer_id: 'cust-apex-01',
        plan_id: 'plan-monthly-starter',
        discount_id: discId,
        lines: [{ product_id: 'prod-001', quantity: 1 }]
      },
      token: staffToken
    });
    assert(newSubRes.status === 201, 'Created test subscription with TESTLIMIT1');
    const testSubId = newSubRes.data.data.id;

    // Transition test subscription to Active so it gets billed
    await query(`UPDATE subscriptions SET status = 'Active', next_billing_date = '2026-11-01' WHERE id = $1`, [testSubId]);

    // Run billing on 2026-11-01: should apply discount and increment current_uses to 1 (hitting max)
    const discBillingRun = await apiRequest('/api/billing/run', {
      method: 'POST',
      body: { target_date: '2026-11-01' },
      token: staffToken
    });
    assert(discBillingRun.status === 200, 'Billed test subscription');

    // Verify discount is now marked active = false (depleted)
    const checkDisc = await query(`SELECT current_uses, max_uses, active FROM discounts WHERE id = $1`, [discId]);
    assert(checkDisc.rows[0].current_uses === 1, `Discount usage incremented to 1 (Actual: ${checkDisc.rows[0].current_uses})`);
    assert(checkDisc.rows[0].active === false, `Discount automatically stopped/deactivated once max_uses was reached`);

    // TEST 5: Payments & Auto-Transition to 'Paid'
    console.log('\n--- TEST 5: Payments Settlement & Auto-Transition to Paid ---');
    // Find an unpaid confirmed invoice
    const unpaidInvRes = await query(
      `SELECT id, invoice_number, total_amount, remaining_amount 
       FROM invoices 
       WHERE status = 'Confirmed' AND remaining_amount > 0 
       LIMIT 1`
    );
    const targetInv = unpaidInvRes.rows[0];
    assert(targetInv !== undefined, `Found unpaid confirmed invoice ${targetInv.invoice_number}`);

    // Pay full remaining balance
    const payRes = await apiRequest('/api/payments', {
      method: 'POST',
      body: {
        invoice_id: targetInv.id,
        amount: Number(targetInv.remaining_amount),
        method: 'UPI',
        reference: 'UPI-REF-2026-TEST'
      },
      token: staffToken
    });
    assert(payRes.status === 201, 'Payment recorded successfully');
    assert(payRes.data.data.invoice.status === 'Paid', `Invoice automatically transitioned to 'Paid' upon full settlement`);
    assert(payRes.data.data.invoice.remaining_amount === 0, `Invoice remaining balance is now $0.00`);

    // TEST 6: Finance Dashboard Performance SLA (< 2000ms with 2,500+ records)
    console.log('\n--- TEST 6: Finance Dashboard Performance (< 2000ms SLA across 2,500+ records) ---');
    const t0 = performance.now();
    const financeRes = await apiRequest('/api/analytics/finance', { token: adminToken });
    const clientLatency = Math.round((performance.now() - t0) * 10) / 10;

    assert(financeRes.status === 200, 'Finance analytics endpoint responded 200 OK');
    const serverExecutionMs = financeRes.data.meta.executionTimeMs;
    console.log(`  ⚡ Server SQL Execution Time: ${serverExecutionMs}ms`);
    console.log(`  ⚡ Full HTTP Roundtrip Latency: ${clientLatency}ms`);

    assert(serverExecutionMs < 2000, `Server execution time ${serverExecutionMs}ms is strictly under 2,000ms SLA!`);
    assert(clientLatency < 2000, `Full HTTP roundtrip ${clientLatency}ms is strictly under 2,000ms SLA!`);
    assert(financeRes.data.data.metrics.totalSubscriptions >= 2500, `Calculated metrics across ${financeRes.data.data.metrics.totalSubscriptions} live subscriptions`);
    assert(financeRes.data.data.metrics.mrr > 0, `MRR calculated: $${financeRes.data.data.metrics.mrr}`);
    assert(financeRes.data.data.metrics.totalCollected > 0, `Cash collected calculated: $${financeRes.data.data.metrics.totalCollected}`);

    // TEST 7: Quotation Template to Subscription 1-Click Endpoint
    console.log('\n--- TEST 7: 1-Click Subscription From Quotation Template ---');
    const fromTmplRes = await apiRequest('/api/subscriptions/from-template', {
      method: 'POST',
      body: {
        template_id: 'tmpl-enterprise-odoo',
        customer_id: 'cust-apex-01'
      },
      token: staffToken
    });
    assert(fromTmplRes.status === 201, '1-click subscription created from template');
    assert(fromTmplRes.data.data.status === 'Quotation', 'Created subscription starts in Quotation status');
    assert(fromTmplRes.data.data.lines.length >= 2, 'Template line items pre-populated');

    console.log(`\n========================================================================`);
    console.log(`🏆 ALL ${passed} INTEGRATION TESTS PASSED WITH 100% SUCCESS! (0 Failures)`);
    console.log(`========================================================================\n`);
    if (server) server.close();
    process.exit(0);
  } finally {
    if (server) server.close();
  }
}

runTestSuite().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
