import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { ENV } from './env.js';
import path from 'path';
import fs from 'fs';

let pool = null;
let pgliteInstance = null;
let isNativePg = false;

// Initialize Database connection
export async function getDb() {
  if (pool) return pool;

  if (ENV.DATABASE_URL) {
    console.log('[DB] Connecting to external PostgreSQL via DATABASE_URL...');
    pool = new pg.Pool({
      connectionString: ENV.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000
    });
    isNativePg = true;
    return pool;
  }

  // Use persistent embedded PostgreSQL engine
  if (!pgliteInstance) {
    const dbDir = path.resolve(process.cwd(), ENV.DATA_DIR);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    console.log(`[DB] Initializing embedded PostgreSQL instance at: ${dbDir}`);
    pgliteInstance = new PGlite(dbDir);
  }

  // Create unified client adapter that matches pg.Pool API
  pool = {
    isNativePg: false,
    query: async (text, params = []) => {
      // PGlite expects parameterized queries with $1, $2, etc. exactly like pg
      const res = await pgliteInstance.query(text, params);
      return {
        rows: res.rows || [],
        rowCount: res.rows ? res.rows.length : (res.affectedRows || 0),
        fields: res.fields || []
      };
    },
    exec: async (text) => {
      return await pgliteInstance.exec(text);
    },
    // Transaction helper
    transaction: async (callback) => {
      return await pgliteInstance.transaction(async (tx) => {
        const txClient = {
          query: async (text, params = []) => {
            const res = await tx.query(text, params);
            return {
              rows: res.rows || [],
              rowCount: res.rows ? res.rows.length : (res.affectedRows || 0),
              fields: res.fields || []
            };
          }
        };
        return await callback(txClient);
      });
    },
    connect: async () => {
      return {
        query: async (text, params = []) => {
          const res = await pgliteInstance.query(text, params);
          return {
            rows: res.rows || [],
            rowCount: res.rows ? res.rows.length : (res.affectedRows || 0),
            fields: res.fields || []
          };
        },
        release: () => {}
      };
    }
  };

  return pool;
}

// Execute multi-statement SQL script (DDL)
export async function exec(text) {
  const db = await getDb();
  if (db.exec) {
    return await db.exec(text);
  }
  return await db.query(text);
}

// Execute query using active connection
export async function query(text, params = []) {
  const db = await getDb();
  return await db.query(text, params);
}

// Execute transaction
export async function transaction(callback) {
  const db = await getDb();
  if (db.isNativePg) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    return await db.transaction(callback);
  }
}

// Initialize complete database schema
export async function initDatabase() {
  const db = await getDb();

  const ddl = `
    -- Users table with RBAC
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL, -- 'admin', 'staff', 'customer'
      customer_id VARCHAR(64),
      department VARCHAR(255),
      status VARCHAR(32) DEFAULT 'Active',
      reset_token VARCHAR(255),
      reset_token_expiry TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Customers directory
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      contact_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(64),
      tax_id VARCHAR(64),
      address TEXT,
      payment_terms VARCHAR(32) DEFAULT 'Net 15',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Products Catalog
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(64) NOT NULL, -- 'Software', 'Add-on', 'Variant Product'
      sales_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Dynamic Product Variants
    CREATE TABLE IF NOT EXISTS product_variants (
      id VARCHAR(64) PRIMARY KEY,
      product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(128),
      price_extra NUMERIC(12, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Subscription Plans with Lifecycle Flags
    CREATE TABLE IF NOT EXISTS plans (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      billing_frequency VARCHAR(32) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
      cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
      min_quantity INT NOT NULL DEFAULT 1,
      available_from DATE NOT NULL,
      available_to DATE NOT NULL,
      auto_close BOOLEAN DEFAULT FALSE,
      can_close_early BOOLEAN DEFAULT TRUE,
      can_pause BOOLEAN DEFAULT TRUE,
      can_renew BOOLEAN DEFAULT TRUE,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Admin Tax Rules
    CREATE TABLE IF NOT EXISTS tax_rules (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
      is_default BOOLEAN DEFAULT FALSE,
      active BOOLEAN DEFAULT TRUE,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Admin Discount Rules Engine
    CREATE TABLE IF NOT EXISTS discounts (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(64) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(32) NOT NULL, -- 'percentage', 'fixed'
      value NUMERIC(12, 2) NOT NULL,
      min_purchase_amount NUMERIC(12, 2) DEFAULT 0,
      min_quantity INT DEFAULT 1,
      scope VARCHAR(32) NOT NULL DEFAULT 'subscription', -- 'subscription', 'product'
      target_product_id VARCHAR(64) REFERENCES products(id),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      max_uses INT NOT NULL DEFAULT 100,
      current_uses INT NOT NULL DEFAULT 0,
      active BOOLEAN DEFAULT TRUE,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Quotation Templates
    CREATE TABLE IF NOT EXISTS quotation_templates (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      plan_id VARCHAR(64) REFERENCES plans(id),
      validity_days INT NOT NULL DEFAULT 30,
      lines JSONB NOT NULL DEFAULT '[]',
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Subscriptions Master Table
    CREATE TABLE IF NOT EXISTS subscriptions (
      id VARCHAR(64) PRIMARY KEY,
      sub_number VARCHAR(64) UNIQUE NOT NULL,
      customer_id VARCHAR(64) REFERENCES customers(id),
      plan_id VARCHAR(64) REFERENCES plans(id),
      status VARCHAR(32) NOT NULL DEFAULT 'Draft', -- 'Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'
      is_paused BOOLEAN DEFAULT FALSE,
      start_date DATE NOT NULL,
      expiry_date DATE NOT NULL,
      next_billing_date DATE NOT NULL,
      payment_terms VARCHAR(32) DEFAULT 'Net 15',
      discount_id VARCHAR(64) REFERENCES discounts(id),
      notes TEXT,
      closed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Subscription Line Items
    CREATE TABLE IF NOT EXISTS subscription_lines (
      id VARCHAR(64) PRIMARY KEY,
      subscription_id VARCHAR(64) REFERENCES subscriptions(id) ON DELETE CASCADE,
      product_id VARCHAR(64) REFERENCES products(id),
      variant_id VARCHAR(64) REFERENCES product_variants(id),
      product_name VARCHAR(255),
      variant_name VARCHAR(255),
      quantity INT NOT NULL DEFAULT 1,
      base_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      variant_extra NUMERIC(12, 2) NOT NULL DEFAULT 0,
      unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
      total NUMERIC(12, 2) NOT NULL DEFAULT 0
    );

    -- Invoices with Strict Idempotency Key Constraint
    CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(64) PRIMARY KEY,
      invoice_number VARCHAR(64) UNIQUE NOT NULL,
      subscription_id VARCHAR(64) REFERENCES subscriptions(id),
      customer_id VARCHAR(64) REFERENCES customers(id),
      invoice_date DATE NOT NULL,
      due_date DATE NOT NULL,
      billing_cycle_date DATE NOT NULL,
      idempotency_key VARCHAR(128) UNIQUE NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'Draft', -- 'Draft', 'Confirmed', 'Paid', 'Cancelled'
      payment_terms VARCHAR(32) DEFAULT 'Net 15',
      subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
      discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      discount_code VARCHAR(64),
      tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      lines JSONB NOT NULL DEFAULT '[]',
      email_sent BOOLEAN DEFAULT FALSE,
      email_sent_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_sub_cycle UNIQUE (subscription_id, billing_cycle_date)
    );

    -- Payments Table
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(64) PRIMARY KEY,
      payment_number VARCHAR(64) UNIQUE NOT NULL,
      invoice_id VARCHAR(64) REFERENCES invoices(id),
      customer_id VARCHAR(64) REFERENCES customers(id),
      amount NUMERIC(12, 2) NOT NULL,
      payment_date DATE NOT NULL,
      method VARCHAR(64) NOT NULL, -- 'Bank Transfer', 'UPI', 'Card', 'Cash'
      reference VARCHAR(128),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Billing Execution Logs
    CREATE TABLE IF NOT EXISTS billing_runs (
      id VARCHAR(64) PRIMARY KEY,
      billing_date DATE NOT NULL,
      run_timestamp TIMESTAMPTZ DEFAULT NOW(),
      invoices_created INT DEFAULT 0,
      duplicates_skipped INT DEFAULT 0,
      execution_time_ms NUMERIC(10, 2),
      summary JSONB
    );

    -- Indexes for sub-2-second query performance across thousands of records
    CREATE INDEX IF NOT EXISTS idx_subs_status_due ON subscriptions (status, next_billing_date);
    CREATE INDEX IF NOT EXISTS idx_subs_cust ON subscriptions (customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices (status, due_date);
    CREATE INDEX IF NOT EXISTS idx_invoices_cust ON invoices (customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_sub ON invoices (subscription_id);
    CREATE INDEX IF NOT EXISTS idx_payments_inv ON payments (invoice_id);
    CREATE INDEX IF NOT EXISTS idx_sub_lines_sub ON subscription_lines (subscription_id);
  `;

  await exec(ddl);
  console.log('[DB] PostgreSQL schema, constraints, and indexes initialized successfully.');
}
