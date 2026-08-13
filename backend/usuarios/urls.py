from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    GoogleAuthView,
    LogoutView,
    DevLoginView,
    LoginView,
    RegistroView,
    PasswordResetView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path("auth/google/", GoogleAuthView.as_view(), name="google-auth"),
    path("auth/dev-login/", DevLoginView.as_view(), name="dev-login"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/registro/", RegistroView.as_view(), name="registro"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/password-reset/", PasswordResetView.as_view(), name="password-reset"),
    path("auth/password-reset-confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]

