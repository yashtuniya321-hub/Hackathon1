import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  // Support demo role header for quick testing if no JWT is passed
  if (!token && req.headers['x-demo-role']) {
    const demoRole = req.headers['x-demo-role'].toLowerCase();
    const demoCustomerId = req.headers['x-demo-customer-id'] || 'cust-apex-01';
    req.user = {
      id: demoRole === 'admin' ? 'usr-admin-01' : demoRole === 'staff' ? 'usr-staff-02' : demoCustomerId,
      email: `${demoRole}@brightloop.com`,
      role: demoRole,
      customer_id: demoRole === 'customer' ? demoCustomerId : null
    };
    return next();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required: No Bearer token provided in Authorization header.',
      meta: {}
    });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or Expired Token: Please authenticate again.',
      details: err.message,
      meta: {}
    });
  }
}

// Restrict to specified roles
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User authentication is required.',
        meta: {}
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Role '${req.user.role}' is not authorized. Required: [${allowedRoles.join(', ')}].`,
        meta: {}
      });
    }

    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireStaffOrAdmin = requireRole('admin', 'staff');

// Enforce Customer Scoping
export function scopeCustomer(req, res, next) {
  if (req.user && req.user.role === 'customer') {
    if (!req.user.customer_id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: No customer profile associated with this account.',
        meta: {}
      });
    }
    // Inject and enforce customer_id filter
    req.customerScopeId = req.user.customer_id;
  }
  next();
}
