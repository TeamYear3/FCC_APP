from decimal import Decimal
from django.db.models import Sum
from .models import OrdenTrabajo, EstadoOrden


def recalcular_monto_total_orden(orden: OrdenTrabajo) -> Decimal:
    """
    Recalcula el monto_total de una OrdenTrabajo sumando los subtotales
    de todos sus ItemPresupuesto asociados y actualiza la orden en PostgreSQL.
    """
    total = orden.items_presupuesto.aggregate(total=Sum('subtotal'))['total']
    if total is None:
        total = Decimal('0.00')
    
    orden.monto_total = total
    orden.save(update_fields=['monto_total', 'actualizado_en'])
    return total


def evaluar_transicion_presupuesto(orden: OrdenTrabajo) -> bool:
    """
    Evalúa y efectúa la transición automática de la OrdenTrabajo al estado 'EN_PRESUPUESTO'
    si se encuentra en estado 'INGRESADO' y posee ítems de presupuesto asociados.
    """
    if orden.estado == EstadoOrden.INGRESADO and orden.items_presupuesto.exists():
        orden.estado = EstadoOrden.EN_PRESUPUESTO
        orden.save(update_fields=['estado', 'actualizado_en'])
        return True
    return False

