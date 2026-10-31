from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import Client, TestCase
from django.urls import reverse

from .forms import SignupForm, SubscriptionForm
from .models import (
    Customer, DiscountRule, Invoice, Plan, Product, ProductVariant,
    Subscription, SubscriptionLine, TaxRule,
)
from .services import create_invoice, generate_due_invoices, record_payment

User = get_user_model()


class SubscriptionManagementTests(TestCase):
    def setUp(self):
        self.customer_user = User.objects.create_user(
            username="customer@example.com",
            email="customer@example.com",
            password="SecurePass!2026",
            first_name="Casey",
        )
        self.customer = Customer.objects.create(
            user=self.customer_user,
            name="Casey Customer",
            company_name="Casey Co",
            email="customer@example.com",
        )
        self.other_customer = Customer.objects.create(name="Other", email="other@example.com")
        self.staff_user = User.objects.create_user(
            username="ops",
            email="ops@example.com",
            password="SecurePass!2026",
        )
        self.staff_user.groups.add(Group.objects.get(name="Staff"))
        self.plan = Plan.objects.create(
            name="Business monthly",
            price=Decimal("100.00"),
            billing_cycle="Monthly",
            minimum_quantity=2,
        )
        self.product = Product.objects.create(name="Analytics", sale_price=Decimal("50.00"))
        self.tax = TaxRule.objects.create(name="Standard", rate=Decimal("10.00"), is_default=True)

    def create_active_subscription(self, customer=None, start_date=None):
        return Subscription.objects.create(
            customer=customer or self.customer,
            plan=self.plan,
            quantity=2,
            start_date=start_date or date.today(),
            status="Active",
        )

    def test_password_policy_and_unique_customer_email(self):
        weak = SignupForm({
            "name": "Rae",
            "email": "rae@example.com",
            "password1": "lowercaseonly",
            "password2": "lowercaseonly",
        })
        self.assertFalse(weak.is_valid())
        self.assertIn("password1", weak.errors)

        duplicate = SignupForm({
            "name": "Casey",
            "email": "CUSTOMER@example.com",
            "password1": "SecurePass!2026",
            "password2": "SecurePass!2026",
        })
        self.assertFalse(duplicate.is_valid())
        self.assertIn("email", duplicate.errors)

    def test_signup_creates_customer_portal_account(self):
        client = Client()
        response = client.post(reverse("signup"), {
            "name": "Rae Customer",
            "company_name": "Rae Labs",
            "email": "rae@example.com",
            "password1": "SecurePass!2026",
            "password2": "SecurePass!2026",
        })
        self.assertRedirects(response, reverse("home"))
        user = User.objects.get(email="rae@example.com")
        self.assertEqual(user.customer_profile.company_name, "Rae Labs")
        self.assertTrue(user.check_password("SecurePass!2026"))

    def test_signup_claims_an_existing_unlinked_customer_profile(self):
        client = Client()
        response = client.post(reverse("signup"), {
            "name": "Other Customer",
            "company_name": "Other Inc",
            "email": "other@example.com",
            "password1": "SecurePass!2026",
            "password2": "SecurePass!2026",
        })
        self.assertRedirects(response, reverse("home"))
        profile = Customer.objects.get(email="other@example.com")
        self.assertIsNotNone(profile.user_id)
        self.assertEqual(profile.name, "Other Customer")

    def test_customer_portal_is_scoped_and_staff_pages_are_restricted(self):
        own = self.create_active_subscription()
        self.create_active_subscription(customer=self.other_customer)
        client = Client()
        client.force_login(self.customer_user)
        response = client.get(reverse("subscriptions"))
        self.assertContains(response, own.subscription_number)
        self.assertEqual(response.content.count(b"SUB-"), 1)
        self.assertEqual(client.get(reverse("products")).status_code, 403)
        self.assertEqual(client.post(reverse("invoice_create", args=[own.pk])).status_code, 403)

    def test_plan_minimum_quantity_is_enforced(self):
        form = SubscriptionForm({
            "customer": self.customer.pk,
            "plan": self.plan.pk,
            "quantity": 1,
            "start_date": date.today().isoformat(),
            "expiry_date": "",
            "quote_valid_until": "",
            "payment_terms": "Net 30",
            "discount_rule": "",
            "status": "Quotation",
        }, staff=True)
        self.assertFalse(form.is_valid())
        self.assertIn("quantity", form.errors)

    def test_customer_subscription_form_hides_staff_controls(self):
        form = SubscriptionForm(customer=self.customer)
        self.assertNotIn("customer", form.fields)
        self.assertNotIn("status", form.fields)
        self.assertNotIn("discount_rule", form.fields)
        self.assertNotIn("quote_template", form.fields)

    def test_odoo_variant_adds_560_to_product_price(self):
        variant = ProductVariant.objects.create(
            product=self.product,
            name="Odoo edition",
            brand="Odoo",
            price_adjustment=Decimal("1.00"),
        )
        variant.refresh_from_db()
        self.assertEqual(variant.price_adjustment, Decimal("560.00"))
        self.assertEqual(variant.unit_price, Decimal("610.00"))

    def test_invoice_snapshots_tax_and_automatic_discount_once_per_period(self):
        subscription = self.create_active_subscription()
        SubscriptionLine.objects.create(
            subscription=subscription,
            product=self.product,
            quantity=2,
            unit_price=Decimal("50.00"),
            tax_rule=self.tax,
        )
        discount = DiscountRule.objects.create(
            name="Ten percent",
            discount_type=DiscountRule.PERCENT,
            amount=Decimal("10.00"),
            applies_to=DiscountRule.WHOLE,
            minimum_purchase=Decimal("100.00"),
            minimum_quantity=2,
        )
        subscription.discount_rule = discount
        subscription.save(update_fields=["discount_rule"])

        invoice, created = create_invoice(subscription, on_date=subscription.start_date)
        self.assertTrue(created)
        self.assertEqual(invoice.subtotal, Decimal("300.00"))
        self.assertEqual(invoice.discount_amount, Decimal("30.00"))
        self.assertEqual(invoice.tax_amount, Decimal("27.00"))
        self.assertEqual(invoice.total_amount, Decimal("297.00"))
        self.assertEqual(invoice.lines.count(), 2)
        self.assertEqual(DiscountRule.objects.get(pk=discount.pk).times_used, 1)

        next_invoice, next_created = create_invoice(subscription, on_date=subscription.start_date)
        self.assertIsNone(next_invoice)
        self.assertFalse(next_created)
        self.assertEqual(Invoice.objects.filter(subscription=subscription).count(), 1)

    def test_payments_are_recorded_and_invoice_closes_at_full_balance(self):
        subscription = self.create_active_subscription()
        invoice, _ = create_invoice(subscription, on_date=subscription.start_date)
        invoice.status = "Confirmed"
        invoice.save(update_fields=["status"])
        record_payment(invoice, method="bank_transfer", amount=Decimal("75.00"), paid_on=date.today(), note="First part")
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "Confirmed")
        self.assertEqual(invoice.amount_due, Decimal("145.00"))
        record_payment(invoice, method="upi", amount=Decimal("145.00"), paid_on=date.today())
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "Paid")
        self.assertEqual(invoice.payments.count(), 2)
        with self.assertRaises(ValueError):
            record_payment(invoice, method="cash", amount=Decimal("1.00"))

    def test_billing_command_service_is_idempotent_for_current_period(self):
        subscription = self.create_active_subscription()
        self.assertEqual(generate_due_invoices(on_date=subscription.start_date), 1)
        self.assertEqual(generate_due_invoices(on_date=subscription.start_date), 0)
        self.assertEqual(Invoice.objects.filter(subscription=subscription).count(), 1)

    def test_staff_workspace_pages_render(self):
        subscription = self.create_active_subscription()
        invoice, _ = create_invoice(subscription, on_date=subscription.start_date)
        client = Client()
        client.force_login(self.staff_user)
        paths = [
            reverse("home"), reverse("subscriptions"), reverse("customers"),
            reverse("products"), reverse("plans"), reverse("invoices"),
            reverse("payments"), reverse("customer_create"),
            reverse("product_create"), reverse("plan_create"),
            reverse("subscription_create"), reverse("subscription_edit", args=[subscription.pk]),
            reverse("invoice_detail", args=[invoice.pk]),
        ]
        for path in paths:
            with self.subTest(path=path):
                response = client.get(path)
                self.assertEqual(response.status_code, 200)

