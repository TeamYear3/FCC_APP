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
        # Crear usuarios de prueba con diferentes roles
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            nombre="Carlos",
            apellido="Admin",
            rol="admin",
            password="adminpassword123"
        )
        self.tecnico_user = User.objects.create_user(
            email="tecnico@example.com",
            nombre="Juan",
            apellido="Tecnico",
            rol="tecnico",
            password="tecnicopassword123"
        )
        self.cliente_user = User.objects.create_user(
            email="cliente@example.com",
            nombre="Lucas",
            apellido="Cliente",
            rol="cliente",
            password="clientepassword123"
        )
        
        # Crear clientes en la base de datos
        self.cliente_actual = Cliente.objects.create(
            nombre="Cliente",
            apellido="Uno",
            tipo_documento="DNI",
            dni_cuit="11111111",
            condicion_iva="CF",
            telefono="11223344",
            domicilio="Direccion 1"
        )
        
        self.cliente_nuevo = Cliente.objects.create(
            nombre="Cliente",
            apellido="Dos",
            tipo_documento="DNI",
            dni_cuit="22222222",
            condicion_iva="CF",
            telefono="55667788",
            domicilio="Direccion 2"
        )
        
        # Crear vehículo de prueba
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente_actual,
            patente="AB123CD",
            marca="Toyota",
            modelo="Corolla",
            anio=2020,
            kilometraje=50000,
            color="Rojo",
            foto_url="https://ejemplo.com/fotos/rojo.jpg"
        )
        
        self.url_detalle = reverse('detalle-vehiculo', kwargs={'pk': self.vehiculo.id})

    def test_actualizar_vehiculo_campos_validos(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "marca": "Ford",
            "modelo": "Focus",
            "anio": 2022,
            "kilometraje": 30000,
            "color": "Azul",
            "foto_url": "https://ejemplo.com/fotos/azul.jpg"
        }
        # Prueba PUT
        response = self.client.put(self.url_detalle, {**data, "cliente_id": str(self.cliente_actual.id)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["marca"], "Ford")
        self.assertEqual(response.data["modelo"], "Focus")
        self.assertEqual(response.data["anio"], 2022)
        self.assertEqual(response.data["kilometraje"], 30000)
        self.assertEqual(response.data["color"], "Azul")
        self.assertEqual(response.data["foto_url"], "https://ejemplo.com/fotos/azul.jpg")

        # Prueba PATCH
        response = self.client.patch(self.url_detalle, {"color": "Gris"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["color"], "Gris")

    def test_actualizar_vehiculo_cambio_cliente(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "cliente_id": str(self.cliente_nuevo.id)
        }
        response = self.client.patch(self.url_detalle, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["cliente_id"], self.cliente_nuevo.id)
        
        # Verificar en base de datos
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.cliente, self.cliente_nuevo)

    def test_actualizar_vehiculo_bloqueo_patente(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "patente": "XY999ZZ"
        }
        response = self.client.patch(self.url_detalle, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # La respuesta debe mantener la patente original
        self.assertEqual(response.data["patente"], "AB123CD")
        
        # Verificar en base de datos que no se haya modificado
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.patente, "AB123CD")

    def test_actualizar_vehiculo_cliente_inexistente(self):
        self.client.force_authenticate(user=self.admin_user)
        invalid_uuid = "00000000-0000-0000-0000-000000000000"
        data = {
            "cliente_id": invalid_uuid
        }
        response = self.client.patch(self.url_detalle, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cliente_id", response.data)
        self.assertEqual(response.data["cliente_id"][0], "El cliente especificado no existe.")

    def test_actualizar_vehiculo_sin_permiso(self):
        # Tecnico
        self.client.force_authenticate(user=self.tecnico_user)
        response = self.client.patch(self.url_detalle, {"color": "Negro"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Cliente
        self.client.force_authenticate(user=self.cliente_user)
        response = self.client.patch(self.url_detalle, {"color": "Negro"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Anonimo
        self.client.logout()
        response = self.client.patch(self.url_detalle, {"color": "Negro"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

