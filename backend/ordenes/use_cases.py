import logging
import threading
from django.conf import settings
from rest_framework.exceptions import ValidationError
from vehiculos.models import Vehiculo
from core.utils.email_service import send_email_service
from .models import OrdenTrabajo, EstadoOrden

logger = logging.getLogger(__name__)


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
        from django.template.loader import render_to_string
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
        import threading
        if threading.current_thread() is not threading.main_thread():
            from django.db import connection
            connection.close()




class CrearOrdenTrabajoUseCase:
    def execute(self, vehiculo_id, descripcion_problema, fecha_ingreso):
        try:
            vehiculo = Vehiculo.objects.get(id=vehiculo_id)
        except (Vehiculo.DoesNotExist, ValidationError, ValueError):
            raise ValidationError({"vehiculo_id": "El vehículo especificado no existe."})
        
        orden = OrdenTrabajo.objects.create(
            vehiculo=vehiculo,
            descripcion_problema=descripcion_problema,
            fecha_ingreso=fecha_ingreso,
            estado=EstadoOrden.INGRESADO
        )

        # Envío automático de email en segundo plano (asíncrono y no bloqueante)
        try:
            threading.Thread(
                target=enviar_email_orden_background,
                args=(orden.id,),
                daemon=True
            ).start()
        except Exception as e:
            # Fallback: registrar error en los logs pero no fallar la transacción de creación
            logger.error(
                f"Error al iniciar el hilo de envío de correo para la orden {orden.id}: {str(e)}",
                exc_info=True
            )

        return orden

