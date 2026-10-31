import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken, scopeCustomer, requireStaffOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// List Invoices (Scoped for Customer)
router.get('/', authenticateToken, scopeCustomer, async (req, res) => {
  try {
    const { status, customer_id, subscription_id, overdue_only, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT i.*, 
             c.name as customer_name, c.email as customer_email, c.contact_name, c.tax_id as customer_tax_id,
             s.sub_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN subscriptions s ON i.subscription_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (req.customerScopeId) {
      params.push(req.customerScopeId);
      sql += ` AND i.customer_id = $${params.length}`;
    } else if (customer_id) {
      params.push(customer_id);
      sql += ` AND i.customer_id = $${params.length}`;
    }

    if (subscription_id) {
      params.push(subscription_id);
      sql += ` AND i.subscription_id = $${params.length}`;
    }

    if (status && status !== 'All') {
      if (status === 'Overdue') {
        const todayStr = new Date().toISOString().split('T')[0];
        params.push(todayStr);
        sql += ` AND i.status IN ('Draft', 'Confirmed') AND i.remaining_amount > 0 AND i.due_date < $${params.length}`;
      } else {
        params.push(status);
        sql += ` AND i.status = $${params.length}`;
      }
    }

    if (overdue_only === 'true') {
      const todayStr = new Date().toISOString().split('T')[0];
      params.push(todayStr);
      sql += ` AND i.status IN ('Draft', 'Confirmed') AND i.remaining_amount > 0 AND i.due_date < $${params.length}`;
    }

    sql += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), Number(offset));

    const invRes = await query(sql, params);
    const invoices = invRes.rows.map(inv => ({
      ...inv,
      subtotal: Number(inv.subtotal),
      discount_amount: Number(inv.discount_amount),
      tax_amount: Number(inv.tax_amount),
      total_amount: Number(inv.total_amount),
      paid_amount: Number(inv.paid_amount),
      remaining_amount: Number(inv.remaining_amount),
      lines: typeof inv.lines === 'string' ? JSON.parse(inv.lines) : (inv.lines || [])
    }));

    return res.apiSuccess(invoices);
  } catch (err) {
    return res.apiError('Failed to fetch invoices: ' + err.message, 500);
  }
});

// Get Invoice by ID
router.get('/:id', authenticateToken, scopeCustomer, async (req, res) => {
  try {
    const { id } = req.params;

    let sql = `
      SELECT i.*, 
             c.name as customer_name, c.email as customer_email, c.contact_name, c.address as customer_address, c.tax_id as customer_tax_id,
             s.sub_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN subscriptions s ON i.subscription_id = s.id
      WHERE (i.id = $1 OR i.invoice_number = $1)
    `;
    const params = [id];

    if (req.customerScopeId) {
      params.push(req.customerScopeId);
      sql += ` AND i.customer_id = $2`;
    }

    const invRes = await query(sql, params);
    if (invRes.rows.length === 0) {
      return res.apiError('Invoice not found or access denied.', 404);
    }

    const inv = invRes.rows[0];
    return res.apiSuccess({
      ...inv,
      subtotal: Number(inv.subtotal),
      discount_amount: Number(inv.discount_amount),
      tax_amount: Number(inv.tax_amount),
      total_amount: Number(inv.total_amount),
      paid_amount: Number(inv.paid_amount),
      remaining_amount: Number(inv.remaining_amount),
      lines: typeof inv.lines === 'string' ? JSON.parse(inv.lines) : (inv.lines || [])
    });
  } catch (err) {
    return res.apiError('Failed to fetch invoice details: ' + err.message, 500);
  }
});

// Confirm Invoice (Draft -> Confirmed)
router.post('/:id/confirm', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const invRes = await query(`SELECT * FROM invoices WHERE id = $1`, [id]);
    if (invRes.rows.length === 0) {
      return res.apiError('Invoice not found.', 404);
    }

    const inv = invRes.rows[0];
    if (inv.status !== 'Draft') {
      return res.apiError(`Cannot confirm invoice with status '${inv.status}'. Must be in 'Draft'.`, 400);
    }

    const updateRes = await query(
      `UPDATE invoices SET status = 'Confirmed' WHERE id = $1 RETURNING *`,
      [id]
    );

    return res.apiSuccess(updateRes.rows[0], `Invoice ${inv.invoice_number} confirmed.`);
  } catch (err) {
    return res.apiError('Failed to confirm invoice: ' + err.message, 500);
  }
});

// Cancel Invoice
router.post('/:id/cancel', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const invRes = await query(`SELECT * FROM invoices WHERE id = $1`, [id]);
    if (invRes.rows.length === 0) {
      return res.apiError('Invoice not found.', 404);
    }

    const inv = invRes.rows[0];
    if (inv.status === 'Paid') {
      return res.apiError('Cannot cancel a fully settled/paid invoice.', 400);
    }

    const updateRes = await query(
      `UPDATE invoices SET status = 'Cancelled' WHERE id = $1 RETURNING *`,
      [id]
    );

    return res.apiSuccess(updateRes.rows[0], `Invoice ${inv.invoice_number} cancelled.`);
  } catch (err) {
    return res.apiError('Failed to cancel invoice: ' + err.message, 500);
  }
});

// Send Invoice Notification (Email simulation)
router.post('/:id/send', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const invRes = await query(
      `SELECT i.*, c.email as customer_email, c.contact_name 
       FROM invoices i 
       JOIN customers c ON i.customer_id = c.id 
       WHERE i.id = $1`,
      [id]
    );

    if (invRes.rows.length === 0) {
      return res.apiError('Invoice not found.', 404);
    }

    const inv = invRes.rows[0];
    const updateRes = await query(
      `UPDATE invoices 
       SET email_sent = TRUE, email_sent_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    return res.apiSuccess(
      {
        invoiceNumber: inv.invoice_number,
        recipient: inv.customer_email,
        contactName: inv.contact_name,
        amountDue: Number(inv.remaining_amount),
        emailSentAt: new Date().toISOString()
      },
      `Invoice notification dispatched to ${inv.customer_email}.`
    );
  } catch (err) {
    return res.apiError('Failed to send invoice notification: ' + err.message, 500);
  }
});

// Print-Ready Invoice Payload (JSON + HTML)
router.get('/:id/print', authenticateToken, scopeCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    let sql = `
      SELECT i.*, 
             c.name as customer_name, c.email as customer_email, c.contact_name, c.address as customer_address, c.tax_id as customer_tax_id,
             s.sub_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN subscriptions s ON i.subscription_id = s.id
      WHERE (i.id = $1 OR i.invoice_number = $1)
    `;
    const params = [id];

    if (req.customerScopeId) {
      params.push(req.customerScopeId);
      sql += ` AND i.customer_id = $2`;
    }

    const invRes = await query(sql, params);
    if (invRes.rows.length === 0) {
      return res.apiError('Invoice not found.', 404);
    }

    const inv = invRes.rows[0];
    const lines = typeof inv.lines === 'string' ? JSON.parse(inv.lines) : (inv.lines || []);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${inv.invoice_number} - Brightloop Software</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #212529; margin: 40px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #714B67; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #714B67; }
          .meta { margin-top: 20px; display: flex; justify-content: space-between; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 13px; }
          th { background: #f8f9fa; border-bottom: 2px solid #dee2e6; text-align: left; padding: 10px; }
          td { border-bottom: 1px solid #dee2e6; padding: 10px; }
          .text-right { text-align: right; }
          .total-box { margin-top: 30px; float: right; width: 300px; font-size: 14px; }
          .total-box div { display: flex; justify-content: space-between; padding: 4px 0; }
          .grand-total { font-weight: bold; font-size: 16px; color: #714B67; border-top: 2px solid #dee2e6; padding-top: 8px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Brightloop Software</div>
            <p>Odoo x Flux Hackathon 2026 ERP</p>
          </div>
          <div style="text-align: right;">
            <h2>${inv.invoice_number}</h2>
            <p>Status: ${inv.status.toUpperCase()}</p>
            <p>Date: ${inv.invoice_date} | Due: ${inv.due_date}</p>
          </div>
        </div>
        <div class="meta">
          <div>
            <strong>Billed To:</strong><br>
            ${inv.customer_name}<br>
            Attn: ${inv.contact_name}<br>
            ${inv.customer_address || ''}<br>
            Tax ID: ${inv.customer_tax_id || 'N/A'}
          </div>
          <div style="text-align: right;">
            <strong>Subscription Ref:</strong> ${inv.sub_number || inv.subscription_id}<br>
            <strong>Payment Terms:</strong> ${inv.payment_terms}<br>
            <strong>Idempotency Key:</strong> ${inv.idempotency_key}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Tax %</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lines.map(l => `
              <tr>
                <td>${l.description}</td>
                <td class="text-right">${l.quantity}</td>
                <td class="text-right">$${Number(l.unitPrice).toFixed(2)}</td>
                <td class="text-right">${l.taxRate}%</td>
                <td class="text-right">$${Number(l.total).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total-box">
          <div><span>Subtotal:</span><span>$${Number(inv.subtotal).toFixed(2)}</span></div>
          <div><span>Discount:</span><span>-$${Number(inv.discount_amount).toFixed(2)}</span></div>
          <div><span>Tax:</span><span>$${Number(inv.tax_amount).toFixed(2)}</span></div>
          <div class="grand-total"><span>Total Amount:</span><span>$${Number(inv.total_amount).toFixed(2)}</span></div>
          <div><span>Paid:</span><span>$${Number(inv.paid_amount).toFixed(2)}</span></div>
          <div style="color: #d9534f; font-weight: bold;"><span>Remaining Balance:</span><span>$${Number(inv.remaining_amount).toFixed(2)}</span></div>
        </div>
      </body>
      </html>
    `;

    return res.apiSuccess({
      invoice: {
        ...inv,
        subtotal: Number(inv.subtotal),
        discount_amount: Number(inv.discount_amount),
        tax_amount: Number(inv.tax_amount),
        total_amount: Number(inv.total_amount),
        paid_amount: Number(inv.paid_amount),
        remaining_amount: Number(inv.remaining_amount),
        lines
      },
      renderedHtml: html
    });
  } catch (err) {
    return res.apiError('Failed to generate printable invoice: ' + err.message, 500);
  }
});

export default router;
