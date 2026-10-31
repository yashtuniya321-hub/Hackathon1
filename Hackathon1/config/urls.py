from django.contrib import admin
from django.urls import include, path

from core import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/signup/", views.signup, name="signup"),
    path("accounts/", include("django.contrib.auth.urls")),
    path("", views.home, name="home"),
    path("subscriptions/", views.subscriptions_page, name="subscriptions"),
    path("subscriptions/new/", views.subscription_create, name="subscription_create"),
    path("subscriptions/<int:pk>/edit/", views.subscription_edit, name="subscription_edit"),
    path("subscriptions/<int:pk>/actions/<str:action>/", views.subscription_action, name="subscription_action"),
    path("customers/", views.customers_page, name="customers"),
    path("customers/new/", views.customer_create, name="customer_create"),
    path("products/", views.products_page, name="products"),
    path("products/new/", views.product_create, name="product_create"),
    path("plans/", views.plans_page, name="plans"),
    path("plans/new/", views.plan_create, name="plan_create"),
    path("invoices/", views.invoices_page, name="invoices"),
    path("invoices/create/<int:pk>/", views.invoice_create, name="invoice_create"),
    path("invoices/<int:pk>/", views.invoice_detail, name="invoice_detail"),
    path("invoices/<int:pk>/actions/<str:action>/", views.invoice_action, name="invoice_action"),
    path("invoices/<int:pk>/payments/new/", views.payment_create, name="payment_create"),
    path("payments/", views.payment_list, name="payments"),
]
