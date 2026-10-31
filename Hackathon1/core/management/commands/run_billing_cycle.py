from django.core.management.base import BaseCommand

from core.services import close_expired_subscriptions, generate_due_invoices, mark_overdue_invoices


class Command(BaseCommand):
    help = "Generate invoices for due active subscriptions and refresh lifecycle statuses."

    def handle(self, *args, **options):
        generated = generate_due_invoices()
        closed = close_expired_subscriptions()
        overdue = mark_overdue_invoices()
        self.stdout.write(self.style.SUCCESS(
            f"Billing cycle complete: {generated} invoice(s) generated, "
            f"{overdue} invoice(s) marked overdue, {closed} subscription(s) closed."
        ))
