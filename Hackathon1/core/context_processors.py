def user_role(request):
    user = request.user
    staff_user = user.is_authenticated and (
        user.is_superuser or user.groups.filter(name="Staff").exists()
    )
    return {"staff_user": staff_user}
