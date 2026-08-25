from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    GoogleAuthView,
    LogoutView,
    DevLoginView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path("auth/google/", GoogleAuthView.as_view(), name="google-auth"),
    path("auth/dev-login/", DevLoginView.as_view(), name="dev-login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/password-reset/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("auth/password-reset-confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]

