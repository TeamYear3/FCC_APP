import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class UsuarioManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("El email es obligatorio")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("rol", "admin")
        
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser debe tener is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser debe tener is_superuser=True.")
            
        return self.create_user(email, password, **extra_fields)

class Usuario(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    nombre = models.CharField(max_length=150)
    apellido = models.CharField(max_length=150)
    password = models.CharField(max_length=128, db_column="password_hash", null=True, blank=True)
    rol = models.CharField(
        max_length=20,
        choices=[
            ("admin", "Administrador"),
            ("tecnico", "Técnico"),
            ("cliente", "Cliente"),
        ],
        default="cliente",
    )
    active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    objects = UsuarioManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nombre", "apellido"]

    def __str__(self):
        return f"{self.email} ({self.rol})"

    @property
    def is_active(self):
        return self.active

    @is_active.setter
    def is_active(self, value):
        self.active = value


class PasswordResetToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="password_reset_tokens")
    token = models.CharField(max_length=128, unique=True, db_index=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    expira_en = models.DateTimeField()
    usado = models.BooleanField(default=False)
    usado_en = models.DateTimeField(null=True, blank=True)

    @classmethod
    def generar_token(cls, usuario, duracion_horas=1):
        import secrets
        from datetime import timedelta
        from django.utils import timezone
        
        token_str = secrets.token_urlsafe(32)
        expira_en = timezone.now() + timedelta(hours=duracion_horas)
        return cls.objects.create(
            usuario=usuario,
            token=token_str,
            expira_en=expira_en
        )

    def is_valid(self):
        from django.utils import timezone
        return not self.usado and timezone.now() <= self.expira_en

    def consumir(self):
        from django.utils import timezone
        self.usado = True
        self.usado_en = timezone.now()
        self.save()

    def __str__(self):
        return f"Token reset para {self.usuario.email} (válido={self.is_valid()})"

