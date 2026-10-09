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



def vincular_o_crear_cliente_usuario(usuario):
    """
    TK149: Vincula un nuevo usuario con una ficha preexistente de Cliente
    que coincida por email y esté huérfana (usuario=None), o crea una ficha base de Cliente.
    """
    if getattr(usuario, "rol", "cliente") != "cliente":
        return None

    try:
        from clientes.models import Cliente
        import random

        # Si ya tiene un perfil vinculado, no hacer nada
        if hasattr(usuario, "cliente_perfil") and usuario.cliente_perfil:
            return usuario.cliente_perfil

        email_normalizado = usuario.email.strip().lower() if usuario.email else ""
        if email_normalizado:
            # 1. Buscar coincidencia con ficha huérfana por email
            cliente_existente = Cliente.objects.filter(
                email__iexact=email_normalizado,
                usuario__isnull=True
            ).first()

            if cliente_existente:
                cliente_existente.usuario = usuario
                if not cliente_existente.nombre and usuario.nombre:
                    cliente_existente.nombre = usuario.nombre
                if not cliente_existente.apellido and usuario.apellido:
                    cliente_existente.apellido = usuario.apellido
                cliente_existente.save()
                return cliente_existente

        # 2. Si no existe ficha previa huérfana, generar una ficha base de Cliente
        dni_candidato = f"{abs(hash(str(usuario.id))) % 90000000 + 10000000}"
        while Cliente.objects.filter(dni_cuit=dni_candidato).exists():
            dni_candidato = str(random.randint(10000000, 99999999))

        return Cliente.objects.create(
            usuario=usuario,
            nombre=usuario.nombre or "Cliente",
            apellido=usuario.apellido or "",
            email=usuario.email,
            tipo_documento="DNI",
            dni_cuit=dni_candidato,
            condicion_iva="CF"
        )
    except Exception as e:
        logger.error(
            f"Error al vincular o crear ficha de cliente para usuario {usuario.id}: {str(e)}",
            exc_info=True
        )
        return None


@receiver(post_save, sender=Usuario)
def usuario_creado_signals(sender, instance, created, **kwargs):
    """
    Señal de Django para:
    1. Vincular o crear ficha de Cliente al registrarse un nuevo usuario (TK149).
    2. Disparar automáticamente el correo de bienvenida en segundo plano.
    """
    if created:
        vincular_o_crear_cliente_usuario(instance)

        if instance.email:
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


