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
        ).prefetch_related('ordenes_asignadas__vehiculo').order_by('nombre', 'email')

        mecanicos_data = []

        for tec in tecnicos:
            ots_activas = tec.ots_activas_count
            ots_totales = tec.ots_totales_count
            porcentaje_carga = min(100, int((ots_activas / CAPACIDAD_MAXIMA_MECANICO) * 100))

            ordenes_activas = [o for o in tec.ordenes_asignadas.all() if o.estado in ESTADOS_ACTIVOS]
            ordenes_activas.sort(key=lambda o: (o.fecha_ingreso or o.creado_en), reverse=True)
            ultima_ot = ordenes_activas[0] if ordenes_activas else None

            ot_activa_numero = None
            ot_activa_vehiculo = None
            ot_activa_estado = 'Disponible' if ots_activas == 0 else 'Activo'

            if ultima_ot:
                ot_activa_numero = ultima_ot.numero_ot
                if ultima_ot.vehiculo:
                    ot_activa_vehiculo = f"{ultima_ot.vehiculo.marca} {ultima_ot.vehiculo.modelo}".strip()
                ot_activa_estado = ultima_ot.get_estado_display() or ultima_ot.estado

            mecanicos_data.append({
                'id': str(tec.id),
                'nombre': f"{tec.nombre} {tec.apellido}".strip() or tec.email,
                'email': tec.email,
                'estado': 'Activo' if tec.is_active else 'Inactivo',
                'ots_asignadas': ots_totales,
                'ots_activas': ots_activas,
                'porcentaje_carga': porcentaje_carga,
                'ot_activa_numero': ot_activa_numero,
                'ot_activa_vehiculo': ot_activa_vehiculo,
                'ot_activa_estado': ot_activa_estado
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

