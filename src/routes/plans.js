import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// List all plans
router.get('/', authenticateToken, async (req, res) => {
  try {
    const plansRes = await query(`SELECT * FROM plans ORDER BY cost ASC`);
    const plans = plansRes.rows.map(p => ({
      ...p,
      cost: Number(p.cost)
    }));
    return res.apiSuccess(plans);
  } catch (err) {
    return res.apiError('Failed to fetch plans: ' + err.message, 500);
  }
});

// Get plan by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const planRes = await query(`SELECT * FROM plans WHERE id = $1`, [id]);
    if (planRes.rows.length === 0) {
      return res.apiError('Plan not found.', 404);
    }
    return res.apiSuccess({ ...planRes.rows[0], cost: Number(planRes.rows[0].cost) });
  } catch (err) {
    return res.apiError('Failed to fetch plan: ' + err.message, 500);
  }
});

// Create Plan - ADMIN ONLY
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      billing_frequency = 'monthly',
      cost = 0,
      min_quantity = 1,
      available_from,
      available_to,
      auto_close = false,
      can_close_early = true,
      can_pause = true,
      can_renew = true,
      description = ''
    } = req.body;

    if (!name || !available_from || !available_to) {
      return res.apiError('Missing required fields: name, available_from, and available_to are required.', 400);
    }

    const validFreqs = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validFreqs.includes(billing_frequency)) {
      return res.apiError(`Invalid frequency. Allowed: [${validFreqs.join(', ')}]`, 400);
    }

    const planId = `plan-${Date.now().toString().slice(-6)}`;
    const planRes = await query(
      `INSERT INTO plans (
        id, name, billing_frequency, cost, min_quantity, available_from, available_to,
        auto_close, can_close_early, can_pause, can_renew, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        planId,
        name,
        billing_frequency,
        Number(cost) || 0,
        Number(min_quantity) || 1,
        available_from,
        available_to,
        Boolean(auto_close),
        Boolean(can_close_early),
        Boolean(can_pause),
        Boolean(can_renew),
        description
      ]
    );

    return res.status(201).apiSuccess(
      { ...planRes.rows[0], cost: Number(planRes.rows[0].cost) },
      `Subscription Plan "${name}" created with lifecycle governance.`
    );
  } catch (err) {
    return res.apiError('Failed to create plan: ' + err.message, 500);
  }
});

// Update Plan - ADMIN ONLY
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      billing_frequency,
      cost,
      min_quantity,
      available_from,
      available_to,
      auto_close,
      can_close_early,
      can_pause,
      can_renew,
      description
    } = req.body;

    const updateRes = await query(
      `UPDATE plans 
       SET name = COALESCE($1, name),
           billing_frequency = COALESCE($2, billing_frequency),
           cost = COALESCE($3, cost),
           min_quantity = COALESCE($4, min_quantity),
           available_from = COALESCE($5, available_from),
           available_to = COALESCE($6, available_to),
           auto_close = COALESCE($7, auto_close),
           can_close_early = COALESCE($8, can_close_early),
           can_pause = COALESCE($9, can_pause),
           can_renew = COALESCE($10, can_renew),
           description = COALESCE($11, description)
       WHERE id = $12
       RETURNING *`,
      [
        name,
        billing_frequency,
        cost !== undefined ? Number(cost) : null,
        min_quantity !== undefined ? Number(min_quantity) : null,
        available_from,
        available_to,
        auto_close !== undefined ? Boolean(auto_close) : null,
        can_close_early !== undefined ? Boolean(can_close_early) : null,
        can_pause !== undefined ? Boolean(can_pause) : null,
        can_renew !== undefined ? Boolean(can_renew) : null,
        description,
        id
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.apiError('Plan not found.', 404);
    }

    return res.apiSuccess(
      { ...updateRes.rows[0], cost: Number(updateRes.rows[0].cost) },
      'Plan updated.'
    );
  } catch (err) {
    return res.apiError('Failed to update plan: ' + err.message, 500);
  }
});

// Delete Plan - ADMIN ONLY
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleteRes = await query(`DELETE FROM plans WHERE id = $1 RETURNING id, name`, [id]);
    if (deleteRes.rows.length === 0) {
      return res.apiError('Plan not found.', 404);
    }
    return res.apiSuccess({ id }, `Plan "${deleteRes.rows[0].name}" deleted.`);
  } catch (err) {
    return res.apiError('Failed to delete plan: ' + err.message, 500);
  }
});

export default router;
