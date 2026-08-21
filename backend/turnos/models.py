import uuid
from django.db import models
from clientes.models import Cliente
from vehiculos.models import Vehiculo

class Turno(models.Model):
    ESTADO_CHOICES = [
        ("pendiente", "Pendiente"),
        ("completado", "Completado"),
        ("cancelado", "Cancelado"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name="turnos"
    )
    vehiculo = models.ForeignKey(
        Vehiculo,
        on_delete=models.CASCADE,
        related_name="turnos"
    )
    fecha_hora = models.DateTimeField()
    motivo = models.CharField(max_length=255)
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default="pendiente"
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["fecha_hora"]

    def __str__(self):
        return f"Turno {self.fecha_hora} - {self.cliente} ({self.estado})"
