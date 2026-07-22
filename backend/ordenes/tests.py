from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from clientes.models import Cliente
from vehiculos.models import Vehiculo
from .models import OrdenTrabajo, EstadoOrden

User = get_user_model()

class OrdenTrabajoModelTest(TestCase):
    def setUp(self):
        # Crear un cliente de prueba
        self.cliente = Cliente.objects.create(
            nombre="Karina",
            apellido="Quinteros",
            tipo_documento="DNI",
            dni_cuit="12345678",
            condicion_iva="CF"
        )
        # Crear un vehiculo de prueba
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AB123CD",
            marca="Toyota",
            modelo="Corolla",
            anio=2020
        )
        # Crear un tecnico de prueba
        self.tecnico = User.objects.create_user(
            email="tecnico@example.com",
            nombre="Juan",
            apellido="Tecnico",
            rol="tecnico",
            password="password123"
        )
        # Crear un usuario no técnico de prueba (ej. cliente)
        self.no_tecnico = User.objects.create_user(
            email="cliente_user@example.com",
            nombre="Pedro",
            apellido="Cliente",
            rol="cliente",
            password="password123"
        )

    def test_creacion_orden_exito_y_estado_inicial(self):
        orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="El motor hace ruido al arrancar"
        )
        # Verificar estado inicial por defecto
        self.assertEqual(orden.estado, EstadoOrden.INGRESADO)
        # Verificar que se asocia correctamente al vehiculo
        self.assertEqual(orden.vehiculo, self.vehiculo)
        # Verificar auto-generación de número de OT
        self.assertEqual(orden.numero_ot, "OT-0001")
        # Verificar representación en string
        self.assertEqual(str(orden), "OT-0001 - AB123CD (Ingresado)")

    def test_auto_generacion_secuencial_numero_ot(self):
        # Crear primera orden
        orden1 = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Fallo de frenos"
        )
        self.assertEqual(orden1.numero_ot, "OT-0001")

        # Crear segunda orden
        orden2 = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Cambio de aceite"
        )
        self.assertEqual(orden2.numero_ot, "OT-0002")

    def test_vehiculo_obligatorio(self):
        # Intentar crear orden de trabajo sin vehiculo
        with self.assertRaises(IntegrityError):
            OrdenTrabajo.objects.create(
                vehiculo=None,
                descripcion_problema="Sin vehículo"
            )

    def test_limit_choices_to_tecnico(self):
        # Configurar técnico en la orden de trabajo
        orden = OrdenTrabajo(
            vehiculo=self.vehiculo,
            tecnico=self.tecnico,
            descripcion_problema="Problema de luces"
        )
        # Debería pasar la validación
        orden.full_clean()
        orden.save()
        self.assertEqual(orden.tecnico, self.tecnico)

        # Configurar un no-tecnico en la orden de trabajo
        orden_invalida = OrdenTrabajo(
            vehiculo=self.vehiculo,
            tecnico=self.no_tecnico,
            descripcion_problema="Problema de embrague"
        )
        # full_clean() debe lanzar ValidationError debido al limit_choices_to
        with self.assertRaises(ValidationError):
            orden_invalida.full_clean()


class OrdenTrabajoAPITest(APITestCase):
    def setUp(self):
        # Crear un cliente de prueba
        self.cliente = Cliente.objects.create(
            nombre="Karina",
            apellido="Quinteros",
            tipo_documento="DNI",
            dni_cuit="12345678",
            condicion_iva="CF"
        )
        # Crear un vehiculo de prueba
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AB123CD",
            marca="Toyota",
            modelo="Corolla",
            anio=2020
        )
        # Crear un usuario admin
        self.admin = User.objects.create_user(
            email="admin@example.com",
            nombre="Admin",
            apellido="User",
            rol="admin",
            password="password123"
        )
        # Crear un usuario tecnico
        self.tecnico = User.objects.create_user(
            email="tecnico@example.com",
            nombre="Tecnico",
            apellido="User",
            rol="tecnico",
            password="password123"
        )
        # Crear un usuario cliente
        self.cliente_user = User.objects.create_user(
            email="cliente@example.com",
            nombre="Cliente",
            apellido="User",
            rol="cliente",
            password="password123"
        )
        self.url = reverse('crear-orden-trabajo')

    def test_crear_orden_exitoso_como_admin(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            "vehiculo_id": str(self.vehiculo.id),
            "descripcion_problema": "Fallo en los frenos",
            "fecha_ingreso": "2026-07-16"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["estado"], "ingresado")
        self.assertEqual(response.data["numero_ot"], "OT-0001")
        self.assertEqual(response.data["vehiculo_id"], str(self.vehiculo.id))

    def test_crear_orden_exitoso_como_tecnico(self):
        self.client.force_authenticate(user=self.tecnico)
        data = {
            "vehiculo_id": str(self.vehiculo.id),
            "descripcion_problema": "Fallo en embrague",
            "fecha_ingreso": "2026-07-16"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["estado"], "ingresado")

    def test_crear_orden_rechazado_como_cliente(self):
        self.client.force_authenticate(user=self.cliente_user)
        data = {
            "vehiculo_id": str(self.vehiculo.id),
            "descripcion_problema": "Fallo en embrague",
            "fecha_ingreso": "2026-07-16"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_crear_orden_rechazado_sin_autenticacion(self):
        data = {
            "vehiculo_id": str(self.vehiculo.id),
            "descripcion_problema": "Fallo en embrague",
            "fecha_ingreso": "2026-07-16"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_crear_orden_error_campos_obligatorios(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("vehiculo_id", response.data)
        self.assertIn("descripcion_problema", response.data)
        self.assertIn("fecha_ingreso", response.data)

    def test_crear_orden_error_vehiculo_no_existe(self):
        self.client.force_authenticate(user=self.admin)
        invalido_uuid = "00000000-0000-0000-0000-000000000000"
        data = {
            "vehiculo_id": invalido_uuid,
            "descripcion_problema": "Fallo en embrague",
            "fecha_ingreso": "2026-07-16"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("vehiculo_id", response.data)


from unittest.mock import patch
from django.core import mail
from ordenes.signals import enviar_email_orden_background

class OrdenTrabajoEmailTest(TestCase):
    def setUp(self):
        # Crear un usuario con email
        self.usuario_cliente = User.objects.create_user(
            email="cliente_test@example.com",
            nombre="Carlos",
            apellido="Gomez",
            rol="cliente",
            password="password123"
        )
        # Crear un cliente de prueba
        self.cliente = Cliente.objects.create(
            usuario=self.usuario_cliente,
            nombre="Carlos",
            apellido="Gomez",
            tipo_documento="DNI",
            dni_cuit="87654321",
            condicion_iva="CF"
        )
        # Crear un vehiculo de prueba
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="XY987ZZ",
            marca="Ford",
            modelo="Fiesta",
            anio=2018
        )
        # Crear orden de trabajo
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Fallo en la batería"
        )

    def test_enviar_email_orden_background_exitoso(self):
        """Verifica que enviar_email_orden_background envía el correo con los datos correctos del cliente y la orden."""
        mail.outbox = []
        
        # Llamar a la función de fondo de manera síncrona en el test
        enviar_email_orden_background(self.orden.id)
        
        # Verificar que se envió un correo
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Verificar asunto y destinatario
        self.assertEqual(email.subject, f"Nueva Orden de Trabajo - {self.orden.numero_ot}")
        self.assertEqual(email.to, ["cliente_test@example.com"])
        
        # Verificar contenido básico en texto plano
        self.assertIn("Carlos Gomez", email.body)
        self.assertIn(self.orden.numero_ot, email.body)
        self.assertIn("Ford Fiesta", email.body)
        self.assertIn("Fallo en la batería", email.body)
        self.assertIn(f"/portal/ordenes/{self.orden.numero_ot}", email.body)
        
        # Verificar alternativas HTML
        self.assertEqual(len(email.alternatives), 1)
        html_content, mime_type = email.alternatives[0]
        self.assertEqual(mime_type, "text/html")
        self.assertIn("Carlos Gomez", html_content)
        self.assertIn(self.orden.numero_ot, html_content)
        self.assertIn("Ford Fiesta", html_content)

    def test_enviar_email_orden_background_sin_usuario_asociado(self):
        """Verifica que si el cliente no tiene usuario asociado, no se envía email y no se lanza excepción."""
        cliente_sin_usuario = Cliente.objects.create(
            nombre="Lucas",
            apellido="Perez",
            tipo_documento="DNI",
            dni_cuit="11223344",
            condicion_iva="CF"
        )
        vehiculo_sin_usuario = Vehiculo.objects.create(
            cliente=cliente_sin_usuario,
            patente="XY111ZZ",
            marca="Renault",
            modelo="Clio"
        )
        orden_sin_usuario = OrdenTrabajo.objects.create(
            vehiculo=vehiculo_sin_usuario,
            descripcion_problema="Cambio de bujías"
        )
        
        mail.outbox = []
        enviar_email_orden_background(orden_sin_usuario.id)
        # No se debe haber enviado ningún correo ya que no hay email
        self.assertEqual(len(mail.outbox), 0)

    @patch("ordenes.signals.enviar_email_orden_background")
    def test_creacion_orden_dispara_senal_email(self, mock_enviar_email):
        """Verifica que la creación de OrdenTrabajo dispara la señal post_save que invoca al envío del email."""
        orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Alineación y balanceo"
        )
        
        # Verificar que se llamó a la función de envío de correo en segundo plano
        mock_enviar_email.assert_called_once_with(orden.id)

    @patch("threading.Thread")
    def test_senal_tolerancia_a_errores_de_hilo(self, mock_thread):
        """Verifica que si ocurre un error al lanzar el hilo de la señal, la creación de la orden no falla."""
        mock_thread.return_value.start.side_effect = Exception("Fallo al iniciar el hilo de pruebas")
        
        # No debe levantar ninguna excepción al guardar
        orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Revisión general"
        )
        self.assertIsNotNone(orden.id)




