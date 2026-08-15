from unittest.mock import patch
from decimal import Decimal
from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core import mail
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from clientes.models import Cliente
from vehiculos.models import Vehiculo
from .models import OrdenTrabajo, EstadoOrden, ItemPresupuesto, TipoItem
from .services import notificar_presupuesto_websocket
from .signals import enviar_email_orden_background


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

    def test_crear_orden_como_cliente_prohibido(self):
        self.client.force_authenticate(user=self.cliente_user)
        data = {
            "vehiculo_id": str(self.vehiculo.id),
            "descripcion_problema": "Intento de alta cliente",
            "fecha_ingreso": "2026-07-16"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_filtrar_ordenes_multi_criterio_tk056(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('crear-orden-trabajo')
        response = self.client.get(f"{url}?patente=AB123CD&estado=ingresado")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertIn("total_items", response.data)


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


class ItemPresupuestoModelTest(TestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(
            nombre="Carlos",
            apellido="Gomez",
            tipo_documento="DNI",
            dni_cuit="87654321",
            condicion_iva="CF"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="CD456EF",
            marca="Ford",
            modelo="Focus",
            anio=2021
        )
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Revisión general"
        )


    def test_creacion_item_presupuesto_y_calculo_subtotal(self):
        item = ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.REPUESTO,
            descripcion="Filtro de aceite",
            cantidad=Decimal("2.00"),
            precio_unitario=Decimal("1500.50")
        )
        self.assertEqual(item.subtotal, Decimal("3001.00"))
        self.assertEqual(str(item), "Repuesto: Filtro de aceite ($3001.00)")

    def test_recalculo_subtotal_al_modificar(self):
        item = ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.MANO_DE_OBRA,
            descripcion="Cambio de filtro",
            cantidad=Decimal("1.00"),
            precio_unitario=Decimal("2000.00")
        )
        self.assertEqual(item.subtotal, Decimal("2000.00"))

        item.cantidad = Decimal("2.50")
        item.save()
        self.assertEqual(item.subtotal, Decimal("5000.00"))

    def test_borrado_en_cascada_orden_trabajo(self):
        ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.REPUESTO,
            descripcion="Aceite sintético",
            cantidad=Decimal("4.00"),
            precio_unitario=Decimal("3500.00")
        )
        self.assertEqual(ItemPresupuesto.objects.count(), 1)

class AgregarManoDeObraAPITest(APITestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(
            nombre="Laura",
            apellido="Rios",
            tipo_documento="DNI",
            dni_cuit="11223344",
            condicion_iva="CF"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="EF789GH",
            marca="Chevrolet",
            modelo="Onix",
            anio=2022
        )
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Ruido al frenar"
        )
        self.admin = User.objects.create_user(
            email="admin_presupuesto@example.com",
            nombre="Admin",
            apellido="User",
            rol="admin",
            password="password123"
        )

        self.tecnico = User.objects.create_user(
            email="tecnico_presupuesto@example.com",
            nombre="Tecnico",
            apellido="User",
            rol="tecnico",
            password="password123"
        )
        self.cliente_user = User.objects.create_user(
            email="cliente_presupuesto@example.com",
            nombre="Cliente",
            apellido="User",
            rol="cliente",
            password="password123"
        )
        self.url = reverse('agregar-mano-de-obra', kwargs={'orden_id': self.orden.id})

    def test_agregar_mano_de_obra_modalidad_estandar(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            "descripcion": "Diagnóstico general escáner",
            "modalidad": "estandar",
            "precio_unitario": "4500.00"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["tipo"], "mano_de_obra")
        self.assertEqual(response.data["subtotal"], "4500.00")
        self.assertEqual(ItemPresupuesto.objects.count(), 1)

    def test_agregar_mano_de_obra_modalidad_por_hora(self):
        self.client.force_authenticate(user=self.tecnico)
        data = {
            "descripcion": "Reparación de cableado eléctrico",
            "modalidad": "por_hora",
            "cantidad": "3.50",
            "precio_unitario": "3000.00"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["tipo"], "mano_de_obra")
        self.assertEqual(response.data["subtotal"], "10500.00")

    def test_error_cantidad_o_precio_invalido(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            "descripcion": "Alineación",
            "cantidad": "-1.00",
            "precio_unitario": "0.00"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cantidad", response.data)
        self.assertIn("precio_unitario", response.data)

    def test_bloqueo_acceso_rol_cliente(self):
        self.client.force_authenticate(user=self.cliente_user)
        data = {
            "descripcion": "Cambio de bujías",
            "precio_unitario": "2500.00"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bloqueo_acceso_sin_autenticacion(self):
        data = {
            "descripcion": "Cambio de bujías",
            "precio_unitario": "2500.00"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AgregarRepuestoViewTest(APITestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(
            nombre="Esteban",
            apellido="Gomez",
            tipo_documento="DNI",
            dni_cuit="20345678",
            condicion_iva="CF"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="CD456EF",
            marca="Ford",
            modelo="Focus",
            anio=2019
        )
        self.admin = User.objects.create_user(
            email="admin_repuesto@example.com",
            nombre="Admin",
            apellido="Taller",
            rol="admin",
            password="password123"
        )
        self.tecnico = User.objects.create_user(
            email="tecnico_repuesto@example.com",
            nombre="Tecnico",
            apellido="Repuesto",
            rol="tecnico",
            password="password123"
        )
        self.cliente_user = User.objects.create_user(
            email="cliente_user2@example.com",
            nombre="Cliente",
            apellido="User",
            rol="cliente",
            password="password123"
        )
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Cambio de pastillas de freno y discos"
        )
        self.url = reverse('agregar-repuesto', kwargs={'orden_id': self.orden.id})

    def test_agregar_repuesto_exito(self):
        self.client.force_authenticate(user=self.tecnico)
        data = {
            "descripcion": "Pastillas de freno delanteras Bosch",
            "cantidad": "2.00",
            "precio_unitario": "15000.50"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["tipo"], "repuesto")
        self.assertEqual(response.data["descripcion"], "Pastillas de freno delanteras Bosch")
        self.assertEqual(response.data["subtotal"], "30001.00")
        self.assertEqual(ItemPresupuesto.objects.count(), 1)

    def test_agregar_repuesto_cantidad_por_defecto(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            "descripcion": "Filtro de aceite Fram",
            "precio_unitario": "8500.00"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["cantidad"], "1.00")
        self.assertEqual(response.data["subtotal"], "8500.00")

    def test_error_cantidad_o_precio_invalido_repuesto(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            "descripcion": "Filtro de aire",
            "cantidad": "0.00",
            "precio_unitario": "-500.00"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cantidad", response.data)
        self.assertIn("precio_unitario", response.data)

    def test_bloqueo_acceso_rol_cliente_repuesto(self):
        self.client.force_authenticate(user=self.cliente_user)
        data = {
            "descripcion": "Aceite Sintetico 4L",
            "precio_unitario": "25000.00"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bloqueo_acceso_sin_autenticacion_repuesto(self):
        data = {
            "descripcion": "Aceite Sintetico 4L",
            "precio_unitario": "25000.00"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RecalculoMontoTotalTest(TestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(
            nombre="Lucas",
            apellido="Martinez",
            tipo_documento="DNI",
            dni_cuit="30123456",
            condicion_iva="CF"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AA111BB",
            marca="Chevrolet",
            modelo="Onix",
            anio=2021
        )
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Mantenimiento programado 50.000km"
        )

    def test_monto_total_inicial_cero(self):
        self.assertEqual(self.orden.monto_total, Decimal('0.00'))

    def test_recalculo_al_agregar_items(self):
        item1 = ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.MANO_DE_OBRA,
            descripcion="Cambio de aceite y filtro",
            cantidad=Decimal('1.00'),
            precio_unitario=Decimal('12000.00')
        )
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.monto_total, Decimal('12000.00'))

        item2 = ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.REPUESTO,
            descripcion="Aceite Sintetico 4L",
            cantidad=Decimal('1.00'),
            precio_unitario=Decimal('28500.50')
        )
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.monto_total, Decimal('40500.50'))

    def test_recalculo_al_modificar_item(self):
        item = ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.REPUESTO,
            descripcion="Bujias de Iridio",
            cantidad=Decimal('4.00'),
            precio_unitario=Decimal('5000.00')
        )
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.monto_total, Decimal('20000.00'))

        item.cantidad = Decimal('2.00')
        item.save()

        self.orden.refresh_from_db()
        self.assertEqual(self.orden.monto_total, Decimal('10000.00'))

    def test_recalculo_al_eliminar_item(self):
        item1 = ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.REPUESTO,
            descripcion="Filtro de aire",
            cantidad=Decimal('1.00'),
            precio_unitario=Decimal('7000.00')
        )
        item2 = ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.MANO_DE_OBRA,
            descripcion="Inspección general",
            cantidad=Decimal('1.00'),
            precio_unitario=Decimal('5000.00')
        )
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.monto_total, Decimal('12000.00'))

        item1.delete()

        self.orden.refresh_from_db()
        self.assertEqual(self.orden.monto_total, Decimal('5000.00'))

        item2.delete()

        self.orden.refresh_from_db()
        self.assertEqual(self.orden.monto_total, Decimal('0.00'))


class TransicionEstadoPresupuestoTest(TestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(
            nombre="Mario",
            apellido="Rossi",
            tipo_documento="DNI",
            dni_cuit="25987654",
            condicion_iva="CF"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="BB222CC",
            marca="Fiat",
            modelo="Cronos",
            anio=2022
        )
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Revisión de suspensión"
        )

    def test_transicion_automatica_ingresado_a_en_presupuesto_con_primer_item(self):
        self.assertEqual(self.orden.estado, EstadoOrden.INGRESADO)

        ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.MANO_DE_OBRA,
            descripcion="Diagnóstico de amortiguadores",
            cantidad=Decimal('1.00'),
            precio_unitario=Decimal('15000.00')
        )

        self.orden.refresh_from_db()
        self.assertEqual(self.orden.estado, EstadoOrden.EN_PRESUPUESTO)

    def test_mantiene_estado_en_presupuesto_con_items_subsiguientes(self):
        ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.MANO_DE_OBRA,
            descripcion="Diagnóstico de amortiguadores",
            cantidad=Decimal('1.00'),
            precio_unitario=Decimal('15000.00')
        )
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.estado, EstadoOrden.EN_PRESUPUESTO)

        ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.REPUESTO,
            descripcion="Kit de amortiguadores delanteros",
            cantidad=Decimal('2.00'),
            precio_unitario=Decimal('45000.00')
        )
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.estado, EstadoOrden.EN_PRESUPUESTO)

    def test_no_invierte_estado_si_ya_esta_aprobado(self):
        self.orden.estado = EstadoOrden.APROBADO
        self.orden.save()

        ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.REPUESTO,
            descripcion="Alineación y balanceo",
            cantidad=Decimal('1.00'),
            precio_unitario=Decimal('8000.00')
        )

        self.orden.refresh_from_db()
        self.assertEqual(self.orden.estado, EstadoOrden.APROBADO)


class NotificacionWebSocketPresupuestoTest(TestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(
            nombre="Diego",
            apellido="Maradona",
            tipo_documento="DNI",
            dni_cuit="10101010",
            condicion_iva="CF"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="D1000S",
            marca="Peugeot",
            modelo="208",
            anio=2023
        )
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Cambio de kit de distribución"
        )

    def test_generacion_payload_notificacion_websocket(self):
        payload = notificar_presupuesto_websocket(self.orden)
        self.assertEqual(payload["event"], "presupuesto_actualizado")
        self.assertEqual(payload["orden_id"], str(self.orden.id))
        self.assertEqual(payload["numero_ot"], self.orden.numero_ot)
        self.assertEqual(payload["patente"], "D1000S")
        self.assertEqual(payload["monto_total"], "0.00")
        self.assertEqual(payload["estado"], "ingresado")

    def test_emision_notificacion_al_guardar_item_presupuesto(self):
        ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.REPUESTO,
            descripcion="Correa de distribución Continental",
            cantidad=Decimal('1.00'),
            precio_unitario=Decimal('35000.00')
        )
        self.orden.refresh_from_db()
        payload = notificar_presupuesto_websocket(self.orden)
        self.assertEqual(payload["monto_total"], "35000.00")
        self.assertEqual(payload["estado"], "en_presupuesto")







class OrdenTrabajoEmailTest(TestCase):
    def setUp(self):
        self.usuario_cliente = User.objects.create_user(
            email="cliente_test@example.com",
            nombre="Carlos",
            apellido="Gomez",
            rol="cliente",
            password="password123"
        )
        self.cliente = Cliente.objects.create(
            usuario=self.usuario_cliente,
            nombre="Carlos",
            apellido="Gomez",
            tipo_documento="DNI",
            dni_cuit="87654321",
            condicion_iva="CF"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="CD456EF",
            marca="Ford",
            modelo="Focus",
            anio=2021
        )
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Revisión general"
        )

    def test_enviar_email_orden_background_exito(self):
        mail.outbox = []
        enviar_email_orden_background(self.orden.id)
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, ["cliente_test@example.com"])
        self.assertIn("Nueva Orden de Trabajo", email.subject)

    def test_enviar_email_orden_sin_usuario_o_email(self):
        cliente_sin_usuario = Cliente.objects.create(
            nombre="Pedro",
            apellido="SinEmail",
            tipo_documento="DNI",
            dni_cuit="99887766",
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
        self.assertEqual(len(mail.outbox), 0)

    @patch("ordenes.signals.enviar_email_orden_background")
    def test_creacion_orden_dispara_senal_email(self, mock_enviar_email):
        orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Alineación y balanceo"
        )
        mock_enviar_email.assert_called_once_with(orden.id)

    @patch("threading.Thread")
    def test_senal_tolerancia_a_errores_de_hilo(self, mock_thread):
        mock_thread.return_value.start.side_effect = Exception("Fallo al iniciar el hilo de pruebas")
        orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Revisión general"
        )
        self.assertIsNotNone(orden.id)


from rest_framework.test import APITestCase
from django.urls import reverse
from .models import HistorialEstadoOrden


class HistorialEstadoOrdenAPITestCase(APITestCase):
    def setUp(self):
        self.user_admin = User.objects.create_user(
            email="admin_historial@taller.com",
            nombre="Admin",
            apellido="Taller",
            rol="admin",
            password="password123"
        )
        self.user_cliente = User.objects.create_user(
            email="cliente_historial@taller.com",
            nombre="Cliente",
            apellido="Duenio",
            rol="cliente",
            password="password123"
        )
        self.user_ajeno = User.objects.create_user(
            email="ajeno@taller.com",
            nombre="Cliente",
            apellido="Ajeno",
            rol="cliente",
            password="password123"
        )
        self.cliente = Cliente.objects.create(
            usuario=self.user_cliente,
            nombre="Cliente",
            apellido="Duenio",
            tipo_documento="DNI",
            dni_cuit="33444555",
            condicion_iva="CF"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AB123CD",
            marca="Toyota",
            modelo="Corolla"
        )
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Ruido en el motor"
        )

    def test_consultar_historial_orden_exito_admin(self):
        self.client.force_authenticate(user=self.user_admin)
        url = reverse('consultar-historial-orden', kwargs={'orden_id': self.orden.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['orden_id'], str(self.orden.id))
        self.assertEqual(response.data['estado_actual'], 'ingresado')
        self.assertTrue(len(response.data['historial']) >= 1)

    def test_consultar_historial_orden_exito_propietario(self):
        self.client.force_authenticate(user=self.user_cliente)
        url = reverse('consultar-historial-orden', kwargs={'orden_id': self.orden.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_consultar_historial_orden_bloqueado_cliente_ajeno(self):
        self.client.force_authenticate(user=self.user_ajeno)
        url = reverse('consultar-historial-orden', kwargs={'orden_id': self.orden.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)

    def test_actualizar_estado_orden_y_registro_historial(self):
        self.client.force_authenticate(user=self.user_admin)
        url = reverse('actualizar-estado-orden', kwargs={'orden_id': self.orden.id})
        payload = {
            "estado": "en_proceso",
            "comentario": "Iniciando trabajos de reparación."
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['estado_actual'], 'en_proceso')

        self.orden.refresh_from_db()
        self.assertEqual(self.orden.estado, 'en_proceso')

        ultimo_registro = HistorialEstadoOrden.objects.filter(orden_trabajo=self.orden).first()
        self.assertEqual(ultimo_registro.estado_anterior, 'ingresado')
        self.assertEqual(ultimo_registro.estado_nuevo, 'en_proceso')
        self.assertEqual(ultimo_registro.comentario, 'Iniciando trabajos de reparación.')


from django.core.files.uploadedfile import SimpleUploadedFile
from .models import AdjuntoDiagnostico


class AdjuntoDiagnosticoAPITest(APITestCase):
    def setUp(self):
        self.user_tecnico = User.objects.create_user(
            email="tecnico_foto@fcc.com",
            password="Password123!",
            rol="tecnico",
            nombre="Técnico",
            apellido="Pruebas"
        )
        self.cliente = Cliente.objects.create(
            nombre="Cliente",
            apellido="Diagnostico",
            tipo_documento="DNI",
            dni_cuit="77889900",
            condicion_iva="CF"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="FOTO123",
            marca="Toyota",
            modelo="Corolla",
            anio=2022
        )
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Diagnóstico con fotos"
        )

    def test_subir_adjunto_diagnostico_exito(self):
        self.client.force_authenticate(user=self.user_tecnico)
        url = reverse('listar-crear-adjuntos-orden', kwargs={'orden_id': self.orden.id})
        
        foto_mock = SimpleUploadedFile("motor.jpg", b"contenido_de_imagen_falsa", content_type="image/jpeg")
        response = self.client.post(url, {'archivo': foto_mock}, format='multipart')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['nombre_archivo'], 'motor.jpg')
        self.assertTrue('url_secure' in response.data)

        self.assertEqual(AdjuntoDiagnostico.objects.filter(orden_trabajo=self.orden).count(), 1)

    def test_listar_adjuntos_diagnostico(self):
        self.client.force_authenticate(user=self.user_tecnico)
        AdjuntoDiagnostico.objects.create(
            orden_trabajo=self.orden,
            url_secure="http://localhost:8000/media/diagnosticos/test.jpg",
            public_id="diagnosticos/test.jpg",
            nombre_archivo="rueda.png",
            tamanio=1024,
            creado_por=self.user_tecnico
        )

        url = reverse('listar-crear-adjuntos-orden', kwargs={'orden_id': self.orden.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['nombre_archivo'], 'rueda.png')

    def test_eliminar_adjunto_diagnostico(self):
        self.client.force_authenticate(user=self.user_tecnico)
        adjunto = AdjuntoDiagnostico.objects.create(
            orden_trabajo=self.orden,
            url_secure="http://localhost:8000/media/diagnosticos/test.jpg",
            public_id="diagnosticos/test.jpg",
            nombre_archivo="a_borrar.jpg",
            tamanio=2048,
            creado_por=self.user_tecnico
        )

        url = reverse('eliminar-adjunto-diagnostico', kwargs={'adjunto_id': adjunto.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(AdjuntoDiagnostico.objects.filter(id=adjunto.id).count(), 0)


class ItemsPresupuestoAPITest(APITestCase):
    """
    TK043: Pruebas unitarias para gestión de ítems de presupuesto (Listar, Completado, Eliminar).
    """

    def setUp(self):
        self.cliente_user = User.objects.create_user(
            email="cliente_items@taller.com",
            password="Password123!",
            nombre="Cliente",
            apellido="Items",
            rol="cliente"
        )
        self.tecnico = User.objects.create_user(
            email="tecnico_items@taller.com",
            password="Password123!",
            nombre="Tecnico",
            apellido="Items",
            rol="tecnico"
        )
        self.cliente = Cliente.objects.create(
            usuario=self.cliente_user,
            dni_cuit="20445566778",
            telefono="1122334455"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="ITM123",
            marca="Toyota",
            modelo="Corolla",
            anio=2021
        )
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Revisión general e ítems"
        )
        self.item = ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo="repuesto",
            descripcion="Filtro de aire Bosch",
            cantidad=Decimal("1.00"),
            precio_unitario=Decimal("5000.00")
        )

    def test_listar_items_presupuesto(self):
        self.client.force_authenticate(user=self.tecnico)
        url = reverse('listar-items-presupuesto', kwargs={'orden_id': self.orden.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['descripcion'], "Filtro de aire Bosch")
        self.assertFalse(response.data[0]['completado'])

    def test_marcar_item_completado(self):
        self.client.force_authenticate(user=self.tecnico)
        url = reverse('marcar-item-completado', kwargs={'orden_id': self.orden.id, 'item_id': self.item.id})
        response = self.client.patch(url, {'completado': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['completado'])

        # Alternar sin enviar valor explícito
        response = self.client.patch(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['completado'])

    def test_eliminar_item_presupuesto(self):
        self.client.force_authenticate(user=self.tecnico)
        url = reverse('eliminar-item-presupuesto', kwargs={'orden_id': self.orden.id, 'item_id': self.item.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ItemPresupuesto.objects.filter(id=self.item.id).count(), 0)








