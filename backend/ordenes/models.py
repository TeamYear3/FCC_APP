import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from vehiculos.models import Vehiculo

class EstadoOrden(models.TextChoices):
    INGRESADO = 'ingresado', 'Ingresado'
    EN_PRESUPUESTO = 'en_presupuesto', 'En Presupuesto'
    APROBADO = 'aprobado', 'Aprobado'
    RECHAZADO = 'rechazado', 'Rechazado'
    EN_PROCESO = 'en_proceso', 'En Proceso'
    FINALIZADO = 'finalizado', 'Finalizado'

class OrdenTrabajo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.PROTECT, related_name="ordenes")
    tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'rol': 'tecnico'},
        related_name="ordenes_asignadas"
    )
    numero_ot = models.CharField(max_length=50, unique=True, blank=True)
    estado = models.CharField(
        max_length=20,
        choices=EstadoOrden.choices,
        default=EstadoOrden.INGRESADO
    )
    descripcion_problema = models.TextField()
    fecha_ingreso = models.DateField(default=timezone.now)
    fecha_entrega = models.DateField(null=True, blank=True)
    comentario_rechazo = models.TextField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.numero_ot:
            last_ot = OrdenTrabajo.objects.all().order_by('creado_en', 'id').last()
            if not last_ot:
                self.numero_ot = 'OT-0001'
            else:
                try:
                    last_num = int(last_ot.numero_ot.replace('OT-', ''))
                    self.numero_ot = f'OT-{(last_num + 1):04d}'
                except (ValueError, TypeError, AttributeError):
                    import random
                    self.numero_ot = f'OT-{random.randint(1000, 9999)}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.numero_ot} - {self.vehiculo.patente} ({self.get_estado_display()})"


class TipoItem(models.TextChoices):
    MANO_DE_OBRA = 'mano_de_obra', 'Mano de Obra'
    REPUESTO = 'repuesto', 'Repuesto'


class ItemPresupuesto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    orden_trabajo = models.ForeignKey(
        OrdenTrabajo,
        on_delete=models.CASCADE,
        related_name="items_presupuesto"
    )
    tipo = models.CharField(
        max_length=20,
        choices=TipoItem.choices,
        default=TipoItem.REPUESTO
    )
    descripcion = models.CharField(max_length=255)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.subtotal = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_tipo_display()}: {self.descripcion} (${self.subtotal})"

