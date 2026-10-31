import re

from django.core.exceptions import ValidationError


class StrongPasswordValidator:
    """Require a long password with mixed case and a non-alphanumeric character."""

    def validate(self, password, user=None):
        errors = []
        if len(password) <= 8:
            errors.append("Password must be more than eight characters long.")
        if not re.search(r"[A-Z]", password):
            errors.append("Password must include an uppercase letter.")
        if not re.search(r"[a-z]", password):
            errors.append("Password must include a lowercase letter.")
        if not re.search(r"[^A-Za-z0-9]", password):
            errors.append("Password must include a special character.")
        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return "Use more than eight characters, including upper and lower case letters and a special character."
