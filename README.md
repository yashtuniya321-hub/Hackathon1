# Brightloop Software — Backend API & Automated Recurring Billing Engine
**Odoo x Flux Hackathon 2026**

High-performance, ACID-compliant Recurring Billing Engine and REST API for Brightloop Subscription Management System. Powered by Node.js, Express, and PostgreSQL with full JWT Role-Based Access Control (RBAC).

---

## 🚀 Quick Start

### 1. Requirements & Installation
The backend uses `@electric-sql/pglite` (embedded WebAssembly PostgreSQL 18.6 engine), enabling full PostgreSQL transactions, row locking (`FOR UPDATE`), unique constraints, and schema indexes with **zero external database dependencies**.

```bash
cd "/Users/riteshsg/Documents/Backend"
npm install
```

### 2. Run Database Seeding
Populates accounts, products, the `+560` Odoo variant, plans, discount rules, quotation templates, and **2,500+ realistic subscriptions and invoices** in ~1 second:
```bash
npm run seed
```

### 3. Run Automated Test Suite
Executes the comprehensive automated verification covering batch billing idempotency, plan auto-close, discount quota depletion, and `< 2000ms` SLA compliance:
```bash
npm test
```
*Expected Result: 34 passed, 0 failed (100% success).*

### 4. Start the Production API Server
```bash
npm start
# Server listens on http://localhost:4000
```

---

## 🔐 Demo Credentials & RBAC Architecture

| Role | Email | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@brightloop.com` | `Admin@2026!` | Full system control. The **only** role allowed to create staff (`POST /api/staff`), products, plans, tax rules, and discount rules. |
| **Internal Staff** | `staff@brightloop.com` | `Staff@2026!` | Day-to-day operations: quotations, subscriptions, batch billing runs, invoices, and payments. |
| **Customer** | `elena@apexretail.io` | `Customer@2026!` | Self-service Customer Portal: strictly scoped to `customer_id` (`cust-apex-01`) to view/manage subscriptions, toggle add-ons, and view/pay invoices. |

> **Tip for Judges / Testing:** You can pass `x-demo-role: admin`, `x-demo-role: staff`, or `x-demo-role: customer` as an HTTP header to simulate role access without logging in first.

---

## ⚡ Performance SLA Guarantee (< 2000ms)
Every single endpoint injects a high-resolution performance metadata envelope into the response:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "executionTimeMs": 14.82,
    "slaCompliant": true,
    "timestamp": "2026-10-31T04:54:59.330Z"
  }
}
```
Aggregations across 2,500+ subscriptions and thousands of invoice lines in `GET /api/analytics/finance` execute in **13ms–35ms** (far exceeding the < 2,000ms requirement).

---

## 📦 Core Business Logic Modules

### 1. Module A: Auth & Strict RBAC
- **Password Regex Validation:** `/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}$/` (enforced at `POST /api/auth/signup`).
- **Staff Onboarding Control:** `POST /api/staff` rejects requests from non-admin users with `403 Forbidden`.
- **Forgot Password:** `POST /api/auth/forgot-password` generates secure tokens for simulated email reset.

### 2. Module B: Products, Dynamic Variants & Plans
- **Odoo Brand Variant:** Base product price of `$1,200` has an "Odoo Connected Edition" variant with `price_extra = +560.00`, resulting in `$1,760.00` unit price.
- **Plan Lifecycles:** Configurable `daily`, `weekly`, `monthly`, `yearly` billing frequencies with `auto_close`, `can_close_early`, `can_pause`, and `can_renew` flags.

### 3. Module C: Quotations & Subscription Pipeline
- **Quotation Templates:** Pre-configured offers with product lines and validity days (`validity_days`).
- **1-Click Generation:** `POST /api/subscriptions/from-template` instantiates draft subscriptions instantly.
- **Strict State Machine:** `Draft -> Quotation -> Confirmed -> Active -> Closed`.
- **Plan Permission Enforcement:** Calls to `/pause`, `/resume`, `/close-early`, and `/renew` dynamically verify whether the linked plan permits that action.
- **Add-on Self-Service:** `PATCH /api/subscriptions/:id/toggle-addon` allows customers to add or remove optional items.

### 4. Module D: Atomic Batch Recurring Billing Engine (`POST /api/billing/run`)
- **Row Locking & ACID:** Uses `FOR UPDATE` locking across due subscriptions.
- **Idempotency Safeguard:** Enforces unique constraint on `(subscription_id, billing_cycle_date)`. Running the engine repeatedly will **never double-bill or skip** any subscription.
- **Automated Discount Engine:** Evaluates active discounts against date ranges, minimum purchase amounts, minimum seat quantities, and `current_uses < max_uses`. Atomically increments `current_uses` upon application.
- **Automatic Interval Advancement:** Advances `next_billing_date` based on the plan's interval (`daily`, `weekly`, `monthly`, `yearly`).
- **Auto-Close on Expiry:** Subscriptions reaching `expiry_date` under an `auto_close = true` plan are automatically decommissioned to `Closed`.
- **Invoice Pipeline:** Invoices move from `Draft -> Confirmed -> Paid` / `Cancelled`, with endpoints for confirmation, cancellation, email dispatch preview (`/send`), and print-ready formatting (`/print`).

### 5. Module E: Payments & Finance Analytics
- **Instant Payment Allocation:** `POST /api/payments` records payments and automatically transitions invoices to `Paid` once fully settled.
- **Real-Time Financial Metrics:** `GET /api/analytics/finance` calculates Active Subscriptions, Total Invoiced, MRR, ARR, Collected Revenue, Outstanding Balances, and Overdue Accounts.

---

## 🧪 Integration Test Suite Coverage (`npm test`)

The automated integration test suite (`src/scripts/testBillingEngine.js`) executes 34 distinct assertions:

1. **Test 1: Batch Billing Idempotency**
   - Runs billing on 10 due subscriptions.
   - Re-runs billing on the exact same date.
   - Asserts: 10 created on run 1, 0 duplicates created on run 2, 10 idempotency safeguards logged.
2. **Test 2: Plan Interval Advancement & Auto-Close**
   - Daily, Weekly, and Monthly subscriptions advance `next_billing_date` appropriately.
   - Subscription with `auto_close = true` reaching `expiry_date` transitions status to `Closed`.
3. **Test 3: Discount Rule Quota Depletion & Expiry**
   - Fixed and percentage discounts applied accurately.
   - `current_uses` increments atomically.
   - Discount rejects application once `current_uses >= max_uses` or after `end_date`.
4. **Test 4: Performance SLA (< 2000ms)**
   - Queries `GET /api/analytics/finance` across 2,500+ records.
   - Asserts `executionTimeMs < 2000` (Actual: ~14ms).
   - Asserts `slaCompliant === true`.
