from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from clientes.models import Cliente
from vehiculos.models import Vehiculo
from ordenes.models import OrdenTrabajo, EstadoOrden

Usuario = get_user_model()

class BusquedaUniversalTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = Usuario.objects.create_user(
            email="admin@test.com",
            password="Password123!",
            rol="admin"
        )
        self.client.force_authenticate(user=self.user)

        self.cliente = Cliente.objects.create(
            nombre="Carlos",
            apellido="Gomez",
            tipo_documento="DNI",
            dni_cuit="35999888"
        )

        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AA123ZZ",
            numero_chasis="CHASIS998877",
            marca="Ford",
            modelo="Focus"
        )

        self.orden = OrdenTrabajo.objects.create(
            numero_ot="OT-9999",
            vehiculo=self.vehiculo,
            estado=EstadoOrden.INGRESADO,
            descripcion_problema="Ruido en motor"
        )

    def test_busqueda_query_corta_retorna_vacio(self):
        response = self.client.get('/api/busqueda-universal/?q=a')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['clientes']), 0)
        self.assertEqual(len(response.data['vehiculos']), 0)
        self.assertEqual(len(response.data['ordenes']), 0)

    def test_busqueda_cliente_por_dni(self):
        response = self.client.get('/api/busqueda-universal/?q=35999')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['clientes']), 1)
        self.assertEqual(response.data['clientes'][0]['titulo'], 'Carlos Gomez')

    def test_busqueda_vehiculo_por_patente(self):
        response = self.client.get('/api/busqueda-universal/?q=AA123')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['vehiculos']), 1)
        self.assertIn('Ford Focus', response.data['vehiculos'][0]['titulo'])

    def test_busqueda_orden_por_numero_ot(self):
        response = self.client.get('/api/busqueda-universal/?q=OT-9999')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['ordenes']), 1)
        self.assertEqual(response.data['ordenes'][0]['titulo'], 'Orden OT-9999')
