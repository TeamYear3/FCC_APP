from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from core.permissions import EsAdministrador, EsTecnico
from .models import Vehiculo
from .serializers import VehiculoSerializer

class CrearVehiculoView(generics.ListCreateAPIView):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), (EsAdministrador | EsTecnico)()]
        return [IsAuthenticated(), EsAdministrador()]


class DetalleVehiculoView(generics.RetrieveUpdateAPIView):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer
    permission_classes = [IsAuthenticated, EsAdministrador]
