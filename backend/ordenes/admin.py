from django.contrib import admin
from .models import OrdenTrabajo, ItemPresupuesto

@admin.register(OrdenTrabajo)
class OrdenTrabajoAdmin(admin.ModelAdmin):
    list_display = ("numero_ot", "vehiculo", "tecnico", "estado", "fecha_ingreso", "fecha_entrega", "creado_en")
    list_filter = ("estado", "fecha_ingreso")
    search_fields = ("numero_ot", "vehiculo__patente", "tecnico__email", "descripcion_problema")

@admin.register(ItemPresupuesto)
class ItemPresupuestoAdmin(admin.ModelAdmin):
    list_display = ("descripcion", "orden_trabajo", "tipo", "cantidad", "precio_unitario", "subtotal", "creado_en")
    list_filter = ("tipo", "creado_en")
    search_fields = ("descripcion", "orden_trabajo__numero_ot")

