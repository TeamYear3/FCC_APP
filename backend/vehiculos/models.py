import uuid
from django.db import models
from clientes.models import Cliente

class Vehiculo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name="vehiculos")
    patente = models.CharField(max_length=20, unique=True)
    numero_chasis = models.CharField(max_length=50, unique=True, null=True, blank=True)
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    anio = models.PositiveIntegerField(null=True, blank=True)
    kilometraje = models.PositiveIntegerField(default=0)
    color = models.CharField(max_length=50, blank=True)
    foto_url = models.URLField(max_length=500, null=True, blank=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.patente})"

