import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from vehiculos.models import Vehiculo


class EstadoOrden(models.TextChoices):
    INGRESADO = 'ingresado', 'Ingresado'
    EN_PRESUPUESTO = 'en_presupuesto', 'En Presupuesto'
    APROBADO = 'aprobado', 'Aprobado'
    RECHAZADO = 'rechazado', 'Rechazado'
    EN_PROCESO = 'en_proceso', 'En Proceso'
    FINALIZADO = 'finalizado', 'Finalizado'
    ENTREGADO = 'entregado', 'Entregado'

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
    turno = models.ForeignKey(
        'turnos.Turno',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordenes_trabajo"
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
    monto_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    aprobado_por_cliente = models.BooleanField(default=False)
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

    def transicionar_a(self, nuevo_estado, usuario=None, comentario=""):
        estado_anterior = self.estado
        if estado_anterior == nuevo_estado:
            return

        # Validaciones de transiciones permitidas
        transiciones_validas = {
            EstadoOrden.INGRESADO: [EstadoOrden.EN_PRESUPUESTO],
            EstadoOrden.EN_PRESUPUESTO: [EstadoOrden.APROBADO, EstadoOrden.RECHAZADO],
            EstadoOrden.APROBADO: [EstadoOrden.EN_PROCESO],
            EstadoOrden.RECHAZADO: [EstadoOrden.EN_PRESUPUESTO],
            EstadoOrden.EN_PROCESO: [EstadoOrden.FINALIZADO],
            EstadoOrden.FINALIZADO: [EstadoOrden.ENTREGADO],
            EstadoOrden.ENTREGADO: []
        }

        permitidos = transiciones_validas.get(estado_anterior, [])
        if nuevo_estado not in permitidos:
            raise ValidationError(
                f"No se permite transicionar del estado '{self.get_estado_display()}' al estado '{nuevo_estado}'."
            )

        # Validaciones adicionales para transicionar a EN_PROCESO
        if nuevo_estado == EstadoOrden.EN_PROCESO:
            if not self.turno:
                raise ValidationError("La orden de trabajo debe tener un turno asociado para iniciar el proceso.")
            if self.turno.estado == "cancelado":
                raise ValidationError("El turno asociado a la orden de trabajo está cancelado.")
            if not self.aprobado_por_cliente:
                raise ValidationError("Se requiere la aprobación explícita del cliente para iniciar el proceso.")
            if not self.items_presupuesto.exists():
                raise ValidationError("No se puede iniciar el proceso sin ítems en el presupuesto.")

        # Guardar cambio de estado
        self.estado = nuevo_estado
        self.save(update_fields=['estado', 'actualizado_en'])

        # Registrar historial
        HistorialEstadoOrden.objects.create(
            orden_trabajo=self,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            usuario=usuario,
            comentario=comentario
        )


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
    completado = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        subtotal = Decimal(str(self.cantidad)) * Decimal(str(self.precio_unitario))
        self.subtotal = subtotal.quantize(Decimal('0.01'))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_tipo_display()}: {self.descripcion} (${self.subtotal:.2f})"


class HistorialEstadoOrden(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    orden_trabajo = models.ForeignKey(
        OrdenTrabajo,
        on_delete=models.CASCADE,
        related_name="historial_estados"
    )
    estado_anterior = models.CharField(
        max_length=20,
        choices=EstadoOrden.choices,
        null=True,
        blank=True
    )
    estado_nuevo = models.CharField(
        max_length=20,
        choices=EstadoOrden.choices
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="historiales_ordenes_creadas"
    )
    comentario = models.TextField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'Historial de Estado de Orden'
        verbose_name_plural = 'Historiales de Estados de Orden'

    def __str__(self):
        return f"{self.orden_trabajo.numero_ot}: {self.estado_anterior} -> {self.estado_nuevo}"


class AdjuntoDiagnostico(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    orden_trabajo = models.ForeignKey(
        OrdenTrabajo,
        on_delete=models.CASCADE,
        related_name="adjuntos_diagnostico"
    )
    url_secure = models.URLField(max_length=500)
    public_id = models.CharField(max_length=255, blank=True, null=True)
    nombre_archivo = models.CharField(max_length=255)
    tamanio = models.IntegerField(default=0)
    mime_type = models.CharField(max_length=100, default='image/jpeg')
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="adjuntos_diagnostico_creados"
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'Adjunto de Diagnóstico'
        verbose_name_plural = 'Adjuntos de Diagnóstico'

    def __str__(self):
        return f"Adjunto {self.nombre_archivo} ({self.orden_trabajo.numero_ot})"




