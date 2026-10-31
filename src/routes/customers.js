import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken, requireStaffOrAdmin } from '../middleware/auth.js';

export const router = express.Router();

// GET /api/customers - List all customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = 'SELECT * FROM customers ORDER BY name ASC';
    let params = [];
    
    // If user is a customer, only return themselves
    if (req.user?.role === 'customer') {
      sql = 'SELECT * FROM customers WHERE id = $1';
      params = [req.user.customer_id];
    }
    
    const result = await query(sql, params);
    res.apiSuccess(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/customers/:id - Single customer
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user?.role === 'customer' && req.user.customer_id !== id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const result = await query('SELECT * FROM customers WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.apiSuccess(result.rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/customers - Create new customer
router.post('/', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { name, contact_name, contactName, email, phone, tax_id, taxId, address, payment_terms, paymentTerms } = req.body;
    const resolvedContact = contact_name || contactName || name;
    const resolvedTax = tax_id || taxId || 'US-STANDARD';
    const resolvedTerms = payment_terms || paymentTerms || 'Net 15';

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Customer name and email are required' });
    }

    const id = `cust-${Date.now().toString().slice(-6)}`;
    const result = await query(
      `INSERT INTO customers (id, name, contact_name, email, phone, tax_id, address, payment_terms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, name, resolvedContact, email.toLowerCase().trim(), phone || '+1 (555) 000-0000', resolvedTax, address || 'Corporate Headquarters', resolvedTerms]
    );

    res.apiSuccess(result.rows[0], 'Customer created successfully', 201);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
