import logging
import threading
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.template.loader import render_to_string
from django.contrib.auth import get_user_model
from core.utils.email_service import send_email_service

logger = logging.getLogger(__name__)
Usuario = get_user_model()


def enviar_email_bienvenida_background(email, nombre="", apellido="", rol="cliente"):
    """
    Función utilitaria ejecutada en segundo plano para enviar el correo
    formal de bienvenida al nuevo usuario registrado en la plataforma.
    """
    try:
        if not email:
            logger.warning("No se puede enviar email de bienvenida porque no se especificó un email.")
            return

        nombre_completo = f"{nombre} {apellido}".strip() or email
        roles_dict = {
            "admin": "Administrador",
            "tecnico": "Técnico Especialista",
            "cliente": "Cliente"
        }
        rol_display = roles_dict.get(rol, rol.capitalize())

        portal_base_url = getattr(settings, "CLIENT_PORTAL_URL", "https://fccapp.com").rstrip("/")
        enlace_portal = f"{portal_base_url}/login"

        subject = f"¡Bienvenido a FCC App, {nombre_completo}!"

        message = (
            f"Hola {nombre_completo},\n\n"
            f"Te damos una cordial bienvenida a la plataforma oficial del taller FCC App.\n\n"
            f"Tu cuenta ha sido creada exitosamente:\n"
            f"- Correo: {email}\n"
            f"- Rol asignado: {rol_display}\n\n"
            f"Puedes acceder a tu panel ingresando a:\n"
            f"{enlace_portal}\n\n"
            f"Atentamente,\n"
            f"El equipo de FCC App"
        )
        context = {
            "nombre_usuario": nombre_completo,
            "email": email,
            "rol_display": rol_display,
            "enlace_portal": enlace_portal,
        }

        try:
            html_message = render_to_string("usuarios/email_bienvenida.html", context)

        except Exception:
            # Fallback seguro para entornos con Python 3.14 e instrumentación de templates
            html_message = (
                f"<html><body style='font-family: sans-serif; background: #0B0B0B; color: #FFF; padding: 20px;'>"
                f"<div style='max-width: 600px; margin: auto; background: #1E1E1E; padding: 30px; border-radius: 12px; border-left: 4px solid #FFCC00;'>"
                f"<h1 style='color: #FFCC00;'>¡Bienvenido a FCC App!</h1>"
                f"<p>Hola <strong>{nombre_completo}</strong>,</p>"
                f"<p>Tu cuenta ha sido creada con éxito con el rol <strong>{rol_display}</strong>.</p>"
                f"<p><a href='{enlace_portal}' style='background: #FFCC00; color: #0B0B0B; padding: 10px 20px; border-radius: 20px; text-decoration: none; font-weight: bold;'>Ingresar a la Plataforma</a></p>"
                f"</div></body></html>"
            )

        send_email_service(
            subject=subject,
            message=message,
            recipient_list=[email],
            html_message=html_message
        )
    except Exception as e:
        logger.error(
            f"Error al enviar el correo de bienvenida en segundo plano para {email}: {str(e)}",
            exc_info=True
        )



@receiver(post_save, sender=Usuario)
def usuario_creado_bienvenida_signal(sender, instance, created, **kwargs):
    """
    Señal de Django para disparar automáticamente el correo de bienvenida
    cuando se registra un nuevo usuario en la base de datos.
    """
    if created and instance.email:
        try:
            threading.Thread(
                target=enviar_email_bienvenida_background,
                args=(instance.email, instance.nombre, instance.apellido, instance.rol),
                daemon=True
            ).start()
        except Exception as e:
            logger.error(
                f"Error al iniciar el hilo de email de bienvenida para el usuario {instance.id}: {str(e)}",
                exc_info=True
            )

