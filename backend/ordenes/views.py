from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.permissions import EsAdministrador, EsTecnico
from .models import OrdenTrabajo
from .serializers import OrdenTrabajoSerializer, ItemManoDeObraSerializer, ItemRepuestoSerializer

from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from core.permissions import EsAdministrador, EsTecnico, EsCliente


class OrdenTrabajoPagination(PageNumberPagination):
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


class ListarCrearOrdenTrabajoView(generics.ListCreateAPIView):
    serializer_class = OrdenTrabajoSerializer
    pagination_class = OrdenTrabajoPagination

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]
        return [IsAuthenticated(), (EsAdministrador | EsTecnico)()]

    def get_queryset(self):
        queryset = OrdenTrabajo.objects.select_related('vehiculo__cliente__usuario', 'tecnico').all().order_by('-fecha_ingreso', '-creado_en')
        
        user = self.request.user
        if getattr(user, 'rol', None) == 'cliente':
            queryset = queryset.filter(vehiculo__cliente__usuario=user)

        # Filtros acumulativos TK056
        patente = self.request.query_params.get('patente')
        if patente:
            queryset = queryset.filter(vehiculo__patente__icontains=patente.strip())

        cliente = self.request.query_params.get('cliente')
        if cliente:
            cliente_term = cliente.strip()
            queryset = queryset.filter(
                Q(vehiculo__cliente__nombre__icontains=cliente_term) |
                Q(vehiculo__cliente__apellido__icontains=cliente_term) |
                Q(vehiculo__cliente__dni_cuit__icontains=cliente_term)
            )

        estado = self.request.query_params.get('estado')
        if estado and estado.lower() != 'todos':
            queryset = queryset.filter(estado__iexact=estado.strip())

        tecnico = self.request.query_params.get('tecnico')
        if tecnico:
            queryset = queryset.filter(
                Q(tecnico__nombre__icontains=tecnico.strip()) |
                Q(tecnico__apellido__icontains=tecnico.strip())
            )

        fecha_desde = self.request.query_params.get('fecha_desde')
        if fecha_desde:
            queryset = queryset.filter(fecha_ingreso__gte=fecha_desde)

        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_hasta:
            queryset = queryset.filter(fecha_ingreso__lte=fecha_hasta)

        return queryset


CrearOrdenTrabajoView = ListarCrearOrdenTrabajoView


class AgregarManoDeObraView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico]

    def post(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo, id=orden_id)
        serializer = ItemManoDeObraSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        item = serializer.save(orden_trabajo=orden)
        response_serializer = ItemManoDeObraSerializer(item)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class AgregarRepuestoView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico]

    def post(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo, id=orden_id)
        serializer = ItemRepuestoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        item = serializer.save(orden_trabajo=orden)
        response_serializer = ItemRepuestoSerializer(item)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


