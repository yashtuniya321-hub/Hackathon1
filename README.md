# Brightloop Software - Subscription Management System Backend
### Odoo Hackathon 2026

Production-ready backend built with **Express.js**, **PostgreSQL** (`pg` pool), **JSON Web Tokens (JWT)**, **bcryptjs**, and **node-cron**.

---

## 🏗️ Architecture & Business Rules Overview

| Module | Features & Strict Business Rules |
| :--- | :--- |
| **1. Authentication & Users** | • Roles: `Admin`, `Staff`, `Customer`<br>• Unique emails enforced in DB schema<br>• **Strict Password Rule**: Length > 8 characters, at least 1 uppercase, 1 lowercase, 1 special character<br>• Middlewares: `verifyAdmin`, `verifyStaff`, `verifyCustomer`<br>• Only Admins can register Staff/Admin accounts |
| **2. Products, Plans & Discounts** | • Products with base sales/cost prices & variants (e.g. +$560 for Odoo brand edition)<br>• Plans: frequencies (`daily`, `weekly`, `monthly`, `yearly`), minimum quantity, closure rules (`auto-close`, `pausable`, `auto-renew`)<br>• Discounts: fixed/percentage, min purchase, start/end dates, usage limits, scope (`subscription` / `product`) |
| **3. Subscriptions & Quotes** | • Customer, plan, line items, taxes, discounts, amounts<br>• **Strict Status Progression**: `Draft` ➔ `Quotation` ➔ `Confirmed` ➔ `Active` ➔ `Closed`<br>• Prevents illegal jumps or regressions |
| **4. Automated Billing Cron** | • Daily `node-cron` querying Active subscriptions due for billing (`next_billing_date <= CURRENT_DATE`)<br>• Generates invoices snapshotting customer details, line items, 18% tax, and discounts<br>• Automatically advances billing dates and applies `auto-close` rules<br>• **Invoice Status Progression**: `Draft` ➔ `Confirmed` ➔ `Paid`<br>• Manual trigger endpoint: `POST /api/invoices/trigger-billing` for instant demo |
| **5. Payments & Finance Dashboard** | • Record payments against invoices; automatically marks invoice as `Paid` upon full settlement<br>• **Sub-2-Second Finance Dashboard Query**: Single-pass CTE query utilizing specialized B-Tree indexes returning active subscriptions, total revenue, and overdue invoices in **< 5ms** |

---

## 📁 Project Structure

```
odoo-hackathon/
├── .env                              # Environment configuration
├── .env.example                      # Template environment variables
├── package.json                      # Dependencies & scripts
├── server.js                         # Application entrypoint & graceful shutdown
├── test-api.sh                       # Complete automated end-to-end curl test suite
├── brightloop_postman_collection.json # Ready-to-import Postman Collection
├── tests/
│   └── unit.test.js                  # 17 automated unit tests (native Node test runner)
└── src/
    ├── app.js                        # Express app, middlewares & error handling
    ├── config/
    │   └── db.js                     # PostgreSQL connection pool with connection pooling
    ├── database/
    │   ├── schema.sql                # Complete SQL schema, constraints & indexes
    │   ├── initDb.js                 # Schema initialization runner
    │   └── seed.js                   # Seed script with demo accounts, plans & invoices
    ├── middleware/
    │   ├── auth.middleware.js        # verifyToken, verifyAdmin, verifyStaff, verifyCustomer
    │   └── validate.middleware.js    # Strict password rule & registration validation
    ├── controllers/
    │   ├── auth.controller.js        # Register, Login, Me, List Users
    │   ├── product.controller.js     # Products & Variant pricing (+560 Odoo brand)
    │   ├── plan.controller.js        # Plans with closure rules & minimum quantity
    │   ├── discount.controller.js    # Discount rules & code validation
    │   ├── subscription.controller.js# Subscription lifecycle & state machine
    │   ├── invoice.controller.js     # Invoice management & manual billing trigger
    │   ├── payment.controller.js     # Payment recording & auto-paid transition
    │   └── dashboard.controller.js   # High-performance Finance Dashboard query
    ├── services/
    │   ├── billing.service.js        # Automated billing engine & date math
    │   └── cron.service.js           # node-cron scheduled background job
    └── routes/
        ├── auth.routes.js
        ├── product.routes.js
        ├── plan.routes.js
        ├── discount.routes.js
        ├── subscription.routes.js
        ├── invoice.routes.js
        ├── payment.routes.js
        ├── dashboard.routes.js
        └── index.js
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database in `.env`
Update your PostgreSQL credentials in `.env`:
```env
PORT=5000
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=brightloop_subscriptions
JWT_SECRET=super_secret_brightloop_hackathon_jwt_key_2026_!@#$%^
```

Create the database in PostgreSQL if it doesn't already exist:
```bash
createdb brightloop_subscriptions
```

### 3. Initialize Schema & Seed Data
```bash
# Creates all tables, checks, foreign keys and indexes
npm run db:init

# Seeds Admin, Staff, Customer, Products, Plans, Subscriptions, and Invoices
npm run db:seed
```

**Default Seed Accounts:**
| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@brightloop.io` | `Admin@12345` |
| **Staff** | `staff@brightloop.io` | `Staff@12345` |
| **Customer** | `customer@acme.com` | `Customer@12345` |

### 4. Start the Server
```bash
# Production mode
npm start

# Development mode (with nodemon auto-restart)
npm run dev
```

---

## 🧪 How to Test

### Option A: Run Automated Unit Tests (No Database Required)
Test password rules, state machine transitions, variant pricing (+560), and billing date calculations:
```bash
npm test
```
*Output: 17/17 tests passing in < 60ms.*

---

### Option B: Run Automated End-to-End Test Script
With the server running (`npm run dev`), execute:
```bash
./test-api.sh
```
This script automatically runs 13 end-to-end integration tests:
1. Health check
2. Password validation checks (short password, missing uppercase/lowercase/special character)
3. RBAC checks (public user blocked from creating Staff)
4. Admin login & JWT verification
5. Customer login & JWT verification
6. Admin adds Product with Odoo Variant (+560 price extra)
7. Admin creates Plan (Monthly, min qty 2, auto-renew)
8. Admin creates Discount rule
9. Customer creates Subscription in `Draft`
10. Strict state machine progression (`Draft` ➔ `Quotation` ➔ `Confirmed` ➔ `Active`) & blocks illegal jump
11. Triggers automated daily billing cycle
12. Records payment against invoice & auto-transitions to `Paid`
13. Finance Dashboard benchmark query (asserts < 2000 ms response time)

---

### Option C: Import Postman Collection
Import [`brightloop_postman_collection.json`](./brightloop_postman_collection.json) directly into Postman, Bruno, or Insomnia. It includes preconfigured environment variables and all request payloads.
