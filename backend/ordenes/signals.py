import logging
import threading
from django.conf import settings
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.template.loader import render_to_string
from core.utils.email_service import send_email_service
from .models import OrdenTrabajo, ItemPresupuesto
from .services import (
    recalcular_monto_total_orden,
    evaluar_transicion_presupuesto,
    notificar_presupuesto_websocket
)

logger = logging.getLogger(__name__)


@receiver(post_save, sender=ItemPresupuesto)
def procesar_cambios_post_save_item(sender, instance, created, **kwargs):
    if instance.orden_trabajo:
        recalcular_monto_total_orden(instance.orden_trabajo)
        evaluar_transicion_presupuesto(instance.orden_trabajo)
        notificar_presupuesto_websocket(instance.orden_trabajo)


@receiver(post_delete, sender=ItemPresupuesto)
def procesar_cambios_post_delete_item(sender, instance, **kwargs):
    if instance.orden_trabajo:
        recalcular_monto_total_orden(instance.orden_trabajo)


def enviar_email_orden_background(orden_id):
    """
    Función utilitaria ejecutada en segundo plano para enviar el correo
    informativo de creación de Orden de Trabajo al cliente.
    """
    try:
        orden = OrdenTrabajo.objects.select_related("vehiculo__cliente__usuario").get(id=orden_id)
        cliente = orden.vehiculo.cliente

        if not cliente.usuario or not cliente.usuario.email:
            logger.warning(
                f"No se pudo enviar el correo de la OT {orden.numero_ot} porque el cliente "
                f"'{cliente.nombre} {cliente.apellido}' no tiene un usuario o email asociado."
            )
            return

        email_cliente = cliente.usuario.email
        nombre_cliente = f"{cliente.nombre} {cliente.apellido}"
        
        # Enlace único al portal
        portal_base_url = getattr(settings, "CLIENT_PORTAL_URL", "https://fccapp.com").rstrip("/")
        enlace_portal = f"{portal_base_url}/portal/ordenes/{orden.numero_ot}"

        subject = f"Nueva Orden de Trabajo - {orden.numero_ot}"
        
        # Texto plano
        message = (
            f"Hola {nombre_cliente},\n\n"
            f"Se ha registrado con éxito una nueva Orden de Trabajo para tu vehículo en nuestro taller.\n\n"
            f"Detalles de la Orden:\n"
            f"- Número de OT: {orden.numero_ot}\n"
            f"- Vehículo: {orden.vehiculo.marca} {orden.vehiculo.modelo} (Patente: {orden.vehiculo.patente})\n"
            f"- Descripción del problema: {orden.descripcion_problema}\n\n"
            f"Puedes realizar el seguimiento de tu orden en tiempo real ingresando a nuestro portal del cliente:\n"
            f"{enlace_portal}\n\n"
            f"Atentamente,\n"
            f"El equipo de FCC App"
        )

        # Renderizar la plantilla HTML con los estilos y colores corporativos
        context = {
            "nombre_cliente": nombre_cliente,
            "numero_ot": orden.numero_ot,
            "marca": orden.vehiculo.marca,
            "modelo": orden.vehiculo.modelo,
            "patente": orden.vehiculo.patente,
            "descripcion_problema": orden.descripcion_problema,
            "enlace_portal": enlace_portal,
        }
        html_message = render_to_string("ordenes/email_nueva_orden.html", context)

        send_email_service(
            subject=subject,
            message=message,
            recipient_list=[email_cliente],
            html_message=html_message
        )
    except Exception as e:
        logger.error(
            f"Error al enviar el correo en segundo plano para la OT ID {orden_id}: {str(e)}",
            exc_info=True
        )
    finally:
        if threading.current_thread() is not threading.main_thread():
            from django.db import connection
            connection.close()


@receiver(post_save, sender=OrdenTrabajo)
def orden_trabajo_creada_signal(sender, instance, created, **kwargs):
    """
    Señal de Django para disparar automáticamente el correo al cliente
    cuando se crea exitosamente una Orden de Trabajo.
    """
    if created:
        # Envío automático de email en segundo plano (asíncrono y no bloqueante)
        try:
            threading.Thread(
                target=enviar_email_orden_background,
                args=(instance.id,),
                daemon=True
            ).start()
        except Exception as e:
            # Fallback: registrar error en los logs pero no fallar la transacción de creación
            logger.error(
                f"Error al iniciar el hilo de envío de correo para la orden {instance.id}: {str(e)}",
                exc_info=True
            )

