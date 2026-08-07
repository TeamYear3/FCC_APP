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


from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from ordenes.models import OrdenTrabajo
from ordenes.serializers import OrdenTrabajoSerializer


class HistorialVehiculoPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'limit'
    page_query_param = 'page'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'total_items': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'results': data
        })


class HistorialVehiculoView(generics.ListAPIView):
    serializer_class = OrdenTrabajoSerializer
    pagination_class = HistorialVehiculoPagination

    def get_permissions(self):
        return [IsAuthenticated(), (EsAdministrador | EsTecnico)()]

    def get_queryset(self):
        vehiculo_id = self.kwargs.get('pk')
        if not Vehiculo.objects.filter(id=vehiculo_id).exists():
            raise NotFound("El vehículo especificado no existe.")
        return OrdenTrabajo.objects.filter(vehiculo_id=vehiculo_id).order_by('-fecha_ingreso', '-creado_en')

