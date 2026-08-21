from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from clientes.models import Cliente
from vehiculos.models import Vehiculo
from ordenes.models import OrdenTrabajo, EstadoOrden

Usuario = get_user_model()

class TallerDashboardAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin = Usuario.objects.create_user(
            email="admin@test.com",
            password="Password123!",
            rol="admin",
            nombre="Laura",
            apellido="Zarate"
        )

        self.tecnico = Usuario.objects.create_user(
            email="tecnico@test.com",
            password="Password123!",
            rol="tecnico",
            nombre="Martin",
            apellido="Gomez"
        )

        self.cliente_user = Usuario.objects.create_user(
            email="cliente@test.com",
            password="Password123!",
            rol="cliente",
            nombre="Carlos",
            apellido="Rodriguez"
        )

        self.cliente = Cliente.objects.create(
            nombre="Carlos",
            apellido="Rodriguez",
            tipo_documento="DNI",
            dni_cuit="30111222",
            usuario=self.cliente_user
        )

        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AA100ZZ",
            marca="Ford",
            modelo="Focus"
        )

        self.orden = OrdenTrabajo.objects.create(
            numero_ot="OT-7001",
            vehiculo=self.vehiculo,
            tecnico=self.tecnico,
            estado=EstadoOrden.EN_PROCESO,
            descripcion_problema="Revisión de frenos",
            monto_total=15000.00
        )

    def test_resumen_mecanicos_admin_exito(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/taller/mecanicos/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['email'], 'tecnico@test.com')
        self.assertEqual(response.data[0]['ots_activas'], 1)
        self.assertEqual(response.data[0]['porcentaje_carga'], 20)

    def test_resumen_mecanicos_tecnico_prohibido(self):
        self.client.force_authenticate(user=self.tecnico)
        response = self.client.get('/api/taller/mecanicos/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_resumen_mecanicos_cliente_prohibido(self):
        self.client.force_authenticate(user=self.cliente_user)
        response = self.client.get('/api/taller/mecanicos/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_resumen_clientes_admin_exito(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/taller/clientes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['dni_cuit'], '30111222')
        self.assertEqual(response.data[0]['vehiculos_count'], 1)
        self.assertEqual(response.data[0]['ots_activas'], 1)

    def test_resumen_clientes_tecnico_prohibido(self):
        self.client.force_authenticate(user=self.tecnico)
        response = self.client.get('/api/taller/clientes/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
