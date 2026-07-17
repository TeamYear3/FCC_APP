from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from .models import Cliente

User = get_user_model()

class ClienteModelTest(TestCase):
    def setUp(self):
        # Crear un usuario semilla para pruebas de relación
        self.usuario_semilla = User.objects.create_user(
            email="testuser@example.com",
            nombre="Juan",
            apellido="Perez",
            rol="cliente",
            password="securepassword123"
        )

    def test_creacion_cliente_exito(self):
        cliente = Cliente.objects.create(
            usuario=self.usuario_semilla,
            nombre="Carlos",
            apellido="Gomez",
            tipo_documento="DNI",
            dni_cuit="12345678",
            condicion_iva="CF",
            telefono="1122334455",
            domicilio="Av. Siempre Viva 742"
        )
        self.assertEqual(cliente.nombre, "Carlos")
        self.assertEqual(cliente.apellido, "Gomez")
        self.assertEqual(cliente.tipo_documento, "DNI")
        self.assertEqual(cliente.dni_cuit, "12345678")
        self.assertEqual(cliente.condicion_iva, "CF")
        self.assertEqual(cliente.telefono, "1122334455")
        self.assertEqual(cliente.domicilio, "Av. Siempre Viva 742")
        self.assertEqual(cliente.usuario, self.usuario_semilla)
        self.assertEqual(str(cliente), "Carlos Gomez (DNI: 12345678)")

    def test_dni_cuit_unico(self):
        # Crear primer cliente
        Cliente.objects.create(
            nombre="Carlos",
            apellido="Gomez",
            tipo_documento="DNI",
            dni_cuit="12345678",
            condicion_iva="CF",
            telefono="1122334455",
            domicilio="Av. Siempre Viva 742"
        )

        # Intentar crear un segundo cliente con el mismo DNI
        with self.assertRaises(IntegrityError):
            Cliente.objects.create(
                nombre="Ana",
                apellido="Lopez",
                tipo_documento="DNI",
                dni_cuit="12345678", # Mismo DNI
                condicion_iva="RI",
                telefono="99887766",
                domicilio="Calle Falsa 123"
            )

    def test_usuario_relacion_opcional(self):
        # Crear cliente sin usuario asociado
        cliente_sin_usuario = Cliente.objects.create(
            nombre="Ana",
            apellido="Lopez",
            tipo_documento="CUIT",
            dni_cuit="20123456789",
            condicion_iva="RI",
            telefono="99887766",
            domicilio="Calle Falsa 123"
        )
        self.assertIsNone(cliente_sin_usuario.usuario)

        # Vincularlo posteriormente a un usuario
        cliente_sin_usuario.usuario = self.usuario_semilla
        cliente_sin_usuario.save()

        self.assertEqual(cliente_sin_usuario.usuario, self.usuario_semilla)


from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse

class ClienteAPITestCase(APITestCase):
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
            email="cliente_perfil@example.com",
            nombre="Lucas",
            apellido="Cliente",
            rol="cliente",
            password="clientepassword123"
        )
        
        self.url = reverse('crear-cliente')

    def test_crear_cliente_dni_valido(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "nombre": "Ana",
            "apellido": "Lopez",
            "tipo_documento": "DNI",
            "dni_cuit": "12345678",
            "condicion_iva": "CF",
            "telefono": "99887766",
            "domicilio": "Calle Falsa 123"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["nombre"], "Ana")
        self.assertEqual(response.data["dni_cuit"], "12345678")

    def test_crear_cliente_cuit_valido(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "nombre": "Empresa S.A.",
            "apellido": "Perez",
            "tipo_documento": "CUIT",
            "dni_cuit": "20-12345678-9",
            "condicion_iva": "RI",
            "telefono": "11223344",
            "domicilio": "Av. Mitre 500"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["dni_cuit"], "20-12345678-9")

    def test_crear_cliente_dni_invalido(self):
        self.client.force_authenticate(user=self.admin_user)
        # Menos dígitos
        data = {
            "nombre": "Ana",
            "apellido": "Lopez",
            "tipo_documento": "DNI",
            "dni_cuit": "123456",
            "condicion_iva": "CF"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("dni_cuit", response.data)

        # Más dígitos o letras
        data["dni_cuit"] = "123456789"
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crear_cliente_cuit_invalido(self):
        self.client.force_authenticate(user=self.admin_user)
        # Formato sin guiones
        data = {
            "nombre": "Empresa S.A.",
            "apellido": "Perez",
            "tipo_documento": "CUIT",
            "dni_cuit": "20123456789",
            "condicion_iva": "RI"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("dni_cuit", response.data)

    def test_crear_cliente_dni_cuit_duplicado(self):
        # Crear un cliente inicial en la BD
        Cliente.objects.create(
            nombre="Existente",
            apellido="User",
            tipo_documento="DNI",
            dni_cuit="87654321",
            condicion_iva="CF"
        )
        
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "nombre": "Duplicado",
            "apellido": "User",
            "tipo_documento": "DNI",
            "dni_cuit": "87654321",
            "condicion_iva": "CF"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("dni_cuit", response.data)

    def test_crear_cliente_sin_permiso_admin(self):
        # Intentar con rol tecnico
        self.client.force_authenticate(user=self.tecnico_user)
        data = {
            "nombre": "Ana",
            "apellido": "Lopez",
            "tipo_documento": "DNI",
            "dni_cuit": "12345678",
            "condicion_iva": "CF"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Intentar con rol cliente
        self.client.force_authenticate(user=self.cliente_user)
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_crear_cliente_anonimo(self):
        # Sin autenticación
        data = {
            "nombre": "Ana",
            "apellido": "Lopez",
            "tipo_documento": "DNI",
            "dni_cuit": "12345678",
            "condicion_iva": "CF"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
