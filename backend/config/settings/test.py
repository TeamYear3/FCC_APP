import os
from .base import *

DEBUG = True
SECRET_KEY = "test-secret-key-for-unit-testing"

# Usar SQLite en memoria para la suite de pruebas cuando no hay PostgreSQL local corriendo
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

TESTING = True

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
