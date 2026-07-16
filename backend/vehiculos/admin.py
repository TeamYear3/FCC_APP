from django.contrib import admin
from .models import Vehiculo

@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = ("id", "patente", "marca", "modelo", "anio", "kilometraje", "color", "cliente", "creado_en")
    search_fields = ("patente", "marca", "modelo", "cliente__nombre", "cliente__apellido")
