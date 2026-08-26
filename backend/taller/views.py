from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
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
        tecnicos = Usuario.objects.filter(rol='tecnico').order_by('nombre', 'email')
        mecanicos_data = []

        for tec in tecnicos:
            ots_qs = OrdenTrabajo.objects.filter(tecnico=tec)
            ots_activas_count = ots_qs.filter(estado__in=ESTADOS_ACTIVOS).count()
            ots_totales_count = ots_qs.count()

            porcentaje_carga = min(100, int((ots_activas_count / CAPACIDAD_MAXIMA_MECANICO) * 100))

            mecanicos_data.append({
                'id': str(tec.id),
                'nombre': f"{tec.nombre} {tec.apellido}".strip() or tec.email,
                'email': tec.email,
                'estado': 'Activo' if tec.is_active else 'Inactivo',
                'ots_asignadas': ots_totales_count,
                'ots_activas': ots_activas_count,
                'porcentaje_carga': porcentaje_carga
            })

        return Response(mecanicos_data, status=status.HTTP_200_OK)


class ResumenClientesView(views.APIView):
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request):
        clientes = Cliente.objects.all().order_by('apellido', 'nombre')
        clientes_data = []

        for c in clientes:
            vehiculos_count = Vehiculo.objects.filter(cliente=c, activo=True).count()
            ots_activas_count = OrdenTrabajo.objects.filter(
                vehiculo__cliente=c,
                estado__in=ESTADOS_ACTIVOS
            ).count()

            monto_total_agg = OrdenTrabajo.objects.filter(
                vehiculo__cliente=c
            ).aggregate(total=Sum('monto_total'))['total'] or 0

            codigo_cliente = f"CLI-{c.id.hex[:6].upper()}" if hasattr(c.id, 'hex') else f"CLI-{c.id}"

            clientes_data.append({
                'id': str(c.id),
                'nombre': c.nombre,
                'apellido': c.apellido,
                'dni_cuit': c.dni_cuit,
                'tipo_documento': c.tipo_documento,
                'vehiculos_count': vehiculos_count,
                'ots_activas': ots_activas_count,
                'monto_total_facturado': float(monto_total_agg),
                'codigo_cliente': codigo_cliente
            })

        return Response(clientes_data, status=status.HTTP_200_OK)
