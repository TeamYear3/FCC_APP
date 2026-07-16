from django.contrib import admin
from .models import OrdenTrabajo

@admin.register(OrdenTrabajo)
class OrdenTrabajoAdmin(admin.ModelAdmin):
    list_display = ("numero_ot", "vehiculo", "tecnico", "estado", "fecha_ingreso", "fecha_entrega", "creado_en")
    list_filter = ("estado", "fecha_ingreso")
    search_fields = ("numero_ot", "vehiculo__patente", "tecnico__email", "descripcion_problema")
