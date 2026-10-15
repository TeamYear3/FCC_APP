import logging
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from core.utils.email_service import send_email_service

logger = logging.getLogger(__name__)


def enviar_notificacion_email_turno(turno, accion="confirmado"):
    """
    TK212: Envía una notificación por correo electrónico en tiempo real al cliente
    al asignar, confirmar o reprogramar un turno desde la agenda del taller (US-22).
    """
    cliente = getattr(turno, "cliente", None)
    if not cliente:
        logger.warning(f"[TK212] Turno #{turno.id} sin cliente asociado. Se omite notificación por email.")
        return False

    destinatario = cliente.email or (cliente.usuario.email if getattr(cliente, "usuario", None) else None)
    if not destinatario:
        logger.warning(f"[TK212] Cliente {cliente.nombre} {cliente.apellido} (Turno #{turno.id}) sin correo electrónico.")
        return False

    fecha_hora_formateada = timezone.localtime(turno.fecha_hora).strftime("%d/%m/%Y a las %H:%M hs")
    vehiculo = getattr(turno, "vehiculo", None)
    vehiculo_str = f"{vehiculo.marca} {vehiculo.modelo} ({vehiculo.patente})" if vehiculo else "Vehículo no asignado"
    nombre_cliente = f"{cliente.nombre} {cliente.apellido}".strip() or "Cliente"

    if accion == "modificado":
        asunto = "Turno Reprogramado - FCC Taller Mecánico"
    elif accion == "cancelado":
        asunto = "Cancelación de Turno - FCC Taller Mecánico"
    else:
        asunto = "Confirmación de Turno - FCC Taller Mecánico"

    context = {
        "subject": asunto,
        "accion": accion,
        "cliente_nombre": nombre_cliente,
        "fecha_hora": fecha_hora_formateada,
        "vehiculo": vehiculo_str,
        "motivo": turno.motivo or "Revisión general y diagnóstico",
        "estado": turno.estado.capitalize() if turno.estado else "Pendiente",
    }

    try:
        cuerpo_html = render_to_string("turnos/email_turno_confirmado.html", context)
    except Exception as exc:
        logger.warning(f"[TK212] Error renderizando plantilla HTML de turno: {exc}. Usando fallback.")
        cuerpo_html = None

    cuerpo_texto = (
        f"Hola {nombre_cliente},\n\n"
        f"Te informamos que tu turno en FCC Taller Mecánico ha sido {accion}.\n"
        f"Fecha y Hora: {fecha_hora_formateada}\n"
        f"Vehículo: {vehiculo_str}\n"
        f"Motivo: {turno.motivo}\n"
        f"Estado: {turno.estado}\n\n"
        f"Dirección: Av. Colón 1234, Córdoba Capital\n"
        f"Teléfono: (0351) 456-7890\n\n"
        f"Saludos cordiales,\nEquipo de FCC Taller Mecánico"
    )

    return send_email_service(
        subject=asunto,
        message=cuerpo_texto,
        recipient_list=[destinatario],
        html_message=cuerpo_html,
    )
