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
