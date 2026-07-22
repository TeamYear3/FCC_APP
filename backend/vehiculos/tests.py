from django.test import TestCase
from django.db import IntegrityError
from clientes.models import Cliente
from .models import Vehiculo

class VehiculoModelTest(TestCase):
    def setUp(self):
        # Crear un cliente de prueba
        self.cliente = Cliente.objects.create(
            nombre="Karina",
            apellido="Quinteros",
            tipo_documento="DNI",
            dni_cuit="12345678",
            condicion_iva="CF",
            telefono="11223344",
            domicilio="Calle Falsa 123"
        )

    def test_creacion_vehiculo_exito(self):
        vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AB123CD",
            marca="Toyota",
            modelo="Corolla",
            anio=2020,
            kilometraje=45000,
            color="Blanco",
            foto_url="https://ejemplo.com/fotos/corolla.jpg"
        )
        self.assertEqual(vehiculo.cliente, self.cliente)
        self.assertEqual(vehiculo.patente, "AB123CD")
        self.assertEqual(vehiculo.marca, "Toyota")
        self.assertEqual(vehiculo.modelo, "Corolla")
        self.assertEqual(vehiculo.anio, 2020)
        self.assertEqual(vehiculo.kilometraje, 45000)
        self.assertEqual(vehiculo.color, "Blanco")
        self.assertEqual(vehiculo.foto_url, "https://ejemplo.com/fotos/corolla.jpg")
        self.assertEqual(str(vehiculo), "Toyota Corolla (AB123CD)")

    def test_vehiculo_campos_opcionales_y_defaults(self):
        vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="ZZ999ZZ",
            marca="Honda",
            modelo="Civic"
        )
        self.assertEqual(vehiculo.kilometraje, 0)
        self.assertEqual(vehiculo.color, "")
        self.assertIsNone(vehiculo.foto_url)

    def test_patente_unica(self):
        # Crear primer vehiculo
        Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AB123CD",
            marca="Toyota",
            modelo="Corolla",
            anio=2020
        )
        
        # Intentar crear segundo vehiculo con la misma patente
        with self.assertRaises(IntegrityError):
            Vehiculo.objects.create(
                cliente=self.cliente,
                patente="AB123CD", # Duplicada
                marca="Ford",
                modelo="Fiesta",
                anio=2018
            )

    def test_cliente_obligatorio(self):
        # Intentar crear vehiculo sin cliente
        with self.assertRaises(IntegrityError):
            Vehiculo.objects.create(
                cliente=None,
                patente="XYZ999",
                marca="Chevrolet",
                modelo="Onix",
                anio=2022
            )


from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

class VehiculoAPITestCase(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            email="admin_vehiculo@example.com",
            nombre="Admin",
            apellido="Vehiculo",
            rol="admin",
            password="adminpassword123"
        )
        self.tecnico_user = User.objects.create_user(
            email="tecnico_vehiculo@example.com",
            nombre="Tecnico",
            apellido="Vehiculo",
            rol="tecnico",
            password="tecnicopassword123"
        )
        self.cliente = Cliente.objects.create(
            nombre="Test",
            apellido="Cliente",
            tipo_documento="DNI",
            dni_cuit="30111222",
            condicion_iva="CF"
        )
        self.url = reverse('crear-vehiculo')

    def test_crear_vehiculo_patente_valida_mercosur(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "cliente_id": str(self.cliente.id),
            "patente": "AB123CD",
            "marca": "Ford",
            "modelo": "Ranger",
            "anio": 2023,
            "kilometraje": 15000,
            "color": "Gris"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["patente"], "AB123CD")
        self.assertEqual(response.data["cliente_id"], str(self.cliente.id))

    def test_crear_vehiculo_patente_valida_tradicional(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "cliente_id": str(self.cliente.id),
            "patente": "abc123", # debe normalizar a mayúsculas
            "marca": "Chevrolet",
            "modelo": "Corsa",
            "anio": 2012,
            "kilometraje": 120000
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["patente"], "ABC123")

    def test_crear_vehiculo_patente_invalida(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "cliente_id": str(self.cliente.id),
            "patente": "123ABCD", # inválida
            "marca": "Fiat",
            "modelo": "Cronos"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("patente", response.data)

    def test_crear_vehiculo_patente_duplicada(self):
        Vehiculo.objects.create(
            cliente=self.cliente,
            patente="ZZ999ZZ",
            marca="Renault",
            modelo="Clio"
        )
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "cliente_id": str(self.cliente.id),
            "patente": "zz999zz",
            "marca": "Peugeot",
            "modelo": "208"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("patente", response.data)

    def test_crear_vehiculo_cliente_inexistente(self):
        import uuid
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "cliente_id": str(uuid.uuid4()),
            "patente": "AF555ZZ",
            "marca": "Volkswagen",
            "modelo": "Golf"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cliente_id", response.data)

    def test_crear_vehiculo_sin_permiso_admin(self):
        self.client.force_authenticate(user=self.tecnico_user)
        data = {
            "cliente_id": str(self.cliente.id),
            "patente": "AG777WW",
            "marca": "Nissan",
            "modelo": "Frontier"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

