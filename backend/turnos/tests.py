from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, time
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

        # Definir una fecha base de pruebas (Zonas horarias correctas)
        self.fecha_base = datetime.combine(datetime(2026, 8, 25), time(10, 0))
        # Hacerla timezone-aware
        self.fecha_base = timezone.make_aware(self.fecha_base)

    def test_crud_turno_como_admin(self):
        """Prueba de flujo CRUD básico de Turno realizado por el Administrador."""
        self.client.force_authenticate(user=self.admin_user)

        # 1. Crear Turno
        payload = {
            "cliente": str(self.cliente_a.id),
            "vehiculo": str(self.vehiculo_a.id),
            "fecha_hora": self.fecha_base.isoformat(),
            "motivo": "Cambio de aceite y filtro",
            "estado": "pendiente"
        }
        response = self.client.post("/api/turnos/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["warning_overbooking"])
        turno_id = response.data["id"]

        # 2. Leer Turno
        response = self.client.get(f"/api/turnos/{turno_id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["motivo"], "Cambio de aceite y filtro")

        # 3. Actualizar Turno
        payload_update = {
            "motivo": "Alineación y balanceo",
            "estado": "completado"
        }
        response = self.client.patch(f"/api/turnos/{turno_id}/", payload_update, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["motivo"], "Alineación y balanceo")
        self.assertEqual(response.data["estado"], "completado")

        # 4. Eliminar Turno
        response = self.client.delete(f"/api/turnos/{turno_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Turno.objects.filter(id=turno_id).exists())

    def test_validacion_vehiculo_no_pertenece_a_cliente(self):
        """Prueba que no permite crear un turno si el vehículo no es del cliente."""
        self.client.force_authenticate(user=self.admin_user)

        # Vehículo B con Cliente A
        payload = {
            "cliente": str(self.cliente_a.id),
            "vehiculo": str(self.vehiculo_b.id),
            "fecha_hora": self.fecha_base.isoformat(),
            "motivo": "Revisión general"
        }
        response = self.client.post("/api/turnos/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("vehiculo", response.data)

    def test_sobrecupo_diario_y_forzado(self):
        """Prueba de la regla de sobre-cupo (2 turnos por día) y la capacidad de forzado."""
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
        response = self.client.post("/api/turnos/", payload, format="json")
        
        # Debe fallar arrojando error HTTP 400 y warning_overbooking = True
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(response.data["warning_overbooking"])

        # Intentar crear el tercer turno pero FORZANDO la reserva
        payload["force_booking"] = True
        response = self.client.post("/api/turnos/", payload, format="json")

        # Debe tener éxito y devolver warning_overbooking = True
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["warning_overbooking"])
        self.assertEqual(Turno.objects.filter(fecha_hora__date=self.fecha_base.date()).count(), 3)

    def test_filtro_seguridad_por_rol_cliente(self):
        """Prueba que los clientes solo puedan ver y acceder a sus propios turnos."""
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

        # Al listar turnos, solo debe ver el suyo
        response = self.client.get("/api/turnos/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(turno_a.id))

        # Si intenta acceder directamente al turno del Cliente B, debe dar un 404 (ocultamiento seguro)
        response = self.client.get(f"/api/turnos/{turno_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
