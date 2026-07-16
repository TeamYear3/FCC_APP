import uuid
from django.db import models
from django.conf import settings

class Cliente(models.Model):
    TIPO_DOCUMENTO_CHOICES = [
        ("DNI", "DNI"),
        ("CUIT", "CUIT"),
    ]

    CONDICION_IVA_CHOICES = [
        ("RI", "Responsable Inscripto"),
        ("MT", "Monotributista"),
        ("CF", "Consumidor Final"),
        ("EX", "Exento"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cliente_perfil"
    )
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    tipo_documento = models.CharField(
        max_length=10,
        choices=TIPO_DOCUMENTO_CHOICES,
        default="DNI"
    )
    dni_cuit = models.CharField(max_length=20, unique=True)
    condicion_iva = models.CharField(
        max_length=20,
        choices=CONDICION_IVA_CHOICES,
        default="CF"
    )
    telefono = models.CharField(max_length=50, blank=True)
    domicilio = models.CharField(max_length=255, blank=True)
    
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.tipo_documento}: {self.dni_cuit})"
