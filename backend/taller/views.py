from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum, Value, DecimalField
from django.db.models.functions import Coalesce
from decimal import Decimal
from core.permissions import EsAdministrador
from clientes.models import Cliente
from ordenes.models import OrdenTrabajo, EstadoOrden
from vehiculos.models import Vehiculo

Usuario = get_user_model()

CAPACIDAD_MAXIMA_MECANICO = 5

ESTADOS_ACTIVOS = [
    EstadoOrden.INGRESADO,
    EstadoOrden.EN_PRESUPUESTO,
    EstadoOrden.APROBADO,
    EstadoOrden.EN_PROCESO
]

class ResumenMecanicosView(views.APIView):
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request):
        tecnicos = Usuario.objects.filter(rol='tecnico').annotate(
            ots_totales_count=Count('ordenes_asignadas', distinct=True),
            ots_activas_count=Count(
                'ordenes_asignadas',
                filter=Q(ordenes_asignadas__estado__in=ESTADOS_ACTIVOS),
                distinct=True
            )
        ).order_by('nombre', 'email')

        mecanicos_data = []

        for tec in tecnicos:
            ots_activas = tec.ots_activas_count
            ots_totales = tec.ots_totales_count
            porcentaje_carga = min(100, int((ots_activas / CAPACIDAD_MAXIMA_MECANICO) * 100))

            mecanicos_data.append({
                'id': str(tec.id),
                'nombre': f"{tec.nombre} {tec.apellido}".strip() or tec.email,
                'email': tec.email,
                'estado': 'Activo' if tec.is_active else 'Inactivo',
                'ots_asignadas': ots_totales,
                'ots_activas': ots_activas,
                'porcentaje_carga': porcentaje_carga
            })

        return Response(mecanicos_data, status=status.HTTP_200_OK)


class ResumenClientesView(views.APIView):
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request):
        clientes = Cliente.objects.annotate(
            vehiculos_activos_count=Count(
                'vehiculos',
                filter=Q(vehiculos__activo=True),
                distinct=True
            ),
            ots_activas_count=Count(
                'vehiculos__ordenes',
                filter=Q(vehiculos__ordenes__estado__in=ESTADOS_ACTIVOS),
                distinct=True
            ),
            monto_total_agg=Coalesce(
                Sum('vehiculos__ordenes__monto_total'),
                Value(Decimal('0.00')),
                output_field=DecimalField()
            )
        ).order_by('apellido', 'nombre')

        clientes_data = []

        for c in clientes:
            codigo_cliente = f"CLI-{c.id.hex[:6].upper()}" if hasattr(c.id, 'hex') else f"CLI-{c.id}"

            clientes_data.append({
                'id': str(c.id),
                'nombre': c.nombre,
                'apellido': c.apellido,
                'dni_cuit': c.dni_cuit,
                'tipo_documento': c.tipo_documento,
                'vehiculos_count': c.vehiculos_activos_count,
                'ots_activas': c.ots_activas_count,
                'monto_total_facturado': float(c.monto_total_agg),
                'codigo_cliente': codigo_cliente
            })

        return Response(clientes_data, status=status.HTTP_200_OK)

