# Brightloop Subscription Management

A Django application for the subscription lifecycle described in the Odoo hackathon brief: customer accounts, product and plan setup, quotations, recurring invoices, discounts, taxes, payments, and revenue reporting.

## Features

- Customer sign-up with a unique email, a strong-password policy, sign-in, and email-based password reset.
- Role-based workspace access for administrators, internal staff, and customers. Customers can only view and manage records linked to their own account.
- Product catalogue with type, sale and cost prices, notes, and variants. A variant with the brand `Odoo` always adds ₹560 to the product price.
- Daily, weekly, monthly, and yearly plans with minimum quantities, availability dates, invoice due terms, and optional automatic closure at expiry.
- Drafts and quotations with expiring quote terms, product lines, and reusable quotation templates.
- Subscription states for Draft, Quotation, Confirmed, Active, Paused, and Closed, with early close, pause/resume, and renewal actions.
- Idempotent recurring invoice generation. Invoice lines snapshot product prices, discount, and tax at issue time.
- Admin-managed percentage or fixed discounts, including date, minimum purchase/quantity, usage limits, and product-specific rules.
- Admin-managed tax rules, partial and full payment records, overdue tracking, email sending, printable invoices, and a searchable payment ledger.
- Filtered dashboard with recurring revenue, payments received, outstanding balance, overdue invoices, and paginated lists.

## Run locally

Requires Python 3.12 or newer.

```bash
cd Hackathon1
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open <http://127.0.0.1:8000/>. The first migration creates the `Staff` group. Sign in as the superuser to configure products, variants, plans, tax rules, discounts, quotation templates, and users in `/admin/`.

To add an internal staff member, create a user in Django Admin and assign the `Staff` group. Leave Django's `Staff status` unchecked so the user can use the Brightloop workspace without access to the administration site. Customers can create their own portal account at `/accounts/signup/`; if staff already entered their customer profile, sign-up claims that unlinked profile by email.

## Recurring billing

Run the billing-cycle command daily from a scheduler:

```bash
python manage.py run_billing_cycle
```

It generates one invoice per due subscription period, closes expired plans that use automatic closure, and marks confirmed past-due invoices as overdue. Invoices begin in Draft; staff confirms and sends them from the invoice page, and records payments against the balance.

## Email and settings

The default email backend writes reset links and invoice emails to the terminal for local development. Set `DJANGO_EMAIL_BACKEND` to Django's SMTP backend and configure the relevant Django `EMAIL_*` variables to deliver email. Configure `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, and `DJANGO_ALLOWED_HOSTS` before deploying. The default SQLite database is for local development; `db.sqlite3` and `.env` files are excluded from Git.

## Tests

```bash
python manage.py test
python manage.py check
```
