from datetime import timedelta
from decimal import Decimal
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import EsAdministrador
from core.mongo import registrar_telemetria_arca
from ordenes.models import OrdenTrabajo
from .models import Factura, EstadoFactura, EstadoPago, TipoComprobante
from .arca_client import ArcaWSClient, ArcaFiscalError, ArcaAuthError
from .serializers import (
    FacturaSerializer,
    EmitirFacturaSerializer,
    FacturaCalendarioSerializer,
)


class EmitirFacturaView(APIView):
    """
    Endpoint para emitir una Factura Electrónica oficial conectada al WebService de ARCA (ex-AFIP).
    Solo disponible para usuarios con rol 'admin'.
    """
    permission_classes = [IsAuthenticated, EsAdministrador]

    def post(self, request, *args, **kwargs):
        serializer = EmitirFacturaSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        orden_id = serializer.validated_data["orden_trabajo_id"]
        tipo_comprobante = serializer.validated_data.get("tipo_comprobante", TipoComprobante.FACTURA_B)
        punto_venta = serializer.validated_data.get("punto_venta", 1)
        dias_vencimiento = serializer.validated_data.get("dias_vencimiento_pago", 15)
        observaciones = serializer.validated_data.get("observaciones", "")
        condicion_iva_override = serializer.validated_data.get("condicion_iva", "")

        orden = (
            OrdenTrabajo.objects.select_related("vehiculo__cliente")
            .prefetch_related("items_presupuesto")
            .get(id=orden_id)
        )
        cliente = orden.vehiculo.cliente if orden.vehiculo else None

        if condicion_iva_override and cliente:
            cliente.condicion_iva = condicion_iva_override
            cliente.save(update_fields=["condicion_iva", "actualizado_en"])

        datos_solicitud = {
            "orden_id": str(orden.id),
            "total": str(orden.monto_total),
            "tipo_comprobante": tipo_comprobante,
            "punto_venta": punto_venta,
            "doc_tipo": getattr(cliente, "tipo_documento", "DNI"),
            "doc_nro": getattr(cliente, "dni_cuit", "0"),
        }

        # Llamar al WebService de ARCA para autorizar y obtener CAE oficial
        try:
            arca_response = ArcaWSClient.solicitar_cae(
                total=orden.monto_total,
                punto_venta=punto_venta,
                tipo_comprobante=tipo_comprobante,
                doc_tipo=getattr(cliente, "tipo_documento", "DNI"),
                doc_nro=getattr(cliente, "dni_cuit", "0"),
                condicion_iva=getattr(cliente, "condicion_iva", "CF")
            )
            registrar_telemetria_arca(
                datos_solicitud=datos_solicitud,
                respuesta_arca=arca_response,
                orden_id=orden.id,
                exitoso=True
            )
        except ArcaFiscalError as exc:
            registrar_telemetria_arca(
                datos_solicitud=datos_solicitud,
                respuesta_arca={"observaciones": exc.observaciones},
                orden_id=orden.id,
                exitoso=False,
                error=str(exc)
            )
            return Response(
                {"error": str(exc), "observaciones": exc.observaciones},
                status=status.HTTP_400_BAD_REQUEST
            )
        except ArcaAuthError as exc:
            registrar_telemetria_arca(
                datos_solicitud=datos_solicitud,
                respuesta_arca=None,
                orden_id=orden.id,
                exitoso=False,
                error=str(exc)
            )
            return Response(
                {"error": f"Falla de autenticación fiscal con ARCA: {str(exc)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        hoy = timezone.localdate()
        fecha_vencimiento_pago = hoy + timedelta(days=dias_vencimiento)

        factura = Factura.objects.create(
            orden_trabajo=orden,
            tipo_comprobante=tipo_comprobante,
            punto_venta=punto_venta,
            numero_factura=arca_response["numero_factura"],
            cae=arca_response["cae"],
            fecha_vencimiento_cae=arca_response["fecha_vencimiento_cae"],
            total=orden.monto_total,
            estado=EstadoFactura.EMITIDA,
            estado_pago=EstadoPago.SIN_INTERACCION,
            fecha_vencimiento_pago=fecha_vencimiento_pago,
            cuit_emisor=arca_response["cuit_emisor"],
            observaciones=observaciones
        )

        return Response(
            FacturaSerializer(factura).data,
            status=status.HTTP_201_CREATED
        )


class FacturaListView(APIView):
    """
    Lista de todas las facturas emitidas con soporte de filtros avanzados por:
    - estado_pago
    - tipo / tipo_comprobante (A, B, C)
    - fecha_desde y fecha_hasta (rango de fechas de emisión)
    - cliente_id / cliente (nombre, apellido, CUIT)
    - busqueda (patente, CAE, cliente)
    - paginación con mantenimiento de filtros
    """
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request, *args, **kwargs):
        queryset = (
            Factura.objects.select_related("orden_trabajo__vehiculo__cliente")
            .prefetch_related("orden_trabajo__items_presupuesto")
            .all()
        )

        estado_pago = request.query_params.get("estado_pago")
        if estado_pago:
            queryset = queryset.filter(estado_pago=estado_pago)

        tipo_comprobante = request.query_params.get("tipo") or request.query_params.get("tipo_comprobante")
        if tipo_comprobante:
            queryset = queryset.filter(tipo_comprobante=tipo_comprobante.upper())

        fecha_desde = request.query_params.get("fecha_desde")
        if fecha_desde:
            queryset = queryset.filter(fecha_emision__date__gte=fecha_desde)

        fecha_hasta = request.query_params.get("fecha_hasta")
        if fecha_hasta:
            queryset = queryset.filter(fecha_emision__date__lte=fecha_hasta)

        cliente_id = request.query_params.get("cliente_id")
        if cliente_id:
            queryset = queryset.filter(orden_trabajo__vehiculo__cliente__id=cliente_id)

        cliente_filtro = request.query_params.get("cliente")
        if cliente_filtro:
            c = cliente_filtro.strip()
            queryset = queryset.filter(
                Q(orden_trabajo__vehiculo__cliente__nombre__icontains=c) |
                Q(orden_trabajo__vehiculo__cliente__apellido__icontains=c) |
                Q(orden_trabajo__vehiculo__cliente__dni_cuit__icontains=c)
            )

        busqueda = request.query_params.get("busqueda")
        if busqueda:
            b = busqueda.strip()
            queryset = queryset.filter(
                Q(orden_trabajo__vehiculo__cliente__nombre__icontains=b) |
                Q(orden_trabajo__vehiculo__cliente__apellido__icontains=b) |
                Q(orden_trabajo__vehiculo__cliente__dni_cuit__icontains=b) |
                Q(orden_trabajo__vehiculo__patente__icontains=b) |
                Q(cae__icontains=b)
            )

        page = request.query_params.get("page")
        limit = request.query_params.get("limit") or request.query_params.get("page_size")
        if page or limit:
            from rest_framework.pagination import PageNumberPagination
            paginator = PageNumberPagination()
            paginator.page_size = int(limit) if limit else 10
            page_obj = paginator.paginate_queryset(queryset, request)
            if page_obj is not None:
                serializer = FacturaSerializer(page_obj, many=True)
                return paginator.get_paginated_response(serializer.data)

        serializer = FacturaSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FacturaDetailView(APIView):
    """
    Detalle completo de una factura por su ID primario UUID.
    """
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request, id, *args, **kwargs):
        factura = (
            Factura.objects.select_related("orden_trabajo__vehiculo__cliente")
            .prefetch_related("orden_trabajo__items_presupuesto")
            .filter(id=id)
            .first()
        )
        if not factura:
            return Response(
                {"error": "Factura no encontrada."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = FacturaSerializer(factura)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FacturaCalendarioView(APIView):
    """
    TK062: Endpoint para agrupar comprobantes fiscales clasificados por fecha y semaforización:
    - 'sin_interaccion' (Gris)
    - 'pagada' (Verde claro)
    - 'a_vencer' (Verde)
    - 'vencida' (Rojo)
    """
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request, *args, **kwargs):
        facturas = (
            Factura.objects.select_related("orden_trabajo__vehiculo__cliente")
            .filter(estado=EstadoFactura.EMITIDA)
            .order_by("fecha_vencimiento_pago", "-fecha_emision")
        )

        serializer = FacturaCalendarioSerializer(facturas, many=True)
        
        # Resumen estadístico financiero para el encabezado del panel
        total_facturado = sum([f.total for f in facturas])
        total_pagado = sum([f.total for f in facturas if f.estado_pago == EstadoPago.PAGADA])
        total_vencido = sum([f.total for f in facturas if f.semaforo_color == "vencida"])
        total_a_vencer = sum([f.total for f in facturas if f.semaforo_color == "a_vencer"])

        return Response({
            "facturas": serializer.data,
            "resumen": {
                "total_facturado": total_facturado,
                "total_pagado": total_pagado,
                "total_vencido": total_vencido,
                "total_a_vencer": total_a_vencer,
                "cantidad_comprobantes": facturas.count()
            }
        }, status=status.HTTP_200_OK)


class ActualizarEstadoPagoFacturaView(APIView):
    """
    Permite actualizar el estado de cobro/interacción de una factura.
    """
    permission_classes = [IsAuthenticated, EsAdministrador]

    def patch(self, request, id, *args, **kwargs):
        factura = Factura.objects.filter(id=id).first()
        if not factura:
            return Response({"error": "Factura no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        nuevo_estado = request.data.get("estado_pago")
        if nuevo_estado not in [choice[0] for choice in EstadoPago.choices]:
            return Response(
                {"error": f"Estado de pago inválido. Opciones válidas: {[c[0] for c in EstadoPago.choices]}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        factura.estado_pago = nuevo_estado
        factura.save()

        return Response(
            FacturaSerializer(factura).data,
            status=status.HTTP_200_OK
        )
