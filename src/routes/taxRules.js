import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// List all tax rules
router.get('/', authenticateToken, async (req, res) => {
  try {
    const taxRes = await query(`SELECT * FROM tax_rules ORDER BY rate ASC`);
    const taxes = taxRes.rows.map(t => ({
      ...t,
      rate: Number(t.rate)
    }));
    return res.apiSuccess(taxes);
  } catch (err) {
    return res.apiError('Failed to fetch tax rules: ' + err.message, 500);
  }
});

// Create tax rule - ADMIN ONLY
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, rate = 0, is_default = false, active = true, description = '' } = req.body;

    if (!name || rate === undefined) {
      return res.apiError('Tax rule name and percentage rate are required.', 400);
    }

    const taxId = `tax-${Date.now().toString().slice(-6)}`;
    const insertRes = await query(
      `INSERT INTO tax_rules (id, name, rate, is_default, active, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [taxId, name, Number(rate), Boolean(is_default), Boolean(active), description]
    );

    return res.status(201).apiSuccess(
      { ...insertRes.rows[0], rate: Number(insertRes.rows[0].rate) },
      `Tax rule "${name}" created.`
    );
  } catch (err) {
    return res.apiError('Failed to create tax rule: ' + err.message, 500);
  }
});

// Delete tax rule - ADMIN ONLY
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleteRes = await query(`DELETE FROM tax_rules WHERE id = $1 RETURNING id, name`, [id]);
    if (deleteRes.rows.length === 0) {
      return res.apiError('Tax rule not found.', 404);
    }
    return res.apiSuccess({ id }, `Tax rule "${deleteRes.rows[0].name}" removed.`);
  } catch (err) {
    return res.apiError('Failed to delete tax rule: ' + err.message, 500);
  }
});

export default router;
