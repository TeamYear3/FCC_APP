import os
from .base import *

DEBUG = False

# Carga la clave secreta dinámicamente desde variables de entorno (.env) o fallback heredado
SECRET_KEY = os.getenv("SECRET_KEY", SECRET_KEY)

# Usar SQLite en memoria para la suite de pruebas cuando no hay PostgreSQL local corriendo
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
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

