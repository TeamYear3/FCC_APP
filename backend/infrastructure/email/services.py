import logging
from typing import List, Optional
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)


def send_email_service(
    subject: str,
    message: str,
    recipient_list: List[str],
    html_message: Optional[str] = None,
    from_email: Optional[str] = None,
) -> bool:
    """
    Servicio utilitario reutilizable para el envío de correos electrónicos vía SMTP en Django.
    Puede ser consumido por los módulos de Órdenes, Turnos y Autenticación.
    
    Args:
        subject (str): Asunto del correo.
        message (str): Cuerpo del mensaje en texto plano.
        recipient_list (List[str]): Lista de correos electrónicos de los destinatarios.
        html_message (Optional[str]): Cuerpo alternativo en formato HTML.
        from_email (Optional[str]): Remitente personalizado. Si no se provee, utiliza DEFAULT_FROM_EMAIL.
        
    Returns:
        bool: True si el envío fue exitoso (al menos 1 mensaje enviado), False en caso de error.
    """
    if not recipient_list:
        logger.warning("Intento de envío de correo sin destinatarios especificados en recipient_list.")
        return False

    remitente = from_email or getattr(settings, "DEFAULT_FROM_EMAIL", "FCC App <noreply@fccapp.com>")

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=message,
            from_email=remitente,
            to=recipient_list,
        )
        if html_message:
            email.attach_alternative(html_message, "text/html")

        enviados = email.send(fail_silently=False)
        if enviados > 0:
            logger.info(f"Correo '{subject}' enviado exitosamente a {recipient_list}")
            return True
        else:
            logger.warning(f"No se pudo enviar el correo '{subject}' a {recipient_list} (cero mensajes enviados).")
            return False
    except Exception as e:
        logger.error(f"Error al enviar correo '{subject}' a {recipient_list}: {str(e)}", exc_info=True)
        return False
