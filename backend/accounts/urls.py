from django.urls import path

from accounts.views import LoginView, MeView, RefreshView

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("users/me/", MeView.as_view(), name="users-me"),
]
