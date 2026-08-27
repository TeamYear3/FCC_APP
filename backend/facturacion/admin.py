from django.contrib import admin
from .models import Factura


@admin.register(Factura)
class FacturaAdmin(admin.ModelAdmin):
    list_display = (
        "numero_comprobante_formateado",
        "cae",
        "fecha_vencimiento_cae",
        "total",
        "estado",
        "estado_pago",
        "fecha_emision",
    )
    list_filter = ("tipo_comprobante", "estado", "estado_pago", "punto_venta")
    search_fields = ("cae", "numero_factura", "orden_trabajo__numero_ot", "orden_trabajo__vehiculo__patente")
    readonly_fields = ("id", "cae", "fecha_vencimiento_cae", "fecha_emision")
