from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from core.permissions import EsAdministrador, EsTecnico, EsCliente
from .models import OrdenTrabajo, HistorialEstadoOrden, AdjuntoDiagnostico, ItemPresupuesto, EstadoCobro, EstadoOrden
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

        # Filtros acumulativos TK056 & TK119
        search = self.request.query_params.get('search') or self.request.query_params.get('busqueda') or self.request.query_params.get('q')

        numero_ot = self.request.query_params.get('numero_ot')
        if numero_ot:
            queryset = queryset.filter(numero_ot__icontains=numero_ot.strip())

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
                Q(vehiculo__cliente__nombre__icontains=term) |
                Q(vehiculo__cliente__apellido__icontains=term) |
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
                    Q(vehiculo__cliente__dni_cuit__icontains=cliente_term)
                )

        if search:
            search_term = search.strip()
            queryset = queryset.filter(
                Q(vehiculo__patente__icontains=search_term) |
                Q(vehiculo__cliente__nombre__icontains=search_term) |
                Q(vehiculo__cliente__apellido__icontains=search_term) |
                Q(vehiculo__cliente__dni_cuit__icontains=search_term) |
                Q(numero_ot__icontains=search_term)
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

        complejidad = self.request.query_params.get('complejidad')
        if complejidad and complejidad.lower() != 'todas':
            queryset = queryset.filter(complejidad__iexact=complejidad.strip())

        return queryset


CrearOrdenTrabajoView = ListarCrearOrdenTrabajoView


class DetalleOrdenTrabajoView(generics.RetrieveAPIView):
    """
    TK095: Endpoint GET /api/ordenes/<uuid:id>/
    Retorna el detalle completo de una Orden de Trabajo individual.
    Restringe el acceso si el rol es 'cliente' y la OT no pertenece a sus vehículos.
    """
    serializer_class = OrdenTrabajoSerializer
    lookup_field = 'id'
    lookup_url_kwarg = 'id'

    def get_permissions(self):
        return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]

    def get_queryset(self):
        return OrdenTrabajo.objects.select_related(
            'vehiculo__cliente__usuario', 'tecnico'
        ).prefetch_related(
            'items_presupuesto', 'adjuntos_diagnostico', 'historial_estados'
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

    def get(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo, id=orden_id)
        adjuntos = orden.adjuntos_diagnostico.all()
        serializer = AdjuntoDiagnosticoSerializer(adjuntos, many=True, context={'request': request})
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

