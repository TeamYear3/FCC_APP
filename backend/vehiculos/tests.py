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
            telefono="1122334455",
            domicilio="Av. Siempre Viva 123"
        )

    def test_creacion_vehiculo_exito(self):
        vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AB123CD",
            marca="Toyota",
            modelo="Hilux",
            anio=2021,
            kilometraje=45000,
            color="Blanco"
        )
        self.assertEqual(vehiculo.patente, "AB123CD")
        self.assertEqual(vehiculo.marca, "Toyota")
        self.assertEqual(vehiculo.modelo, "Hilux")
        self.assertEqual(vehiculo.anio, 2021)
        self.assertEqual(vehiculo.kilometraje, 45000)
        self.assertEqual(vehiculo.color, "Blanco")
        self.assertEqual(vehiculo.cliente, self.cliente)
        self.assertEqual(str(vehiculo), "Toyota Hilux (AB123CD)")

    def test_vehiculo_campos_opcionales_y_defaults(self):
        vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AC999XX",
            marca="Volkswagen",
            modelo="Gol"
        )
        self.assertIsNone(vehiculo.anio)
        self.assertEqual(vehiculo.kilometraje, 0) # Default
        self.assertEqual(vehiculo.color, "")
        self.assertIsNone(vehiculo.foto_url)

    def test_patente_unica(self):
        Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AB123CD",
            marca="Toyota",
            modelo="Hilux",
            anio=2021
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
        self.cliente_user = User.objects.create_user(
            email="cliente_vehiculo@example.com",
            nombre="Lucas",
            apellido="Cliente",
            rol="cliente",
            password="clientepassword123"
        )
        self.cliente = Cliente.objects.create(
            nombre="Test",
            apellido="Cliente",
            tipo_documento="DNI",
            dni_cuit="30111222",
            condicion_iva="CF"
        )
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
        self.url = reverse('crear-vehiculo')
        self.url_detalle = reverse('detalle-vehiculo', kwargs={'pk': self.vehiculo.id})

    # Pruebas para CrearVehiculoView (POST)
    def test_crear_vehiculo_patente_valida_mercosur(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "cliente_id": str(self.cliente.id),
            "patente": "AG123XY",
            "marca": "Ford",
            "modelo": "Ranger",
            "anio": 2023,
            "kilometraje": 15000,
            "color": "Gris"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["patente"], "AG123XY")
        self.assertEqual(response.data["cliente_id"], self.cliente.id)

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
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("detail", response.data)

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

    # Pruebas para DetalleVehiculoView (PUT/PATCH)
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

    def test_listar_vehiculos_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_listar_vehiculos_tecnico(self):
        self.client.force_authenticate(user=self.tecnico_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_listar_vehiculos_cliente_prohibido(self):
        self.client.force_authenticate(user=self.cliente_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_listar_vehiculos_anonimo_no_autorizado(self):
        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    def test_crear_vehiculo_patente_duplicada_retorna_409(self):
        self.client.force_authenticate(user=self.admin_user)
        # Crear un vehículo con patente específica
        Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AA222BB",
            marca="Renault",
            modelo="Clio"
        )
        data = {
            "cliente_id": str(self.cliente.id),
            "patente": "aa222bb", # duplicada (debe ser insensible a mayúsculas/minúsculas)
            "marca": "Peugeot",
            "modelo": "208"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("detail", response.data)

    def test_crear_vehiculo_chasis_duplicado_retorna_409(self):
        self.client.force_authenticate(user=self.admin_user)
        # Crear un vehículo con chasis específico
        Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AA333BB",
            numero_chasis="CHASIS12345678901",
            marca="Renault",
            modelo="Clio"
        )
        data = {
            "cliente_id": str(self.cliente.id),
            "patente": "AA444BB",
            "numero_chasis": "chasis12345678901", # duplicado
            "marca": "Peugeot",
            "modelo": "208"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("detail", response.data)

    def test_actualizar_vehiculo_bloqueo_numero_chasis(self):
        self.client.force_authenticate(user=self.admin_user)
        # Asignamos chasis inicial
        self.vehiculo.numero_chasis = "CHASISINIT123"
        self.vehiculo.save()

        data = {
            "numero_chasis": "NUEVOCHASIS999"
        }
        response = self.client.patch(self.url_detalle, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["numero_chasis"], "CHASISINIT123")

        # Verificar en base de datos que no se haya modificado
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.numero_chasis, "CHASISINIT123")

    def test_listar_vehiculos_filtrado_por_cliente(self):
        self.client.force_authenticate(user=self.admin_user)
        # Crear otro vehículo para el cliente_nuevo
        Vehiculo.objects.create(
            cliente=self.cliente_nuevo,
            patente="AA888BB",
            marca="Ford",
            modelo="Fiesta"
        )
        # Listar filtrando por cliente_actual (que tiene self.vehiculo)
        response = self.client.get(f"{self.url}?cliente={self.cliente_actual.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(self.vehiculo.id))

    def test_eliminar_vehiculo_sin_ordenes_hace_hard_delete(self):
        self.client.force_authenticate(user=self.admin_user)
        vehiculo_libre = Vehiculo.objects.create(
            cliente=self.cliente_actual,
            patente="AA999BB",
            marca="Fiat",
            modelo="Cronos"
        )
        url_del = reverse('detalle-vehiculo', kwargs={'pk': vehiculo_libre.id})
        response = self.client.delete(url_del)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        # Verificar que ya no existe en la BD
        self.assertFalse(Vehiculo.objects.filter(id=vehiculo_libre.id).exists())

    def test_eliminar_vehiculo_con_ordenes_hace_soft_delete(self):
        from ordenes.models import OrdenTrabajo
        self.client.force_authenticate(user=self.admin_user)
        # Crear una orden vinculada a self.vehiculo
        OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Falla en alternador y batería"
        )
        response = self.client.delete(self.url_detalle)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Debe seguir existiendo en la base de datos pero inactivo
        self.vehiculo.refresh_from_db()
        self.assertFalse(self.vehiculo.activo)

        # No debe figurar en el queryset de detalle ni de listado de activos
        response_get = self.client.get(self.url_detalle)
        self.assertEqual(response_get.status_code, status.HTTP_404_NOT_FOUND)

    def test_crear_vehiculo_sin_chasis_exito(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "cliente_id": str(self.cliente.id),
            "patente": "AA777BB",
            "marca": "Renault",
            "modelo": "Clio",
            "anio": 2021
            # numero_chasis omitido
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["numero_chasis"])


from ordenes.models import OrdenTrabajo

class HistorialVehiculoAPITestCase(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            email="admin_historial@example.com",
            nombre="Admin",
            apellido="Historial",
            rol="admin",
            password="adminpassword123"
        )
        self.cliente = Cliente.objects.create(
            nombre="Propietario",
            apellido="Test",
            tipo_documento="DNI",
            dni_cuit="44332211",
            condicion_iva="CF"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="HH111HH",
            marca="Honda",
            modelo="Civic",
            anio=2021
        )
        # Crear 15 Órdenes de Trabajo para probar la paginación de 10 por página
        for i in range(15):
            OrdenTrabajo.objects.create(
                vehiculo=self.vehiculo,
                descripcion_problema=f"Mantenimiento programado {i+1}",
                fecha_ingreso="2026-01-01"
            )

    def test_obtener_historial_vehiculo_paginado_exito(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('historial-vehiculo', kwargs={'pk': self.vehiculo.id})
        
        # Pagina 1 (limit=10 por defecto)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_items'], 15)
        self.assertEqual(response.data['total_pages'], 2)
        self.assertEqual(response.data['current_page'], 1)
        self.assertEqual(len(response.data['results']), 10)

        # Pagina 2
        response_p2 = self.client.get(f"{url}?page=2")
        self.assertEqual(response_p2.status_code, status.HTTP_200_OK)
        self.assertEqual(response_p2.data['current_page'], 2)
        self.assertEqual(len(response_p2.data['results']), 5)

    def test_obtener_historial_vehiculo_inexistente_retorna_404(self):
        import uuid
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('historial-vehiculo', kwargs={'pk': uuid.uuid4()})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_exportar_historial_pdf_exito(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('exportar-historial-pdf', kwargs={'pk': self.vehiculo.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('attachment; filename=', response['Content-Disposition'])
        self.assertTrue(len(response.content) > 0)

    def test_reasignar_vehiculo_exito(self):
        self.client.force_authenticate(user=self.admin_user)
        nuevo_cliente = Cliente.objects.create(
            nombre="Nuevo",
            apellido="Titular",
            tipo_documento="DNI",
            dni_cuit="99887766",
            condicion_iva="CF"
        )
        url = reverse('reasignar-vehiculo', kwargs={'pk': self.vehiculo.id})
        data = {'nuevo_cliente_id': str(nuevo_cliente.id)}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.cliente.id, nuevo_cliente.id)
        self.assertTrue(self.vehiculo.activo)



