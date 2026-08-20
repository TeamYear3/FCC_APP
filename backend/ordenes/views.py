from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from core.permissions import EsAdministrador, EsTecnico, EsCliente
from .models import OrdenTrabajo, HistorialEstadoOrden, AdjuntoDiagnostico, ItemPresupuesto
from .serializers import (
    OrdenTrabajoSerializer,
    ItemManoDeObraSerializer,
    ItemRepuestoSerializer,
    ItemPresupuestoSerializer,
    HistorialEstadoOrdenSerializer,
    ActualizarEstadoOrdenSerializer,
    AdjuntoDiagnosticoSerializer
)
from .storage import subir_imagen_diagnostico, eliminar_imagen_diagnostico


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


from rest_framework.exceptions import PermissionDenied
from .models import HistorialEstadoOrden
from .serializers import HistorialEstadoOrdenSerializer, ActualizarEstadoOrdenSerializer


class ConsultarHistorialOrdenView(APIView):
    """
    TK046: Endpoint GET /api/ordenes/<orden_id>/historial/
    Retorna el estado actual de la OT y la lista de su historial cronológico.
    Restringe el acceso si el rol es 'cliente' y la OT no pertenece a sus vehículos.
    """
    def get_permissions(self):
        return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]

    def get(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo.objects.select_related('vehiculo__cliente__usuario'), id=orden_id)

        if getattr(request.user, 'rol', None) == 'cliente':
            if not orden.vehiculo or not orden.vehiculo.cliente or orden.vehiculo.cliente.usuario_id != request.user.id:
                raise PermissionDenied("No tiene autorización para consultar esta Orden de Trabajo.")

        historial_qs = orden.historial_estados.all()
        historial_serializer = HistorialEstadoOrdenSerializer(historial_qs, many=True)

        return Response({
            'orden_id': str(orden.id),
            'numero_ot': orden.numero_ot,
            'estado_actual': orden.estado,
            'estado_actual_display': orden.get_estado_display(),
            'historial': historial_serializer.data
        }, status=status.HTTP_200_OK)


class ActualizarEstadoOrdenView(APIView):
    """
    TK033 & TK035: Endpoint PATCH /api/ordenes/<orden_id>/estado/
    Permite a Administradores y Técnicos actualizar el estado de la OT y registra el cambio en HistorialEstadoOrden.
    """
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico]

    def patch(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo, id=orden_id)
        serializer = ActualizarEstadoOrdenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        nuevo_estado = serializer.validated_data['estado']
        comentario = serializer.validated_data.get('comentario', '')
        estado_anterior = orden.estado

        if estado_anterior != nuevo_estado:
            orden.estado = nuevo_estado
            orden.save(update_fields=['estado', 'actualizado_en'])

            HistorialEstadoOrden.objects.create(
                orden_trabajo=orden,
                estado_anterior=estado_anterior,
                estado_nuevo=nuevo_estado,
                usuario=request.user,
                comentario=comentario
            )

            from .services import notificar_presupuesto_websocket
            notificar_presupuesto_websocket(orden)

        historial_serializer = HistorialEstadoOrdenSerializer(orden.historial_estados.all(), many=True)
        return Response({
            'orden_id': str(orden.id),
            'numero_ot': orden.numero_ot,
            'estado_actual': orden.estado,
            'estado_actual_display': orden.get_estado_display(),
            'historial': historial_serializer.data
        }, status=status.HTTP_200_OK)


class AdjuntoDiagnosticoListCreateView(APIView):
    """
    TK052: Endpoint GET/POST /api/ordenes/<orden_id>/adjuntos/ y /api/diagnosticos/adjuntos/
    Subida de imágenes de diagnóstico a Cloudinary (o almacenamiento local) y persistencia de metadatos.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo, id=orden_id)
        adjuntos = orden.adjuntos_diagnostico.all()
        serializer = AdjuntoDiagnosticoSerializer(adjuntos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, orden_id=None, *args, **kwargs):
        target_orden_id = orden_id or request.data.get('orden_trabajo') or request.data.get('orden_id')
        if not target_orden_id:
            return Response({'error': 'Debe especificar el ID de la orden de trabajo.'}, status=status.HTTP_400_BAD_REQUEST)

        orden = get_object_or_404(OrdenTrabajo, id=target_orden_id)
        file_obj = request.FILES.get('archivo') or request.FILES.get('file') or request.FILES.get('imagen')
        if not file_obj:
            return Response({'error': 'No se adjuntó ningún archivo de imagen.'}, status=status.HTTP_400_BAD_REQUEST)

        resultado_upload = subir_imagen_diagnostico(file_obj, orden.id)

        adjunto = AdjuntoDiagnostico.objects.create(
            orden_trabajo=orden,
            url_secure=resultado_upload['url_secure'],
            public_id=resultado_upload['public_id'],
            nombre_archivo=resultado_upload['nombre_archivo'],
            tamanio=resultado_upload['tamanio'],
            mime_type=resultado_upload['mime_type'],
            creado_por=request.user if request.user.is_authenticated else None
        )

        serializer = AdjuntoDiagnosticoSerializer(adjunto)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdjuntoDiagnosticoDetailView(APIView):
    """
    TK052: Endpoint DELETE /api/diagnosticos/adjuntos/<adjunto_id>/
    Elimina la imagen del proveedor de almacenamiento (Cloudinary / Local) y su registro.
    """
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico]

    def delete(self, request, adjunto_id, *args, **kwargs):
        adjunto = get_object_or_404(AdjuntoDiagnostico, id=adjunto_id)
        eliminar_imagen_diagnostico(adjunto.public_id)
        adjunto.delete()
        return Response({'message': 'Adjunto de diagnóstico eliminado exitosamente.'}, status=status.HTTP_204_NO_CONTENT)


class ListarItemsPresupuestoView(APIView):
    """
    TK043: Endpoint GET /api/ordenes/<orden_id>/items/
    Lista todos los ítems de presupuesto (mano de obra y repuestos) de una OT.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo, id=orden_id)
        items = orden.items_presupuesto.all()
        serializer = ItemPresupuestoSerializer(items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MarcarItemCompletadoView(APIView):
    """
    TK043: Endpoint PATCH /api/ordenes/<orden_id>/items/<item_id>/completado/
    Alterna o establece el estado `completado` de una tarea o repuesto durante la reparación.
    """
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico]

    def patch(self, request, orden_id, item_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo, id=orden_id)
        item = get_object_or_404(ItemPresupuesto, id=item_id, orden_trabajo=orden)

        if 'completado' in request.data:
            item.completado = bool(request.data['completado'])
        else:
            item.completado = not item.completado

        item.save(update_fields=['completado', 'actualizado_en'])
        serializer = ItemPresupuestoSerializer(item)
        return Response(serializer.data, status=status.HTTP_200_OK)


class EliminarItemPresupuestoView(APIView):
    """
    TK043: Endpoint DELETE /api/ordenes/<orden_id>/items/<item_id>/
    Elimina un ítem del presupuesto y actualiza el monto total de la OT.
    """
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico]

    def delete(self, request, orden_id, item_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo, id=orden_id)
        item = get_object_or_404(ItemPresupuesto, id=item_id, orden_trabajo=orden)
        item.delete()

        # Recalcular el monto total de la OT
        total = sum(i.subtotal for i in orden.items_presupuesto.all())
        orden.monto_total = total
        orden.save(update_fields=['monto_total', 'actualizado_en'])

        return Response({'message': 'Ítem eliminado del presupuesto exitosamente.', 'monto_total': float(total)}, status=status.HTTP_200_OK)
