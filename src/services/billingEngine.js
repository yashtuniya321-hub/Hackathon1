import { query, transaction } from '../config/db.js';

export class BillingEngine {
  /**
   * Atomic ACID Transactional Batch Billing Day Engine
   * Evaluates due subscriptions, enforces idempotency, evaluates discounts & taxes,
   * advances renewal intervals, and decommissions auto-closing plans.
   */
  static async runBatchBilling({ targetDate = new Date().toISOString().split('T')[0] } = {}) {
    const t0 = performance.now();
    const billingDateObj = new Date(targetDate);

    return await transaction(async (client) => {
      // 1. Fetch active, non-paused subscriptions due on or before targetDate
      // using row-level locking (FOR UPDATE) to prevent race conditions
      const subsRes = await client.query(
        `SELECT s.*, p.billing_frequency, p.cost as plan_cost, p.auto_close, p.name as plan_name,
                c.name as customer_name, c.email as customer_email, c.payment_terms as customer_terms
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         JOIN customers c ON s.customer_id = c.id
         WHERE s.status = 'Active'
           AND s.is_paused = FALSE
           AND s.next_billing_date <= $1
         ORDER BY s.next_billing_date ASC
         FOR UPDATE OF s`,
        [targetDate]
      );

      const dueSubscriptions = subsRes.rows;
      const createdInvoices = [];
      const skippedDuplicates = [];
      const runTimePrefix = Date.now().toString().slice(-4);

      for (const sub of dueSubscriptions) {
        const cycleDateRaw = sub.next_billing_date;
        const cycleDate = cycleDateRaw instanceof Date
          ? cycleDateRaw.toISOString().split('T')[0]
          : String(cycleDateRaw).split('T')[0];
        const idempotencyKey = `${sub.id}_${cycleDate}`;

        // 2. Check strict idempotency constraint: Have we already billed this cycle?
        const existingInvRes = await client.query(
          `SELECT id, invoice_number FROM invoices 
           WHERE subscription_id = $1 AND billing_cycle_date = $2`,
          [sub.id, cycleDate]
        );

        if (existingInvRes.rows.length > 0) {
          skippedDuplicates.push({
            subscriptionId: sub.id,
            subNumber: sub.sub_number,
            billingCycleDate: cycleDate,
            idempotencyKey,
            existingInvoice: existingInvRes.rows[0].invoice_number,
            reason: 'Idempotency safeguard: Already billed for this cycle.'
          });
          continue;
        }

        // 3. Fetch subscription line items
        const linesRes = await client.query(
          `SELECT sl.*, p.type as product_type
           FROM subscription_lines sl
           LEFT JOIN products p ON sl.product_id = p.id
           WHERE sl.subscription_id = $1`,
          [sub.id]
        );

        const subLines = linesRes.rows;
        let subtotal = 0;
        let totalQuantity = 0;

        subLines.forEach(l => {
          const qty = Number(l.quantity) || 1;
          const uPrice = Number(l.unit_price) || (Number(l.base_price) + Number(l.variant_extra));
          const lineTot = Number(l.total) || (qty * uPrice);
          subtotal += lineTot;
          totalQuantity += qty;
        });

        // Fallback to plan cost if no specific lines exist
        if (subtotal === 0 && Number(sub.plan_cost) > 0) {
          subtotal = Number(sub.plan_cost);
        }

        // 4. Evaluate Admin Discount Rules
        let discountAmount = 0;
        let appliedDiscountCode = null;

        if (sub.discount_id) {
          const discRes = await client.query(
            `SELECT * FROM discounts WHERE id = $1 FOR UPDATE`,
            [sub.discount_id]
          );

          if (discRes.rows.length > 0) {
            const disc = discRes.rows[0];
            const nowIso = targetDate;
            const startDateStr = disc.start_date instanceof Date
              ? disc.start_date.toISOString().split('T')[0]
              : (disc.start_date ? String(disc.start_date).split('T')[0] : null);
            const endDateStr = disc.end_date instanceof Date
              ? disc.end_date.toISOString().split('T')[0]
              : (disc.end_date ? String(disc.end_date).split('T')[0] : null);

            const isNotExpired = (!endDateStr || endDateStr >= nowIso) &&
                                 (!startDateStr || startDateStr <= nowIso);
            const hasQuota = disc.max_uses ? (Number(disc.current_uses) < Number(disc.max_uses)) : true;
            const meetsMinSpend = !disc.min_purchase_amount || subtotal >= Number(disc.min_purchase_amount);
            const meetsMinSeats = !disc.min_quantity || totalQuantity >= Number(disc.min_quantity);

            if (disc.active && isNotExpired && hasQuota && meetsMinSpend && meetsMinSeats) {
              appliedDiscountCode = disc.code;

              if (disc.scope === 'product' && disc.target_product_id) {
                // Apply discount only to target product line
                const targetLine = subLines.find(l => l.product_id === disc.target_product_id);
                if (targetLine) {
                  const lineTotal = Number(targetLine.total);
                  if (disc.type === 'percentage') {
                    discountAmount = Math.round((lineTotal * (Number(disc.value) / 100)) * 100) / 100;
                  } else {
                    discountAmount = Math.min(Number(disc.value), lineTotal);
                  }
                }
              } else {
                // Apply to whole subscription
                if (disc.type === 'percentage') {
                  discountAmount = Math.round((subtotal * (Number(disc.value) / 100)) * 100) / 100;
                } else {
                  discountAmount = Math.min(Number(disc.value), subtotal);
                }
              }

              // Increment current_uses and auto-expire if quota reached
              const updatedUses = Number(disc.current_uses) + 1;
              const shouldDeactivate = disc.max_uses ? (updatedUses >= Number(disc.max_uses)) : false;

              await client.query(
                `UPDATE discounts 
                 SET current_uses = $1, active = $2
                 WHERE id = $3`,
                [updatedUses, !shouldDeactivate, disc.id]
              );
            }
          }
        }

        // 5. Automatic Tax Calculation
        const taxableBase = Math.max(0, subtotal - discountAmount);
        let taxAmount = 0;

        subLines.forEach(line => {
          const rate = Number(line.tax_rate) || 18;
          const lineFraction = subtotal > 0 ? (Number(line.total) / subtotal) : 1;
          const lineTaxable = taxableBase * lineFraction;
          taxAmount += Math.round((lineTaxable * (rate / 100)) * 100) / 100;
        });

        const totalAmount = Math.round((taxableBase + taxAmount) * 100) / 100;

        // 6. Compute Due Date based on Payment Terms
        const paymentTerms = sub.payment_terms || sub.customer_terms || 'Net 15';
        let termDays = 15;
        if (paymentTerms === 'Net 30') termDays = 30;
        else if (paymentTerms === 'Net 60') termDays = 60;
        else if (paymentTerms === 'Immediate') termDays = 0;

        const dueTimestamp = new Date(billingDateObj.getTime() + termDays * 86400000);
        const dueDate = dueTimestamp.toISOString().split('T')[0];

        // Generate unique invoice number and ID: INV-2026-XXXX
        const invSeq = `${runTimePrefix}${(createdInvoices.length + 1).toString().padStart(4, '0')}`;
        const invoiceNumber = `INV-2026-${invSeq}`;
        const invoiceId = `inv-2026-${invSeq}`;

        // Prepare line item JSON snapshot for invoice
        const invoiceLines = subLines.map(l => ({
          productId: l.product_id,
          description: l.variant_name ? `${l.product_name} (${l.variant_name})` : l.product_name,
          quantity: l.quantity,
          unitPrice: Number(l.unit_price),
          taxRate: Number(l.tax_rate),
          total: Number(l.total)
        }));

        // 7. Insert Invoice (Protected by UNIQUE constraint)
        const insertInvRes = await client.query(
          `INSERT INTO invoices (
            id, invoice_number, subscription_id, customer_id, invoice_date, due_date,
            billing_cycle_date, idempotency_key, status, payment_terms, subtotal,
            discount_amount, discount_code, tax_amount, total_amount, paid_amount,
            remaining_amount, lines, email_sent, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, 'Draft', $9, $10,
            $11, $12, $13, $14, 0,
            $15, $16, FALSE, $17
          ) RETURNING *`,
          [
            invoiceId,
            invoiceNumber,
            sub.id,
            sub.customer_id,
            targetDate,
            dueDate,
            cycleDate,
            idempotencyKey,
            paymentTerms,
            subtotal,
            discountAmount,
            appliedDiscountCode,
            taxAmount,
            totalAmount,
            totalAmount,
            JSON.stringify(invoiceLines),
            `Automated recurring billing run for cycle: ${cycleDate}`
          ]
        );

        createdInvoices.push(insertInvRes.rows[0]);

        // 8. Advance Subscription next_billing_date by plan frequency
        const freq = sub.billing_frequency || 'monthly';
        const nextDateObj = new Date(cycleDate);

        if (freq === 'daily') {
          nextDateObj.setDate(nextDateObj.getDate() + 1);
        } else if (freq === 'weekly') {
          nextDateObj.setDate(nextDateObj.getDate() + 7);
        } else if (freq === 'yearly') {
          nextDateObj.setFullYear(nextDateObj.getFullYear() + 1);
        } else {
          // Default monthly
          nextDateObj.setMonth(nextDateObj.getMonth() + 1);
        }

        const nextBillingDateStr = nextDateObj.toISOString().split('T')[0];

        // Check if plan has auto_close = true and has reached or surpassed expiry_date
        let newStatus = sub.status;
        let closedAt = null;

        const expiryStr = sub.expiry_date instanceof Date
          ? sub.expiry_date.toISOString().split('T')[0]
          : (sub.expiry_date ? String(sub.expiry_date).split('T')[0] : null);

        if (sub.auto_close && expiryStr && nextBillingDateStr >= expiryStr) {
          newStatus = 'Closed';
          closedAt = new Date().toISOString();
        }

        await client.query(
          `UPDATE subscriptions 
           SET next_billing_date = $1, status = $2, closed_at = $3
           WHERE id = $4`,
          [nextBillingDateStr, newStatus, closedAt, sub.id]
        );
      }

      const elapsed = Math.round((performance.now() - t0) * 100) / 100;

      // 9. Save Execution Audit Log
      const runId = `brun-${Date.now()}`;
      await client.query(
        `INSERT INTO billing_runs (
          id, billing_date, run_timestamp, invoices_created, duplicates_skipped, execution_time_ms, summary
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6)`,
        [
          runId,
          targetDate,
          createdInvoices.length,
          skippedDuplicates.length,
          elapsed,
          JSON.stringify({
            createdCount: createdInvoices.length,
            skippedCount: skippedDuplicates.length,
            skippedDuplicates
          })
        ]
      );

      return {
        runId,
        billingDate: targetDate,
        invoicesCreated: createdInvoices.length,
        duplicatesSkipped: skippedDuplicates.length,
        invoices: createdInvoices,
        skippedDetails: skippedDuplicates,
        executionTimeMs: elapsed,
        slaCompliant: elapsed < 2000
      };
    });
  }
}
