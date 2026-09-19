from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from core.permissions import EsAdministrador, EsTecnico, EsCliente
from .models import Turno
from .serializers import TurnoSerializer

class TurnoViewSet(viewsets.ModelViewSet):
    serializer_class = TurnoSerializer

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]
        elif self.request.method == 'POST':
            return [IsAuthenticated(), (EsAdministrador | EsCliente)()]
        return [IsAuthenticated(), EsAdministrador()]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "rol", None) == "cliente":
            # Un cliente solo puede ver sus propios turnos
            return Turno.objects.filter(cliente__usuario=user).select_related("cliente", "vehiculo")
        # Administradores y técnicos pueden ver todos los turnos
        return Turno.objects.all().select_related("cliente", "vehiculo")

    def perform_create(self, serializer):
        # Si un cliente está creando el turno, podemos forzar que se asocie a su propio perfil
        # de cliente por seguridad (a menos que sea admin/tecnico cargando en nombre del cliente)
        user = self.request.user
        if getattr(user, "rol", None) == "cliente":
            # Intentar obtener el cliente asociado al usuario perfil
            if hasattr(user, "cliente_perfil"):
                serializer.save(cliente=user.cliente_perfil)
                return
        serializer.save()
