from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from core.permissions import EsAdministrador, EsTecnico, EsCliente, EsAdminOSoloLecturaTecnico
from .models import Cliente
from .serializers import ClienteSerializer

class CrearClienteView(generics.ListCreateAPIView):
    queryset = Cliente.objects.all().order_by('-creado_en', 'apellido')
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated, EsAdminOSoloLecturaTecnico]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'apellido', 'dni_cuit']

class DetalleClienteView(generics.RetrieveUpdateAPIView):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]
        return [IsAuthenticated(), EsAdministrador()]

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if getattr(user, 'rol', None) == 'cliente':
            if obj.usuario_id != user.id:
                raise PermissionDenied("No tiene autorización para consultar esta ficha de cliente.")
        return obj

