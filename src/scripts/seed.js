import bcrypt from 'bcryptjs';
import { initDatabase, query, transaction } from '../config/db.js';

export async function runSeed({ count = 2500 } = {}) {
  console.log('🌱 Starting Brightloop Software Database Seed Engine...');
  const t0 = performance.now();

  await initDatabase();

  await transaction(async (client) => {
    // 1. Clear existing records cleanly
    console.log('  Cleaning tables...');
    await client.query(`DELETE FROM billing_runs`);
    await client.query(`DELETE FROM payments`);
    await client.query(`DELETE FROM invoices`);
    await client.query(`DELETE FROM subscription_lines`);
    await client.query(`DELETE FROM subscriptions`);
    await client.query(`DELETE FROM quotation_templates`);
    await client.query(`DELETE FROM discounts`);
    await client.query(`DELETE FROM tax_rules`);
    await client.query(`DELETE FROM plans`);
    await client.query(`DELETE FROM product_variants`);
    await client.query(`DELETE FROM products`);
    await client.query(`DELETE FROM users`);
    await client.query(`DELETE FROM customers`);

    // 2. Seed Customers
    console.log('  Seeding enterprise & retail customers...');
    const customers = [
      {
        id: 'cust-apex-01',
        name: 'Apex Retail Labs Inc.',
        contact_name: 'Elena Rostova',
        email: 'elena@apexretail.io',
        phone: '+1 (555) 349-8812',
        tax_id: 'US-EIN-8829104',
        address: '450 Mission St, Suite 1200, San Francisco, CA 94105',
        payment_terms: 'Net 15'
      },
      {
        id: 'cust-fluxcorp-02',
        name: 'Flux Dynamics GmbH',
        contact_name: 'Markus Weber',
        email: 'm.weber@fluxdynamics.de',
        phone: '+49 89 2441-098',
        tax_id: 'DE-VAT-99210042',
        address: 'Maximilianstraße 35, 80539 München, Germany',
        payment_terms: 'Net 30'
      },
      {
        id: 'cust-zenith-03',
        name: 'Zenith Logistics & Supply Ltd',
        contact_name: 'Dev Patel',
        email: 'dev@zenithlogistics.in',
        phone: '+91 98201 44521',
        tax_id: '27AABCZ9912K1Z8',
        address: 'Bandra-Kurla Complex, Tower 4, Mumbai, MH 400051',
        payment_terms: 'Immediate'
      },
      {
        id: 'cust-artisan-04',
        name: 'Artisan Coffee Roasters',
        contact_name: 'Chloe Bennett',
        email: 'chloe@artisancoffee.co',
        phone: '+1 (555) 782-9901',
        tax_id: 'US-EIN-5521990',
        address: '1240 Pearl St, Boulder, CO 80302',
        payment_terms: 'Immediate'
      }
    ];

    for (const c of customers) {
      await client.query(
        `INSERT INTO customers (id, name, contact_name, email, phone, tax_id, address, payment_terms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [c.id, c.name, c.contact_name, c.email, c.phone, c.tax_id, c.address, c.payment_terms]
      );
    }

    // 3. Seed Users with RBAC (Admin, Staff, Customer)
    console.log('  Seeding RBAC credentials (admin, staff, customer)...');
    const adminPasswordHash = await bcrypt.hash('Admin@2026!', 10);
    const staffPasswordHash = await bcrypt.hash('Staff@2026!', 10);
    const custPasswordHash = await bcrypt.hash('Customer@2026!', 10);

    const users = [
      {
        id: 'usr-admin-01',
        name: 'Sarah Chen (Admin)',
        email: 'admin@brightloop.com',
        password_hash: adminPasswordHash,
        role: 'admin',
        customer_id: null,
        department: 'Executive Leadership'
      },
      {
        id: 'usr-staff-02',
        name: 'Julian Vance (Operations)',
        email: 'staff@brightloop.com',
        password_hash: staffPasswordHash,
        role: 'staff',
        customer_id: null,
        department: 'Sales & Customer Operations'
      },
      {
        id: 'usr-staff-03',
        name: 'Aisha Al-Mansoor',
        email: 'aisha@brightloop.com',
        password_hash: staffPasswordHash,
        role: 'staff',
        customer_id: null,
        department: 'Billing & Accounts'
      },
      {
        id: 'usr-cust-01',
        name: 'Elena Rostova',
        email: 'elena@apexretail.io',
        password_hash: custPasswordHash,
        role: 'customer',
        customer_id: 'cust-apex-01',
        department: null
      }
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, role, customer_id, department, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active')`,
        [u.id, u.name, u.email, u.password_hash, u.role, u.customer_id, u.department]
      );
    }

    // 4. Seed Products & Variants (Exact +560 Odoo Variant)
    console.log('  Seeding products & +560 Odoo variant...');
    const products = [
      {
        id: 'prod-001',
        name: 'Brightloop ERP Core Suite',
        type: 'Variant Product',
        sales_price: 1200,
        cost_price: 450,
        notes: 'Base enterprise resource planning module. CRM, financials, inventory.',
        variants: [
          { id: 'var-core-std', name: 'Standard Edition', brand: 'Standard', price_extra: 0 },
          { id: 'var-core-odoo', name: 'Odoo Connected Edition', brand: 'Odoo', price_extra: 560 }, // +560 Odoo Variant
          { id: 'var-core-ent', name: 'Enterprise Multi-Company', brand: 'Enterprise', price_extra: 950 }
        ]
      },
      {
        id: 'prod-002',
        name: 'Advanced Inventory & Warehouse Barcoding',
        type: 'Software',
        sales_price: 480,
        cost_price: 160,
        notes: 'Multi-warehouse automation and batch tracking.',
        variants: []
      },
      {
        id: 'prod-003',
        name: 'AI Revenue & Churn Prediction Copilot',
        type: 'Add-on',
        sales_price: 299,
        cost_price: 90,
        notes: 'Predictive intelligence for subscriber expansion and retention.',
        variants: []
      },
      {
        id: 'prod-004',
        name: '24/7 Dedicated Support SLA & TAM',
        type: 'Add-on',
        sales_price: 450,
        cost_price: 200,
        notes: '15-minute response SLA with designated Technical Account Manager.',
        variants: []
      },
      {
        id: 'prod-005',
        name: 'Automated Tax & GST Compliance Engine',
        type: 'Software',
        sales_price: 350,
        cost_price: 110,
        notes: 'One-click e-invoicing and digital compliance.',
        variants: []
      }
    ];

    for (const p of products) {
      await client.query(
        `INSERT INTO products (id, name, type, sales_price, cost_price, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [p.id, p.name, p.type, p.sales_price, p.cost_price, p.notes]
      );

      for (const v of p.variants) {
        await client.query(
          `INSERT INTO product_variants (id, product_id, name, brand, price_extra)
           VALUES ($1, $2, $3, $4, $5)`,
          [v.id, p.id, v.name, v.brand, v.price_extra]
        );
      }
    }

    // 5. Seed Plans with Lifecycle Governance
    console.log('  Seeding subscription plans with lifecycle controls...');
    const plans = [
      {
        id: 'plan-monthly-starter',
        name: 'Monthly Starter',
        billing_frequency: 'monthly',
        cost: 499,
        min_quantity: 1,
        available_from: '2026-01-01',
        available_to: '2026-12-31',
        auto_close: false,
        can_close_early: true,
        can_pause: true,
        can_renew: true,
        description: 'Monthly agile package for small business and startups.'
      },
      {
        id: 'plan-yearly-enterprise',
        name: 'Yearly Enterprise Contract',
        billing_frequency: 'yearly',
        cost: 4800,
        min_quantity: 5,
        available_from: '2026-01-01',
        available_to: '2028-12-31',
        auto_close: false,
        can_close_early: false, // Strict contract: early close locked
        can_pause: false, // Strict contract: pause locked
        can_renew: true,
        description: 'Locked enterprise pricing with dedicated support.'
      },
      {
        id: 'plan-weekly-growth',
        name: 'Weekly Sprint Flex',
        billing_frequency: 'weekly',
        cost: 140,
        min_quantity: 1,
        available_from: '2026-01-01',
        available_to: '2026-12-31',
        auto_close: false,
        can_close_early: true,
        can_pause: true,
        can_renew: true,
        description: 'Short-cycle weekly billing for project consultancies.'
      },
      {
        id: 'plan-daily-sandbox',
        name: 'Daily Developer Sandbox',
        billing_frequency: 'daily',
        cost: 25,
        min_quantity: 1,
        available_from: '2026-01-01',
        available_to: '2026-12-31',
        auto_close: true, // Automatically closes on expiry
        can_close_early: true,
        can_pause: false,
        can_renew: false,
        description: 'Ephemeral developer sandbox plan.'
      }
    ];

    for (const pl of plans) {
      await client.query(
        `INSERT INTO plans (
          id, name, billing_frequency, cost, min_quantity, available_from, available_to,
          auto_close, can_close_early, can_pause, can_renew, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          pl.id, pl.name, pl.billing_frequency, pl.cost, pl.min_quantity, pl.available_from, pl.available_to,
          pl.auto_close, pl.can_close_early, pl.can_pause, pl.can_renew, pl.description
        ]
      );
    }

    // 6. Seed Tax Rules
    console.log('  Seeding tax rules...');
    await client.query(
      `INSERT INTO tax_rules (id, name, rate, is_default, active, description)
       VALUES ('tax-gst-18', 'GST 18% (Standard Software)', 18.00, TRUE, TRUE, 'Standard Goods & Services Tax'),
              ('tax-vat-5', 'International VAT 5%', 5.00, FALSE, TRUE, 'Digital export tax rate')`
    );

    // 7. Seed Discounts
    console.log('  Seeding admin discount rules...');
    const discounts = [
      {
        id: 'disc-flux20',
        code: 'FLUX20',
        name: 'Odoo x Flux Hackathon 20% Off',
        type: 'percentage',
        value: 20,
        min_purchase_amount: 1000,
        min_quantity: 1,
        scope: 'subscription',
        target_product_id: null,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        max_uses: 100,
        current_uses: 12,
        active: true,
        description: 'Special 20% concession for Flux ecosystem.'
      },
      {
        id: 'disc-seats15',
        code: 'SEATS15',
        name: 'Multi-Seat Volume Savings 15%',
        type: 'percentage',
        value: 15,
        min_purchase_amount: 2500,
        min_quantity: 5,
        scope: 'subscription',
        target_product_id: null,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        max_uses: 50,
        current_uses: 24,
        active: true,
        description: '15% savings on 5+ seat subscriptions.'
      },
      {
        id: 'disc-odoo500',
        code: 'ODOO500',
        name: 'Odoo Migration Credit $500',
        type: 'fixed',
        value: 500,
        min_purchase_amount: 1500,
        min_quantity: 1,
        scope: 'product',
        target_product_id: 'prod-001',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        max_uses: 30,
        current_uses: 18,
        active: true,
        description: '$500 flat concession when adopting Odoo edition.'
      },
      {
        id: 'disc-expired-sample',
        code: 'EXPIRED2025',
        name: 'Legacy 2025 Promotional Pass',
        type: 'percentage',
        value: 30,
        min_purchase_amount: 500,
        min_quantity: 1,
        scope: 'subscription',
        target_product_id: null,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        max_uses: 10,
        current_uses: 10, // Depleted!
        active: false,
        description: 'Historical discount that has reached max_uses.'
      }
    ];

    for (const d of discounts) {
      await client.query(
        `INSERT INTO discounts (
          id, code, name, type, value, min_purchase_amount, min_quantity, scope,
          target_product_id, start_date, end_date, max_uses, current_uses, active, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          d.id, d.code, d.name, d.type, d.value, d.min_purchase_amount, d.min_quantity, d.scope,
          d.target_product_id, d.start_date, d.end_date, d.max_uses, d.current_uses, d.active, d.description
        ]
      );
    }

    // 8. Seed Quotation Templates
    console.log('  Seeding quotation templates...');
    await client.query(
      `INSERT INTO quotation_templates (id, name, plan_id, validity_days, lines, description)
       VALUES (
         'tmpl-sme-monthly',
         'Small Shop Monthly Quickstart',
         'plan-monthly-starter',
         15,
         $1,
         'Standard package for growing retailers: 1 Core Suite + 1 Add-on.'
       ), (
         'tmpl-enterprise-odoo',
         'Enterprise Odoo Power Contract',
         'plan-yearly-enterprise',
         30,
         $2,
         'Full-stack enterprise package with +560 Odoo integration variant, AI copilot, and 24/7 SLA.'
       )`,
      [
        JSON.stringify([
          { product_id: 'prod-001', variant_id: 'var-core-std', quantity: 1, tax_rate: 18 },
          { product_id: 'prod-003', variant_id: null, quantity: 1, tax_rate: 18 }
        ]),
        JSON.stringify([
          { product_id: 'prod-001', variant_id: 'var-core-odoo', quantity: 8, tax_rate: 18 }, // +560 Odoo variant
          { product_id: 'prod-003', variant_id: null, quantity: 8, tax_rate: 18 },
          { product_id: 'prod-004', variant_id: null, quantity: 1, tax_rate: 18 }
        ])
      ]
    );

    // 9. Seed Core Initial Subscriptions (Including +560 Odoo Variant Record)
    console.log('  Seeding core subscriptions and lines...');
    const coreSubs = [
      {
        id: 'sub-2026-0001',
        sub_number: 'SUB-2026-0001',
        customer_id: 'cust-apex-01',
        plan_id: 'plan-monthly-starter',
        status: 'Active',
        is_paused: false,
        start_date: '2026-09-01',
        expiry_date: '2027-09-01',
        next_billing_date: '2026-10-01',
        payment_terms: 'Net 15',
        discount_id: 'disc-flux20',
        lines: [
          {
            product_id: 'prod-001',
            variant_id: 'var-core-std',
            product_name: 'Brightloop ERP Core Suite',
            variant_name: 'Standard Edition',
            quantity: 2,
            base_price: 1200,
            variant_extra: 0,
            unit_price: 1200,
            tax_rate: 18,
            total: 2400
          },
          {
            product_id: 'prod-003',
            variant_id: null,
            product_name: 'AI Revenue & Churn Prediction Copilot',
            variant_name: null,
            quantity: 2,
            base_price: 299,
            variant_extra: 0,
            unit_price: 299,
            tax_rate: 18,
            total: 598
          }
        ]
      },
      {
        id: 'sub-2026-0002',
        sub_number: 'SUB-2026-0002',
        customer_id: 'cust-fluxcorp-02',
        plan_id: 'plan-yearly-enterprise',
        status: 'Active',
        is_paused: false,
        start_date: '2026-01-15',
        expiry_date: '2027-01-15',
        next_billing_date: '2026-10-15',
        payment_terms: 'Net 30',
        discount_id: 'disc-seats15',
        lines: [
          {
            product_id: 'prod-001',
            variant_id: 'var-core-odoo', // +560 Odoo variant!
            product_name: 'Brightloop ERP Core Suite',
            variant_name: 'Odoo Connected Edition (+560)',
            quantity: 8,
            base_price: 1200,
            variant_extra: 560,
            unit_price: 1760, // 1200 + 560
            tax_rate: 5,
            total: 14080
          },
          {
            product_id: 'prod-004',
            variant_id: null,
            product_name: '24/7 Dedicated Support SLA & TAM',
            variant_name: null,
            quantity: 1,
            base_price: 450,
            variant_extra: 0,
            unit_price: 450,
            tax_rate: 5,
            total: 450
          }
        ]
      },
      {
        id: 'sub-2026-0003',
        sub_number: 'SUB-2026-0003',
        customer_id: 'cust-zenith-03',
        plan_id: 'plan-monthly-starter',
        status: 'Quotation',
        is_paused: false,
        start_date: '2026-10-25',
        expiry_date: '2027-10-25',
        next_billing_date: '2026-11-25',
        payment_terms: 'Immediate',
        discount_id: null,
        lines: [
          {
            product_id: 'prod-002',
            variant_id: null,
            product_name: 'Advanced Inventory & Warehouse Barcoding',
            variant_name: null,
            quantity: 5,
            base_price: 480,
            variant_extra: 0,
            unit_price: 480,
            tax_rate: 18,
            total: 2400
          }
        ]
      },
      {
        id: 'sub-2026-0004',
        sub_number: 'SUB-2026-0004',
        customer_id: 'cust-artisan-04',
        plan_id: 'plan-monthly-starter',
        status: 'Active',
        is_paused: false,
        start_date: '2026-08-10',
        expiry_date: '2027-08-10',
        next_billing_date: '2026-10-10',
        payment_terms: 'Immediate',
        discount_id: null,
        lines: [
          {
            product_id: 'prod-001',
            variant_id: 'var-core-std',
            product_name: 'Brightloop ERP Core Suite',
            variant_name: 'Standard Edition',
            quantity: 1,
            base_price: 1200,
            variant_extra: 0,
            unit_price: 1200,
            tax_rate: 18,
            total: 1200
          }
        ]
      }
    ];

    for (const sub of coreSubs) {
      await client.query(
        `INSERT INTO subscriptions (
          id, sub_number, customer_id, plan_id, status, is_paused,
          start_date, expiry_date, next_billing_date, payment_terms, discount_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Core initial subscription')`,
        [
          sub.id, sub.sub_number, sub.customer_id, sub.plan_id, sub.status, sub.is_paused,
          sub.start_date, sub.expiry_date, sub.next_billing_date, sub.payment_terms, sub.discount_id
        ]
      );

      for (let idx = 0; idx < sub.lines.length; idx++) {
        const l = sub.lines[idx];
        await client.query(
          `INSERT INTO subscription_lines (
            id, subscription_id, product_id, variant_id, product_name, variant_name,
            quantity, base_price, variant_extra, unit_price, tax_rate, total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            `sline-${sub.id}-${idx}`,
            sub.id,
            l.product_id,
            l.variant_id,
            l.product_name,
            l.variant_name,
            l.quantity,
            l.base_price,
            l.variant_extra,
            l.unit_price,
            l.tax_rate,
            l.total
          ]
        );
      }
    }

    // 10. Seed Overdue and Settled Invoices
    console.log('  Seeding core invoices and payment history...');
    const coreInvoices = [
      {
        id: 'inv-2026-0001',
        invoice_number: 'INV-2026-0001',
        subscription_id: 'sub-2026-0001',
        customer_id: 'cust-apex-01',
        invoice_date: '2026-09-01',
        due_date: '2026-09-16', // Overdue
        billing_cycle_date: '2026-09-01',
        idempotency_key: 'sub-2026-0001_2026-09-01',
        status: 'Confirmed',
        payment_terms: 'Net 15',
        subtotal: 2998.00,
        discount_amount: 599.60,
        discount_code: 'FLUX20',
        tax_amount: 431.71,
        total_amount: 2830.11,
        paid_amount: 0,
        remaining_amount: 2830.11,
        lines: [
          { description: 'Brightloop ERP Core Suite (Standard)', quantity: 2, unitPrice: 1200, taxRate: 18, total: 2400 },
          { description: 'AI Revenue & Churn Prediction Copilot', quantity: 2, unitPrice: 299, taxRate: 18, total: 598 }
        ]
      },
      {
        id: 'inv-2026-0002',
        invoice_number: 'INV-2026-0002',
        subscription_id: 'sub-2026-0002',
        customer_id: 'cust-fluxcorp-02',
        invoice_date: '2026-01-15',
        due_date: '2026-02-15',
        billing_cycle_date: '2026-01-15',
        idempotency_key: 'sub-2026-0002_2026-01-15',
        status: 'Paid',
        payment_terms: 'Net 30',
        subtotal: 14530.00,
        discount_amount: 2179.50,
        discount_code: 'SEATS15',
        tax_amount: 617.53,
        total_amount: 12968.03,
        paid_amount: 12968.03,
        remaining_amount: 0,
        lines: [
          { description: 'Brightloop ERP Core Suite (Odoo Connected +560)', quantity: 8, unitPrice: 1760, taxRate: 5, total: 14080 },
          { description: '24/7 Support SLA & TAM', quantity: 1, unitPrice: 450, taxRate: 5, total: 450 }
        ]
      },
      {
        id: 'inv-2026-0003',
        invoice_number: 'INV-2026-0003',
        subscription_id: 'sub-2026-0004',
        customer_id: 'cust-artisan-04',
        invoice_date: '2026-08-10',
        due_date: '2026-08-10', // Overdue
        billing_cycle_date: '2026-08-10',
        idempotency_key: 'sub-2026-0004_2026-08-10',
        status: 'Confirmed',
        payment_terms: 'Immediate',
        subtotal: 1200.00,
        discount_amount: 0,
        discount_code: null,
        tax_amount: 216.00,
        total_amount: 1416.00,
        paid_amount: 500.00, // Partial payment
        remaining_amount: 916.00,
        lines: [
          { description: 'Brightloop ERP Core Suite (Standard)', quantity: 1, unitPrice: 1200, taxRate: 18, total: 1200 }
        ]
      }
    ];

    for (const inv of coreInvoices) {
      await client.query(
        `INSERT INTO invoices (
          id, invoice_number, subscription_id, customer_id, invoice_date, due_date,
          billing_cycle_date, idempotency_key, status, payment_terms, subtotal,
          discount_amount, discount_code, tax_amount, total_amount, paid_amount,
          remaining_amount, lines, email_sent, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, TRUE, 'Core invoice')`,
        [
          inv.id, inv.invoice_number, inv.subscription_id, inv.customer_id, inv.invoice_date,
          inv.due_date, inv.billing_cycle_date, inv.idempotency_key, inv.status, inv.payment_terms,
          inv.subtotal, inv.discount_amount, inv.discount_code, inv.tax_amount, inv.total_amount,
          inv.paid_amount, inv.remaining_amount, JSON.stringify(inv.lines)
        ]
      );
    }

    // Seed core payments
    await client.query(
      `INSERT INTO payments (id, payment_number, invoice_id, customer_id, amount, payment_date, method, reference, notes)
       VALUES (
         'pay-2026-0001', 'PAY-2026-0001', 'inv-2026-0002', 'cust-fluxcorp-02', 12968.03, '2026-01-20', 'Bank Transfer', 'SWIFT-DE-88391032', 'Settled via wire'
       ), (
         'pay-2026-0002', 'PAY-2026-0002', 'inv-2026-0003', 'cust-artisan-04', 500.00, '2026-08-15', 'Card', 'STRIPE-CH-774921', 'Partial installment'
       )`
    );

    // 11. HIGH SCALE STRESS SEEDING: Populate 2,500 Subscriptions & Invoices
    console.log(`  ⚡ Generating ${count} realistic subscriptions & invoices for < 2s performance benchmarking...`);
    const statuses = ['Active', 'Active', 'Active', 'Quotation', 'Confirmed', 'Closed'];
    const planIds = plans.map(p => p.id);
    const customerIds = customers.map(c => c.id);

    const bulkSubBatchSize = 250;
    for (let batchStart = 1; batchStart <= count; batchStart += bulkSubBatchSize) {
      const batchEnd = Math.min(count, batchStart + bulkSubBatchSize - 1);

      for (let i = batchStart; i <= batchEnd; i++) {
        const seq = (i + 4).toString().padStart(5, '0');
        const sId = `sub-sim-${seq}`;
        const sNumber = `SUB-SIM-${seq}`;
        const cId = customerIds[i % customerIds.length];
        const pId = planIds[i % planIds.length];
        const stat = statuses[i % statuses.length];
        const qty = (i % 8) + 1;
        const unitPrice = 1760; // Uses Odoo variant
        const lineTot = qty * unitPrice;

        await client.query(
          `INSERT INTO subscriptions (
            id, sub_number, customer_id, plan_id, status, is_paused,
            start_date, expiry_date, next_billing_date, payment_terms, discount_id, notes
          ) VALUES ($1, $2, $3, $4, $5, FALSE, '2026-01-01', '2027-01-01', '2026-10-01', 'Net 15', $6, 'Simulated stress subscription')`,
          [sId, sNumber, cId, pId, stat, i % 3 === 0 ? 'disc-flux20' : null]
        );

        await client.query(
          `INSERT INTO subscription_lines (
            id, subscription_id, product_id, variant_id, product_name, variant_name,
            quantity, base_price, variant_extra, unit_price, tax_rate, total
          ) VALUES ($1, $2, 'prod-001', 'var-core-odoo', 'Brightloop ERP Core Suite', 'Odoo Connected Edition (+560)', $3, 1200, 560, 1760, 18, $4)`,
          [`sline-sim-${seq}`, sId, qty, lineTot]
        );

        // Create realistic invoice for half of them
        if (i % 2 === 0) {
          const invSeq = (i + 3).toString().padStart(5, '0');
          const invId = `inv-sim-${invSeq}`;
          const invNum = `INV-SIM-${invSeq}`;
          const invDate = i % 4 === 0 ? '2026-08-01' : '2026-10-01';
          const dueDate = i % 4 === 0 ? '2026-08-16' : '2026-10-16'; // Some overdue
          const invStat = i % 4 === 0 ? 'Confirmed' : (i % 6 === 0 ? 'Paid' : 'Confirmed');
          const taxAmt = Math.round(lineTot * 0.18 * 100) / 100;
          const totAmt = Math.round((lineTot + taxAmt) * 100) / 100;
          const paidAmt = invStat === 'Paid' ? totAmt : 0;
          const remAmt = totAmt - paidAmt;

          await client.query(
            `INSERT INTO invoices (
              id, invoice_number, subscription_id, customer_id, invoice_date, due_date,
              billing_cycle_date, idempotency_key, status, payment_terms, subtotal,
              discount_amount, discount_code, tax_amount, total_amount, paid_amount,
              remaining_amount, lines, email_sent, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, '2026-10-01', $7, $8, 'Net 15', $9, 0, NULL, $10, $11, $12, $13, $14, TRUE, 'Simulated stress invoice')`,
            [
              invId, invNum, sId, cId, invDate, dueDate, `${sId}_2026-10-01`, invStat,
              lineTot, taxAmt, totAmt, paidAmt, remAmt,
              JSON.stringify([{ description: 'Brightloop Core Suite (Odoo +560)', quantity: qty, unitPrice: 1760, taxRate: 18, total: lineTot }])
            ]
          );
        }
      }
    }
  });

  const duration = Math.round((performance.now() - t0) * 10) / 10;
  console.log(`\n🎉 Database seeding finished in ${duration}ms! Total records: 2,500+ subscriptions & invoices.\n`);
  return { success: true, durationMs: duration };
}

// Allow direct CLI execution: node src/scripts/seed.js
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed().then(() => process.exit(0)).catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
