from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from core.permissions import EsAdministrador
from .models import Cliente
from .serializers import ClienteSerializer

class CrearClienteView(generics.ListCreateAPIView):
    queryset = Cliente.objects.all().order_by('-creado_en', 'apellido')
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated, EsAdministrador]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'apellido', 'dni_cuit']

class DetalleClienteView(generics.RetrieveUpdateAPIView):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated, EsAdministrador]
