from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from core.permissions import EsAdministrador
from .models import Cliente
from .serializers import ClienteSerializer

class CrearClienteView(generics.ListCreateAPIView):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated, EsAdministrador]

class DetalleClienteView(generics.RetrieveUpdateAPIView):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated, EsAdministrador]
