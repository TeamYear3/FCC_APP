from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from core.permissions import EsAdministrador, EsTecnico, EsCliente
from rest_framework.exceptions import NotFound, PermissionDenied
from .models import Vehiculo
from .serializers import VehiculoSerializer


class CrearVehiculoView(generics.ListCreateAPIView):
    serializer_class = VehiculoSerializer

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'rol', None) == 'cliente':
            return Vehiculo.objects.filter(activo=True, cliente__usuario=user)

        queryset = Vehiculo.objects.filter(activo=True)
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        return queryset

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]
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
        return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]

    def get_queryset(self):
        vehiculo_id = self.kwargs.get('pk')
        try:
            vehiculo = Vehiculo.objects.select_related('cliente__usuario').get(id=vehiculo_id)
        except Vehiculo.DoesNotExist:
            raise NotFound("El vehículo especificado no existe.")

        user = self.request.user
        if getattr(user, 'rol', None) == 'cliente':
            if not vehiculo.cliente or vehiculo.cliente.usuario_id != user.id:
                raise PermissionDenied("No tiene autorización para consultar la información de este vehículo.")

        return OrdenTrabajo.objects.filter(vehiculo_id=vehiculo_id).order_by('-fecha_ingreso', '-creado_en')


import io
from django.http import HttpResponse
from rest_framework.views import APIView
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


class ExportarHistorialPDFView(APIView):
    def get_permissions(self):
        return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]

    def get(self, request, pk):
        try:
            vehiculo = Vehiculo.objects.select_related('cliente__usuario').get(id=pk, activo=True)
        except Vehiculo.DoesNotExist:
            raise NotFound("El vehículo especificado no existe.")

        if getattr(request.user, 'rol', None) == 'cliente':
            if not vehiculo.cliente or vehiculo.cliente.usuario_id != request.user.id:
                raise PermissionDenied("No tiene autorización para exportar la información de este vehículo.")

        ordenes = OrdenTrabajo.objects.filter(vehiculo=vehiculo).order_by('-fecha_ingreso', '-creado_en')

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
            fontSize=10,
            textColor=colors.HexColor('#666666'),
            spaceAfter=12
        )
        heading_style = ParagraphStyle(
            'HeadingStyle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            textColor=colors.HexColor('#1E1E1E'),
            spaceAfter=6
        )
        cell_style = ParagraphStyle(
            'CellStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9
        )
        header_cell_style = ParagraphStyle(
            'HeaderCellStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            textColor=colors.whitesmoke
        )

        story = []

        # Encabezado
        story.append(Paragraph("HISTORIAL DE SERVICIOS Y MANTENIMIENTO", title_style))
        story.append(Paragraph("Taller FCC APP - Reporte Oficial de Vehículo", subtitle_style))
        story.append(Spacer(1, 10))

        # Información del Vehículo
        cliente_nombre = f"{vehiculo.cliente.nombre} {vehiculo.cliente.apellido}" if vehiculo.cliente else "N/A"
        cliente_doc = f"{vehiculo.cliente.tipo_documento}: {vehiculo.cliente.dni_cuit}" if vehiculo.cliente else "N/A"
        chasis_val = getattr(vehiculo, 'numero_chasis', None) or 'N/A'

        info_data = [
            [Paragraph("<b>Patente:</b> " + vehiculo.patente, cell_style), Paragraph("<b>Marca/Modelo:</b> " + f"{vehiculo.marca} {vehiculo.modelo}", cell_style)],
            [Paragraph("<b>Año:</b> " + str(vehiculo.anio or 'N/A'), cell_style), Paragraph("<b>Kilometraje:</b> " + f"{vehiculo.kilometraje:,} km", cell_style)],
            [Paragraph("<b>N° Chasis:</b> " + str(chasis_val), cell_style), Paragraph("<b>Cliente:</b> " + cliente_nombre, cell_style)],
            [Paragraph("<b>Doc. Cliente:</b> " + cliente_doc, cell_style), Paragraph("", cell_style)]
        ]

        info_table = Table(info_data, colWidths=[260, 260])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F4F4F5')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E4E4E7')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E4E4E7')),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 15))

        # Tabla de Intervenciones
        story.append(Paragraph("Detalle de Órdenes de Trabajo", heading_style))

        table_data = [
            [
                Paragraph("N° OT", header_cell_style),
                Paragraph("Fecha", header_cell_style),
                Paragraph("Estado", header_cell_style),
                Paragraph("Descripción del Problema", header_cell_style),
                Paragraph("Monto Total", header_cell_style)
            ]
        ]

        if not ordenes.exists():
            table_data.append([
                Paragraph("N/A", cell_style),
                Paragraph("-", cell_style),
                Paragraph("-", cell_style),
                Paragraph("Sin intervenciones registradas", cell_style),
                Paragraph("$0.00", cell_style)
            ])
        else:
            for ot in ordenes:
                table_data.append([
                    Paragraph(ot.numero_ot or 'N/A', cell_style),
                    Paragraph(str(ot.fecha_ingreso), cell_style),
                    Paragraph(ot.get_estado_display(), cell_style),
                    Paragraph(ot.descripcion_problema[:60] + ('...' if len(ot.descripcion_problema) > 60 else ''), cell_style),
                    Paragraph(f"${ot.monto_total:.2f}", cell_style)
                ])

        ots_table = Table(table_data, colWidths=[70, 70, 80, 210, 90])
        ots_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E1E1E')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('ALIGN', (4,0), (4,-1), 'RIGHT'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E4E4E7')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9F9FB')])
        ]))

        story.append(ots_table)

        doc.build(story)
        pdf_value = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_value, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="historial_vehiculo_{vehiculo.patente}.pdf"'
        return response


from clientes.models import Cliente
from rest_framework import status


class ReasignarVehiculoView(APIView):
    def get_permissions(self):
        return [IsAuthenticated(), EsAdministrador()]

    def post(self, request, pk):
        nuevo_cliente_id = request.data.get('nuevo_cliente_id') or request.data.get('cliente_id')
        if not nuevo_cliente_id:
            return Response({'detail': 'Debe especificar el ID del nuevo cliente.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            vehiculo = Vehiculo.objects.get(id=pk)
        except Vehiculo.DoesNotExist:
            raise NotFound("El vehículo especificado no existe.")

        try:
            nuevo_cliente = Cliente.objects.get(id=nuevo_cliente_id)
        except Cliente.DoesNotExist:
            return Response({'detail': 'El cliente destino especificado no existe.'}, status=status.HTTP_400_BAD_REQUEST)

        vehiculo.cliente = nuevo_cliente
        vehiculo.activo = True
        vehiculo.save()

        serializer = VehiculoSerializer(vehiculo)
        return Response(serializer.data, status=status.HTTP_200_OK)


from .models import MantenimientoProgramado
from .serializers import MantenimientoProgramadoSerializer

class MantenimientoProgramadoView(generics.ListCreateAPIView):
    serializer_class = MantenimientoProgramadoSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), (EsAdministrador | EsTecnico | EsCliente)()]
        return [IsAuthenticated(), (EsAdministrador | EsTecnico)()]

    def get_queryset(self):
        vehiculo_id = self.kwargs.get('pk')
        try:
            vehiculo = Vehiculo.objects.select_related('cliente__usuario').get(id=vehiculo_id)
        except Vehiculo.DoesNotExist:
            raise NotFound("El vehículo especificado no existe.")

        user = self.request.user
        if getattr(user, 'rol', None) == 'cliente':
            if not vehiculo.cliente or vehiculo.cliente.usuario_id != user.id:
                raise PermissionDenied("No tiene autorización para consultar los mantenimientos de este vehículo.")

        return MantenimientoProgramado.objects.filter(vehiculo_id=vehiculo_id).order_by('-creado_en')

    def perform_create(self, serializer):
        vehiculo_id = self.kwargs.get('pk')
        try:
            vehiculo = Vehiculo.objects.get(id=vehiculo_id)
        except Vehiculo.DoesNotExist:
            raise NotFound("El vehículo especificado no existe.")

        serializer.save(vehiculo=vehiculo)



