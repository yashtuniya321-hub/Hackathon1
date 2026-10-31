import express from 'express';
import { BillingEngine } from '../services/billingEngine.js';
import { query } from '../config/db.js';
import { authenticateToken, requireStaffOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// 1. Run Billing Day Batch Engine
router.post('/run', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { target_date = new Date().toISOString().split('T')[0] } = req.body;

    const result = await BillingEngine.runBatchBilling({ targetDate: target_date });

    return res.apiSuccess(
      result,
      `Batch Billing Day completed: ${result.invoicesCreated} invoices created, ${result.duplicatesSkipped} duplicates safeguarded.`
    );
  } catch (err) {
    return res.apiError('Batch billing engine execution failed: ' + err.message, 500);
  }
});

// 2. Fetch Historical Billing Audit Runs
router.get('/logs', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const runsRes = await query(
      `SELECT * FROM billing_runs ORDER BY run_timestamp DESC LIMIT 50`
    );
    return res.apiSuccess(runsRes.rows);
  } catch (err) {
    return res.apiError('Failed to fetch billing logs: ' + err.message, 500);
  }
});

export default router;
