from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Prefetch, Count, Sum, Avg, Case, When, Value, IntegerField
from django.db.models.functions import Concat
from datetime import timedelta, date
from decimal import Decimal
from rest_framework.exceptions import PermissionDenied
from core.permissions import EsAdministrador, EsTecnico, EsCliente
from .models import (
    OrdenTrabajo, HistorialEstadoOrden, AdjuntoDiagnostico,
    ItemPresupuesto, EstadoCobro, EstadoOrden, TipoItem
)
from .serializers import (
    OrdenTrabajoSerializer,
    DetalleOrdenTrabajoSerializer,
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
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
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
        queryset = OrdenTrabajo.objects.select_related('vehiculo__cliente__usuario', 'tecnico').annotate(
            nombre_completo=Concat('vehiculo__cliente__nombre', Value(' '), 'vehiculo__cliente__apellido'),
            nombre_completo_rev=Concat('vehiculo__cliente__apellido', Value(' '), 'vehiculo__cliente__nombre'),
            vehiculo_desc=Concat('vehiculo__marca', Value(' '), 'vehiculo__modelo')
        ).all().order_by('-fecha_ingreso', '-creado_en')
        
        user = self.request.user
        if getattr(user, 'rol', None) == 'cliente':
            queryset = queryset.filter(vehiculo__cliente__usuario=user)

        # Filtros acumulativos TK056 & TK119
        search = self.request.query_params.get('search') or self.request.query_params.get('busqueda') or self.request.query_params.get('q')

        numero_ot = self.request.query_params.get('numero_ot')
        if numero_ot:
            ot_str = numero_ot.strip()
            ot_clean = ot_str.lower().replace('#', '').replace('ot-', '').replace('ot', '').strip()
            q_num = Q(numero_ot__icontains=ot_str)
            if ot_clean.isdigit():
                q_num |= Q(numero_ot__iexact=f"OT-{int(ot_clean):04d}")
            queryset = queryset.filter(q_num)

        orden_id = self.request.query_params.get('id')
        if orden_id:
            queryset = queryset.filter(id=orden_id.strip())
        patente = self.request.query_params.get('patente')
        cliente = self.request.query_params.get('cliente')

        # Si patente y cliente tienen el mismo valor (búsqueda unificada desde frontend)
        if patente and cliente and patente.strip() == cliente.strip():
            term = patente.strip()
            queryset = queryset.filter(
                Q(vehiculo__patente__icontains=term) |
                Q(vehiculo__marca__icontains=term) |
                Q(vehiculo__modelo__icontains=term) |
                Q(vehiculo_desc__icontains=term) |
                Q(vehiculo__cliente__nombre__icontains=term) |
                Q(vehiculo__cliente__apellido__icontains=term) |
                Q(nombre_completo__icontains=term) |
                Q(nombre_completo_rev__icontains=term) |
                Q(vehiculo__cliente__dni_cuit__icontains=term) |
                Q(numero_ot__icontains=term) |
                Q(descripcion_problema__icontains=term)
            )
        else:
            if patente:
                queryset = queryset.filter(
                    Q(vehiculo__patente__icontains=patente.strip()) |
                    Q(numero_ot__icontains=patente.strip())
                )
            if cliente:
                cliente_term = cliente.strip()
                queryset = queryset.filter(
                    Q(vehiculo__cliente__nombre__icontains=cliente_term) |
                    Q(vehiculo__cliente__apellido__icontains=cliente_term) |
                    Q(nombre_completo__icontains=cliente_term) |
                    Q(nombre_completo_rev__icontains=cliente_term) |
                    Q(vehiculo__cliente__dni_cuit__icontains=cliente_term)
                )

        relevancia_anotada = False
        if search:
            search_term = search.strip()
            search_clean = search_term.lower().replace('#', '').replace('ot-', '').replace('ot', '').strip()

            q_ot = Q(numero_ot__icontains=search_term)
            if search_clean.isdigit():
                q_ot |= Q(numero_ot__iexact=f"OT-{int(search_clean):04d}")
                q_ot |= Q(numero_ot__icontains=f"OT-{int(search_clean)}")

            # DNI: Si son pocos dígitos numéricos (<= 2) solo buscar al inicio, sino icontains
            if search_term.isdigit() and len(search_term) <= 2:
                q_dni = Q(vehiculo__cliente__dni_cuit__startswith=search_term)
            else:
                q_dni = Q(vehiculo__cliente__dni_cuit__icontains=search_term)

            q_cliente = (
                Q(vehiculo__cliente__nombre__icontains=search_term) |
                Q(vehiculo__cliente__apellido__icontains=search_term) |
                Q(nombre_completo__icontains=search_term) |
                Q(nombre_completo_rev__icontains=search_term) |
                q_dni
            )

            # Si el término tiene varias palabras (ej. "Carlos Gómez" o "Fiat Cronos")
            palabras = [p for p in search_term.split() if len(p) >= 2]
            if len(palabras) > 1:
                q_palabras_cliente = Q()
                q_palabras_vehiculo = Q()
                for w in palabras:
                    q_palabras_cliente &= (Q(vehiculo__cliente__nombre__icontains=w) | Q(vehiculo__cliente__apellido__icontains=w))
                    q_palabras_vehiculo &= (Q(vehiculo__marca__icontains=w) | Q(vehiculo__modelo__icontains=w))
                q_cliente |= q_palabras_cliente

            q_vehiculo = (
                Q(vehiculo__patente__icontains=search_term) |
                Q(vehiculo__marca__icontains=search_term) |
                Q(vehiculo__modelo__icontains=search_term) |
                Q(vehiculo_desc__icontains=search_term)
            )
            if len(palabras) > 1:
                q_vehiculo |= q_palabras_vehiculo

            q_problema = Q(descripcion_problema__icontains=search_term)
            q_tecnico = (
                Q(tecnico__nombre__icontains=search_term) |
                Q(tecnico__apellido__icontains=search_term)
            )

            queryset = queryset.filter(q_ot | q_cliente | q_vehiculo | q_problema | q_tecnico)

            # Priorización de Relevancia
            prioridad_cases = []
            if search_clean.isdigit():
                prioridad_cases.append(When(numero_ot__iexact=f"OT-{int(search_clean):04d}", then=Value(1)))
            prioridad_cases.append(When(numero_ot__iexact=search_term, then=Value(1)))
            prioridad_cases.append(When(numero_ot__icontains=search_term, then=Value(2)))
            prioridad_cases.append(When(vehiculo__patente__iexact=search_term, then=Value(3)))
            prioridad_cases.append(When(vehiculo__patente__icontains=search_term, then=Value(4)))
            prioridad_cases.append(When(nombre_completo__iexact=search_term, then=Value(5)))
            prioridad_cases.append(When(nombre_completo__icontains=search_term, then=Value(6)))
            prioridad_cases.append(When(vehiculo_desc__icontains=search_term, then=Value(7)))

            queryset = queryset.annotate(
                relevancia=Case(*prioridad_cases, default=Value(20), output_field=IntegerField())
            )
            relevancia_anotada = True

        estado = self.request.query_params.get('estado')
        if estado and estado.lower() != 'todos':
            if ',' in estado:
                estados_list = [e.strip().lower() for e in estado.split(',') if e.strip()]
                queryset = queryset.filter(estado__in=estados_list)
            else:
                queryset = queryset.filter(estado__iexact=estado.strip())

        estado_cobro = self.request.query_params.get('estado_cobro')
        if estado_cobro and estado_cobro.lower() != 'todos':
            queryset = queryset.filter(estado_cobro__iexact=estado_cobro.strip())

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

        complejidad = self.request.query_params.get('complejidad')
        if complejidad and complejidad.lower() != 'todas':
            queryset = queryset.filter(complejidad__iexact=complejidad.strip())

        ordering = self.request.query_params.get('ordering')
        if relevancia_anotada and (not ordering or ordering in ['fecha_desc', 'complejidad']):
            queryset = queryset.order_by('relevancia', '-fecha_ingreso', '-creado_en')
        elif ordering == 'complejidad':
            queryset = queryset.annotate(
                complejidad_peso=Case(
                    When(complejidad='alta', then=Value(1)),
                    When(complejidad='media', then=Value(2)),
                    When(complejidad='baja', then=Value(3)),
                    default=Value(4),
                    output_field=IntegerField()
                )
            ).order_by('complejidad_peso', '-fecha_ingreso', '-creado_en')
        elif ordering == 'fecha_asc':
            queryset = queryset.order_by('fecha_ingreso', 'creado_en')
        elif ordering == 'fecha_desc':
            queryset = queryset.order_by('-fecha_ingreso', '-creado_en')

        return queryset


CrearOrdenTrabajoView = ListarCrearOrdenTrabajoView


class DetalleOrdenTrabajoView(generics.RetrieveAPIView):
    """
    TK095, TK183 & TK184: Endpoint GET /api/ordenes/<uuid:id>/
    Retorna el detalle consolidado de una Orden de Trabajo.
    Conforme a AUT-BE-02, no admite eliminación destructiva directa sobre esta URL (retorna 405).
    """
    serializer_class = DetalleOrdenTrabajoSerializer
    lookup_field = 'id'
    lookup_url_kwarg = 'id'

    def get_permissions(self):
        return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]

    def get_queryset(self):
        adjuntos_qs = AdjuntoDiagnostico.objects.select_related('creado_por', 'item_presupuesto')
        items_qs = ItemPresupuesto.objects.prefetch_related(
            Prefetch('adjuntos', queryset=adjuntos_qs)
        )
        return OrdenTrabajo.objects.select_related(
            'vehiculo__cliente__usuario', 'tecnico'
        ).prefetch_related(
            Prefetch('items_presupuesto', queryset=items_qs),
            Prefetch('adjuntos_diagnostico', queryset=adjuntos_qs),
            'historial_estados__usuario'
        ).all()

    def check_object_permissions(self, request, obj):
        user = request.user
        if getattr(user, 'rol', None) == 'cliente':
            if not obj.vehiculo or not obj.vehiculo.cliente or obj.vehiculo.cliente.usuario_id != user.id:
                raise PermissionDenied("No tiene autorización para consultar esta Orden de Trabajo.")
        elif getattr(user, 'rol', None) in ('admin', 'tecnico'):
            return
        else:
            raise PermissionDenied("No tiene permisos para realizar esta acción.")


class EliminarOrdenTrabajoView(generics.DestroyAPIView):
    """
    Endpoint DELETE /api/ordenes/<uuid:id>/eliminar/
    Permite la eliminación definitiva de una orden con auditoría NoSQL en MongoDB.
    Restringe la eliminación a Administradores y Técnicos autorizados.
    """
    serializer_class = DetalleOrdenTrabajoSerializer
    lookup_field = 'id'
    lookup_url_kwarg = 'id'

    def get_permissions(self):
        return [IsAuthenticated(), (EsAdministrador | EsTecnico)()]

    def get_queryset(self):
        return OrdenTrabajo.objects.all()

    def perform_destroy(self, instance):
        orden_id = str(instance.id)
        numero_ot = instance.numero_ot
        estado_previo = instance.estado

        try:
            from core.mongo import registrar_auditoria_ot
            registrar_auditoria_ot(
                orden_id=orden_id,
                estado_anterior=estado_previo,
                estado_nuevo='ELIMINADO',
                usuario=self.request.user,
                metadata={"numero_ot": numero_ot, "motivo": "Eliminación directa de orden de trabajo"}
            )
        except Exception:
            pass

        instance.delete()


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
    TK033, TK035 & TK204: Endpoint PATCH /api/ordenes/<orden_id>/estado/
    Permite a Administradores y Técnicos actualizar el estado de la OT,
    y a Clientes autorizados aprobar o rechazar presupuestos en estado 'en_presupuesto'.
    """
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico | EsCliente]

    def patch(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo, id=orden_id)
        serializer = ActualizarEstadoOrdenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        nuevo_estado = serializer.validated_data['estado']
        comentario = serializer.validated_data.get('comentario', '')
        estado_anterior = orden.estado

        # Control de permisos para rol 'cliente' (TK204 / US-18)
        if getattr(request.user, "rol", None) == "cliente":
            if not orden.vehiculo or not orden.vehiculo.cliente or orden.vehiculo.cliente.usuario_id != request.user.id:
                raise PermissionDenied("No tiene autorización para modificar esta Orden de Trabajo.")
            if orden.estado != EstadoOrden.EN_PRESUPUESTO or nuevo_estado not in (EstadoOrden.APROBADO, EstadoOrden.RECHAZADO):
                raise PermissionDenied("El cliente únicamente puede aprobar o rechazar presupuestos en estado 'En Presupuesto'.")

        if estado_anterior != nuevo_estado:
            try:
                orden.transicionar_a(nuevo_estado, usuario=request.user, comentario=comentario)
            except ValidationError as e:
                error_msg = e.messages[0] if hasattr(e, 'messages') and e.messages else str(e)
                if error_msg.startswith("['") and error_msg.endswith("']"):
                    error_msg = error_msg[2:-2]
                return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)

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

    def get(self, request, orden_id=None, *args, **kwargs):
        target_orden_id = orden_id or request.query_params.get('orden_id') or request.query_params.get('orden_trabajo')
        user = request.user

        if getattr(user, 'rol', '') == 'cliente':
            if not target_orden_id:
                return Response({'error': 'Debe especificar el ID de la orden de trabajo.'}, status=status.HTTP_400_BAD_REQUEST)
            orden = get_object_or_404(OrdenTrabajo.objects.select_related('vehiculo__cliente'), id=target_orden_id)
            if not orden.vehiculo or not orden.vehiculo.cliente or orden.vehiculo.cliente.usuario_id != user.id:
                return Response({'error': 'No tiene permisos para ver adjuntos de una orden de trabajo ajena.'}, status=status.HTTP_403_FORBIDDEN)
            adjuntos = orden.adjuntos_diagnostico.filter(mime_type__startswith='image/')
        else:
            if target_orden_id:
                orden = get_object_or_404(OrdenTrabajo, id=target_orden_id)
                adjuntos = orden.adjuntos_diagnostico.all()
            else:
                adjuntos = AdjuntoDiagnostico.objects.all()

        serializer = AdjuntoDiagnosticoSerializer(adjuntos, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, orden_id=None, *args, **kwargs):
        user = request.user
        if getattr(user, 'rol', '') == 'cliente':
            return Response({'error': 'Los clientes no tienen permisos para subir adjuntos de diagnóstico.'}, status=status.HTTP_403_FORBIDDEN)

        target_orden_id = orden_id or request.data.get('orden_trabajo') or request.data.get('orden_id')
        if not target_orden_id:
            return Response({'error': 'Debe especificar el ID de la orden de trabajo.'}, status=status.HTTP_400_BAD_REQUEST)

        orden = get_object_or_404(OrdenTrabajo, id=target_orden_id)
        file_obj = request.FILES.get('archivo') or request.FILES.get('file') or request.FILES.get('imagen')
        if not file_obj:
            return Response({'error': 'No se adjuntó ningún archivo de imagen.'}, status=status.HTTP_400_BAD_REQUEST)

        resultado_upload = subir_imagen_diagnostico(file_obj, orden.id)
        if resultado_upload.get('mime_type') and not resultado_upload['mime_type'].startswith('image/'):
            return Response({'error': 'Solo se admiten archivos de imagen (JPEG, PNG, WebP).'}, status=status.HTTP_400_BAD_REQUEST)

        item_id = request.data.get('item_presupuesto_id') or request.data.get('item_presupuesto')
        item_obj = None
        if item_id:
            item_obj = ItemPresupuesto.objects.filter(id=item_id, orden_trabajo=orden).first()

        adjunto = AdjuntoDiagnostico.objects.create(
            orden_trabajo=orden,
            item_presupuesto=item_obj,
            url_secure=resultado_upload['url_secure'],
            public_id=resultado_upload['public_id'],
            nombre_archivo=resultado_upload['nombre_archivo'],
            tamanio=resultado_upload['tamanio'],
            mime_type=resultado_upload['mime_type'],
            creado_por=request.user if request.user.is_authenticated else None
        )

        serializer = AdjuntoDiagnosticoSerializer(adjunto, context={'request': request})
        from .services import notificar_adjunto_diagnostico_websocket
        notificar_adjunto_diagnostico_websocket(
            adjunto_o_id=adjunto.id,
            orden_id=orden.id,
            numero_ot=orden.numero_ot,
            accion="creado",
            datos_adjunto=serializer.data
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdjuntoDiagnosticoDetailView(APIView):
    """
    TK052: Endpoint DELETE /api/diagnosticos/adjuntos/<adjunto_id>/
    Elimina la imagen del proveedor de almacenamiento (Cloudinary / Local) y su registro.
    """
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico]

    def delete(self, request, adjunto_id, *args, **kwargs):
        adjunto = get_object_or_404(AdjuntoDiagnostico, id=adjunto_id)
        orden_id = str(adjunto.orden_trabajo_id)
        numero_ot = adjunto.orden_trabajo.numero_ot if adjunto.orden_trabajo else None
        eliminar_imagen_diagnostico(adjunto.public_id)
        adjunto.delete()

        from .services import notificar_adjunto_diagnostico_websocket
        notificar_adjunto_diagnostico_websocket(
            adjunto_o_id=adjunto_id,
            orden_id=orden_id,
            numero_ot=numero_ot,
            accion="eliminado"
        )
        return Response({'message': 'Adjunto de diagnóstico eliminado exitosamente.'}, status=status.HTTP_204_NO_CONTENT)


class ListarItemsPresupuestoView(APIView):
    """
    TK043: Endpoint GET /api/ordenes/<orden_id>/items/
    Lista todos los ítems de presupuesto (mano de obra y repuestos) de una OT.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo, id=orden_id)
        items = (
            orden.items_presupuesto
            .select_related('orden_trabajo')
            .prefetch_related('adjuntos__creado_por')
            .all()
        )
        serializer = ItemPresupuestoSerializer(items, many=True, context={'request': request})
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


class ExportarOrdenPDFView(APIView):
    """
    TK121: Endpoint GET /api/ordenes/<pk>/pdf/
    Genera y exporta el comprobante oficial de la Orden de Trabajo en formato PDF utilizando ReportLab.
    """
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico | EsCliente]

    def get(self, request, pk, *args, **kwargs):
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors
        except ImportError:
            return HttpResponse("Biblioteca reportlab no disponible en este entorno.", status=501)

        import io
        from django.http import HttpResponse

        orden = get_object_or_404(
            OrdenTrabajo.objects.select_related('vehiculo__cliente__usuario', 'tecnico'),
            id=pk
        )

        # Validación de autorización para clientes
        if getattr(request.user, 'rol', None) == 'cliente':
            vehiculo = orden.vehiculo
            if not vehiculo.cliente or vehiculo.cliente.usuario_id != request.user.id:
                raise PermissionDenied("No tiene autorización para descargar la orden de este vehículo.")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            textColor=colors.HexColor('#1E1E1E'),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'SubTitleStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            textColor=colors.HexColor('#555555'),
            spaceAfter=12
        )
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=11,
            textColor=colors.HexColor('#1E1E1E'),
            spaceBefore=10,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            textColor=colors.HexColor('#333333'),
            leading=11
        )
        body_bold = ParagraphStyle(
            'BodyBold',
            parent=body_style,
            fontName='Helvetica-Bold'
        )

        elements = []

        # Encabezado Empresa y Comprobante
        elements.append(Paragraph("FCC TALLER MECÁNICO Y SERVICIOS", title_style))
        elements.append(Paragraph(
            f"Comprobante de Orden de Trabajo #{orden.numero_ot or str(orden.id)[:8].upper()} · Emisión: {timezone.now().strftime('%d/%m/%Y %H:%M')}",
            subtitle_style
        ))
        elements.append(Spacer(1, 4))

        # Tabla 1: Datos de la Orden y Vehículo / Cliente
        veh = orden.vehiculo
        cli = veh.cliente if veh else None

        info_data = [
            [
                Paragraph("<b>N° Orden:</b>", body_style),
                Paragraph(f"#{orden.numero_ot or str(orden.id)[:8]}", body_bold),
                Paragraph("<b>Vehículo:</b>", body_style),
                Paragraph(f"{veh.marca} {veh.modelo} ({veh.anio})", body_bold)
            ],
            [
                Paragraph("<b>Estado:</b>", body_style),
                Paragraph(orden.estado.upper().replace('_', ' '), body_bold),
                Paragraph("<b>Patente:</b>", body_style),
                Paragraph(veh.patente.upper(), body_bold)
            ],
            [
                Paragraph("<b>Complejidad:</b>", body_style),
                Paragraph(orden.complejidad.capitalize(), body_style),
                Paragraph("<b>Cliente / Titular:</b>", body_style),
                Paragraph(f"{cli.nombre} {cli.apellido}" if cli else "Consumidor Final", body_style)
            ],
            [
                Paragraph("<b>Fecha Ingreso:</b>", body_style),
                Paragraph(orden.fecha_ingreso.strftime('%d/%m/%Y') if orden.fecha_ingreso else "-", body_style),
                Paragraph("<b>Contacto / CUIT:</b>", body_style),
                Paragraph(f"Tel: {cli.telefono or 'S/D'} · {cli.dni_cuit or ''}" if cli else "-", body_style)
            ]
        ]

        info_table = Table(info_data, colWidths=[80, 180, 80, 200])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8F9FA')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 10))

        # Diagnóstico inicial / Problema
        elements.append(Paragraph("DIAGNÓSTICO INICIAL / SÍNTOMAS REPORTADOS", section_heading))
        problema_text = orden.descripcion_problema or "Inspección técnica integral."
        if orden.motivo_pausa:
            problema_text += f"\n[Pausado en taller: {orden.motivo_pausa}]"
        elements.append(Paragraph(problema_text.replace('\n', '<br/>'), body_style))
        elements.append(Spacer(1, 10))

        # Detalle de Ítems de Presupuesto
        elements.append(Paragraph("DETALLE DE TRABAJOS Y REPUESTOS (PRESUPUESTO)", section_heading))
        items = list(orden.items_presupuesto.all())
        if items:
            items_data = [
                [
                    Paragraph("<b>Tipo</b>", body_bold),
                    Paragraph("<b>Descripción</b>", body_bold),
                    Paragraph("<b>Cant.</b>", body_bold),
                    Paragraph("<b>P. Unitario</b>", body_bold),
                    Paragraph("<b>Subtotal</b>", body_bold)
                ]
            ]
            for it in items:
                tipo_lbl = "Mano de Obra" if it.tipo == 'mano_de_obra' else "Repuesto"
                items_data.append([
                    Paragraph(tipo_lbl, body_style),
                    Paragraph(it.descripcion, body_style),
                    Paragraph(str(it.cantidad), body_style),
                    Paragraph(f"${it.precio_unitario:,.2f}", body_style),
                    Paragraph(f"${it.subtotal:,.2f}", body_bold)
                ])

            items_data.append([
                Paragraph("<b>TOTAL PRESUPUESTADO</b>", body_bold),
                Paragraph("", body_style),
                Paragraph("", body_style),
                Paragraph("", body_style),
                Paragraph(f"<b>${orden.monto_total:,.2f}</b>", body_bold)
            ])

            items_table = Table(items_data, colWidths=[80, 240, 45, 85, 90])
            items_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E5E7EB')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#999999')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F3F4F6')),
            ]))
            elements.append(items_table)
        else:
            elements.append(Paragraph(
                f"Sin ítems detallados cargados. Presupuesto estimado base: <b>${orden.monto_total:,.2f}</b>",
                body_style
            ))

        elements.append(Spacer(1, 24))

        # Firmas de conformidad
        firmas_data = [
            [
                Paragraph("_______________________________<br/>Firma y Aclaración Cliente", body_style),
                Paragraph("_______________________________<br/>Firma Responsable Técnico Taller", body_style)
            ]
        ]
        firmas_table = Table(firmas_data, colWidths=[270, 270])
        firmas_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(firmas_table)

        doc.build(elements)
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        filename = f"orden_trabajo_{orden.numero_ot or str(orden.id)[:8]}.pdf"
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response


class RegistrarPagoOrdenView(APIView):
    """
    TK103: Endpoint POST /api/ordenes/<uuid:id>/registrar-pago/
    Permite asentar el cobro de la orden de trabajo de manera desacoplada de ARCA
    (Efectivo, Transferencia, Débito, Crédito) y opcionalmente transicionar a 'entregado'.
    """
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico]

    def post(self, request, id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo, id=id)
        from .serializers import RegistrarPagoSerializer, OrdenTrabajoSerializer
        serializer = RegistrarPagoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        metodo_pago = serializer.validated_data['metodo_pago']
        comentario = serializer.validated_data.get('comentario', '')
        entregar_orden = serializer.validated_data.get('entregar_orden', False)
        condicion_iva = serializer.validated_data.get('condicion_iva')

        if condicion_iva and orden.vehiculo and orden.vehiculo.cliente:
            orden.vehiculo.cliente.condicion_iva = condicion_iva
            orden.vehiculo.cliente.save(update_fields=['condicion_iva', 'actualizado_en'])

        orden.estado_cobro = EstadoCobro.COBRADO
        orden.metodo_pago = metodo_pago
        orden.fecha_cobro = timezone.now()
        orden.save(update_fields=['estado_cobro', 'metodo_pago', 'fecha_cobro', 'actualizado_en'])

        # Si se solicitó entregar la orden y está finalizada, transicionar
        if entregar_orden and orden.estado == EstadoOrden.FINALIZADO:
            try:
                orden.transicionar_a(
                    EstadoOrden.ENTREGADO,
                    usuario=request.user,
                    comentario=comentario or f"Orden entregada y cobrada mediante {metodo_pago}"
                )
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Registrar historial de cobro
        HistorialEstadoOrden.objects.create(
            orden_trabajo=orden,
            estado_anterior=orden.estado,
            estado_nuevo=orden.estado,
            usuario=request.user if request.user.is_authenticated else None,
            comentario=f"Cobro registrado exitosamente: {metodo_pago.upper()}. {comentario}".strip()
        )

        # Retornar datos actualizados de la orden
        response_serializer = OrdenTrabajoSerializer(orden, context={'request': request})
        return Response({
            'message': 'Cobro registrado exitosamente.',
            'orden': response_serializer.data
        }, status=status.HTTP_200_OK)


class OrdenTrabajoAuditoriaView(APIView):
    """
    TK129: Endpoint GET /api/ordenes/<orden_id>/auditoria/
    Recupera el historial cronológico de auditoría NoSQL almacenado en MongoDB.
    """
    def get_permissions(self):
        return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]

    def get(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo.objects.select_related('vehiculo__cliente__usuario'), id=orden_id)

        if getattr(request.user, 'rol', None) == 'cliente':
            if not orden.vehiculo or not orden.vehiculo.cliente or orden.vehiculo.cliente.usuario_id != request.user.id:
                raise PermissionDenied("No tiene autorización para consultar la auditoría de esta Orden.")

        from core.mongo import obtener_auditoria_ot
        registros_nosql = obtener_auditoria_ot(orden.id)

        return Response({
            'orden_id': str(orden.id),
            'numero_ot': orden.numero_ot,
            'origen_datos': 'MongoDB',
            'total_registros': len(registros_nosql),
            'auditoria': registros_nosql
        }, status=status.HTTP_200_OK)


class OrdenEventosWebSocketView(APIView):
    """
    TK192 (US-13): Endpoint GET /api/ordenes/<orden_id>/eventos-websocket/
    Recupera el historial cronológico de eventos WebSocket persistidos en MongoDB.
    """
    def get_permissions(self):
        return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]

    def get(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo.objects.select_related('vehiculo__cliente__usuario'), id=orden_id)

        if getattr(request.user, 'rol', None) == 'cliente':
            if not orden.vehiculo or not orden.vehiculo.cliente or orden.vehiculo.cliente.usuario_id != request.user.id:
                raise PermissionDenied("No tiene autorización para consultar los eventos WebSocket de esta Orden.")

        from core.mongo import obtener_historial_eventos_websocket
        eventos = obtener_historial_eventos_websocket(orden_id=orden.id, numero_ot=orden.numero_ot)

        return Response({
            'orden_id': str(orden.id),
            'numero_ot': orden.numero_ot,
            'origen_datos': 'MongoDB',
            'total_eventos': len(eventos),
            'eventos': eventos
        }, status=status.HTTP_200_OK)


class OrdenDiagnosticoOBD2View(APIView):
    """
    TK193 (US-07): Endpoints para registrar y consultar diagnósticos técnicos OBD-II en MongoDB.
    POST /api/ordenes/<orden_id>/diagnostico-obd2/ -> Registrar informe/lectura OBD-II (Técnicos y Administradores).
    GET  /api/ordenes/<orden_id>/diagnostico-obd2/ -> Consultar historial de lecturas OBD-II (Admins, Técnicos, Cliente propietario).
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]
        return [IsAuthenticated(), (EsAdministrador | EsTecnico)()]

    def get(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo.objects.select_related('vehiculo__cliente__usuario'), id=orden_id)

        if getattr(request.user, 'rol', None) == 'cliente':
            if not orden.vehiculo or not orden.vehiculo.cliente or orden.vehiculo.cliente.usuario_id != request.user.id:
                raise PermissionDenied("No tiene autorización para consultar los diagnósticos técnicos de esta Orden.")

        from core.mongo import obtener_diagnosticos_obd2
        patente = orden.vehiculo.patente if orden.vehiculo else None
        diagnosticos = obtener_diagnosticos_obd2(orden_id=orden.id, patente=patente)

        return Response({
            'orden_id': str(orden.id),
            'numero_ot': orden.numero_ot,
            'patente': patente,
            'origen_datos': 'MongoDB',
            'total_diagnosticos': len(diagnosticos),
            'diagnosticos': diagnosticos
        }, status=status.HTTP_200_OK)

    def post(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo.objects.select_related('vehiculo'), id=orden_id)

        codigos_dtc = request.data.get('codigos_dtc', [])
        parametros_en_vivo = request.data.get('parametros_en_vivo', {})
        escaner = request.data.get('escaner')
        notas = request.data.get('notas')

        from core.mongo import registrar_diagnostico_obd2
        patente = orden.vehiculo.patente if orden.vehiculo else None

        resultado = registrar_diagnostico_obd2(
            orden_id=orden.id,
            codigos_dtc=codigos_dtc,
            parametros_en_vivo=parametros_en_vivo,
            escaner=escaner,
            notas=notas,
            tecnico=request.user,
            numero_ot=orden.numero_ot,
            patente=patente
        )

        if resultado is None:
            return Response({
                'error': 'No se pudo persistir el diagnóstico OBD-II en la base de datos NoSQL MongoDB.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({
            'message': 'Diagnóstico OBD-II registrado exitosamente en MongoDB.',
            'diagnostico': resultado
        }, status=status.HTTP_201_CREATED)


class ReporteRentabilidadView(APIView):
    """
    TK210: Endpoint para el cálculo y visualización analítica de métricas de rentabilidad,
    servicios más demandados y márgenes por tipo de reparación (US-14).
    Accesible exclusivamente para usuarios con rol administrador.
    """
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request, *args, **kwargs):
        periodo = request.query_params.get("periodo", "mes").lower()
        hoy = timezone.localdate()

        # Determinar rango de fechas según período
        if periodo == "mes":
            inicio = hoy.replace(day=1)
            fin = hoy
        elif periodo == "trimestre":
            mes_actual = hoy.month
            mes_inicio = ((mes_actual - 1) // 3) * 3 + 1
            inicio = hoy.replace(month=mes_inicio, day=1)
            fin = hoy
        elif periodo == "anio":
            inicio = hoy.replace(month=1, day=1)
            fin = hoy
        elif periodo == "todos":
            inicio = None
            fin = None
        else:
            fecha_desde = request.query_params.get("fecha_desde")
            fecha_hasta = request.query_params.get("fecha_hasta")
            try:
                inicio = date.fromisoformat(fecha_desde) if fecha_desde else None
                fin = date.fromisoformat(fecha_hasta) if fecha_hasta else hoy
            except (ValueError, TypeError):
                inicio = hoy.replace(day=1)
                fin = hoy

        ordenes_qs = OrdenTrabajo.objects.all()
        if inicio:
            ordenes_qs = ordenes_qs.filter(fecha_ingreso__gte=inicio)
        if fin:
            ordenes_qs = ordenes_qs.filter(fecha_ingreso__lte=fin)

        cantidad_ordenes = ordenes_qs.count()
        total_facturado_aggr = ordenes_qs.aggregate(
            total=Sum("monto_total"),
            promedio=Avg("monto_total")
        )
        total_facturado = total_facturado_aggr.get("total") or Decimal("0.00")
        ticket_promedio = total_facturado_aggr.get("promedio") or Decimal("0.00")

        items_qs = ItemPresupuesto.objects.filter(orden_trabajo__in=ordenes_qs)

        mano_obra_aggr = items_qs.filter(tipo=TipoItem.MANO_DE_OBRA).aggregate(total=Sum("subtotal"))
        total_mano_obra = mano_obra_aggr.get("total") or Decimal("0.00")

        repuestos_aggr = items_qs.filter(tipo=TipoItem.REPUESTO).aggregate(total=Sum("subtotal"))
        total_repuestos = repuestos_aggr.get("total") or Decimal("0.00")

        suma_items = total_mano_obra + total_repuestos
        if suma_items > 0:
            margen_mano_obra_pct = round(float((total_mano_obra / suma_items) * 100), 1)
            margen_repuestos_pct = round(float((total_repuestos / suma_items) * 100), 1)
        else:
            margen_mano_obra_pct = 0.0
            margen_repuestos_pct = 0.0

        top_servicios_raw = items_qs.filter(
            tipo=TipoItem.MANO_DE_OBRA
        ).values("descripcion").annotate(
            cantidad=Count("id"),
            total=Sum("subtotal")
        ).order_by("-cantidad", "-total")[:5]

        top_servicios = [
            {
                "servicio": item["descripcion"],
                "cantidad": item["cantidad"],
                "total": float(item["total"] or 0)
            }
            for item in top_servicios_raw
        ]

        historico_mensual = []
        for i in range(5, -1, -1):
            anio_mes = hoy.year
            mes_calc = hoy.month - i
            while mes_calc <= 0:
                mes_calc += 12
                anio_mes -= 1

            inicio_m = date(anio_mes, mes_calc, 1)
            if mes_calc == 12:
                fin_m = date(anio_mes + 1, 1, 1) - timedelta(days=1)
            else:
                fin_m = date(anio_mes, mes_calc + 1, 1) - timedelta(days=1)

            ots_mes = OrdenTrabajo.objects.filter(fecha_ingreso__gte=inicio_m, fecha_ingreso__lte=fin_m)
            items_mes = ItemPresupuesto.objects.filter(orden_trabajo__in=ots_mes)

            mo_m = items_mes.filter(tipo=TipoItem.MANO_DE_OBRA).aggregate(t=Sum("subtotal"))["t"] or Decimal("0.00")
            rep_m = items_mes.filter(tipo=TipoItem.REPUESTO).aggregate(t=Sum("subtotal"))["t"] or Decimal("0.00")
            tot_m = ots_mes.aggregate(t=Sum("monto_total"))["t"] or (mo_m + rep_m)

            mes_nombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
            nombre_label = f"{mes_nombres[mes_calc - 1]} {str(anio_mes)[2:]}"

            historico_mensual.append({
                "periodo_label": nombre_label,
                "mano_de_obra": float(mo_m),
                "repuestos": float(rep_m),
                "total": float(tot_m),
                "cantidad_ordenes": ots_mes.count()
            })

        data = {
            "periodo": periodo,
            "fecha_desde": inicio.isoformat() if inicio else None,
            "fecha_hasta": fin.isoformat() if fin else None,
            "kpis": {
                "total_facturado": float(total_facturado),
                "total_mano_obra": float(total_mano_obra),
                "total_repuestos": float(total_repuestos),
                "margen_mano_obra_pct": margen_mano_obra_pct,
                "margen_repuestos_pct": margen_repuestos_pct,
                "cantidad_ordenes": cantidad_ordenes,
                "ticket_promedio": round(float(ticket_promedio), 2)
            },
            "margenes_reparacion": {
                "mano_de_obra": {
                    "monto": float(total_mano_obra),
                    "porcentaje": margen_mano_obra_pct
                },
                "repuestos": {
                    "monto": float(total_repuestos),
                    "porcentaje": margen_repuestos_pct
                }
            },
            "top_servicios": top_servicios,
            "historico_mensual": historico_mensual
        }

        return Response(data, status=status.HTTP_200_OK)




