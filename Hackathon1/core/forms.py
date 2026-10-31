from django import forms
from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError
from django.db import transaction
from django.forms import inlineformset_factory

from .models import (
    Customer, DiscountRule, Plan, Product, ProductVariant, QuoteTemplate,
    Payment, Subscription, SubscriptionLine, TaxRule,
)

User = get_user_model()


class SignupForm(forms.Form):
    name = forms.CharField(max_length=200, label="Your name")
    company_name = forms.CharField(max_length=200, required=False, label="Company (optional)")
    email = forms.EmailField()
    password1 = forms.CharField(widget=forms.PasswordInput, label="Password")
    password2 = forms.CharField(widget=forms.PasswordInput, label="Confirm password")

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError("An account already exists with this email address.")
        existing_customer = Customer.objects.filter(email__iexact=email).first()
        if existing_customer and existing_customer.user_id:
            raise ValidationError("An account already exists with this email address.")
        if User.objects.filter(username__iexact=email).exists():
            raise ValidationError("This email address is already in use.")
        return email

    def clean(self):
        cleaned = super().clean()
        password1 = cleaned.get("password1")
        password2 = cleaned.get("password2")
        if password1 and password2 and password1 != password2:
            self.add_error("password2", "The passwords do not match.")
        if password1:
            candidate = User(username=cleaned.get("email", ""), email=cleaned.get("email", ""))
            try:
                password_validation.validate_password(password1, candidate)
            except ValidationError as exc:
                self.add_error("password1", exc)
        return cleaned

    @transaction.atomic
    def save(self):
        user = User.objects.create_user(
            username=self.cleaned_data["email"],
            email=self.cleaned_data["email"],
            password=self.cleaned_data["password1"],
            first_name=self.cleaned_data["name"],
        )
        customer = Customer.objects.filter(email__iexact=self.cleaned_data["email"], user__isnull=True).first()
        if customer:
            customer.user = user
            customer.name = self.cleaned_data["name"]
            customer.company_name = self.cleaned_data["company_name"]
            customer.save(update_fields=["user", "name", "company_name"])
        else:
            Customer.objects.create(
                user=user,
                name=self.cleaned_data["name"],
                company_name=self.cleaned_data["company_name"],
                email=self.cleaned_data["email"],
            )
        return user


class CustomerForm(forms.ModelForm):
    class Meta:
        model = Customer
        fields = ["name", "company_name", "email", "phone", "address"]
        widgets = {"address": forms.Textarea(attrs={"rows": 3})}


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ["name", "product_type", "description", "notes", "sale_price", "cost_price", "is_active"]
        widgets = {"description": forms.Textarea(attrs={"rows": 3}), "notes": forms.Textarea(attrs={"rows": 3})}


class PlanForm(forms.ModelForm):
    class Meta:
        model = Plan
        fields = [
            "name", "description", "price", "billing_cycle", "minimum_quantity",
            "available_from", "available_until", "payment_due_days", "auto_close", "is_active",
        ]
        widgets = {
            "description": forms.Textarea(attrs={"rows": 3}),
            "available_from": forms.DateInput(attrs={"type": "date"}),
            "available_until": forms.DateInput(attrs={"type": "date"}),
        }

    def clean(self):
        cleaned = super().clean()
        start, end = cleaned.get("available_from"), cleaned.get("available_until")
        if start and end and end < start:
            self.add_error("available_until", "The end date must be on or after the start date.")
        return cleaned


class SubscriptionForm(forms.ModelForm):
    class Meta:
        model = Subscription
        fields = [
            "customer", "plan", "quote_template", "quantity", "start_date", "expiry_date",
            "quote_valid_until", "payment_terms", "discount_rule", "status",
        ]
        widgets = {
            "start_date": forms.DateInput(attrs={"type": "date"}),
            "expiry_date": forms.DateInput(attrs={"type": "date"}),
            "quote_valid_until": forms.DateInput(attrs={"type": "date"}),
            "payment_terms": forms.TextInput(attrs={"placeholder": "Due within 30 days"}),
        }

    def __init__(self, *args, customer=None, staff=False, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["customer"].queryset = Customer.objects.order_by("name")
        self.fields["plan"].queryset = Plan.objects.filter(is_active=True).order_by("name")
        self.fields["quote_template"].queryset = QuoteTemplate.objects.filter(is_active=True).select_related("plan")
        self.fields["discount_rule"].queryset = DiscountRule.objects.filter(is_active=True)
        self.fields["discount_rule"].required = False
        self.fields["quote_template"].required = False
        if customer:
            self.fields.pop("customer")
            self.customer = customer
        else:
            self.customer = None
        if not staff:
            for name in ("status", "quote_template", "discount_rule", "quote_valid_until", "payment_terms"):
                self.fields.pop(name)

    def clean(self):
        cleaned = super().clean()
        plan = cleaned.get("plan")
        qty = cleaned.get("quantity")
        start, expiry = cleaned.get("start_date"), cleaned.get("expiry_date")
        if plan and qty is not None and qty < plan.minimum_quantity:
            self.add_error("quantity", f"This plan requires at least {plan.minimum_quantity} units.")
        if plan and start:
            if plan.available_from and start < plan.available_from:
                self.add_error("start_date", "This plan is not available yet.")
            if plan.available_until and start > plan.available_until:
                self.add_error("start_date", "This plan is no longer available.")
        if start and expiry and expiry < start:
            self.add_error("expiry_date", "Expiry date cannot be before the start date.")
        if not self.fields.get("status"):
            cleaned["status"] = "Quotation"
        if self.customer:
            cleaned["customer"] = self.customer
        return cleaned

    def save(self, commit=True):
        instance = super().save(commit=False)
        if self.customer:
            instance.customer = self.customer
            instance.status = "Quotation"
        if commit:
            instance.save()
            self.save_m2m()
        return instance


class SubscriptionLineForm(forms.ModelForm):
    class Meta:
        model = SubscriptionLine
        fields = ["product", "variant", "quantity", "unit_price", "tax_rule"]
        widgets = {"unit_price": forms.NumberInput(attrs={"step": "0.01", "min": "0"})}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["product"].queryset = Product.objects.filter(is_active=True).order_by("name")
        self.fields["variant"].queryset = ProductVariant.objects.filter(is_active=True).select_related("product")
        self.fields["variant"].required = False
        self.fields["tax_rule"].queryset = TaxRule.objects.filter(is_active=True)
        self.fields["tax_rule"].required = False
        self.fields["unit_price"].required = False

    def clean(self):
        cleaned = super().clean()
        product, variant = cleaned.get("product"), cleaned.get("variant")
        if variant and product and variant.product_id != product.id:
            self.add_error("variant", "Choose a variant belonging to the selected product.")
        if product and cleaned.get("unit_price") is None:
            cleaned["unit_price"] = variant.unit_price if variant else product.sale_price
        return cleaned


SubscriptionLineFormSet = inlineformset_factory(
    Subscription,
    SubscriptionLine,
    form=SubscriptionLineForm,
    extra=1,
    can_delete=True,
)


class PaymentForm(forms.Form):
    method = forms.ChoiceField(choices=Payment.METHODS)
    amount = forms.DecimalField(min_value=0.01, max_digits=12, decimal_places=2)
    paid_on = forms.DateField(widget=forms.DateInput(attrs={"type": "date"}))
    note = forms.CharField(required=False, max_length=240)
