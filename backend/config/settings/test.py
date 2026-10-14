import os
from .base import *

DEBUG = False

# Carga la clave secreta dinámicamente desde variables de entorno (.env) o fallback heredado
SECRET_KEY = os.getenv("SECRET_KEY", SECRET_KEY)

# Base de datos de pruebas (TK222 / AUT-BE-06): siempre PostgreSQL.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_TEST_DB", os.getenv("POSTGRES_DB", "fcc_app_test")),
        "USER": os.getenv("POSTGRES_USER", "fcc_user"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "fcc_password"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "TEST": {
            "NAME": "test_fcc_app",
        },
    }
}

TESTING = True

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# MONGO_URI vacío en tests para activar el fallback seguro
MONGO_URI = ""

# Usar caché en memoria (LocMemCache) para aislar la suite de pruebas unitarias
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

