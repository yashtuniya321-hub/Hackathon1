import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// List all discounts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const discRes = await query(`SELECT * FROM discounts ORDER BY created_at DESC`);
    const discounts = discRes.rows.map(d => ({
      ...d,
      value: Number(d.value),
      min_purchase_amount: Number(d.min_purchase_amount),
      min_quantity: Number(d.min_quantity),
      max_uses: Number(d.max_uses),
      current_uses: Number(d.current_uses)
    }));
    return res.apiSuccess(discounts);
  } catch (err) {
    return res.apiError('Failed to fetch discounts: ' + err.message, 500);
  }
});

// Create discount rule - ADMIN ONLY
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      code,
      name,
      type = 'percentage',
      value,
      min_purchase_amount = 0,
      min_quantity = 1,
      scope = 'subscription',
      target_product_id = null,
      start_date,
      end_date,
      max_uses = 100,
      description = ''
    } = req.body;

    if (!code || !name || value === undefined || !start_date || !end_date) {
      return res.apiError('Missing required discount parameters: code, name, value, start_date, and end_date are required.', 400);
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');

    // Check unique code
    const existing = await query(`SELECT id FROM discounts WHERE code = $1`, [cleanCode]);
    if (existing.rows.length > 0) {
      return res.apiError(`Discount code "${cleanCode}" already exists.`, 409);
    }

    const discId = `disc-${Date.now().toString().slice(-6)}`;
    const insertRes = await query(
      `INSERT INTO discounts (
        id, code, name, type, value, min_purchase_amount, min_quantity, scope,
        target_product_id, start_date, end_date, max_uses, current_uses, active, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, TRUE, $13)
      RETURNING *`,
      [
        discId,
        cleanCode,
        name,
        type,
        Number(value),
        Number(min_purchase_amount) || 0,
        Number(min_quantity) || 1,
        scope,
        target_product_id || null,
        start_date,
        end_date,
        Number(max_uses) || 100,
        description
      ]
    );

    return res.status(201).apiSuccess(
      {
        ...insertRes.rows[0],
        value: Number(insertRes.rows[0].value),
        min_purchase_amount: Number(insertRes.rows[0].min_purchase_amount),
        min_quantity: Number(insertRes.rows[0].min_quantity),
        max_uses: Number(insertRes.rows[0].max_uses),
        current_uses: Number(insertRes.rows[0].current_uses)
      },
      `Discount rule "${cleanCode}" created.`
    );
  } catch (err) {
    return res.apiError('Failed to create discount rule: ' + err.message, 500);
  }
});

// Update discount rule - ADMIN ONLY
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      value,
      min_purchase_amount,
      min_quantity,
      scope,
      target_product_id,
      start_date,
      end_date,
      max_uses,
      active,
      description
    } = req.body;

    const updateRes = await query(
      `UPDATE discounts 
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           value = COALESCE($3, value),
           min_purchase_amount = COALESCE($4, min_purchase_amount),
           min_quantity = COALESCE($5, min_quantity),
           scope = COALESCE($6, scope),
           target_product_id = COALESCE($7, target_product_id),
           start_date = COALESCE($8, start_date),
           end_date = COALESCE($9, end_date),
           max_uses = COALESCE($10, max_uses),
           active = COALESCE($11, active),
           description = COALESCE($12, description)
       WHERE id = $13
       RETURNING *`,
      [
        name,
        type,
        value !== undefined ? Number(value) : null,
        min_purchase_amount !== undefined ? Number(min_purchase_amount) : null,
        min_quantity !== undefined ? Number(min_quantity) : null,
        scope,
        target_product_id,
        start_date,
        end_date,
        max_uses !== undefined ? Number(max_uses) : null,
        active !== undefined ? Boolean(active) : null,
        description,
        id
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.apiError('Discount rule not found.', 404);
    }

    return res.apiSuccess(updateRes.rows[0], 'Discount rule updated.');
  } catch (err) {
    return res.apiError('Failed to update discount rule: ' + err.message, 500);
  }
});

// Delete discount rule - ADMIN ONLY
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleteRes = await query(`DELETE FROM discounts WHERE id = $1 RETURNING id, code`, [id]);
    if (deleteRes.rows.length === 0) {
      return res.apiError('Discount rule not found.', 404);
    }
    return res.apiSuccess({ id }, `Discount "${deleteRes.rows[0].code}" removed.`);
  } catch (err) {
    return res.apiError('Failed to delete discount: ' + err.message, 500);
  }
});

export default router;
