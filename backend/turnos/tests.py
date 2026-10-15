from io import StringIO
import uuid
from rest_framework.test import APITestCase
from rest_framework import status
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core import mail
from django.utils import timezone
from datetime import datetime, time, timedelta
from clientes.models import Cliente
from vehiculos.models import Vehiculo
from .models import Turno

Usuario = get_user_model()

class TurnoAPITests(APITestCase):

    def setUp(self):
        # Crear usuarios con roles correspondientes
        self.admin_user = Usuario.objects.create_user(
            email="admin@test.com",
            password="password123",
            nombre="Admin",
            apellido="Taller",
            rol="admin"
        )
        self.client_user_a = Usuario.objects.create_user(
            email="clienta@test.com",
            password="password123",
            nombre="Juan",
            apellido="Pérez",
            rol="cliente"
        )
        self.client_user_b = Usuario.objects.create_user(
            email="clientb@test.com",
            password="password123",
            nombre="María",
            apellido="Gómez",
            rol="cliente"
        )
        self.tecnico_user = Usuario.objects.create_user(
            email="tecnico@test.com",
            password="password123",
            nombre="Carlos",
            apellido="Técnico",
            rol="tecnico"
        )

        # Crear perfiles de cliente
        self.cliente_a = Cliente.objects.create(
            usuario=self.client_user_a,
            nombre="Juan",
            apellido="Pérez",
            tipo_documento="DNI",
            dni_cuit="12345678"
        )
        self.cliente_b = Cliente.objects.create(
            usuario=self.client_user_b,
            nombre="María",
            apellido="Gómez",
            tipo_documento="DNI",
            dni_cuit="87654321"
        )

        # Crear vehículos para cada cliente
        self.vehiculo_a = Vehiculo.objects.create(
            cliente=self.cliente_a,
            patente="AA123BB",
            marca="Ford",
            modelo="Fiesta"
        )
        self.vehiculo_b = Vehiculo.objects.create(
            cliente=self.cliente_b,
            patente="CC987DD",
            marca="Chevrolet",
            modelo="Onix"
        )

        # Definir una fecha base de pruebas futura en día hábil (Martes a las 10:00 hs)
        ahora = timezone.now()
        # Buscamos el próximo martes a futuro
        dias_hasta_martes = (1 - ahora.weekday() + 7) % 7
        if dias_hasta_martes == 0:
            dias_hasta_martes = 7
        fecha_martes = (ahora + timezone.timedelta(days=dias_hasta_martes)).date()
        self.fecha_base = timezone.make_aware(datetime.combine(fecha_martes, time(10, 0)))

    def test_rechazo_turno_en_el_pasado(self):
        """Prueba que no permite crear un turno con fecha u hora en el pasado (TK077)."""
        # Arrange
        self.client.force_authenticate(user=self.admin_user)
        fecha_pasada = timezone.now() - timezone.timedelta(days=1)
        payload = {
            "cliente": str(self.cliente_a.id),
            "vehiculo": str(self.vehiculo_a.id),
            "fecha_hora": fecha_pasada.isoformat(),
            "motivo": "Turno en el pasado"
        }
        # Act
        response = self.client.post(reverse('turno-list'), payload, format="json")

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fecha_hora", response.data)
        self.assertIn("pasado", str(response.data["fecha_hora"]))

    def test_rechazo_turno_dia_domingo(self):
        """Prueba que no permite crear un turno en día domingo (TK116)."""
        # Arrange
        self.client.force_authenticate(user=self.admin_user)
        ahora = timezone.now()
        # Buscamos el próximo domingo a futuro
        dias_hasta_domingo = (6 - ahora.weekday() + 7) % 7
        if dias_hasta_domingo == 0:
            dias_hasta_domingo = 7
        fecha_domingo = timezone.make_aware(
            datetime.combine((ahora + timezone.timedelta(days=dias_hasta_domingo)).date(), time(10, 0))
        )
        payload = {
            "cliente": str(self.cliente_a.id),
            "vehiculo": str(self.vehiculo_a.id),
            "fecha_hora": fecha_domingo.isoformat(),
            "motivo": "Turno Domingo No Permitido"
        }

        # Act
        response = self.client.post(reverse('turno-list'), payload, format="json")

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fecha_hora", response.data)
        self.assertIn("domingo", str(response.data["fecha_hora"]).lower())

    def test_normalizacion_timezone_nocturno_argentina(self):
        """Prueba que un turno a las 22:00 hs en Argentina cuenta para la fecha local y no el día siguiente UTC (TK077)."""
        # Arrange
        self.client.force_authenticate(user=self.admin_user)
        # 22:00 hs hora local Argentina de la fecha_base
        fecha_nocturna = timezone.make_aware(datetime.combine(self.fecha_base.date(), time(22, 0)))
        
        # Turno 1 a las 10:00 hs
        Turno.objects.create(
            cliente=self.cliente_a,
            vehiculo=self.vehiculo_a,
            fecha_hora=self.fecha_base,
            motivo="Turno Mañana"
        )
        # Turno 2 a las 14:00 hs
        Turno.objects.create(
            cliente=self.cliente_b,
            vehiculo=self.vehiculo_b,
            fecha_hora=timezone.make_aware(datetime.combine(self.fecha_base.date(), time(14, 0))),
            motivo="Turno Tarde"
        )
        
        # Intentar crear un tercer turno a las 22:00 hs (en UTC sería el día siguiente)
        payload = {
            "cliente": str(self.cliente_a.id),
            "vehiculo": str(self.vehiculo_a.id),
            "fecha_hora": fecha_nocturna.isoformat(),
            "motivo": "Turno Noche Excedente"
        }

        # Act
        response = self.client.post(reverse('turno-list'), payload, format="json")

        # Assert
        # Debe detectar sobrecupo en el día local
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(response.data["warning_overbooking"])

    def test_crud_turno_como_admin(self):
        """Prueba de flujo CRUD básico de Turno realizado por el Administrador."""
        # Arrange
        self.client.force_authenticate(user=self.admin_user)

        # 1. Crear Turno
        payload = {
            "cliente": str(self.cliente_a.id),
            "vehiculo": str(self.vehiculo_a.id),
            "fecha_hora": self.fecha_base.isoformat(),
            "motivo": "Cambio de aceite y filtro",
            "estado": "pendiente"
        }

        # Act
        response = self.client.post(reverse('turno-list'), payload, format="json")

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["warning_overbooking"])
        turno_id = response.data["id"]

        # 2. Leer Turno
        response = self.client.get(reverse('turno-detail', kwargs={'pk': turno_id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["motivo"], "Cambio de aceite y filtro")

        # 3. Actualizar Turno
        payload_update = {
            "motivo": "Alineación y balanceo",
            "estado": "completado"
        }
        response = self.client.patch(reverse('turno-detail', kwargs={'pk': turno_id}), payload_update, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["motivo"], "Alineación y balanceo")
        self.assertEqual(response.data["estado"], "completado")

        # 4. Eliminar Turno
        response = self.client.delete(reverse('turno-detail', kwargs={'pk': turno_id}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Turno.objects.filter(id=turno_id).exists())

    def test_validacion_vehiculo_no_pertenece_a_cliente(self):
        """Prueba que no permite crear un turno si el vehículo no es del cliente."""
        # Arrange
        self.client.force_authenticate(user=self.admin_user)

        # Vehículo B con Cliente A
        payload = {
            "cliente": str(self.cliente_a.id),
            "vehiculo": str(self.vehiculo_b.id),
            "fecha_hora": self.fecha_base.isoformat(),
            "motivo": "Revisión general"
        }

        # Act
        response = self.client.post(reverse('turno-list'), payload, format="json")

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("vehiculo", response.data)

    def test_sobrecupo_diario_y_forzado(self):
        """Prueba de la regla de sobre-cupo (2 turnos por día) y la capacidad de forzado."""
        # Arrange
        self.client.force_authenticate(user=self.admin_user)

        # Crear primer turno del día
        Turno.objects.create(
            cliente=self.cliente_a,
            vehiculo=self.vehiculo_a,
            fecha_hora=self.fecha_base,
            motivo="Turno 1"
        )

        # Crear segundo turno del día (mismo día, hora distinta)
        Turno.objects.create(
            cliente=self.cliente_b,
            vehiculo=self.vehiculo_b,
            fecha_hora=self.fecha_base.replace(hour=14),
            motivo="Turno 2"
        )

        # Intentar crear un tercer turno en el mismo día (sin forzar)
        payload = {
            "cliente": str(self.cliente_a.id),
            "vehiculo": str(self.vehiculo_a.id),
            "fecha_hora": self.fecha_base.replace(hour=16).isoformat(),
            "motivo": "Turno 3 (Exceso)"
        }

        # Act
        response = self.client.post(reverse('turno-list'), payload, format="json")
        
        # Assert
        # Debe fallar arrojando error HTTP 400 y warning_overbooking = True
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(response.data["warning_overbooking"])

        # Intentar crear el tercer turno pero FORZANDO la reserva
        payload["force_booking"] = True
        response = self.client.post(reverse('turno-list'), payload, format="json")

        # Debe tener éxito y devolver warning_overbooking = True
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["warning_overbooking"])
        self.assertEqual(Turno.objects.filter(fecha_hora__date=self.fecha_base.date()).count(), 3)

    def test_filtro_seguridad_por_rol_cliente(self):
        """Prueba que los clientes solo puedan ver y acceder a sus propios turnos."""
        # Arrange
        # Creamos un turno para Cliente A
        turno_a = Turno.objects.create(
            cliente=self.cliente_a,
            vehiculo=self.vehiculo_a,
            fecha_hora=self.fecha_base,
            motivo="Turno A"
        )
        # Creamos un turno para Cliente B
        turno_b = Turno.objects.create(
            cliente=self.cliente_b,
            vehiculo=self.vehiculo_b,
            fecha_hora=self.fecha_base.replace(hour=11),
            motivo="Turno B"
        )

        # Autenticamos como Cliente A
        self.client.force_authenticate(user=self.client_user_a)

        # Act
        response = self.client.get(reverse('turno-list'))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(turno_a.id))

        # Act
        response = self.client.get(reverse('turno-detail', kwargs={'pk': turno_b.id}))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_tecnico_puede_crear_turno_rapido(self):
        """Prueba que un usuario con rol 'tecnico' tiene autorización para crear turnos (TK196)."""
        # Arrange
        self.client.force_authenticate(user=self.tecnico_user)
        payload = {
            "cliente": str(self.cliente_a.id),
            "vehiculo": str(self.vehiculo_a.id),
            "fecha_hora": self.fecha_base.isoformat(),
            "motivo": "Turno rápido creado por técnico"
        }

        # Act
        response = self.client.post(reverse('turno-list'), payload, format="json")

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["motivo"], "Turno rápido creado por técnico")


class TurnosCasosFelicesAPITest(APITestCase):
    """
    AUT-BE-01: Suite DRF y cobertura de casos felices en recursos expuestos (TK213).
    Trazabilidad: HU-08 (Agenda de Turnos) ↔ TEST-P-005.
    """
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            email="admin_turno_aut@example.com",
            nombre="Admin",
            apellido="Turnos",
            rol="admin",
            password="password123"
        )
        self.cliente = Cliente.objects.create(
            nombre="Lorena",
            apellido="Paola",
            tipo_documento="DNI",
            dni_cuit="28445566",
            condicion_iva="CF"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AD987BC",
            marca="Chevrolet",
            modelo="Cruze",
            anio=2019
        )
        self.turno = Turno.objects.create(
            cliente=self.cliente,
            vehiculo=self.vehiculo,
            fecha_hora=timezone.now() + timezone.timedelta(days=2),
            motivo="Service 50.000 km",
            estado="pendiente"
        )

    def test_consulta_listado_turnos_exitoso(self):
        """HU-08 / TEST-P-005: Verificar que un usuario admin obtiene HTTP 200 OK al listar la agenda de turnos."""
        # Arrange
        self.client.force_authenticate(user=self.admin)
        url = reverse("turno-list")

        # Act
        response = self.client.get(url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertGreaterEqual(len(results), 1)

    def test_consulta_detalle_turno_exitoso(self):
        """HU-08 / TEST-P-005: Verificar que un usuario admin obtiene HTTP 200 OK al consultar el detalle de un turno."""
        # Arrange
        self.client.force_authenticate(user=self.admin)
        url = reverse("turno-detail", kwargs={"pk": self.turno.id})

        # Act
        response = self.client.get(url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data["id"]), str(self.turno.id))
        self.assertEqual(response.data["motivo"], "Service 50.000 km")

    def test_crear_turno_payload_valido_exitoso(self):
        """HU-08 / TEST-P-005: Creación de turno retornando HTTP 201 Created."""
        # Arrange
        self.client.force_authenticate(user=self.admin)
        url = reverse("turno-list")
        payload = {
            "cliente": str(self.cliente.id),
            "vehiculo": str(self.vehiculo.id),
            "fecha_hora": (timezone.now() + timezone.timedelta(days=5)).isoformat(),
            "motivo": "Revisión técnica periódica"
        }

        # Act
        response = self.client.post(url, payload, format="json")

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["motivo"], "Revisión técnica periódica")

    def test_actualizar_turno_payload_valido_exitoso(self):
        """HU-08 / TEST-P-005: Actualización de motivo de turno retornando HTTP 200 OK."""
        # Arrange
        self.client.force_authenticate(user=self.admin)
        url = reverse("turno-detail", kwargs={"pk": self.turno.id})
        payload = {"motivo": "Revisión técnica y alineación"}

        # Act
        response = self.client.patch(url, payload, format="json")

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["motivo"], "Revisión técnica y alineación")


class RecordatoriosTurnosCommandTests(TestCase):
    """Pruebas unitarias para el comando enviar_recordatorios_turnos (TK203 / US-17)."""

    def setUp(self):
        self.user = Usuario.objects.create_user(
            email="notificar@cliente.com",
            password="password123",
            nombre="Lucas",
            apellido="Mendez",
            rol="cliente"
        )
        self.cliente = Cliente.objects.create(
            usuario=self.user,
            nombre="Lucas",
            apellido="Mendez",
            tipo_documento="DNI",
            dni_cuit="44556677",
            email="notificar@cliente.com"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AB123CD",
            marca="Toyota",
            modelo="Corolla",
            anio=2021
        )
        mail.outbox.clear()

    def test_enviar_recordatorio_turno_24h_anticipacion_exitoso(self):
        # Arrange
        fecha_manana = timezone.now() + timedelta(hours=24)
        Turno.objects.create(
            cliente=self.cliente,
            vehiculo=self.vehiculo,
            fecha_hora=fecha_manana,
            motivo="Cambio de aceite y filtros",
            estado="pendiente"
        )
        out = StringIO()

        # Act
        call_command("enviar_recordatorios_turnos", "--horas=24", stdout=out)

        # Assert
        output = out.getvalue()
        self.assertIn("[ENVIADO] Recordatorio enviado a notificar@cliente.com", output)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Recordatorio de Turno de Taller", mail.outbox[0].subject)
        self.assertIn("Lucas Mendez", mail.outbox[0].body)
        self.assertIn("Toyota Corolla (AB123CD)", mail.outbox[0].body)

    def test_no_enviar_recordatorio_para_turnos_fuera_de_ventana(self):
        # Arrange: Turno para dentro de 5 días
        fecha_lejana = timezone.now() + timedelta(days=5)
        Turno.objects.create(
            cliente=self.cliente,
            vehiculo=self.vehiculo,
            fecha_hora=fecha_lejana,
            motivo="Alineación",
            estado="pendiente"
        )
        out = StringIO()

        # Act
        call_command("enviar_recordatorios_turnos", "--horas=24", stdout=out)

        # Assert
        output = out.getvalue()
        self.assertIn("No hay turnos pendientes para recordar", output)
        self.assertEqual(len(mail.outbox), 0)

    def test_dry_run_simula_sin_disparar_emails(self):
        # Arrange
        fecha_manana = timezone.now() + timedelta(hours=24)
        Turno.objects.create(
            cliente=self.cliente,
            vehiculo=self.vehiculo,
            fecha_hora=fecha_manana,
            motivo="Revisión de frenos",
            estado="pendiente"
        )
        out = StringIO()

        # Act
        call_command("enviar_recordatorios_turnos", "--horas=24", "--dry-run", stdout=out)

        # Assert
        output = out.getvalue()
        self.assertIn("[DRY-RUN] Simulado envío a notificar@cliente.com", output)
        self.assertEqual(len(mail.outbox), 0)
    def test_no_reenviar_recordatorio_si_ya_fue_notificado(self):
        # Arrange: Turno dentro de la ventana de 24h
        fecha_manana = timezone.now() + timedelta(hours=24)
        turno = Turno.objects.create(
            cliente=self.cliente,
            vehiculo=self.vehiculo,
            fecha_hora=fecha_manana,
            motivo="Cambio de pastillas",
            estado="pendiente"
        )
        out1 = StringIO()
        out2 = StringIO()

        # Act 1: Primer envío
        call_command("enviar_recordatorios_turnos", "--horas=24", stdout=out1)
        self.assertEqual(len(mail.outbox), 1)
        turno.refresh_from_db()
        self.assertIsNotNone(turno.recordatorio_enviado_en)

        # Act 2: Segunda ejecución inmediata (idempotencia)
        call_command("enviar_recordatorios_turnos", "--horas=24", stdout=out2)

        # Assert: No debe enviar un segundo correo
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("No hay turnos pendientes para recordar en este período.", out2.getvalue())


class MetodosNoPermitidosTurnosAPITests(APITestCase):
    """AUT-BE-02: rutas de turnos rechazan métodos HTTP que no existen."""

    def setUp(self):
        self.admin = Usuario.objects.create_user(
            email="admin_405_turnos@example.com",
            password="adminpassword123",
            nombre="Admin",
            apellido="Métodos HTTP",
            rol="admin",
        )
        self.client.force_authenticate(user=self.admin)

    def test_lista_turnos_rechaza_trace(self):
        # Arrange
        url = reverse("turno-list")

        # Act
        response = self.client.generic("TRACE", url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertIn("Allow", response.headers)
        self.assertNotIn("TRACE", response.headers["Allow"])

    def test_detalle_turno_rechaza_trace(self):
        # Arrange
        url = reverse("turno-detail", kwargs={"pk": uuid.uuid4()})

        # Act
        response = self.client.generic("TRACE", url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertIn("Allow", response.headers)
        self.assertNotIn("TRACE", response.headers["Allow"])
