import base64
import io
import json
from datetime import timedelta
from decimal import Decimal
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
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

        with transaction.atomic():
            orden = (
                OrdenTrabajo.objects.select_for_update()
                .select_related("vehiculo__cliente")
                .prefetch_related("items_presupuesto")
                .get(id=orden_id)
            )
            cliente = orden.vehiculo.cliente if orden.vehiculo else None

            # Guarda de idempotencia pesimista ante concurrencia
            factura_existente = Factura.objects.filter(orden_trabajo=orden).first()
            if factura_existente:
                return Response(
                    {
                        "error": "La orden de trabajo ya posee una factura emitida.",
                        "orden_trabajo_id": ["Esta Orden de Trabajo ya posee una Factura emitida."],
                        "factura_id": str(factura_existente.id),
                        "numero_comprobante": factura_existente.numero_comprobante_formateado,
                        "cae": factura_existente.cae,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # La actualizacion de condicion_iva solo se efectiviza si la OT no tiene factura
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
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        queryset = (
            Factura.objects.select_related("orden_trabajo__vehiculo__cliente")
            .prefetch_related("orden_trabajo__items_presupuesto")
            .all()
        )

        # Si el usuario es cliente, aislar estrictamente a sus comprobantes
        if getattr(request.user, "rol", None) == "cliente":
            cliente = getattr(request.user, "cliente", None)
            if not cliente:
                from clientes.models import Cliente
                cliente = Cliente.objects.filter(usuario=request.user).first()
            if not cliente:
                return Response([], status=status.HTTP_200_OK)
            queryset = queryset.filter(orden_trabajo__vehiculo__cliente=cliente)

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


class FacturaClienteListView(APIView):
    """
    TK206: Endpoint dedicado para que los clientes consulten sus facturas emitidas en el Portal Cliente.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        cliente = getattr(request.user, "cliente", None)
        if not cliente:
            from clientes.models import Cliente
            cliente = Cliente.objects.filter(usuario=request.user).first()

        if not cliente:
            return Response([], status=status.HTTP_200_OK)

        queryset = (
            Factura.objects.select_related("orden_trabajo__vehiculo__cliente")
            .prefetch_related("orden_trabajo__items_presupuesto")
            .filter(orden_trabajo__vehiculo__cliente=cliente)
            .order_by("-fecha_emision")
        )
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


class FacturaPDFView(APIView):
    """
    TK208: Endpoint GET /api/facturas/<uuid:id>/pdf/
    Generación y descarga de la representación oficial en PDF de la factura electrónica autorizada por ARCA,
    incluyendo código CAE, vencimiento fiscal, desglose de ítems y código QR oficial.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id, *args, **kwargs):
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors
            from reportlab.graphics.shapes import Drawing
            from reportlab.graphics.barcode.qr import QrCodeWidget
        except ImportError:
            return HttpResponse("Biblioteca ReportLab no disponible en este entorno.", status=501)

        factura = get_object_or_404(
            Factura.objects.select_related("orden_trabajo__vehiculo__cliente__usuario"),
            id=id
        )

        # Validación de autorización si el usuario es cliente
        if getattr(request.user, "rol", None) == "cliente":
            vehiculo = getattr(factura.orden_trabajo, "vehiculo", None)
            cliente = getattr(vehiculo, "cliente", None) if vehiculo else None
            cliente_usuario_id = getattr(cliente, "usuario_id", None)
            if not cliente or cliente_usuario_id != request.user.id:
                return Response(
                    {"error": "No tiene autorización para descargar este comprobante fiscal."},
                    status=status.HTTP_403_FORBIDDEN
                )

        orden = factura.orden_trabajo
        vehiculo = orden.vehiculo if orden else None
        cliente = vehiculo.cliente if vehiculo else None

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
            'FacTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=13,
            textColor=colors.HexColor('#111827'),
            spaceAfter=2
        )
        small_bold = ParagraphStyle(
            'FacSmallBold',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            textColor=colors.HexColor('#1F2937'),
            leading=10
        )
        small_regular = ParagraphStyle(
            'FacSmallRegular',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=7.5,
            textColor=colors.HexColor('#4B5563'),
            leading=10
        )
        letter_style = ParagraphStyle(
            'FacLetter',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=26,
            alignment=1,
            textColor=colors.HexColor('#111827')
        )
        letter_sub = ParagraphStyle(
            'FacLetterSub',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=7,
            alignment=1,
            textColor=colors.HexColor('#4B5563')
        )
        section_title = ParagraphStyle(
            'FacSectionTitle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=9,
            textColor=colors.HexColor('#1F2937'),
            spaceBefore=6,
            spaceAfter=3
        )
        table_header = ParagraphStyle(
            'FacTableHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            textColor=colors.HexColor('#FFFFFF'),
            leading=10
        )
        table_cell = ParagraphStyle(
            'FacTableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=7.5,
            textColor=colors.HexColor('#1F2937'),
            leading=10
        )
        table_cell_bold = ParagraphStyle(
            'FacTableCellBold',
            parent=table_cell,
            fontName='Helvetica-Bold'
        )

        elements = []

        # 1. ENCABEZADO FISCAL OFICIAL CON LETRA CENTRAL
        tipo_letra = factura.tipo_comprobante or "B"
        cod_cbte = "COD. 01" if tipo_letra == "A" else ("COD. 06" if tipo_letra == "B" else "COD. 11")

        col_izq = [
            Paragraph("<b>FCC TALLER MECÁNICO</b>", title_style),
            Paragraph("Razón Social: FCC Servicios Automotores S.A.", small_regular),
            Paragraph(f"<b>CUIT Emisor:</b> {factura.cuit_emisor}", small_regular),
            Paragraph("<b>Condición IVA:</b> IVA Responsable Inscripto", small_regular),
            Paragraph("<b>Domicilio Comercial:</b> Av. Colón 1234, Córdoba", small_regular),
        ]

        col_centro = [
            Paragraph(f"<b>{tipo_letra}</b>", letter_style),
            Paragraph(f"<b>{cod_cbte}</b>", letter_sub),
        ]

        fecha_emi_str = factura.fecha_emision.strftime('%d/%m/%Y') if factura.fecha_emision else "-"
        fecha_vto_pago_str = factura.fecha_vencimiento_pago.strftime('%d/%m/%Y') if factura.fecha_vencimiento_pago else "-"

        col_der = [
            Paragraph("<b>FACTURA ELECTRÓNICA</b>", title_style),
            Paragraph(f"<b>Punto de Venta:</b> {str(factura.punto_venta).zfill(4)} · <b>Comp. N°:</b> {str(factura.numero_factura).zfill(8)}", small_bold),
            Paragraph(f"<b>Fecha de Emisión:</b> {fecha_emi_str}", small_regular),
            Paragraph(f"<b>Fecha Vto. para el Pago:</b> {fecha_vto_pago_str}", small_regular),
            Paragraph(f"<b>Estado Comprobante:</b> {factura.estado.upper()}", small_bold),
        ]

        header_data = [[col_izq, col_centro, col_der]]
        header_table = Table(header_data, colWidths=[240, 60, 240])
        header_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#9CA3AF')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#D1D5DB')),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#F3F4F6')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 5))

        # 2. DATOS DEL CLIENTE / RECEPTOR
        nombre_cli = f"{cliente.nombre} {cliente.apellido}".strip() if cliente else "Consumidor Final"
        dni_cuit_cli = getattr(cliente, "dni_cuit", "-") or "-"
        cond_iva_cli = getattr(cliente, "condicion_iva", "CF") or "CF"
        cond_iva_map = {
            "RI": "Responsable Inscripto",
            "CF": "Consumidor Final",
            "EX": "Exento",
            "MT": "Monotributista"
        }
        cond_iva_desc = cond_iva_map.get(cond_iva_cli, cond_iva_cli)

        veh_str = f"{vehiculo.marca} {vehiculo.modelo} ({vehiculo.anio}) - Patente: {vehiculo.patente}" if vehiculo else "No registrado"
        ot_num = f"#{orden.numero_ot or str(orden.id)[:8]}" if orden else "-"

        cliente_data = [
            [
                Paragraph("<b>Apellido y Nombre / Razón Social:</b>", small_bold),
                Paragraph(nombre_cli, small_regular),
                Paragraph("<b>CUIT / DNI:</b>", small_bold),
                Paragraph(dni_cuit_cli, small_regular)
            ],
            [
                Paragraph("<b>Condición frente al IVA:</b>", small_bold),
                Paragraph(cond_iva_desc, small_regular),
                Paragraph("<b>Condición de Venta:</b>", small_bold),
                Paragraph("Contado / Cuenta Corriente", small_regular)
            ],
            [
                Paragraph("<b>Vehículo Asociado:</b>", small_bold),
                Paragraph(veh_str, small_regular),
                Paragraph("<b>Orden de Trabajo:</b>", small_bold),
                Paragraph(ot_num, small_regular)
            ]
        ]
        cliente_table = Table(cliente_data, colWidths=[140, 160, 110, 130])
        cliente_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F9FAFB')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#D1D5DB')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(cliente_table)
        elements.append(Spacer(1, 6))

        # 3. DETALLE DE ÍTEMS Y CONCEPTOS FACTURADOS
        elements.append(Paragraph("DETALLE DE CONCEPTOS LIQUIDADOS", section_title))
        items_header = [
            Paragraph("Tipo", table_header),
            Paragraph("Descripción del Concepto / Repuesto", table_header),
            Paragraph("Cant.", table_header),
            Paragraph("Precio Unitario", table_header),
            Paragraph("Subtotal", table_header)
        ]
        items_data = [items_header]

        items_presupuesto = list(orden.items_presupuesto.all()) if orden else []
        if items_presupuesto:
            for it in items_presupuesto:
                tipo_display = "Mano de Obra" if it.tipo == "mano_obra" else "Repuesto"
                subtotal_it = it.subtotal
                items_data.append([
                    Paragraph(tipo_display, table_cell),
                    Paragraph(it.descripcion or "-", table_cell),
                    Paragraph(f"{it.cantidad:.2f}", table_cell),
                    Paragraph(f"${it.precio_unitario:,.2f}", table_cell),
                    Paragraph(f"${subtotal_it:,.2f}", table_cell_bold),
                ])
        else:
            items_data.append([
                Paragraph("Servicio", table_cell),
                Paragraph(orden.descripcion_problema if orden else "Servicio de reparación automotriz", table_cell),
                Paragraph("1.00", table_cell),
                Paragraph(f"${factura.total:,.2f}", table_cell),
                Paragraph(f"${factura.total:,.2f}", table_cell_bold),
            ])

        # Totales
        subtotal_gravado = factura.total / Decimal("1.21") if tipo_letra == "A" else factura.total
        iva_liquidado = factura.total - subtotal_gravado if tipo_letra == "A" else Decimal("0.00")

        if tipo_letra == "A":
            items_data.append([
                Paragraph("", table_cell),
                Paragraph("<b>Subtotal Gravado (21%):</b>", table_cell),
                Paragraph("", table_cell),
                Paragraph("", table_cell),
                Paragraph(f"${subtotal_gravado:,.2f}", table_cell_bold)
            ])
            items_data.append([
                Paragraph("", table_cell),
                Paragraph("<b>IVA Liquidado (21%):</b>", table_cell),
                Paragraph("", table_cell),
                Paragraph("", table_cell),
                Paragraph(f"${iva_liquidado:,.2f}", table_cell_bold)
            ])

        items_data.append([
            Paragraph("", table_cell),
            Paragraph("<b>TOTAL FACTURADO:</b>", table_cell_bold),
            Paragraph("", table_cell),
            Paragraph("", table_cell),
            Paragraph(f"<b>${factura.total:,.2f}</b>", table_cell_bold)
        ])

        items_table = Table(items_data, colWidths=[70, 250, 45, 85, 90])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F2937')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#9CA3AF')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 8))

        # 4. PIE FISCAL OFICIAL ARCA CON QR Y CÓDIGO CAE
        qr_data = (
            f"https://www.afip.gob.ar/fe/qr/?p="
            f"{base64.b64encode(json.dumps({'ver':1,'fecha':fecha_emi_str,'cuit':30718293849,'ptoVta':factura.punto_venta,'tipoCmp':6 if tipo_letra=='B' else (1 if tipo_letra=='A' else 11),'nroCmp':factura.numero_factura,'importe':float(factura.total),'moneda':'PES','ctz':1,'tipoDocRec':96,'nroDocRec':int(dni_cuit_cli.replace('-','')) if dni_cuit_cli.replace('-','').isdigit() else 0,'tipoCodAut':'E','codAut':int(factura.cae) if factura.cae.isdigit() else 0}).encode('utf-8')).decode('utf-8')}"
        )

        qr_widget = QrCodeWidget(qr_data)
        bounds = qr_widget.getBounds()
        w = bounds[2] - bounds[0]
        h = bounds[3] - bounds[1]
        qr_drawing = Drawing(65, 65, transform=[65/w, 0, 0, 65/h, 0, 0])
        qr_drawing.add(qr_widget)

        fecha_vto_cae_str = factura.fecha_vencimiento_cae.strftime('%d/%m/%Y') if factura.fecha_vencimiento_cae else "-"

        pie_fiscal_info = [
            Paragraph("<b>Comprobante Autorizado por ARCA (Agencia de Recaudación y Control Aduanero)</b>", small_bold),
            Paragraph(f"<b>CAE N°:</b> <font size=10 color='#1E40AF'><b>{factura.cae}</b></font>", small_bold),
            Paragraph(f"<b>Fecha de Vencimiento de CAE:</b> {fecha_vto_cae_str}", small_regular),
            Paragraph("La validez de este comprobante puede ser contrastada escaneando el código QR fiscal o en arca.gob.ar.", small_regular)
        ]

        pie_table = Table([[qr_drawing, pie_fiscal_info]], colWidths=[75, 465])
        pie_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F3F4F6')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#9CA3AF')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(pie_table)

        doc.build(elements)
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        filename = f"factura_{factura.numero_comprobante_formateado}.pdf"
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response

