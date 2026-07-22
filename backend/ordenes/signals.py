from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import ItemPresupuesto
from .services import recalcular_monto_total_orden, evaluar_transicion_presupuesto


@receiver(post_save, sender=ItemPresupuesto)
def procesar_cambios_post_save_item(sender, instance, created, **kwargs):
    if instance.orden_trabajo:
        recalcular_monto_total_orden(instance.orden_trabajo)
        evaluar_transicion_presupuesto(instance.orden_trabajo)


@receiver(post_delete, sender=ItemPresupuesto)
def procesar_cambios_post_delete_item(sender, instance, **kwargs):
    if instance.orden_trabajo:
        recalcular_monto_total_orden(instance.orden_trabajo)

