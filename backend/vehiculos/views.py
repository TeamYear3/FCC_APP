from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from core.permissions import EsAdministrador
from .models import Vehiculo
from .serializers import VehiculoSerializer

class DetalleVehiculoView(generics.RetrieveUpdateAPIView):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer
    permission_classes = [IsAuthenticated, EsAdministrador]

