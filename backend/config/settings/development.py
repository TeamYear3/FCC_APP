import os
from .base import *

DEBUG = True

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "fcc_app"),
        "USER": os.getenv("POSTGRES_USER", "fcc_user"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "fcc_password"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

# Consola como backend de email en desarrollo para evitar errores de envío SMTP
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

