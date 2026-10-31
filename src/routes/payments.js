import express from 'express';
import { query, transaction } from '../config/db.js';
import { authenticateToken, scopeCustomer } from '../middleware/auth.js';

const router = express.Router();

// List payments (Scoped for customer)
router.get('/', authenticateToken, scopeCustomer, async (req, res) => {
  try {
    const { customer_id, invoice_id, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT p.*, 
             c.name as customer_name, c.email as customer_email,
             i.invoice_number, i.total_amount as invoice_total
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      JOIN invoices i ON p.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (req.customerScopeId) {
      params.push(req.customerScopeId);
      sql += ` AND p.customer_id = $${params.length}`;
    } else if (customer_id) {
      params.push(customer_id);
      sql += ` AND p.customer_id = $${params.length}`;
    }

    if (invoice_id) {
      params.push(invoice_id);
      sql += ` AND p.invoice_id = $${params.length}`;
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), Number(offset));

    const payRes = await query(sql, params);
    const payments = payRes.rows.map(p => ({
      ...p,
      amount: Number(p.amount),
      invoice_total: Number(p.invoice_total)
    }));

    return res.apiSuccess(payments);
  } catch (err) {
    return res.apiError('Failed to fetch payments: ' + err.message, 500);
  }
});

// Record Payment Against Specific Invoice
router.post('/', authenticateToken, scopeCustomer, async (req, res) => {
  try {
    const {
      invoice_id,
      amount,
      method = 'Bank Transfer',
      reference,
      notes = '',
      payment_date = new Date().toISOString().split('T')[0]
    } = req.body;

    if (!invoice_id || amount === undefined || Number(amount) <= 0) {
      return res.apiError('invoice_id and a positive payment amount are required.', 400);
    }

    const payAmount = Number(amount);
    const validMethods = ['Bank Transfer', 'UPI', 'Card', 'Cash'];
    if (!validMethods.includes(method)) {
      return res.apiError(`Invalid payment method. Permitted: [${validMethods.join(', ')}]`, 400);
    }

    const result = await transaction(async (client) => {
      // 1. Fetch invoice with lock
      const invRes = await client.query(
        `SELECT * FROM invoices WHERE id = $1 FOR UPDATE`,
        [invoice_id]
      );

      if (invRes.rows.length === 0) {
        throw new Error('Invoice not found.');
      }

      const inv = invRes.rows[0];

      // Enforce customer scoping if customer
      if (req.customerScopeId && inv.customer_id !== req.customerScopeId) {
        throw new Error('Unauthorized: You can only record payments for your own invoices.');
      }

      if (inv.status === 'Cancelled') {
        throw new Error('Cannot record payments against a Cancelled invoice.');
      }

      const remainingBefore = Number(inv.remaining_amount);
      if (remainingBefore <= 0.01) {
        throw new Error('Invoice is already fully settled/paid.');
      }

      // Generate payment unique ID
      const paySuffix = `${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 900 + 100)}`;
      const payNumber = `PAY-2026-${paySuffix}`;
      const payId = `pay-2026-${paySuffix}`;

      // Insert payment record
      const payRes = await client.query(
        `INSERT INTO payments (
          id, payment_number, invoice_id, customer_id, amount, payment_date, method, reference, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          payId,
          payNumber,
          inv.id,
          inv.customer_id,
          payAmount,
          payment_date,
          method,
          reference || `TXN-${Date.now().toString().slice(-6)}`,
          notes || 'Payment settlement recorded'
        ]
      );

      // 2. Update Invoice balance
      const newPaidAmount = Math.round((Number(inv.paid_amount) + payAmount) * 100) / 100;
      const totalAmount = Number(inv.total_amount);
      const newRemaining = Math.max(0, Math.round((totalAmount - newPaidAmount) * 100) / 100);

      // Automatically transition invoice to Paid when settled
      const newStatus = newRemaining <= 0.01 ? 'Paid' : (inv.status === 'Draft' ? 'Confirmed' : inv.status);

      const updatedInvRes = await client.query(
        `UPDATE invoices 
         SET paid_amount = $1, remaining_amount = $2, status = $3 
         WHERE id = $4 
         RETURNING *`,
        [newPaidAmount, newRemaining, newStatus, inv.id]
      );

      return {
        payment: {
          ...payRes.rows[0],
          amount: payAmount
        },
        invoice: {
          ...updatedInvRes.rows[0],
          total_amount: Number(updatedInvRes.rows[0].total_amount),
          paid_amount: Number(updatedInvRes.rows[0].paid_amount),
          remaining_amount: Number(updatedInvRes.rows[0].remaining_amount)
        }
      };
    });

    return res.status(201).apiSuccess(
      result,
      `Payment ${result.payment.payment_number} of $${result.payment.amount} recorded. Invoice status: ${result.invoice.status}.`
    );
  } catch (err) {
    return res.apiError('Failed to record payment: ' + err.message, 400);
  }
});

export default router;
