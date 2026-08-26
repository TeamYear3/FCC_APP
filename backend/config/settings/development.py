import os
from .base import *

DEBUG = True

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

# Permite usar SQLite local si no se especifica PostgreSQL
if os.getenv("USE_POSTGRES", "false").lower() == "true":
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
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# Consola como backend de email en desarrollo para evitar errores de envío SMTP
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

