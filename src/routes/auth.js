import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { ENV } from '../config/env.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Exact regex requirement: > 8 chars, at least 1 uppercase, 1 lowercase, 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}$/;

// Account Signup (Customer Self-Service)
router.post('/signup', async (req, res) => {
  try {
    const { name, companyName, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.apiError('Missing required fields: name, email, and password are required.', 400);
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Password security regex validation
    if (!PASSWORD_REGEX.test(password)) {
      return res.apiError(
        'Password security policy failed: Password must be greater than 8 characters and include at least 1 uppercase letter, 1 lowercase letter, and 1 special character.',
        400
      );
    }

    // 2. Enforce unique email per account
    const existing = await query(`SELECT id FROM users WHERE LOWER(email) = $1`, [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.apiError('An account with this email address already exists. Please sign in or use another email.', 409);
    }

    // 3. Create customer organization record
    const customerId = `cust-${Date.now().toString().slice(-6)}`;
    await query(
      `INSERT INTO customers (id, name, contact_name, email, phone, tax_id, address, payment_terms)
       VALUES ($1, $2, $3, $4, $5, 'US-PENDING', 'Corporate Office', 'Immediate')`,
      [customerId, companyName || `${name}'s Organization`, name, cleanEmail, phone || '+1 (555) 000-0000']
    );

    // 4. Hash password and insert user with 'customer' role
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now().toString().slice(-6)}`;

    const userRes = await query(
      `INSERT INTO users (id, name, email, password_hash, role, customer_id, status)
       VALUES ($1, $2, $3, $4, 'customer', $5, 'Active')
       RETURNING id, name, email, role, customer_id, created_at`,
      [userId, name, cleanEmail, passwordHash, customerId]
    );

    const user = userRes.rows[0];

    // 5. Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, customer_id: user.customer_id },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRY }
    );

    return res.status(201).apiSuccess(
      { token, user },
      'Customer account registered successfully. Welcome to Brightloop Software!'
    );
  } catch (err) {
    return res.apiError('Signup failed: ' + err.message, 500);
  }
});

// Account Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.apiError('Email and password are required.', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRes = await query(
      `SELECT id, name, email, password_hash, role, customer_id, status 
       FROM users WHERE LOWER(email) = $1`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.apiError('Invalid email or password. Please verify credentials.', 401);
    }

    const user = userRes.rows[0];

    if (user.status !== 'Active') {
      return res.apiError('Account is suspended or deactivated. Contact support.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.apiError('Invalid email or password. Please verify credentials.', 401);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, customer_id: user.customer_id },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRY }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customer_id: user.customer_id
    };

    return res.apiSuccess({ token, user: safeUser }, `Signed in as ${user.name} (${user.role})`);
  } catch (err) {
    return res.apiError('Login failed: ' + err.message, 500);
  }
});

// Forgot Password: Generates simulated recovery token
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.apiError('Email address is required.', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRes = await query(`SELECT id, name FROM users WHERE LOWER(email) = $1`, [cleanEmail]);

    if (userRes.rows.length === 0) {
      return res.apiError(`No account registered with email: ${email}`, 404);
    }

    // Generate secure recovery token with 60-min validity
    const resetToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const expiry = new Date(Date.now() + ENV.RESET_TOKEN_EXPIRY_MINUTES * 60000);

    await query(
      `UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3`,
      [resetToken, expiry, userRes.rows[0].id]
    );

    return res.apiSuccess(
      {
        email: cleanEmail,
        resetToken,
        resetLink: `http://localhost:5173/auth/reset-password?token=${resetToken}`,
        expiresAt: expiry.toISOString()
      },
      `Password recovery instructions dispatched to ${cleanEmail}.`
    );
  } catch (err) {
    return res.apiError('Failed to process password recovery: ' + err.message, 500);
  }
});

// Reset Password with Token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.apiError('Reset token and new password are required.', 400);
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.apiError(
        'Password security policy failed: Password must be > 8 characters with at least 1 uppercase, 1 lowercase, and 1 special character.',
        400
      );
    }

    const userRes = await query(
      `SELECT id, email, reset_token_expiry FROM users WHERE reset_token = $1`,
      [token]
    );

    if (userRes.rows.length === 0) {
      return res.apiError('Invalid recovery token. Please request a new reset link.', 400);
    }

    const user = userRes.rows[0];
    if (new Date() > new Date(user.reset_token_expiry)) {
      return res.apiError('Recovery token has expired. Please request a fresh reset link.', 400);
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2`,
      [newHash, user.id]
    );

    return res.apiSuccess(null, 'Password updated successfully. You can now sign in with your new password.');
  } catch (err) {
    return res.apiError('Password reset failed: ' + err.message, 500);
  }
});

// Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userRes = await query(
      `SELECT id, name, email, role, customer_id, department, status, created_at 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.apiError('User not found.', 404);
    }

    return res.apiSuccess(userRes.rows[0]);
  } catch (err) {
    return res.apiError('Failed to fetch profile: ' + err.message, 500);
  }
});

export default router;
