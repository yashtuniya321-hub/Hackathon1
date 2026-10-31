import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken, requireStaffOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Executive Finance Analytics API
router.get('/finance', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { start_date, end_date, plan_id, status } = req.query;
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Fast SQL aggregations for subscriptions metrics
    let subSql = `
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN s.status = 'Active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN s.status = 'Quotation' THEN 1 END) as quotation_subscriptions,
        COUNT(CASE WHEN s.status = 'Draft' THEN 1 END) as draft_subscriptions,
        COUNT(CASE WHEN s.status = 'Closed' THEN 1 END) as closed_subscriptions,
        COUNT(CASE WHEN s.is_paused = TRUE THEN 1 END) as paused_subscriptions
      FROM subscriptions s
      WHERE 1=1
    `;
    const subParams = [];
    if (plan_id) {
      subParams.push(plan_id);
      subSql += ` AND s.plan_id = $${subParams.length}`;
    }
    if (status) {
      subParams.push(status);
      subSql += ` AND s.status = $${subParams.length}`;
    }

    const subCountsRes = await query(subSql, subParams);
    const subCounts = subCountsRes.rows[0];

    // 2. MRR / ARR computation from active subscriptions using SQL join
    const mrrRes = await query(
      `SELECT 
         s.id, p.billing_frequency, p.cost as plan_cost,
         COALESCE(SUM(sl.total), p.cost) as sub_total
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       LEFT JOIN subscription_lines sl ON s.id = sl.subscription_id
       WHERE s.status = 'Active' AND s.is_paused = FALSE
       GROUP BY s.id, p.billing_frequency, p.cost`
    );

    let mrr = 0;
    mrrRes.rows.forEach(row => {
      const baseAmt = Number(row.sub_total) || Number(row.plan_cost) || 0;
      const freq = row.billing_frequency || 'monthly';
      if (freq === 'monthly') mrr += baseAmt;
      else if (freq === 'yearly') mrr += baseAmt / 12;
      else if (freq === 'weekly') mrr += (baseAmt * 52) / 12;
      else if (freq === 'daily') mrr += baseAmt * 30;
    });

    const arr = mrr * 12;

    // 3. Invoices & Revenue Aggregations
    let invSql = `
      SELECT 
        COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN total_amount ELSE 0 END), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN paid_amount ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN remaining_amount ELSE 0 END), 0) as total_outstanding,
        COUNT(CASE WHEN status != 'Cancelled' THEN 1 END) as total_invoices_count,
        COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_invoices_count
      FROM invoices
      WHERE 1=1
    `;
    const invParams = [];
    if (start_date) {
      invParams.push(start_date);
      invSql += ` AND invoice_date >= $${invParams.length}`;
    }
    if (end_date) {
      invParams.push(end_date);
      invSql += ` AND invoice_date <= $${invParams.length}`;
    }

    const invTotalsRes = await query(invSql, invParams);
    const invTotals = invTotalsRes.rows[0];

    // 4. Overdue Invoices Detection (where remaining_amount > 0 and due_date < today)
    const overdueRes = await query(
      `SELECT i.id, i.invoice_number, i.subscription_id, i.customer_id,
              i.invoice_date, i.due_date, i.total_amount, i.paid_amount, i.remaining_amount,
              c.name as customer_name, c.email as customer_email, c.contact_name
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.status IN ('Draft', 'Confirmed')
         AND i.remaining_amount > 0
         AND i.due_date < $1
       ORDER BY i.due_date ASC
       LIMIT 100`,
      [todayStr]
    );

    const overdueInvoices = overdueRes.rows.map(i => ({
      ...i,
      total_amount: Number(i.total_amount),
      paid_amount: Number(i.paid_amount),
      remaining_amount: Number(i.remaining_amount)
    }));

    const totalOverdueAmount = overdueInvoices.reduce((acc, i) => acc + i.remaining_amount, 0);

    // 5. Subscription breakdown by Plan
    const planBreakdownRes = await query(
      `SELECT p.name as plan_name, p.billing_frequency, COUNT(s.id) as count
       FROM plans p
       LEFT JOIN subscriptions s ON p.id = s.plan_id
       GROUP BY p.name, p.billing_frequency
       ORDER BY count DESC`
    );

    return res.apiSuccess({
      metrics: {
        totalSubscriptions: Number(subCounts.total_subscriptions),
        activeSubscriptions: Number(subCounts.active_subscriptions),
        quotationsCount: Number(subCounts.quotation_subscriptions),
        draftCount: Number(subCounts.draft_subscriptions),
        closedCount: Number(subCounts.closed_subscriptions),
        pausedCount: Number(subCounts.paused_subscriptions),
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        totalInvoiced: Number(invTotals.total_invoiced),
        totalCollected: Number(invTotals.total_collected),
        totalOutstanding: Number(invTotals.total_outstanding),
        overdueCount: overdueInvoices.length,
        totalOverdueAmount: Math.round(totalOverdueAmount * 100) / 100
      },
      overdueInvoices,
      planBreakdown: planBreakdownRes.rows.map(r => ({ ...r, count: Number(r.count) }))
    });
  } catch (err) {
    return res.apiError('Failed to generate finance analytics: ' + err.message, 500);
  }
});

export default router;
