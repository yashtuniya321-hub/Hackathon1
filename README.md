# Brightloop Software — Subscription Management System
### Odoo x Flux Hackathon 2026

A production-ready, full-stack recurring billing platform and ERP built for **Brightloop Software**, featuring an Odoo-inspired ERP interface, an atomic ACID Batch Recurring Billing Engine with idempotency safeguards, strict Role-Based Access Control (Admin, Internal Staff, Customer Portal), and high-throughput PostgreSQL telemetry verified under 2,500+ active subscriptions.

---

## 🚀 1-Click Launch

```bash
git clone https://github.com/yashtuniya321-hub/Hackathon1.git
cd Hackathon1
./start.sh
```
- **Unified Application (Frontend + Backend API):** http://localhost:4000
- **Database:** Embedded PostgreSQL 18.6 (zero external database installation required!)
- **Alternative Dev Mode:**
  - Backend API: `npm start` (Port 4000)
  - Vite Frontend Dev Server: `npm run dev:frontend` (Port 5173)

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Client Layer"]
        UI["Operations Command Center & ERP Views"]
        RoleSwitcher["Demo Role Switcher (Admin | Staff | Customer)"]
        ClientService["src/services/api.js (REST Client & Normalizer)"]
    end

    subgraph Backend["Backend API Layer (Port 4000)"]
        TimingMiddleware["Timing Middleware (< 2000ms SLA Injector)"]
        AuthMiddleware["RBAC Guard (JWT & x-demo-role)"]
        BillingEngine["ACID Batch Billing Engine (FOR UPDATE Locks)"]
        Router["REST Endpoints (/subscriptions, /billing, /invoices, /analytics)"]
    end

    subgraph Database["Database Layer"]
        Postgres[("Embedded PostgreSQL 18.6 Engine (ACID Transactions)")]
    end

    Client --> Backend
    Backend --> Database
```

---

## 🔐 Demo Credentials & RBAC Access Matrix

| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@brightloop.com` | `Admin@2026!` | Full system control. Only role allowed to add staff (`POST /api/staff`), configure products, plans, tax rules, and discounts. |
| **Internal Staff** | `staff@brightloop.com` | `Staff@2026!` | Day-to-day operations: manage quotations, subscriptions, batch billing runs, invoices, and payments. Blocked from catalog modifications. |
| **Customer** | `elena@apexretail.io` | `Customer@2026!` | Self-Service Portal: strictly scoped to own account (`cust-apex-01`) to view/manage subscriptions, toggle add-ons, and pay invoices. |

> **Tip for Evaluators:** The top navbar features an interactive **Demo Role Switcher pill** (`Admin` | `Internal Staff` | `Customer Portal`) for instant 1-click RBAC testing.

---

## 📦 Exact Business Rules Implemented

1. **Authentication & Password Security:**
   - Account signup enforces live regex validation: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}$/` (> 8 chars, 1 uppercase, 1 lowercase, 1 special char).
   - Forgot-password flow generates simulated secure reset tokens.
2. **Product Catalog & Dynamic Variants:**
   - Full CRUD for products and variants.
   - Exact hackathon requirement: Choosing the **"Odoo Connected Edition"** brand variant adds **`+$560.00`** to the base price ($1,200 + $560 = $1,760).
3. **Plan Governance & Lifecycle Controls:**
   - Supports `daily`, `weekly`, `monthly`, and `yearly` billing frequencies.
   - Per-plan admin flags: `auto_close`, `can_close_early`, `can_pause`, and `can_renew`.
4. **5-Stage Subscription State Machine:**
   - Strict ribbon progression: `Draft -> Quotation -> Confirmed -> Active -> Closed`.
   - Action endpoints dynamically verify whether the linked plan permits pausing, early closure, or renewal.
   - 1-click generation from Quotation Templates with validity windows (`validity_days`).
5. **Atomic Batch Recurring Billing Engine (`POST /api/billing/run`):**
   - **Row Locking:** Acquires `FOR UPDATE` locks on due active subscriptions.
   - **Idempotency Safeguard:** Enforces unique constraint `uq_sub_cycle UNIQUE(subscription_id, billing_cycle_date)`. Repeated runs create **0 duplicate invoices** and safely skip already-billed subscriptions.
   - **Automated Discount Engine:** Automatically evaluates active discounts against dates, min spend, and `current_uses < max_uses`. Atomically increments usage quota and auto-expires when exhausted.
   - **Interval Advancement & Auto-Close:** Advances `next_billing_date` by interval (`+1 day`, `+7 days`, `+1 month`, `+1 year`) and auto-closes expired contracts when `auto_close = true`.
6. **Payments & Sub-2-Second Finance Engine:**
   - Records payments (Bank Transfer, UPI, Card, Cash) and auto-settles invoices to `Paid`.
   - Real-time SQL aggregations compute MRR, ARR, cash collected, and overdue revenue across 2,500+ records in **under 15 milliseconds**.

---

## 🧪 Automated Test Suite Verification

### 1. Backend Integration Tests (`npm test`)
```
==================================================
📊 Test Suite Summary:
   Total Assertions: 34
   Passed: 34
   Failed: 0
   Success Rate: 100.0%
==================================================
🎉 ALL AUTOMATED BILLING ENGINE TESTS PASSED!
```

### 2. Frontend End-to-End Suite (`cd frontend && node test-e2e.js`)
```
==================================================
🎉 ALL 8 SCENES PASSED 100% PERFECTLY WITH ZERO DEFECTS!
   ✓ Scene 1: Operations Overview & SLA Dashboard (< 810ms)
   ✓ Scene 2: Catalog, Plans & +$560 Odoo Variant
   ✓ Scene 3: 5-Stage Subscription Pipeline
   ✓ Scene 4: 1-Click Billing Day Idempotency Guard (0 duplicates)
   ✓ Scene 5: Invoices Pipeline & Print Layout
   ✓ Scene 6: Payments Settlement & Overdue Revenue Chaser
   ✓ Scene 7: Demo Role Switcher & Strict RBAC
   ✓ Scene 8: Live Regex Password Checklist
==================================================
```

---

## 📂 Project Structure

```
.
├── frontend/                 # React 18 + Vite + Tailwind CSS Application
│   ├── dist/                 # Production pre-built assets
│   ├── src/
│   │   ├── components/       # Odoo ERP layout, status ribbons, navigation
│   │   ├── context/          # State & business logic layer
│   │   ├── pages/            # Modules A–E & Operations Command Center
│   │   └── services/         # API service client
│   ├── package.json
│   └── test-e2e.js
├── src/                      # Node.js + Express + PostgreSQL Backend
│   ├── config/               # Database schema & connection
│   ├── middleware/           # Timing (<2000ms SLA) & RBAC auth
│   ├── routes/               # REST endpoints
│   ├── scripts/              # Seed script & test suite
│   ├── services/             # Atomic Batch Billing Engine
│   ├── app.js                # Express app (serves API + static frontend)
│   └── server.js             # HTTP server entrypoint
├── start.sh                  # 1-click startup launcher
├── package.json              # Root orchestrator
└── README.md                 # Complete hackathon documentation
```
