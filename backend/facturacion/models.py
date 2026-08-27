import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone


class TipoComprobante(models.TextChoices):
    FACTURA_A = "A", "Factura A (Responsable Inscripto)"
    FACTURA_B = "B", "Factura B (Consumidor Final / Exento)"
    FACTURA_C = "C", "Factura C (Monotributo)"


class EstadoFactura(models.TextChoices):
    EMITIDA = "emitida", "Emitida"
    ANULADA = "anulada", "Anulada"


class EstadoPago(models.TextChoices):
    SIN_INTERACCION = "sin_interaccion", "Sin Interacción"
    PAGADA = "pagada", "Pagada"
    A_VENCER = "a_vencer", "A Vencer"
    VENCIDA = "vencida", "Vencida"


class Factura(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    orden_trabajo = models.OneToOneField(
        "ordenes.OrdenTrabajo",
        on_delete=models.CASCADE,
        related_name="factura"
    )
    tipo_comprobante = models.CharField(
        max_length=2,
        choices=TipoComprobante.choices,
        default=TipoComprobante.FACTURA_B
    )
    punto_venta = models.PositiveIntegerField(default=1)
    numero_factura = models.PositiveIntegerField()
    cae = models.CharField(max_length=14, db_index=True)
    fecha_vencimiento_cae = models.DateField()
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    estado = models.CharField(
        max_length=20,
        choices=EstadoFactura.choices,
        default=EstadoFactura.EMITIDA
    )
    estado_pago = models.CharField(
        max_length=20,
        choices=EstadoPago.choices,
        default=EstadoPago.SIN_INTERACCION
    )
    fecha_emision = models.DateTimeField(auto_now_add=True)
    fecha_vencimiento_pago = models.DateField(null=True, blank=True)
    cuit_emisor = models.CharField(max_length=20, default="30-71829384-9")
    observaciones = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Factura"
        verbose_name_plural = "Facturas"
        ordering = ["-fecha_emision"]
        unique_together = ("tipo_comprobante", "punto_venta", "numero_factura")

    @property
    def numero_comprobante_formateado(self):
        return f"{self.tipo_comprobante}-{str(self.punto_venta).zfill(4)}-{str(self.numero_factura).zfill(8)}"

    @property
    def semaforo_color(self):
        """
        Retorna la clave de semaforización según el estado de interacción y vencimiento:
        - 'pagada': verde claro
        - 'vencida': rojo
        - 'a_vencer': verde
        - 'sin_interaccion': gris
        """
        if self.estado == EstadoFactura.ANULADA:
            return "sin_interaccion"
        if self.estado_pago == EstadoPago.PAGADA:
            return "pagada"
        
        if self.fecha_vencimiento_pago:
            hoy = timezone.localdate()
            if hoy > self.fecha_vencimiento_pago:
                return "vencida"
            return "a_vencer"
        
        return self.estado_pago or "sin_interaccion"

    def __str__(self):
        return f"{self.numero_comprobante_formateado} - CAE: {self.cae} (${self.total})"
