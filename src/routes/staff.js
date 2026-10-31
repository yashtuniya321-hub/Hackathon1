import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { authenticateToken, requireAdmin, requireStaffOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// List internal staff members (Admin & Staff)
router.get('/', authenticateToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const staffRes = await query(
      `SELECT id, name, email, role, department, status, created_at 
       FROM users 
       WHERE role IN ('admin', 'staff')
       ORDER BY created_at ASC`
    );
    return res.apiSuccess(staffRes.rows);
  } catch (err) {
    return res.apiError('Failed to fetch staff members: ' + err.message, 500);
  }
});

// Create new staff member - STRICTLY ADMIN ONLY
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password = 'StaffPassword123!', role = 'staff', department } = req.body;

    if (!name || !email) {
      return res.apiError('Staff member name and email are required.', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = role.toLowerCase();

    if (!['admin', 'staff'].includes(cleanRole)) {
      return res.apiError("Invalid role. Permitted staff roles are 'admin' or 'staff'.", 400);
    }

    // Check unique email
    const existing = await query(`SELECT id FROM users WHERE LOWER(email) = $1`, [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.apiError('A user with this email address already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = `usr-staff-${Date.now().toString().slice(-6)}`;

    const insertRes = await query(
      `INSERT INTO users (id, name, email, password_hash, role, department, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Active')
       RETURNING id, name, email, role, department, status, created_at`,
      [id, name, cleanEmail, passwordHash, cleanRole, department || 'Operations']
    );

    return res.status(201).apiSuccess(insertRes.rows[0], `Staff member ${name} created successfully.`);
  } catch (err) {
    return res.apiError('Failed to create staff member: ' + err.message, 500);
  }
});

// Delete staff member - STRICTLY ADMIN ONLY
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.apiError('Self-deletion prohibited: Admin cannot delete their own account.', 400);
    }

    const deleteRes = await query(`DELETE FROM users WHERE id = $1 AND role IN ('admin', 'staff') RETURNING id, name`, [id]);
    if (deleteRes.rows.length === 0) {
      return res.apiError('Staff member not found.', 404);
    }

    return res.apiSuccess({ id }, `Staff member ${deleteRes.rows[0].name} removed.`);
  } catch (err) {
    return res.apiError('Failed to remove staff member: ' + err.message, 500);
  }
});

export default router;
