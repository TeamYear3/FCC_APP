from rest_framework.permissions import BasePermission, SAFE_METHODS

class EsAdministrador(BasePermission):
    message = "No tiene permisos para realizar esta acción."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'rol', None) == 'admin')

class EsTecnico(BasePermission):
    message = "No tiene permisos para realizar esta acción."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'rol', None) == 'tecnico')

class EsAdminOSoloLecturaTecnico(BasePermission):
    message = "No tiene permisos para modificar este recurso."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        rol = getattr(request.user, 'rol', None)
        if rol == 'admin':
            return True
        if rol == 'tecnico' and request.method in SAFE_METHODS:
            return True
        return False

class EsCliente(BasePermission):
    message = "No tiene permisos para realizar esta acción."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'rol', None) == 'cliente')

    def has_object_permission(self, request, view, obj):
        # Si el objeto tiene un atributo 'cliente'
        if hasattr(obj, 'cliente') and obj.cliente:
            if obj.cliente == request.user:
                return True
            if getattr(obj.cliente, 'usuario', None) == request.user:
                return True
        # Si el objeto es directamente un Cliente con FK usuario
        if hasattr(obj, 'usuario'):
            if getattr(obj, 'usuario', None) == request.user:
                return True
        # Si el objeto es el propio usuario
        if obj == request.user:
            return True
        return False
