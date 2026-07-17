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
