from django.contrib import admin

from .models import (
    Customer, DiscountRule, Invoice, InvoiceLine, Payment, Plan, Product,
    ProductVariant, QuoteTemplate, QuoteTemplateLine, Subscription,
    SubscriptionLine, TaxRule,
)


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


class QuoteTemplateLineInline(admin.TabularInline):
    model = QuoteTemplateLine
    extra = 1


class SubscriptionLineInline(admin.TabularInline):
    model = SubscriptionLine
    extra = 0


class InvoiceLineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 0
    readonly_fields = ["description", "quantity", "unit_price", "discount_amount", "tax_rate", "tax_amount", "line_total"]
    can_delete = False


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["name", "company_name", "email", "user", "created_at"]
    search_fields = ["name", "company_name", "email"]
    readonly_fields = ["created_at"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "product_type", "sale_price", "cost_price", "is_active"]
    list_filter = ["product_type", "is_active"]
    search_fields = ["name", "description", "notes"]
    inlines = [ProductVariantInline]


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ["name", "price", "billing_cycle", "minimum_quantity", "is_active", "auto_close"]
    list_filter = ["billing_cycle", "is_active", "auto_close"]
    search_fields = ["name", "description"]


@admin.register(TaxRule)
class TaxRuleAdmin(admin.ModelAdmin):
    list_display = ["name", "rate", "is_default", "is_active"]
    list_filter = ["is_default", "is_active"]
    search_fields = ["name"]


@admin.register(DiscountRule)
class DiscountRuleAdmin(admin.ModelAdmin):
    list_display = ["name", "discount_type", "amount", "applies_to", "times_used", "max_uses", "is_active"]
    list_filter = ["discount_type", "applies_to", "is_active"]
    search_fields = ["name"]
    filter_horizontal = ["products"]
    readonly_fields = ["times_used"]


@admin.register(QuoteTemplate)
class QuoteTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "plan", "validity_days", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "plan__name"]
    inlines = [QuoteTemplateLineInline]


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["subscription_number", "customer", "plan", "status", "start_date", "expiry_date"]
    list_filter = ["status", "plan__billing_cycle"]
    search_fields = ["subscription_number", "customer__name", "customer__email", "plan__name"]
    readonly_fields = ["subscription_number", "created_at", "updated_at"]
    inlines = [SubscriptionLineInline]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "subscription", "period_start", "period_end", "due_date", "total_amount", "status"]
    list_filter = ["status", "issue_date"]
    search_fields = ["invoice_number", "subscription__subscription_number", "subscription__customer__name"]
    readonly_fields = ["invoice_number", "issue_date", "created_at", "subtotal", "discount_amount", "tax_amount", "total_amount"]
    inlines = [InvoiceLineInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["payment_number", "invoice", "method", "amount", "paid_on"]
    list_filter = ["method", "paid_on"]
    search_fields = ["payment_number", "invoice__invoice_number", "invoice__subscription__customer__name"]
    readonly_fields = ["payment_number", "created_at"]


admin.site.site_header = "Brightloop administration"
admin.site.site_title = "Brightloop"
admin.site.index_title = "Subscription operations"
