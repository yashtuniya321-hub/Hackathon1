import express from 'express';
import { query, transaction } from '../config/db.js';
import { authenticateToken, scopeCustomer, requireStaffOrAdmin } from '../middleware/auth.js';

const router = express.Router();

const VALID_STAGES = ['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'];

// Allowed forward/controlled transitions
const PERMITTED_TRANSITIONS = {
  Draft: ['Quotation', 'Cancelled'],
  Quotation: ['Confirmed', 'Draft', 'Cancelled'],
  Confirmed: ['Active', 'Draft', 'Cancelled'],
  Active: ['Closed'],
  Closed: ['Active'] // Re-activation via renewal
};

// 1. List Subscriptions (Scoped for Customer)
router.get('/', authenticateToken, scopeCustomer, async (req, res) => {
  try {
    const { status, customer_id, plan_id, search, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT s.*, 
             c.name as customer_name, c.email as customer_email, c.contact_name,
             p.name as plan_name, p.billing_frequency, p.cost as plan_cost,
             p.can_pause, p.can_close_early, p.can_renew, p.auto_close
      FROM subscriptions s
      JOIN customers c ON s.customer_id = c.id
      JOIN plans p ON s.plan_id = p.id
      WHERE 1=1
    `;
    const params = [];

    // Enforce customer scope
    if (req.customerScopeId) {
      params.push(req.customerScopeId);
      sql += ` AND s.customer_id = $${params.length}`;
    } else if (customer_id) {
      params.push(customer_id);
      sql += ` AND s.customer_id = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND s.status = $${params.length}`;
    }

    if (plan_id) {
      params.push(plan_id);
      sql += ` AND s.plan_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(s.sub_number) LIKE $${params.length} OR LOWER(c.name) LIKE $${params.length} OR LOWER(c.contact_name) LIKE $${params.length})`;
    }

    sql += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), Number(offset));

    const subsRes = await query(sql, params);
    const subIds = subsRes.rows.map(s => s.id);

    // Fetch lines for these subscriptions
    let linesMap = {};
    if (subIds.length > 0) {
      const placeholders = subIds.map((_, i) => `$${i + 1}`).join(',');
      const linesRes = await query(
        `SELECT * FROM subscription_lines WHERE subscription_id IN (${placeholders})`,
        subIds
      );
      linesRes.rows.forEach(l => {
        if (!linesMap[l.subscription_id]) linesMap[l.subscription_id] = [];
        linesMap[l.subscription_id].push({
          ...l,
          quantity: Number(l.quantity),
          base_price: Number(l.base_price),
          variant_extra: Number(l.variant_extra),
          unit_price: Number(l.unit_price),
          tax_rate: Number(l.tax_rate),
          total: Number(l.total)
        });
      });
    }

    const subscriptions = subsRes.rows.map(sub => {
      const lines = linesMap[sub.id] || [];
      const totalAmount = lines.reduce((acc, l) => acc + l.total, 0);

      return {
        ...sub,
        plan_cost: Number(sub.plan_cost),
        total_amount: totalAmount > 0 ? totalAmount : Number(sub.plan_cost),
        lines
      };
    });

    return res.apiSuccess(subscriptions);
  } catch (err) {
    return res.apiError('Failed to list subscriptions: ' + err.message, 500);
  }
});

// 2. Get Subscription Details
router.get('/:id', authenticateToken, scopeCustomer, async (req, res) => {
  try {
    const { id } = req.params;

    let sql = `
      SELECT s.*, 
             c.name as customer_name, c.email as customer_email, c.contact_name, c.address as customer_address, c.tax_id as customer_tax_id,
             p.name as plan_name, p.billing_frequency, p.cost as plan_cost,
             p.can_pause, p.can_close_early, p.can_renew, p.auto_close,
             d.code as discount_code, d.value as discount_value, d.type as discount_type
      FROM subscriptions s
      JOIN customers c ON s.customer_id = c.id
      JOIN plans p ON s.plan_id = p.id
      LEFT JOIN discounts d ON s.discount_id = d.id
      WHERE (s.id = $1 OR s.sub_number = $1)
    `;
    const params = [id];

    if (req.customerScopeId) {
      params.push(req.customerScopeId);
      sql += ` AND s.customer_id = $2`;
    }

    const subRes = await query(sql, params);
    if (subRes.rows.length === 0) {
      return res.apiError('Subscription not found or access denied.', 404);
    }

    const sub = subRes.rows[0];
    const linesRes = await query(
      `SELECT * FROM subscription_lines WHERE subscription_id = $1`,
      [sub.id]
    );

    const lines = linesRes.rows.map(l => ({
      ...l,
      quantity: Number(l.quantity),
      base_price: Number(l.base_price),
      variant_extra: Number(l.variant_extra),
      unit_price: Number(l.unit_price),
      tax_rate: Number(l.tax_rate),
      total: Number(l.total)
    }));

    const totalAmount = lines.reduce((acc, l) => acc + l.total, 0);

    return res.apiSuccess({
      ...sub,
      plan_cost: Number(sub.plan_cost),
      total_amount: totalAmount > 0 ? totalAmount : Number(sub.plan_cost),
      lines
    });
  } catch (err) {
    return res.apiError('Failed to fetch subscription: ' + err.message, 500);
  }
});

// 3. Create Subscription (Starts in Draft Status)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { customer_id, plan_id, discount_id, payment_terms = 'Net 15', lines = [], notes = '' } = req.body;

    const actualCustomerId = req.customerScopeId || customer_id;
    if (!actualCustomerId || !plan_id) {
      return res.apiError('customer_id and plan_id are required.', 400);
    }

    // Verify Plan exists
    const planRes = await query(`SELECT * FROM plans WHERE id = $1`, [plan_id]);
    if (planRes.rows.length === 0) {
      return res.apiError('Linked subscription plan not found.', 404);
    }

    const result = await transaction(async (client) => {
      const subSuffix = `${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 900 + 100)}`;
      const subNumber = `SUB-2026-${subSuffix}`;
      const subId = `sub-2026-${subSuffix}`;

      const startDate = new Date().toISOString().split('T')[0];
      const expiryDate = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
      const nextBillingDate = startDate;

      // Insert subscription in Draft
      const subRes = await client.query(
        `INSERT INTO subscriptions (
          id, sub_number, customer_id, plan_id, status, is_paused,
          start_date, expiry_date, next_billing_date, payment_terms, discount_id, notes
        ) VALUES ($1, $2, $3, $4, 'Draft', FALSE, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [subId, subNumber, actualCustomerId, plan_id, startDate, expiryDate, nextBillingDate, payment_terms, discount_id || null, notes]
      );

      const insertedLines = [];

      // Process and calculate line items: unit_price = base_sales_price + variant_price_extra
      for (const line of lines) {
        const prodRes = await client.query(`SELECT * FROM products WHERE id = $1`, [line.product_id]);
        if (prodRes.rows.length === 0) continue;
        const prod = prodRes.rows[0];

        let variantExtra = 0;
        let variantName = null;

        if (line.variant_id) {
          const varRes = await client.query(`SELECT * FROM product_variants WHERE id = $1`, [line.variant_id]);
          if (varRes.rows.length > 0) {
            variantExtra = Number(varRes.rows[0].price_extra) || 0;
            variantName = varRes.rows[0].name;
          }
        }

        const basePrice = Number(prod.sales_price);
        const unitPrice = basePrice + variantExtra;
        const quantity = Number(line.quantity) || 1;
        const taxRate = Number(line.tax_rate) || 18;
        const lineTotal = unitPrice * quantity;

        const lineId = `sline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const lineRes = await client.query(
          `INSERT INTO subscription_lines (
            id, subscription_id, product_id, variant_id, product_name, variant_name,
            quantity, base_price, variant_extra, unit_price, tax_rate, total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *`,
          [
            lineId,
            subId,
            prod.id,
            line.variant_id || null,
            prod.name,
            variantName,
            quantity,
            basePrice,
            variantExtra,
            unitPrice,
            taxRate,
            lineTotal
          ]
        );
        insertedLines.push({
          ...lineRes.rows[0],
          unit_price: unitPrice,
          total: lineTotal
        });
      }

      return {
        ...subRes.rows[0],
        lines: insertedLines
      };
    });

    return res.status(201).apiSuccess(result, `Subscription ${result.sub_number} created in Draft.`);
  } catch (err) {
    return res.apiError('Failed to create subscription: ' + err.message, 500);
  }
});

// 4. Create Subscription From Quotation Template (1-Click Endpoint)
router.post('/from-template', authenticateToken, async (req, res) => {
  try {
    const { template_id, customer_id, payment_terms = 'Net 15', notes = '' } = req.body;

    const actualCustomerId = req.customerScopeId || customer_id;
    if (!template_id || !actualCustomerId) {
      return res.apiError('template_id and customer_id are required.', 400);
    }

    const tmplRes = await query(`SELECT * FROM quotation_templates WHERE id = $1`, [template_id]);
    if (tmplRes.rows.length === 0) {
      return res.apiError('Quotation template not found.', 404);
    }

    const tmpl = tmplRes.rows[0];
    const templateLines = typeof tmpl.lines === 'string' ? JSON.parse(tmpl.lines) : (tmpl.lines || []);

    const subSuffix = `${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 900 + 100)}`;
    const subNumber = `SUB-2026-${subSuffix}`;
    const subId = `sub-2026-${subSuffix}`;

    const startDate = new Date().toISOString().split('T')[0];
    const expiryTimestamp = new Date(Date.now() + (Number(tmpl.validity_days) || 30) * 86400000);
    const expiryDate = expiryTimestamp.toISOString().split('T')[0];

    const result = await transaction(async (client) => {
      // Create subscription in 'Quotation' status directly from offer template
      const subRes = await client.query(
        `INSERT INTO subscriptions (
          id, sub_number, customer_id, plan_id, status, is_paused,
          start_date, expiry_date, next_billing_date, payment_terms, notes
        ) VALUES ($1, $2, $3, $4, 'Quotation', FALSE, $5, $6, $5, $7, $8)
        RETURNING *`,
        [subId, subNumber, actualCustomerId, tmpl.plan_id, startDate, expiryDate, payment_terms, notes || `Generated from template: ${tmpl.name}`]
      );

      const insertedLines = [];

      for (const line of templateLines) {
        const prodRes = await client.query(`SELECT * FROM products WHERE id = $1`, [line.product_id]);
        if (prodRes.rows.length === 0) continue;
        const prod = prodRes.rows[0];

        let variantExtra = 0;
        let variantName = null;

        if (line.variant_id) {
          const varRes = await client.query(`SELECT * FROM product_variants WHERE id = $1`, [line.variant_id]);
          if (varRes.rows.length > 0) {
            variantExtra = Number(varRes.rows[0].price_extra) || 0;
            variantName = varRes.rows[0].name;
          }
        }

        const basePrice = Number(prod.sales_price);
        const unitPrice = basePrice + variantExtra;
        const quantity = Number(line.quantity) || 1;
        const taxRate = 18;
        const lineTotal = unitPrice * quantity;

        const lineId = `sline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const lineRes = await client.query(
          `INSERT INTO subscription_lines (
            id, subscription_id, product_id, variant_id, product_name, variant_name,
            quantity, base_price, variant_extra, unit_price, tax_rate, total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *`,
          [
            lineId,
            subId,
            prod.id,
            line.variant_id || null,
            prod.name,
            variantName,
            quantity,
            basePrice,
            variantExtra,
            unitPrice,
            taxRate,
            lineTotal
          ]
        );
        insertedLines.push(lineRes.rows[0]);
      }

      return {
        ...subRes.rows[0],
        lines: insertedLines
      };
    });

    return res.status(201).apiSuccess(
      result,
      `Quotation ${result.sub_number} successfully generated from template "${tmpl.name}".`
    );
  } catch (err) {
    return res.apiError('Failed to create subscription from template: ' + err.message, 500);
  }
});

// 5. Strict 5-Stage Status Transition (Draft -> Quotation -> Confirmed -> Active -> Closed)
router.patch('/:id/status', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status: targetStatus } = req.body;

    if (!VALID_STAGES.includes(targetStatus)) {
      return res.apiError(`Invalid target status. Permitted pipeline stages: [${VALID_STAGES.join(', ')}]`, 400);
    }

    const subRes = await query(`SELECT * FROM subscriptions WHERE id = $1`, [id]);
    if (subRes.rows.length === 0) {
      return res.apiError('Subscription not found.', 404);
    }

    const currentStatus = subRes.rows[0].status;
    const allowedTargets = PERMITTED_TRANSITIONS[currentStatus] || [];

    if (!allowedTargets.includes(targetStatus)) {
      return res.apiError(
        `Strict State Machine Violation: Cannot transition subscription from '${currentStatus}' to '${targetStatus}'. Allowed: [${allowedTargets.join(', ')}]`,
        400
      );
    }

    const closedAt = targetStatus === 'Closed' ? new Date().toISOString() : null;
    const updateRes = await query(
      `UPDATE subscriptions SET status = $1, closed_at = $2 WHERE id = $3 RETURNING *`,
      [targetStatus, closedAt, id]
    );

    return res.apiSuccess(updateRes.rows[0], `Subscription status moved to '${targetStatus}'.`);
  } catch (err) {
    return res.apiError('Failed to advance status: ' + err.message, 500);
  }
});

// 6. Plan Lifecycle: Pause Subscription (Checked against plan.can_pause)
router.post('/:id/pause', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const subRes = await query(
      `SELECT s.*, p.can_pause, p.name as plan_name 
       FROM subscriptions s 
       JOIN plans p ON s.plan_id = p.id 
       WHERE s.id = $1`,
      [id]
    );

    if (subRes.rows.length === 0) {
      return res.apiError('Subscription not found.', 404);
    }

    const sub = subRes.rows[0];

    // Enforce Plan Rule
    if (sub.can_pause === false) {
      return res.status(403).apiError(
        `Action Prohibited by Plan Governance: Linked plan '${sub.plan_name}' strictly forbids pausing subscriptions.`,
        403
      );
    }

    const updateRes = await query(
      `UPDATE subscriptions SET is_paused = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );

    return res.apiSuccess(updateRes.rows[0], `Subscription ${sub.sub_number} is now paused.`);
  } catch (err) {
    return res.apiError('Failed to pause subscription: ' + err.message, 500);
  }
});

// 7. Plan Lifecycle: Resume Subscription
router.post('/:id/resume', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateRes = await query(
      `UPDATE subscriptions SET is_paused = FALSE WHERE id = $1 RETURNING *`,
      [id]
    );
    if (updateRes.rows.length === 0) {
      return res.apiError('Subscription not found.', 404);
    }
    return res.apiSuccess(updateRes.rows[0], `Subscription resumed successfully.`);
  } catch (err) {
    return res.apiError('Failed to resume subscription: ' + err.message, 500);
  }
});

// 8. Plan Lifecycle: Close Early (Checked against plan.can_close_early)
router.post('/:id/close-early', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const subRes = await query(
      `SELECT s.*, p.can_close_early, p.name as plan_name 
       FROM subscriptions s 
       JOIN plans p ON s.plan_id = p.id 
       WHERE s.id = $1`,
      [id]
    );

    if (subRes.rows.length === 0) {
      return res.apiError('Subscription not found.', 404);
    }

    const sub = subRes.rows[0];

    // Enforce Plan Rule
    if (sub.can_close_early === false) {
      return res.status(403).apiError(
        `Action Prohibited by Plan Governance: Linked contract '${sub.plan_name}' strictly locks termination before expiry date.`,
        403
      );
    }

    const updateRes = await query(
      `UPDATE subscriptions SET status = 'Closed', closed_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    return res.apiSuccess(updateRes.rows[0], `Subscription ${sub.sub_number} closed early.`);
  } catch (err) {
    return res.apiError('Failed to close subscription early: ' + err.message, 500);
  }
});

// 9. Plan Lifecycle: Renew Subscription (Checked against plan.can_renew)
router.post('/:id/renew', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const subRes = await query(
      `SELECT s.*, p.can_renew, p.name as plan_name, p.billing_frequency 
       FROM subscriptions s 
       JOIN plans p ON s.plan_id = p.id 
       WHERE s.id = $1`,
      [id]
    );

    if (subRes.rows.length === 0) {
      return res.apiError('Subscription not found.', 404);
    }

    const sub = subRes.rows[0];

    // Enforce Plan Rule
    if (sub.can_renew === false) {
      return res.status(403).apiError(
        `Action Prohibited by Plan Governance: Linked plan '${sub.plan_name}' does not allow renewal.`,
        403
      );
    }

    const curExpiry = new Date(sub.expiry_date || Date.now());
    curExpiry.setFullYear(curExpiry.getFullYear() + 1);
    const newExpiry = curExpiry.toISOString().split('T')[0];

    const updateRes = await query(
      `UPDATE subscriptions SET expiry_date = $1, status = 'Active' WHERE id = $2 RETURNING *`,
      [newExpiry, id]
    );

    return res.apiSuccess(updateRes.rows[0], `Subscription ${sub.sub_number} renewed through ${newExpiry}.`);
  } catch (err) {
    return res.apiError('Failed to renew subscription: ' + err.message, 500);
  }
});

// 10. Self-Service Add-on Toggle (Customer & Staff)
router.post('/:id/toggle-addon', authenticateToken, scopeCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id } = req.body;

    if (!product_id) {
      return res.apiError('product_id is required.', 400);
    }

    // Verify product is an Add-on
    const prodRes = await query(`SELECT * FROM products WHERE id = $1 AND type = 'Add-on'`, [product_id]);
    if (prodRes.rows.length === 0) {
      return res.apiError('Product is not a valid Add-on module.', 400);
    }
    const addon = prodRes.rows[0];

    // Check if add-on line already exists
    const existingLine = await query(
      `SELECT * FROM subscription_lines WHERE subscription_id = $1 AND product_id = $2`,
      [id, product_id]
    );

    if (existingLine.rows.length > 0) {
      // Remove add-on
      await query(`DELETE FROM subscription_lines WHERE id = $1`, [existingLine.rows[0].id]);
      return res.apiSuccess({ action: 'removed', product_id }, `Add-on module "${addon.name}" disabled.`);
    } else {
      // Add add-on
      const lineId = `sline-addon-${Date.now()}`;
      const unitPrice = Number(addon.sales_price);
      await query(
        `INSERT INTO subscription_lines (
          id, subscription_id, product_id, product_name, quantity,
          base_price, variant_extra, unit_price, tax_rate, total
        ) VALUES ($1, $2, $3, $4, 1, $5, 0, $5, 18, $5)`,
        [lineId, id, addon.id, addon.name, unitPrice]
      );
      return res.apiSuccess({ action: 'added', product_id, price: unitPrice }, `Add-on module "${addon.name}" activated.`);
    }
  } catch (err) {
    return res.apiError('Failed to toggle add-on: ' + err.message, 500);
  }
});

export default router;
