import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { timingMiddleware } from './middleware/timing.js';

// Import Routes
import authRouter from './routes/auth.js';
import staffRouter from './routes/staff.js';
import productsRouter from './routes/products.js';
import plansRouter from './routes/plans.js';
import taxRulesRouter from './routes/taxRules.js';
import discountsRouter from './routes/discounts.js';
import templatesRouter from './routes/templates.js';
import subscriptionsRouter from './routes/subscriptions.js';
import billingRouter from './routes/billing.js';
import invoicesRouter from './routes/invoices.js';
import paymentsRouter from './routes/payments.js';
import analyticsRouter from './routes/analytics.js';
import customersRouter from './routes/customers.js';

export const app = express();

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(timingMiddleware);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health and Root Route
app.get('/', (req, res) => {
  res.apiSuccess({
    service: 'Brightloop Software — Subscription Management System Backend',
    hackathon: 'Odoo x Flux Hackathon 2026',
    status: 'Operational',
    version: '1.0.0',
    sla: '< 2000ms SLA compliant'
  }, 'Brightloop Backend API is live');
});

app.get('/health', (req, res) => {
  res.apiSuccess({
    uptimeSeconds: Math.round(process.uptime()),
    memoryUsage: process.memoryUsage(),
    status: 'HEALTHY'
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/staff', staffRouter);
app.use('/api/products', productsRouter);
app.use('/api/plans', plansRouter);
app.use('/api/tax-rules', taxRulesRouter);
app.use('/api/discounts', discountsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/customers', customersRouter);

// 404 Catch-All
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    meta: {}
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    meta: {}
  });
});

export default app;
