from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import ItemPresupuesto
from .services import recalcular_monto_total_orden


@receiver(post_save, sender=ItemPresupuesto)
@receiver(post_delete, sender=ItemPresupuesto)
def actualizar_monto_total_al_cambiar_item(sender, instance, **kwargs):
    if instance.orden_trabajo:
        recalcular_monto_total_orden(instance.orden_trabajo)
