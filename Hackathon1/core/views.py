from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal
from functools import wraps

from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.db.models import F, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.http import HttpResponseForbidden
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator

from .forms import (
    CustomerForm, PaymentForm, PlanForm, ProductForm, SignupForm,
    SubscriptionForm, SubscriptionLineFormSet,
)
from .models import (
    Customer, DiscountRule, Invoice, Payment, Plan, Product, QuoteTemplate,
    Subscription, TaxRule,
)
from .services import (
    close_expired_subscriptions, create_invoice, mark_overdue_invoices,
    record_payment, renew_subscription,
)


def is_staff_member(user):
    return user.is_authenticated and (user.is_superuser or user.groups.filter(name="Staff").exists())


def staff_required(view):
    @wraps(view)
    @login_required
    def wrapped(request, *args, **kwargs):
        if not is_staff_member(request.user):
            return HttpResponseForbidden("This page is for Brightloop staff.")
        return view(request, *args, **kwargs)
    return wrapped


def customer_for(user):
    try:
        return user.customer_profile
    except Customer.DoesNotExist:
        return None


def visible_subscriptions(user):
    if is_staff_member(user):
        return Subscription.objects.all()
    customer = customer_for(user)
    return Subscription.objects.filter(customer=customer) if customer else Subscription.objects.none()


def visible_invoices(user):
    if is_staff_member(user):
        return Invoice.objects.all()
    customer = customer_for(user)
    return Invoice.objects.filter(subscription__customer=customer) if customer else Invoice.objects.none()


def _paginate(request, queryset, per_page=25):
    return Paginator(queryset, per_page).get_page(request.GET.get("page"))


@login_required
def home(request):
    if not is_staff_member(request.user):
        customer = customer_for(request.user)
        if customer is None:
            return HttpResponseForbidden("This account is not linked to a customer profile.")
        subscriptions = visible_subscriptions(request.user).select_related("plan").order_by("-created_at")
        invoices = visible_invoices(request.user).select_related("subscription__plan").order_by("-issue_date")
        return render(request, "core/portal.html", {
            "customer": customer,
            "subscriptions": subscriptions[:10],
            "invoices": invoices[:10],
            "active_count": subscriptions.filter(status="Active").count(),
            "open_invoice_count": invoices.filter(status__in=["Confirmed", "Overdue"]).count(),
            "plans": Plan.objects.filter(is_active=True).order_by("price")[:6],
        })

    today = timezone.localdate()
    month_value = request.GET.get("month", today.strftime("%Y-%m"))
    try:
        year, month = (int(part) for part in month_value.split("-", 1))
        if month not in range(1, 13):
            raise ValueError
        period_start = date(year, month, 1)
    except (TypeError, ValueError):
        period_start = date(today.year, today.month, 1)
        month_value = period_start.strftime("%Y-%m")
    period_end = date(period_start.year, period_start.month, monthrange(period_start.year, period_start.month)[1])

    subscriptions = Subscription.objects.select_related("customer", "plan").all()
    status = request.GET.get("status", "")
    search = request.GET.get("search", "").strip()
    if status:
        subscriptions = subscriptions.filter(status=status)
    if search:
        subscriptions = subscriptions.filter(
            Q(subscription_number__icontains=search)
            | Q(customer__name__icontains=search)
            | Q(customer__company_name__icontains=search)
        )
    invoices = Invoice.objects.select_related("subscription__customer", "subscription__plan")
    invoice_status = request.GET.get("invoice_status", "")
    if invoice_status:
        invoices = invoices.filter(status=invoice_status)

    active = Subscription.objects.filter(status="Active")
    normalized_mrr = Decimal("0.00")
    for price, quantity, cycle in active.values_list("plan__price", "quantity", "plan__billing_cycle").iterator(chunk_size=500):
        multiplier = {"Daily": Decimal("30"), "Weekly": Decimal("4.345"), "Monthly": Decimal("1"), "Yearly": Decimal("0.0833333333")}.get(cycle, Decimal("1"))
        normalized_mrr += price * quantity * multiplier
    line_values = Subscription.objects.filter(status="Active").values("plan__billing_cycle").annotate(
        value=Sum(F("lines__quantity") * F("lines__unit_price"))
    )
    for row in line_values:
        if row["value"]:
            multiplier = {"Daily": Decimal("30"), "Weekly": Decimal("4.345"), "Monthly": Decimal("1"), "Yearly": Decimal("0.0833333333")}.get(row["plan__billing_cycle"], Decimal("1"))
            normalized_mrr += row["value"] * multiplier

    paid_revenue = Payment.objects.filter(
        paid_on__range=(period_start, period_end), invoice__status="Paid",
    ).aggregate(total=Coalesce(Sum("amount"), Value(Decimal("0.00"))))["total"]
    overdue_count = Invoice.objects.filter(status="Overdue").count()
    outstanding = Invoice.objects.filter(status__in=["Confirmed", "Overdue"]).annotate(
        paid=Coalesce(Sum("payments__amount"), Value(Decimal("0.00")))
    ).aggregate(total=Coalesce(Sum(F("total_amount") - F("paid")), Value(Decimal("0.00"))))["total"]
    return render(request, "core/home.html", {
        "subscriptions": _paginate(request, subscriptions.order_by("-created_at"), 10),
        "invoices": _paginate(request, invoices.order_by("-issue_date"), 10),
        "active_count": active.count(),
        "customer_count": Customer.objects.count(),
        "plan_count": Plan.objects.filter(is_active=True).count(),
        "monthly_revenue": normalized_mrr.quantize(Decimal("0.01")),
        "paid_revenue": paid_revenue,
        "outstanding_amount": outstanding,
        "overdue_count": overdue_count,
        "subscription_statuses": Subscription.STATUS_CHOICES,
        "invoice_statuses": Invoice.STATUS_CHOICES,
        "selected_status": status,
        "selected_invoice_status": invoice_status,
        "search": search,
        "month": month_value,
    })


@login_required
def subscriptions_page(request):
    subscriptions = visible_subscriptions(request.user).select_related("customer", "plan")
    search = request.GET.get("search", "").strip()
    status = request.GET.get("status", "")
    if search:
        subscriptions = subscriptions.filter(
            Q(customer__name__icontains=search)
            | Q(customer__company_name__icontains=search)
            | Q(subscription_number__icontains=search)
            | Q(plan__name__icontains=search)
        )
    if status:
        subscriptions = subscriptions.filter(status=status)
    all_visible = visible_subscriptions(request.user)
    active = all_visible.filter(status="Active")
    revenue = sum((sub.total_amount for sub in active.select_related("plan").prefetch_related("lines")), Decimal("0.00"))
    return render(request, "core/subscriptions.html", {
        "subscriptions": _paginate(request, subscriptions.order_by("-created_at")),
        "statuses": Subscription.STATUS_CHOICES,
        "search": search,
        "selected_status": status,
        "active_count": active.count(),
        "revenue": revenue,
        "total_count": all_visible.count(),
        "staff_user": is_staff_member(request.user),
    })


@login_required
def subscription_create(request):
    staff_user = is_staff_member(request.user)
    customer = None if staff_user else customer_for(request.user)
    if not staff_user and customer is None:
        return HttpResponseForbidden("A customer profile is required to start a subscription.")

    template_id = request.GET.get("template") or request.POST.get("quote_template")
    quote_template = QuoteTemplate.objects.filter(pk=template_id, is_active=True).prefetch_related("lines").first() if staff_user and template_id else None
    if request.method == "POST":
        form = SubscriptionForm(request.POST, customer=customer, staff=staff_user)
        formset = SubscriptionLineFormSet(request.POST) if staff_user else None
        valid = form.is_valid() and (formset is None or formset.is_valid())
        if valid:
            subscription = form.save(commit=False)
            if quote_template:
                subscription.quote_template = quote_template
                subscription.plan = quote_template.plan
                if not subscription.payment_terms:
                    subscription.payment_terms = quote_template.payment_terms
                if not subscription.quote_valid_until:
                    subscription.quote_valid_until = timezone.localdate() + timedelta(days=quote_template.validity_days)
            subscription.save()
            if staff_user and formset:
                formset.instance = subscription
                has_line = any(f.cleaned_data and f.cleaned_data.get("product") for f in formset.forms if not f.cleaned_data.get("DELETE"))
                if not has_line and quote_template:
                    from .models import SubscriptionLine
                    SubscriptionLine.objects.bulk_create([
                        SubscriptionLine(
                            subscription=subscription,
                            product=item.product,
                            variant=item.variant,
                            quantity=item.quantity,
                            unit_price=item.variant.unit_price if item.variant else item.product.sale_price,
                        )
                        for item in quote_template.lines.select_related("product", "variant")
                    ])
                else:
                    formset.save()
            messages.success(request, f"Subscription {subscription.subscription_number} created.")
            return redirect("subscriptions")
    else:
        initial = {"start_date": timezone.localdate()}
        requested_plan = request.GET.get("plan")
        if requested_plan:
            initial["plan"] = Plan.objects.filter(pk=requested_plan, is_active=True).first()
        if quote_template:
            initial.update({
                "quote_template": quote_template,
                "plan": quote_template.plan,
                "payment_terms": quote_template.payment_terms,
                "quote_valid_until": timezone.localdate() + timedelta(days=quote_template.validity_days),
            })
        form = SubscriptionForm(initial=initial, customer=customer, staff=staff_user)
        formset = SubscriptionLineFormSet(initial=[
            {
                "product": item.product_id,
                "variant": item.variant_id,
                "quantity": item.quantity,
                "unit_price": item.variant.unit_price if item.variant else item.product.sale_price,
            }
            for item in quote_template.lines.select_related("product", "variant")
        ] if quote_template else []) if staff_user else None
    return render(request, "core/subscription_form.html", {
        "form": form, "formset": formset, "editing": False, "staff_user": staff_user,
    })


@staff_required
def subscription_edit(request, pk):
    subscription = get_object_or_404(Subscription.objects.select_related("customer", "plan"), pk=pk)
    if request.method == "POST":
        form = SubscriptionForm(request.POST, instance=subscription, staff=True)
        formset = SubscriptionLineFormSet(request.POST, instance=subscription)
        if form.is_valid() and formset.is_valid():
            form.save()
            formset.save()
            messages.success(request, "Subscription updated.")
            return redirect("subscriptions")
    else:
        form = SubscriptionForm(instance=subscription, staff=True)
        formset = SubscriptionLineFormSet(instance=subscription)
    return render(request, "core/subscription_form.html", {
        "form": form, "formset": formset, "editing": True, "staff_user": True,
        "subscription": subscription,
    })


@require_POST
@login_required
def subscription_action(request, pk, action):
    subscription = get_object_or_404(visible_subscriptions(request.user), pk=pk)
    staff_user = is_staff_member(request.user)
    transitions = {
        "confirm": ("Confirmed", {"Draft", "Quotation"}, True),
        "activate": ("Active", {"Confirmed"}, True),
        "pause": ("Paused", {"Active"}, False),
        "resume": ("Active", {"Paused"}, False),
        "close": ("Closed", {"Draft", "Quotation", "Confirmed", "Active", "Paused"}, False),
    }
    if action == "renew":
        if subscription.status == "Draft" or subscription.status == "Quotation":
            messages.error(request, "A draft or quotation cannot be renewed.")
        elif subscription.status != "Closed" and not subscription.expiry_date:
            messages.error(request, "This subscription has no expiry date to renew from.")
        else:
            renewed = renew_subscription(subscription)
            messages.success(request, f"Renewal {renewed.subscription_number} is ready for confirmation.")
        return redirect("subscriptions")
    if action not in transitions:
        return HttpResponseForbidden("Unsupported subscription action.")
    new_status, allowed_from, staff_only = transitions[action]
    if staff_only and not staff_user:
        return HttpResponseForbidden("Only staff can perform this action.")
    if subscription.status not in allowed_from:
        messages.warning(request, f"{action.title()} is not available while this subscription is {subscription.status.lower()}.")
    else:
        subscription.status = new_status
        subscription.save(update_fields=["status", "updated_at"])
        messages.success(request, f"Subscription moved to {new_status.lower()}.")
    return redirect("subscriptions")


@staff_required
def customers_page(request):
    customers = Customer.objects.all().order_by("name")
    search = request.GET.get("search", "").strip()
    if search:
        customers = customers.filter(Q(name__icontains=search) | Q(company_name__icontains=search) | Q(email__icontains=search))
    return render(request, "core/customers.html", {
        "customers": _paginate(request, customers),
        "search": search,
        "total_customers": Customer.objects.count(),
    })


@staff_required
def customer_create(request):
    if request.method == "POST":
        form = CustomerForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Customer added.")
            return redirect("customers")
    else:
        form = CustomerForm()
    return render(request, "core/object_form.html", {"form": form, "title": "Add customer", "cancel_url": "customers"})


@staff_required
def products_page(request):
    products = Product.objects.prefetch_related("variants").all()
    search = request.GET.get("search", "").strip()
    if search:
        products = products.filter(Q(name__icontains=search) | Q(description__icontains=search) | Q(product_type__icontains=search))
    return render(request, "core/products.html", {
        "products": _paginate(request, products.order_by("name")),
        "search": search,
        "total_products": Product.objects.count(),
        "active_products": Product.objects.filter(is_active=True).count(),
    })


@staff_required
def product_create(request):
    if request.method == "POST":
        form = ProductForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Product added.")
            return redirect("products")
    else:
        form = ProductForm()
    return render(request, "core/object_form.html", {"form": form, "title": "Add product", "cancel_url": "products"})


@login_required
def plans_page(request):
    today = timezone.localdate()
    plans = Plan.objects.filter(is_active=True).filter(
        Q(available_from__isnull=True) | Q(available_from__lte=today),
        Q(available_until__isnull=True) | Q(available_until__gte=today),
    ).order_by("price", "name")
    if is_staff_member(request.user):
        plans = Plan.objects.all().order_by("price", "name")
    return render(request, "core/plans.html", {
        "plans": _paginate(request, plans),
        "total_plans": Plan.objects.count(),
        "active_plans": Plan.objects.filter(is_active=True).count(),
        "staff_user": is_staff_member(request.user),
    })


@staff_required
def plan_create(request):
    if request.method == "POST":
        form = PlanForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Plan created.")
            return redirect("plans")
    else:
        form = PlanForm()
    return render(request, "core/object_form.html", {"form": form, "title": "Create plan", "cancel_url": "plans"})


@login_required
def invoices_page(request):
    mark_overdue_invoices()
    invoices = visible_invoices(request.user).select_related("subscription__customer", "subscription__plan").prefetch_related("payments")
    search = request.GET.get("search", "").strip()
    status = request.GET.get("status", "")
    if search:
        invoices = invoices.filter(
            Q(invoice_number__icontains=search)
            | Q(subscription__customer__name__icontains=search)
            | Q(subscription__subscription_number__icontains=search)
        )
    if status:
        invoices = invoices.filter(status=status)
    all_invoices = visible_invoices(request.user)
    return render(request, "core/invoices.html", {
        "invoices": _paginate(request, invoices.order_by("-issue_date")),
        "total_invoices": all_invoices.count(),
        "paid_invoices": all_invoices.filter(status="Paid").count(),
        "unpaid_invoices": all_invoices.filter(status__in=["Draft", "Confirmed"]).count(),
        "overdue_invoices": all_invoices.filter(status="Overdue").count(),
        "statuses": Invoice.STATUS_CHOICES,
        "selected_status": status,
        "search": search,
        "staff_user": is_staff_member(request.user),
    })


@require_POST
@staff_required
def invoice_create(request, pk):
    subscription = get_object_or_404(Subscription.objects.select_related("plan"), pk=pk)
    if subscription.status != "Active":
        messages.error(request, "Invoices can be generated only for active subscriptions.")
        return redirect("subscriptions")
    invoice, created = create_invoice(subscription)
    if invoice is None:
        messages.info(request, "The next billing period has not started yet.")
        return redirect("subscriptions")
    messages.success(request, "Invoice generated." if created else f"This billing period is already invoiced ({invoice.invoice_number}).")
    return redirect("invoice_detail", pk=invoice.pk)


@login_required
def invoice_detail(request, pk):
    invoice = get_object_or_404(
        visible_invoices(request.user).select_related("subscription__customer", "subscription__plan").prefetch_related("lines", "payments"),
        pk=pk,
    )
    return render(request, "core/invoice_detail.html", {
        "invoice": invoice,
        "staff_user": is_staff_member(request.user),
        "payment_form": PaymentForm(initial={"paid_on": timezone.localdate()}),
    })


@require_POST
@staff_required
def invoice_action(request, pk, action):
    invoice = get_object_or_404(Invoice, pk=pk)
    if action == "confirm" and invoice.status == "Draft":
        invoice.status = "Confirmed"
        invoice.save(update_fields=["status"])
        messages.success(request, "Invoice confirmed.")
    elif action == "cancel" and invoice.status in {"Draft", "Confirmed", "Overdue"} and not invoice.payments.exists():
        invoice.status = "Cancelled"
        invoice.save(update_fields=["status"])
        messages.success(request, "Invoice cancelled.")
    elif action == "send" and invoice.status not in {"Draft", "Cancelled"}:
        customer = invoice.subscription.customer
        send_mail(
            subject=f"Brightloop invoice {invoice.invoice_number}",
            message=(
                f"Hello {customer.name},\n\nYour invoice {invoice.invoice_number} for "
                f"{invoice.total_amount:.2f} is due on {invoice.due_date:%d %b %Y}. "
                f"Please sign in to your Brightloop portal to review the invoice.\n"
            ),
            from_email=None,
            recipient_list=[customer.email],
            fail_silently=False,
        )
        messages.success(request, f"Invoice sent to {customer.email}.")
    else:
        messages.warning(request, "That action is not available for this invoice.")
    return redirect("invoice_detail", pk=invoice.pk)


@require_POST
@staff_required
def payment_create(request, pk):
    invoice = get_object_or_404(Invoice, pk=pk)
    form = PaymentForm(request.POST)
    if form.is_valid():
        try:
            record_payment(invoice, **form.cleaned_data)
            messages.success(request, "Payment recorded.")
        except ValueError as exc:
            messages.error(request, str(exc))
    else:
        messages.error(request, "Please correct the payment details and try again.")
    return redirect("invoice_detail", pk=invoice.pk)


@login_required
def payment_list(request):
    payments = Payment.objects.select_related("invoice__subscription__customer")
    if not is_staff_member(request.user):
        customer = customer_for(request.user)
        payments = payments.filter(invoice__subscription__customer=customer) if customer else payments.none()
    search = request.GET.get("search", "").strip()
    if search:
        payments = payments.filter(Q(payment_number__icontains=search) | Q(invoice__invoice_number__icontains=search) | Q(invoice__subscription__customer__name__icontains=search))
    return render(request, "core/payments.html", {"payments": _paginate(request, payments), "search": search, "staff_user": is_staff_member(request.user)})


def signup(request):
    if request.user.is_authenticated:
        return redirect("home")
    if request.method == "POST":
        form = SignupForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "Your customer account is ready.")
            return redirect("home")
    else:
        form = SignupForm()
    return render(request, "registration/signup.html", {"form": form})
