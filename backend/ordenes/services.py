import logging
from decimal import Decimal
from django.db.models import Sum
from .models import OrdenTrabajo, EstadoOrden

logger = logging.getLogger(__name__)


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


def notificar_presupuesto_websocket(orden: OrdenTrabajo) -> dict:
    """
    Emite una notificación WebSocket hacia el canal del cliente informando
    que el presupuesto de la OrdenTrabajo se encuentra listo y actualizado.
    """
    payload = {
        "event": "presupuesto_actualizado",
        "orden_id": str(orden.id),
        "numero_ot": orden.numero_ot,
        "patente": orden.vehiculo.patente if orden.vehiculo else None,
        "monto_total": str(orden.monto_total),
        "estado": orden.estado
    }

    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"orden_{orden.numero_ot}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "notificacion_presupuesto",
                    "data": payload
                }
            )
            logger.info(f"Notificación WebSocket enviada al grupo {group_name}: {payload}")
    except (ImportError, Exception) as e:
        logger.info(f"Notificación WebSocket registrada (fallback): {payload} - Info: {e}")

    return payload


