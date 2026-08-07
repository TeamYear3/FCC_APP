from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from core.permissions import EsAdministrador, EsTecnico
from .models import Vehiculo
from .serializers import VehiculoSerializer

class CrearVehiculoView(generics.ListCreateAPIView):
    serializer_class = VehiculoSerializer

    def get_queryset(self):
        queryset = Vehiculo.objects.filter(activo=True)
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        return queryset

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), (EsAdministrador | EsTecnico)()]
        return [IsAuthenticated(), EsAdministrador()]



class DetalleVehiculoView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VehiculoSerializer
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        return Vehiculo.objects.filter(activo=True)

    def perform_destroy(self, instance):
        if instance.ordenes.exists():
            instance.activo = False
            instance.save()
        else:
            instance.delete()

