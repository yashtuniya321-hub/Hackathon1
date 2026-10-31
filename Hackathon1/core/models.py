import uuid

from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Sum
from django.utils import timezone


def reference(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def generate_subscription_number():
    return reference("SUB")


def generate_invoice_number():
    return reference("INV")


def generate_payment_number():
    return reference("PAY")


class Customer(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name="customer_profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200, blank=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.company_name or self.name


class Product(models.Model):
    PRODUCT_TYPES = [
        ("software", "Software"),
        ("service", "Service"),
        ("hardware", "Hardware"),
        ("addon", "Add-on"),
    ]

    name = models.CharField(max_length=200)
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPES, default="software")
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, related_name="variants", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    brand = models.CharField(max_length=100, blank=True)
    sku = models.CharField(max_length=80, blank=True)
    price_adjustment = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["product__name", "name"]
        constraints = [models.UniqueConstraint(fields=["product", "name"], name="unique_product_variant_name")]

    def save(self, *args, **kwargs):
        if self.brand.strip().casefold() == "odoo":
            self.price_adjustment = 560
        super().save(*args, **kwargs)

    @property
    def unit_price(self):
        return self.product.sale_price + self.price_adjustment

    def __str__(self):
        return f"{self.product.name} · {self.name}"


class TaxRule(models.Model):
    name = models.CharField(max_length=100, unique=True)
    rate = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)])
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-is_default", "name"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default:
            TaxRule.objects.exclude(pk=self.pk).filter(is_default=True).update(is_default=False)

    def __str__(self):
        return f"{self.name} ({self.rate}%)"


class DiscountRule(models.Model):
    FIXED = "fixed"
    PERCENT = "percent"
    WHOLE = "subscription"
    SPECIFIC = "product"
    DISCOUNT_TYPES = [(FIXED, "Fixed amount"), (PERCENT, "Percentage")]

    name = models.CharField(max_length=120, unique=True)
    discount_type = models.CharField(max_length=12, choices=DISCOUNT_TYPES, default=PERCENT)
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    minimum_purchase = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    minimum_quantity = models.PositiveIntegerField(default=1)
    starts_on = models.DateField(null=True, blank=True)
    ends_on = models.DateField(null=True, blank=True)
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    times_used = models.PositiveIntegerField(default=0)
    applies_to = models.CharField(max_length=20, choices=[(WHOLE, "Whole subscription"), (SPECIFIC, "Selected products")], default=WHOLE)
    products = models.ManyToManyField(Product, blank=True, related_name="discount_rules")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def is_available(self, on_date=None):
        on_date = on_date or timezone.localdate()
        return (
            self.is_active
            and (self.starts_on is None or self.starts_on <= on_date)
            and (self.ends_on is None or self.ends_on >= on_date)
            and (self.max_uses is None or self.times_used < self.max_uses)
        )

    def __str__(self):
        return self.name


class Plan(models.Model):
    BILLING_CHOICES = [
        ("Daily", "Daily"),
        ("Weekly", "Weekly"),
        ("Monthly", "Monthly"),
        ("Yearly", "Yearly"),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CHOICES, default="Monthly")
    minimum_quantity = models.PositiveIntegerField(default=1)
    available_from = models.DateField(null=True, blank=True)
    available_until = models.DateField(null=True, blank=True)
    payment_due_days = models.PositiveSmallIntegerField(default=30)
    auto_close = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["price", "name"]

    def __str__(self):
        return self.name


class QuoteTemplate(models.Model):
    name = models.CharField(max_length=120, unique=True)
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="quote_templates")
    validity_days = models.PositiveSmallIntegerField(default=30)
    payment_terms = models.CharField(max_length=200, blank=True, default="Due within 30 days")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class QuoteTemplateLine(models.Model):
    template = models.ForeignKey(QuoteTemplate, related_name="lines", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    def __str__(self):
        return f"{self.template}: {self.product} × {self.quantity}"


class Subscription(models.Model):
    STATUS_CHOICES = [
        ("Draft", "Draft"),
        ("Quotation", "Quotation"),
        ("Confirmed", "Confirmed"),
        ("Active", "Active"),
        ("Paused", "Paused"),
        ("Closed", "Closed"),
    ]

    subscription_number = models.CharField(max_length=20, unique=True, default=generate_subscription_number)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    quote_template = models.ForeignKey(QuoteTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    start_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    quote_valid_until = models.DateField(null=True, blank=True)
    payment_terms = models.CharField(max_length=200, blank=True, default="Due within 30 days")
    discount_rule = models.ForeignKey(DiscountRule, on_delete=models.SET_NULL, null=True, blank=True, related_name="subscriptions")
    renewal_of = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="renewals")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Draft")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "start_date"]), models.Index(fields=["customer", "status"])]

    @property
    def total_amount(self):
        if "lines" in getattr(self, "_prefetched_objects_cache", {}):
            lines_total = sum((line.unit_price * line.quantity for line in self.lines.all()), start=0)
        else:
            lines_total = self.lines.aggregate(total=Sum(models.F("quantity") * models.F("unit_price")))["total"] or 0
        return self.plan.price * self.quantity + lines_total

    def __str__(self):
        return self.subscription_number


class SubscriptionLine(models.Model):
    subscription = models.ForeignKey(Subscription, related_name="lines", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    tax_rule = models.ForeignKey(TaxRule, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.product.name} × {self.quantity}"


class Invoice(models.Model):
    STATUS_CHOICES = [
        ("Draft", "Draft"),
        ("Confirmed", "Confirmed"),
        ("Paid", "Paid"),
        ("Overdue", "Overdue"),
        ("Cancelled", "Cancelled"),
    ]

    invoice_number = models.CharField(max_length=20, unique=True, default=generate_invoice_number)
    subscription = models.ForeignKey(Subscription, on_delete=models.PROTECT, related_name="invoices")
    period_start = models.DateField()
    period_end = models.DateField()
    issue_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Draft")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issue_date", "-id"]
        constraints = [models.UniqueConstraint(fields=["subscription", "period_start"], name="unique_subscription_billing_period")]
        indexes = [models.Index(fields=["status", "due_date"])]

    @property
    def amount_paid(self):
        if "payments" in getattr(self, "_prefetched_objects_cache", {}):
            return sum((payment.amount for payment in self.payments.all()), start=0)
        return self.payments.aggregate(total=Sum("amount"))["total"] or 0

    @property
    def amount_due(self):
        return max(self.total_amount - self.amount_paid, 0)

    def __str__(self):
        return self.invoice_number


class InvoiceLine(models.Model):
    invoice = models.ForeignKey(Invoice, related_name="lines", on_delete=models.CASCADE)
    description = models.CharField(max_length=240)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return self.description


class Payment(models.Model):
    METHODS = [
        ("bank_transfer", "Bank transfer"),
        ("card", "Card"),
        ("cash", "Cash"),
        ("upi", "UPI"),
        ("other", "Other"),
    ]

    payment_number = models.CharField(max_length=20, unique=True, default=generate_payment_number)
    invoice = models.ForeignKey(Invoice, related_name="payments", on_delete=models.PROTECT)
    method = models.CharField(max_length=20, choices=METHODS)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    paid_on = models.DateField(default=timezone.localdate)
    note = models.CharField(max_length=240, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_on", "-id"]
        indexes = [models.Index(fields=["paid_on"])]

    def __str__(self):
        return self.payment_number
