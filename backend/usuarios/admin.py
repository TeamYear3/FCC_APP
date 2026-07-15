from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Usuario

class UsuarioAdmin(BaseUserAdmin):
    # La visualización en el listado de usuarios
    list_display = ("email", "nombre", "apellido", "rol", "active", "is_staff")
    list_filter = ("rol", "active", "is_staff", "is_superuser")
    
    # Búsqueda por email y nombres
    search_fields = ("email", "nombre", "apellido")
    ordering = ("email",)

    # Definir los fieldsets para la visualización del formulario en el panel
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Información Personal", {"fields": ("nombre", "apellido")}),
        ("Roles y Permisos", {"fields": ("rol", "active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas de Auditoría", {"fields": ("creado_en", "actualizado_en")}),
    )
    
    # Definir los campos de solo lectura
    readonly_fields = ("creado_en", "actualizado_en")

    # Campos requeridos al crear un usuario en el admin
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "nombre", "apellido", "password", "rol", "active", "is_staff", "is_superuser"),
        }),
    )

admin.site.register(Usuario, UsuarioAdmin)
