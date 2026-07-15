from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Agregar 'rol' al listado principal en el Admin
    list_display = UserAdmin.list_display + ('rol',)
    
    # Agregar 'rol' a los filtros
    list_filter = UserAdmin.list_filter + ('rol',)
    
    # Agregar 'rol' a los campos editables del usuario
    fieldsets = UserAdmin.fieldsets + (
        ('Información de Rol', {'fields': ('rol',)}),
    )
    
    # Agregar 'rol' al formulario de creación
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Información de Rol', {'fields': ('rol',)}),
    )
