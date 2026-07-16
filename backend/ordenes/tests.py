from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
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
