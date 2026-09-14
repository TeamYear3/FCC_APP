import os
from .base import *

DEBUG = True
# Hereda SECRET_KEY desde variables de entorno (.env) o desde base.py
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
