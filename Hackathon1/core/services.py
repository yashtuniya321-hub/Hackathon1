from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from .models import DiscountRule, Invoice, InvoiceLine, Payment, Subscription

CENT = Decimal("0.01")


def money(value):
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def add_cycle(start, cycle):
    if cycle == "Daily":
        return start + timedelta(days=1)
    if cycle == "Weekly":
        return start + timedelta(days=7)
    if cycle == "Yearly":
        year, month = start.year + 1, start.month
        day = min(start.day, monthrange(year, month)[1])
        return date(year, month, day)
    year, month = start.year, start.month + 1
    if month == 13:
        year, month = year + 1, 1
    day = min(start.day, monthrange(year, month)[1])
    return date(year, month, day)


def next_period(subscription):
    last_invoice = subscription.invoices.order_by("-period_end").first()
    period_start = last_invoice.period_end + timedelta(days=1) if last_invoice else subscription.start_date
    period_end = add_cycle(period_start, subscription.plan.billing_cycle) - timedelta(days=1)
    if subscription.expiry_date:
        period_end = min(period_end, subscription.expiry_date)
    return period_start, period_end


def _discount_available(rule, on_date, eligible_subtotal, eligible_quantity):
    if not rule or not rule.is_available(on_date):
        return False
    if eligible_subtotal < rule.minimum_purchase or eligible_quantity < rule.minimum_quantity:
        return False
    return True


@transaction.atomic
def create_invoice(subscription, on_date=None):
    """Create one invoice for the next unbilled period; safe to call repeatedly."""
    on_date = on_date or timezone.localdate()
    subscription = Subscription.objects.select_for_update().select_related("plan", "customer").get(pk=subscription.pk)
    period_start, period_end = next_period(subscription)
    existing = Invoice.objects.filter(subscription=subscription, period_start=period_start).first()
    if existing:
        return existing, False
    if period_start > on_date:
        return None, False

    billable_lines = [{
        "description": f"{subscription.plan.name} ({subscription.plan.billing_cycle.lower()})",
        "quantity": subscription.quantity,
        "unit_price": money(subscription.plan.price),
        "tax_rate": Decimal("0.00"),
        "product_id": None,
    }]
    from .models import TaxRule
    default_tax = TaxRule.objects.filter(is_active=True, is_default=True).first()
    if default_tax:
        billable_lines[0]["tax_rate"] = default_tax.rate

    for item in subscription.lines.select_related("product", "variant", "tax_rule"):
        description = item.product.name
        if item.variant:
            description = f"{description} — {item.variant.name}"
        billable_lines.append({
            "description": description,
            "quantity": item.quantity,
            "unit_price": money(item.unit_price),
            "tax_rate": item.tax_rule.rate if item.tax_rule_id else (default_tax.rate if default_tax else Decimal("0.00")),
            "product_id": item.product_id,
        })

    subtotal = money(sum((line["unit_price"] * line["quantity"] for line in billable_lines), Decimal("0")))
    discount = subscription.discount_rule
    eligible = [
        line for line in billable_lines
        if discount and (discount.applies_to == DiscountRule.WHOLE or (line["product_id"] and discount.products.filter(pk=line["product_id"]).exists()))
    ]
    eligible_subtotal = money(sum((line["unit_price"] * line["quantity"] for line in eligible), Decimal("0")))
    eligible_quantity = sum(line["quantity"] for line in eligible)
    applied = discount
    if applied:
        applied = DiscountRule.objects.select_for_update().get(pk=applied.pk)
    if not _discount_available(applied, on_date, eligible_subtotal, eligible_quantity):
        applied = None

    discount_left = Decimal("0.00")
    if applied:
        if applied.discount_type == DiscountRule.PERCENT:
            discount_left = money(eligible_subtotal * applied.amount / Decimal("100"))
        else:
            discount_left = min(money(applied.amount), eligible_subtotal)

    prepared = []
    total_discount = Decimal("0.00")
    tax_total = Decimal("0.00")
    total = Decimal("0.00")
    eligible_ids = {id(line) for line in eligible}
    for line in billable_lines:
        base = money(line["unit_price"] * line["quantity"])
        line_discount = Decimal("0.00")
        if id(line) in eligible_ids and discount_left > 0:
            if applied.discount_type == DiscountRule.PERCENT:
                line_discount = money(base * applied.amount / Decimal("100"))
            else:
                line_discount = min(base, discount_left)
            discount_left = max(Decimal("0.00"), discount_left - line_discount)
        taxable = max(Decimal("0.00"), base - line_discount)
        line_tax = money(taxable * line["tax_rate"] / Decimal("100"))
        line_total = money(taxable + line_tax)
        prepared.append((line, line_discount, line_tax, line_total))
        total_discount += line_discount
        tax_total += line_tax
        total += line_total

    invoice, created = Invoice.objects.get_or_create(
        subscription=subscription,
        period_start=period_start,
        defaults={
            "period_end": period_end,
            "due_date": on_date + timedelta(days=subscription.plan.payment_due_days),
            "subtotal": subtotal,
            "discount_amount": money(total_discount),
            "tax_amount": money(tax_total),
            "total_amount": money(total),
        },
    )
    if not created:
        return invoice, False
    InvoiceLine.objects.bulk_create([
        InvoiceLine(
            invoice=invoice,
            description=line["description"],
            quantity=line["quantity"],
            unit_price=line["unit_price"],
            discount_amount=discount_value,
            tax_rate=line["tax_rate"],
            tax_amount=tax_value,
            line_total=line_total,
        )
        for line, discount_value, tax_value, line_total in prepared
    ])
    if applied and total_discount > 0:
        DiscountRule.objects.filter(pk=applied.pk).update(times_used=F("times_used") + 1)
    return invoice, True


def generate_due_invoices(on_date=None):
    on_date = on_date or timezone.localdate()
    count = 0
    subscriptions = Subscription.objects.filter(status="Active", start_date__lte=on_date).select_related("plan")
    for subscription in subscriptions.iterator(chunk_size=200):
        while True:
            period_start, _ = next_period(subscription)
            if period_start > on_date or (subscription.expiry_date and period_start > subscription.expiry_date):
                break
            _, created = create_invoice(subscription, on_date=on_date)
            if not created:
                # The existing record is the latest issued period; refresh before continuing.
                subscription.refresh_from_db()
                latest = subscription.invoices.order_by("-period_end").first()
                if latest and latest.period_end >= on_date:
                    break
                continue
            count += 1
            subscription.refresh_from_db()
            if subscription.invoices.order_by("-period_end").first().period_end >= on_date:
                break
    return count


def mark_overdue_invoices(on_date=None):
    on_date = on_date or timezone.localdate()
    return Invoice.objects.filter(
        status="Confirmed", due_date__lt=on_date,
    ).exclude(payments__amount__gte=F("total_amount")).update(status="Overdue")


@transaction.atomic
def record_payment(invoice, *, method, amount, paid_on=None, note=""):
    invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)
    if invoice.status in {"Draft", "Cancelled"}:
        raise ValueError("Payments can only be recorded against confirmed invoices.")
    amount = money(amount)
    if amount <= 0 or amount > invoice.amount_due:
        raise ValueError("Payment must be greater than zero and cannot exceed the remaining balance.")
    payment = Payment.objects.create(
        invoice=invoice,
        method=method,
        amount=amount,
        paid_on=paid_on or timezone.localdate(),
        note=note,
    )
    if invoice.amount_due <= 0:
        invoice.status = "Paid"
        invoice.save(update_fields=["status"])
    return payment


@transaction.atomic
def renew_subscription(subscription, on_date=None):
    on_date = on_date or timezone.localdate()
    source = Subscription.objects.select_for_update().select_related("plan", "customer").get(pk=subscription.pk)
    start_date = source.expiry_date + timedelta(days=1) if source.expiry_date and source.expiry_date >= on_date else on_date
    end_date = add_cycle(start_date, source.plan.billing_cycle) - timedelta(days=1)
    if source.plan.auto_close:
        new_expiry = end_date
    else:
        new_expiry = None
    renewed = Subscription.objects.create(
        customer=source.customer,
        plan=source.plan,
        quote_template=source.quote_template,
        quantity=source.quantity,
        start_date=start_date,
        expiry_date=new_expiry,
        payment_terms=source.payment_terms,
        discount_rule=source.discount_rule,
        renewal_of=source,
        status="Confirmed",
    )
    from .models import SubscriptionLine
    SubscriptionLine.objects.bulk_create([
        SubscriptionLine(
            subscription=renewed,
            product=line.product,
            variant=line.variant,
            quantity=line.quantity,
            unit_price=line.unit_price,
            tax_rule=line.tax_rule,
        )
        for line in source.lines.select_related("product", "variant", "tax_rule")
    ])
    return renewed


def close_expired_subscriptions(on_date=None):
    on_date = on_date or timezone.localdate()
    return Subscription.objects.filter(
        status="Active", plan__auto_close=True, expiry_date__lt=on_date,
    ).update(status="Closed")
