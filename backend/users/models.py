from django.contrib.auth.models import AbstractUser
from django.db import models

class UserRoles(models.TextChoices):
    ADMINISTRADOR = 'ADMINISTRADOR', 'Administrador'
    TECNICO = 'TECNICO', 'Técnico'
    CLIENTE = 'CLIENTE', 'Cliente'

class User(AbstractUser):
    rol = models.CharField(
        max_length=20,
        choices=UserRoles.choices,
        default=UserRoles.CLIENTE,
        verbose_name="Rol"
    )

    def __str__(self):
        return f"{self.username} ({self.get_rol_display()})"
