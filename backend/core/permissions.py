from rest_framework.permissions import BasePermission

class EsAdministrador(BasePermission):
    message = "No tiene permisos para realizar esta acción."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'rol', None) == 'admin')

class EsTecnico(BasePermission):
    message = "No tiene permisos para realizar esta acción."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'rol', None) == 'tecnico')

class EsCliente(BasePermission):
    message = "No tiene permisos para realizar esta acción."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'rol', None) == 'cliente')

    def has_object_permission(self, request, view, obj):
        # Si el objeto tiene un atributo 'cliente', verificar si coincide con el usuario
        if hasattr(obj, 'cliente'):
            return obj.cliente == request.user
        # Si el objeto es un cliente (el propio modelo Usuario)
        if obj == request.user:
            return True
        return False
