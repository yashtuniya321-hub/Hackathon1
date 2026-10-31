import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken, requireStaffOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// List quotation templates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tmplRes = await query(
      `SELECT qt.*, p.name as plan_name, p.billing_frequency, p.cost as plan_cost
       FROM quotation_templates qt
       LEFT JOIN plans p ON qt.plan_id = p.id
       ORDER BY qt.created_at DESC`
    );
    return res.apiSuccess(tmplRes.rows);
  } catch (err) {
    return res.apiError('Failed to fetch quotation templates: ' + err.message, 500);
  }
});

// Create quotation template
router.post('/', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { name, plan_id, validity_days = 30, lines = [], description = '' } = req.body;

    if (!name || !plan_id) {
      return res.apiError('Template name and linked plan_id are required.', 400);
    }

    const tmplId = `tmpl-${Date.now().toString().slice(-6)}`;
    const insertRes = await query(
      `INSERT INTO quotation_templates (id, name, plan_id, validity_days, lines, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tmplId, name, plan_id, Number(validity_days) || 30, JSON.stringify(lines), description]
    );

    return res.status(201).apiSuccess(insertRes.rows[0], `Quotation template "${name}" created.`);
  } catch (err) {
    return res.apiError('Failed to create template: ' + err.message, 500);
  }
});

// Delete quotation template
router.delete('/:id', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleteRes = await query(`DELETE FROM quotation_templates WHERE id = $1 RETURNING id, name`, [id]);
    if (deleteRes.rows.length === 0) {
      return res.apiError('Template not found.', 404);
    }
    return res.apiSuccess({ id }, `Template "${deleteRes.rows[0].name}" removed.`);
  } catch (err) {
    return res.apiError('Failed to delete template: ' + err.message, 500);
  }
});

export default router;
