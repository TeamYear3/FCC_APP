import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from turnos.models import Turno
from core.utils.email_service import send_email_service

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Envía correos electrónicos automáticos de recordatorio a los clientes "
        "con citas de turnos agendadas con 24 horas de anticipación (TK203 / US-17)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--horas",
            type=int,
            default=24,
            help="Horas de anticipación para filtrar turnos a notificar (por defecto: 24).",
        )
        parser.add_argument(
            "--margen",
            type=int,
            default=1,
            help="Margen en horas antes y después del objetivo de anticipación (por defecto: 1).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simula la ejecución y lista los destinatarios sin realizar el envío efectivo de correos.",
        )

    def handle(self, *args, **options):
        horas = options["horas"]
        margen = options["margen"]
        dry_run = options["dry_run"]

        ahora = timezone.now()
        inicio_ventana = ahora + timedelta(hours=max(0, horas - margen))
        fin_ventana = ahora + timedelta(hours=horas + margen)

        self.stdout.write(
            self.style.NOTICE(
                f"[INFO] Buscando turnos pendientes con fecha entre {inicio_ventana.isoformat()} y {fin_ventana.isoformat()} (objetivo: {horas}h)..."
            )
        )

        turnos = (
            Turno.objects.select_related("cliente__usuario", "vehiculo")
            .filter(
                estado="pendiente",
                recordatorio_enviado_en__isnull=True,
                fecha_hora__gte=inicio_ventana,
                fecha_hora__lte=fin_ventana,
            )
            .order_by("fecha_hora")
        )

        total_turnos = turnos.count()
        self.stdout.write(f"[INFO] Se encontraron {total_turnos} turnos en la ventana de anticipación.")

        if total_turnos == 0:
            self.stdout.write(self.style.SUCCESS("[OK] No hay turnos pendientes para recordar en este período."))
            return

        enviados = 0
        fallidos = 0
        omitidos = 0

        for turno in turnos:
            cliente = turno.cliente
            vehiculo = turno.vehiculo
            destinatario = cliente.email or (cliente.usuario.email if cliente.usuario else None)

            if not destinatario:
                self.stdout.write(
                    self.style.WARNING(
                        f"[OMITIDO] Turno #{turno.id} omitido: El cliente {cliente.nombre} {cliente.apellido} no posee email registrado."
                    )
                )
                omitidos += 1
                continue

            fecha_hora_formateada = timezone.localtime(turno.fecha_hora).strftime("%d/%m/%Y a las %H:%M hs")
            vehiculo_str = f"{vehiculo.marca} {vehiculo.modelo} ({vehiculo.patente})" if vehiculo else "Vehículo no asignado"

            asunto = "Recordatorio de Turno de Taller - Full Check Car"
            cuerpo_texto = (
                f"Estimado/a {cliente.nombre} {cliente.apellido},\n\n"
                f"Le recordamos que tiene un turno agendado en Full Check Car para su vehículo {vehiculo_str}.\n"
                f"Fecha y Hora: {fecha_hora_formateada}\n"
                f"Motivo: {turno.motivo}\n\n"
                f"Por favor, recuerde presentarse con 10 minutos de anticipación en el taller.\n"
                f"Ante cualquier consulta o necesidad de reprogramación, comuníquese con nosotros.\n\n"
                f"Saludos cordiales,\nEquipo de Full Check Car"
            )

            cuerpo_html = f"""
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
                <h2 style="color: #2563eb; margin-top: 0;">Recordatorio de Turno Agendado</h2>
                <p>Estimado/a <strong>{cliente.nombre} {cliente.apellido}</strong>,</p>
                <p>Le recordamos que tiene un turno programado en <strong>Full Check Car</strong>:</p>
                <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0;">
                    <p style="margin: 4px 0;"><strong>Fecha y Hora:</strong> {fecha_hora_formateada}</p>
                    <p style="margin: 4px 0;"><strong>Vehículo:</strong> {vehiculo_str}</p>
                    <p style="margin: 4px 0;"><strong>Motivo:</strong> {turno.motivo}</p>
                </div>
                <p style="color: #64748b; font-size: 14px;">Le solicitamos presentarse con 10 minutos de anticipación para agilizar la recepción técnica.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Full Check Car - Sistema Integral de Gestión de Taller</p>
            </div>
            """

            if dry_run:
                self.stdout.write(
                    f"[DRY-RUN] Simulado envío a {destinatario} para Turno #{turno.id} ({fecha_hora_formateada})"
                )
                enviados += 1
            else:
                exito = send_email_service(
                    subject=asunto,
                    message=cuerpo_texto,
                    recipient_list=[destinatario],
                    html_message=cuerpo_html,
                )
                if exito:
                    enviados += 1
                    turno.recordatorio_enviado_en = timezone.now()
                    turno.save(update_fields=["recordatorio_enviado_en"])
                    self.stdout.write(
                        self.style.SUCCESS(f"[ENVIADO] Recordatorio enviado a {destinatario} (Turno #{turno.id})")
                    )
                else:
                    fallidos += 1
                    self.stdout.write(
                        self.style.ERROR(f"[ERROR] Falló envío a {destinatario} (Turno #{turno.id})")
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n[RESUMEN] Proceso finalizado. Total turnos: {total_turnos} | Enviados: {enviados} | Omitidos: {omitidos} | Fallidos: {fallidos}"
            )
        )
