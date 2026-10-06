import os
from pathlib import Path

# BASE_DIR apunta a la raíz del proyecto (FccApp/)
# __file__ es config/settings/base.py, por lo que retrocedemos 3 niveles.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Cargar variables de entorno desde la raíz (FCC_APP/.env) o backend (.env)
try:
    from dotenv import load_dotenv
    env_file = BASE_DIR.parent / ".env"
    if not env_file.exists():
        env_file = BASE_DIR / ".env"
    load_dotenv(dotenv_path=env_file)
except ImportError:
    pass

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-fcc-app-default-key-2026-change-me")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party apps
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    # Local apps
    "usuarios",
    "clientes",
    "vehiculos",
    "ordenes",
    "facturacion",
    "turnos",
    "taller",
]

try:
    import daphne
    INSTALLED_APPS.insert(0, "daphne")
except ImportError:
    pass

try:
    import channels
    INSTALLED_APPS.append("channels")
except ImportError:
    pass


ASGI_APPLICATION = "config.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}


PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "es-ar"
TIME_ZONE = "America/Argentina/Buenos_Aires"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom User Model
AUTH_USER_MODEL = "usuarios.Usuario"

# REST Framework Config
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}

# SimpleJWT Settings - Políticas de Sesión y Expiración para Operatividad en Taller
# - Access Token: 30 minutos (balance óptimo entre seguridad y uso continuo sin desconexiones)
# - Refresh Token: 1 día con rotación obligatoria y lista negra inmediata (TK131/TK132/TK134)
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

# Google OAuth Config
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("GOOGLE_OAUTH_CLIENT_ID") or ""
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET") or os.getenv("GOOGLE_OAUTH_CLIENT_SECRET") or ""

# Email / SMTP Configuration
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "sandbox.smtp.mailtrap.io")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "2525"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "FCC App <noreply@fccapp.com>")

# Client Portal Configuration (Frontend URL)
CLIENT_PORTAL_URL = os.getenv("CLIENT_PORTAL_URL", "https://fccapp.com")

# Password Reset Token Timeout (1 hour in seconds)
PASSWORD_RESET_TIMEOUT = 3600

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "fcc_app")

# Cache Configuration (TK185)
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": f"redis://{REDIS_HOST}:{REDIS_PORT}/1",
        "TIMEOUT": 300,  # 5 minutos TTL por defecto
    }
}


