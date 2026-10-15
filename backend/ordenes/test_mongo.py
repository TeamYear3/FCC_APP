from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from usuarios.models import Usuario
from clientes.models import Cliente
from vehiculos.models import Vehiculo
from ordenes.models import OrdenTrabajo, EstadoOrden
from core.mongo import registrar_auditoria_ot, obtener_auditoria_ot, MongoDBClient


class MongoDBAuditoriaTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_superuser(
            email="admin_mongo@fcc.com",
            password="password123",
            nombre="Admin",
            apellido="Mongo",
            rol="admin"
        )
        self.client.force_authenticate(user=self.admin)

        self.cliente_user = Usuario.objects.create_user(
            email="cliente_mongo@fcc.com",
            password="password123",
            nombre="Cliente",
            apellido="Mongo",
            rol="cliente"
        )

        self.cliente = Cliente.objects.create(
            usuario=self.cliente_user,
            nombre="Cliente",
            apellido="Mongo",
            dni_cuit="20999999999",
            telefono="1122334455"
        )

        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AA123BB",
            marca="Toyota",
            modelo="Corolla",
            anio=2022
        )

        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Revisión general",
            estado=EstadoOrden.INGRESADO
        )

    @patch("core.mongo.MongoDBClient.get_db")
    def test_registrar_auditoria_ot_exitoso(self, mock_get_db):
        mock_db = MagicMock()
        mock_coleccion = MagicMock()
        mock_db.__getitem__.return_value = mock_coleccion
        mock_get_db.return_value = mock_db

        resultado = registrar_auditoria_ot(
            orden_id=self.orden.id,
            estado_anterior="ingresado",
            estado_nuevo="en_presupuesto",
            usuario=self.admin,
            metadata={"comentario": "Inicio de presupuesto"}
        )

        self.assertTrue(resultado)
        mock_coleccion.insert_one.assert_called_once()
        args, _ = mock_coleccion.insert_one.call_args
        doc = args[0]
        self.assertEqual(doc["orden_id"], str(self.orden.id))
        self.assertEqual(doc["estado_nuevo"], "en_presupuesto")

    @patch("core.mongo.MongoDBClient.get_db")
    def test_obtener_auditoria_ot_retorna_registros(self, mock_get_db):
        mock_db = MagicMock()
        mock_coleccion = MagicMock()
        mock_cursor = MagicMock()

        registro_fake = {
            "_id": "507f1f77bcf86cd799439011",
            "orden_id": str(self.orden.id),
            "estado_anterior": "ingresado",
            "estado_nuevo": "en_presupuesto",
            "timestamp": "2026-09-20T10:00:00Z"
        }
        mock_cursor.sort.return_value = [registro_fake]
        mock_coleccion.find.return_value = mock_cursor
        mock_db.__getitem__.return_value = mock_coleccion
        mock_get_db.return_value = mock_db

        auditoria = obtener_auditoria_ot(self.orden.id)
        self.assertEqual(len(auditoria), 1)
        self.assertEqual(auditoria[0]["orden_id"], str(self.orden.id))

    @patch("core.mongo.obtener_auditoria_ot")
    def test_endpoint_auditoria_view(self, mock_obtener):
        mock_obtener.return_value = [
            {
                "_id": "507f1f77bcf86cd799439011",
                "orden_id": str(self.orden.id),
                "estado_anterior": "ingresado",
                "estado_nuevo": "en_presupuesto",
                "timestamp": "2026-09-20T10:00:00Z"
            }
        ]

        url = reverse("orden-auditoria-nosql", kwargs={"orden_id": self.orden.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["origen_datos"], "MongoDB")
        self.assertEqual(response.data["total_registros"], 1)

    @patch("core.mongo.MongoDBClient.get_db")
    def test_fallback_mongo_offline(self, mock_get_db):
        mock_get_db.return_value = None

        resultado = registrar_auditoria_ot(self.orden.id, "ingresado", "en_presupuesto")
        self.assertFalse(resultado)

        auditoria = obtener_auditoria_ot(self.orden.id)
        self.assertEqual(auditoria, [])


class MongoWebSocketEventosTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_superuser(
            email="admin_ws_mongo@fcc.com",
            password="password123",
            nombre="AdminWS",
            apellido="Mongo",
            rol="admin"
        )
        self.client.force_authenticate(user=self.admin)

        self.cliente_user = Usuario.objects.create_user(
            email="cliente_ws_mongo@fcc.com",
            password="password123",
            nombre="ClienteWS",
            apellido="Mongo",
            rol="cliente"
        )

        self.cliente = Cliente.objects.create(
            usuario=self.cliente_user,
            nombre="ClienteWS",
            apellido="Mongo",
            dni_cuit="20888888888",
            telefono="1122334455"
        )

        self.otro_cliente_user = Usuario.objects.create_user(
            email="otro_cliente_ws@fcc.com",
            password="password123",
            nombre="OtroCliente",
            apellido="Mongo",
            rol="cliente"
        )

        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="WS123AB",
            marca="Ford",
            modelo="Focus",
            anio=2021
        )

        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Revisión WebSocket",
            estado=EstadoOrden.INGRESADO
        )

    @patch("core.mongo.MongoDBClient.get_db")
    def test_registrar_evento_websocket_exitoso(self, mock_get_db):
        from core.mongo import registrar_evento_websocket
        mock_db = MagicMock()
        mock_col = MagicMock()
        mock_col.find_one.return_value = None
        mock_db.__getitem__.return_value = mock_col
        mock_get_db.return_value = mock_db

        payload = {
            "orden_id": str(self.orden.id),
            "numero_ot": self.orden.numero_ot,
            "estado_nuevo": EstadoOrden.EN_PRESUPUESTO,
            "monto_total": "15000"
        }

        res = registrar_evento_websocket("orden_actualizada", payload, grupo="ordenes_actualizaciones")
        self.assertTrue(res)
        mock_col.insert_one.assert_called_once()
        args, _ = mock_col.insert_one.call_args
        doc = args[0]
        self.assertEqual(doc["tipo_evento"], "orden_actualizada")
        self.assertEqual(doc["orden_id"], str(self.orden.id))
        self.assertEqual(doc["numero_ot"], self.orden.numero_ot)
        self.assertEqual(doc["grupo"], "ordenes_actualizaciones")

    @patch("core.mongo.MongoDBClient.get_db")
    def test_registrar_evento_websocket_deduplicacion(self, mock_get_db):
        from core.mongo import registrar_evento_websocket
        mock_db = MagicMock()
        mock_col = MagicMock()
        mock_col.find_one.return_value = {"evento_id": "evt-123", "tipo_evento": "orden_actualizada"}
        mock_db.__getitem__.return_value = mock_col
        mock_get_db.return_value = mock_db

        payload = {
            "evento_id": "evt-123",
            "orden_id": str(self.orden.id)
        }

        res = registrar_evento_websocket("orden_actualizada", payload)
        self.assertTrue(res)
        mock_col.insert_one.assert_not_called()

    @patch("core.mongo.MongoDBClient.get_db")
    def test_obtener_historial_eventos_websocket(self, mock_get_db):
        from core.mongo import obtener_historial_eventos_websocket
        mock_db = MagicMock()
        mock_col = MagicMock()
        mock_cursor = MagicMock()

        doc_fake = {
            "_id": "607f1f77bcf86cd799439099",
            "evento_id": "evt-abc",
            "tipo_evento": "orden_actualizada",
            "orden_id": str(self.orden.id),
            "numero_ot": self.orden.numero_ot,
            "payload": {"event": "cambio_estado"},
            "timestamp": "2026-10-14T20:00:00Z"
        }
        mock_cursor.sort.return_value.limit.return_value = [doc_fake]
        mock_col.find.return_value = mock_cursor
        mock_db.__getitem__.return_value = mock_col
        mock_get_db.return_value = mock_db

        eventos = obtener_historial_eventos_websocket(orden_id=self.orden.id)
        self.assertEqual(len(eventos), 1)
        self.assertEqual(eventos[0]["evento_id"], "evt-abc")
        self.assertEqual(eventos[0]["orden_id"], str(self.orden.id))

    @patch("core.mongo.MongoDBClient.get_db")
    def test_fallback_mongo_offline_websocket(self, mock_get_db):
        from core.mongo import registrar_evento_websocket, obtener_historial_eventos_websocket
        mock_get_db.return_value = None

        self.assertFalse(registrar_evento_websocket("orden_actualizada", {"orden_id": "123"}))
        self.assertEqual(obtener_historial_eventos_websocket(orden_id="123"), [])

    @patch("core.mongo.obtener_historial_eventos_websocket")
    def test_endpoint_eventos_websocket_admin(self, mock_obtener):
        mock_obtener.return_value = [
            {
                "_id": "doc123",
                "evento_id": "evt-1",
                "tipo_evento": "orden_actualizada",
                "payload": {"estado": "en_presupuesto"}
            }
        ]

        url = reverse("orden-eventos-websocket", kwargs={"orden_id": self.orden.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["origen_datos"], "MongoDB")
        self.assertEqual(response.data["total_eventos"], 1)
        self.assertEqual(response.data["eventos"][0]["evento_id"], "evt-1")

    @patch("core.mongo.obtener_historial_eventos_websocket")
    def test_endpoint_eventos_websocket_cliente_propio(self, mock_obtener):
        mock_obtener.return_value = []
        self.client.force_authenticate(user=self.cliente_user)

        url = reverse("orden-eventos-websocket", kwargs={"orden_id": self.orden.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_endpoint_eventos_websocket_cliente_ajeno_denegado(self):
        self.client.force_authenticate(user=self.otro_cliente_user)
        url = reverse("orden-eventos-websocket", kwargs={"orden_id": self.orden.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class OrdenesConsumerTestCase(TestCase):
    @patch("ordenes.consumers.obtener_historial_eventos_websocket")
    async def test_consumer_receive_historial(self, mock_obtener):
        import json
        from channels.testing import WebsocketCommunicator
        from ordenes.consumers import OrdenesConsumer

        mock_obtener.return_value = [
            {"evento_id": "e1", "tipo_evento": "orden_actualizada", "payload": {"status": "ok"}}
        ]

        communicator = WebsocketCommunicator(OrdenesConsumer.as_asgi(), "/ws/ordenes/")
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.send_json_to({
            "action": "historial",
            "orden_id": "some-uuid",
            "limit": 10
        })

        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "historial_eventos")
        self.assertEqual(response["total"], 1)
        self.assertEqual(response["eventos"][0]["evento_id"], "e1")

        await communicator.disconnect()

    @patch("ordenes.consumers.registrar_evento_websocket")
    async def test_consumer_orden_actualizada_persiste(self, mock_registrar):
        from unittest.mock import AsyncMock
        from ordenes.consumers import OrdenesConsumer

        mock_registrar.return_value = True

        consumer = OrdenesConsumer()
        consumer.room_group_name = "ordenes_actualizaciones"
        consumer.send = AsyncMock()

        await consumer.orden_actualizada({
            "type": "orden_actualizada",
            "payload": {"orden_id": "ot-1", "estado": "en_proceso"}
        })

        mock_registrar.assert_called_once_with(
            tipo_evento="orden_actualizada",
            payload={"orden_id": "ot-1", "estado": "en_proceso"},
            grupo="ordenes_actualizaciones"
        )
        consumer.send.assert_awaited_once()

    @patch("ordenes.consumers.registrar_evento_websocket")
    async def test_consumer_notificacion_presupuesto_persiste(self, mock_registrar):
        from unittest.mock import AsyncMock
        from ordenes.consumers import OrdenesConsumer

        mock_registrar.return_value = True

        consumer = OrdenesConsumer()
        consumer.room_group_name = "ordenes_actualizaciones"
        consumer.send = AsyncMock()

        await consumer.notificacion_presupuesto({
            "type": "notificacion_presupuesto",
            "data": {"orden_id": "ot-2", "monto": "5000"}
        })

        mock_registrar.assert_called_once_with(
            tipo_evento="notificacion_presupuesto",
            payload={"orden_id": "ot-2", "monto": "5000"},
            grupo="ordenes_actualizaciones"
        )
        consumer.send.assert_awaited_once()

    @patch("ordenes.consumers.registrar_evento_websocket")
    async def test_consumer_adjunto_actualizado_persiste(self, mock_registrar):
        from unittest.mock import AsyncMock
        from ordenes.consumers import OrdenesConsumer

        mock_registrar.return_value = True

        consumer = OrdenesConsumer()
        consumer.room_group_name = "ordenes_actualizaciones"
        consumer.send = AsyncMock()

        await consumer.adjunto_actualizado({
            "type": "adjunto_actualizado",
            "payload": {"orden_id": "ot-3", "accion": "creado"}
        })

        mock_registrar.assert_called_once_with(
            tipo_evento="adjunto_actualizado",
            payload={"orden_id": "ot-3", "accion": "creado"},
            grupo="ordenes_actualizaciones"
        )
        consumer.send.assert_awaited_once()


class MongoDiagnosticoOBD2TestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_superuser(
            email="admin_obd@fcc.com",
            password="password123",
            nombre="AdminOBD",
            apellido="Taller",
            rol="admin"
        )
        self.tecnico = Usuario.objects.create_user(
            email="tecnico_obd@fcc.com",
            password="password123",
            nombre="Carlos",
            apellido="Tecnico",
            rol="tecnico"
        )
        self.cliente_user = Usuario.objects.create_user(
            email="cliente_obd@fcc.com",
            password="password123",
            nombre="Duenio",
            apellido="Vehiculo",
            rol="cliente"
        )
        self.otro_cliente_user = Usuario.objects.create_user(
            email="otro_obd@fcc.com",
            password="password123",
            nombre="Ajeno",
            apellido="Vehiculo",
            rol="cliente"
        )

        self.cliente = Cliente.objects.create(
            usuario=self.cliente_user,
            nombre="Duenio",
            apellido="Vehiculo",
            dni_cuit="20777777777",
            telefono="1133221100"
        )

        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="OBD123",
            marca="Chevrolet",
            modelo="Cruze",
            anio=2020
        )

        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            tecnico=self.tecnico,
            descripcion_problema="Luz de Check Engine encendida",
            estado=EstadoOrden.INGRESADO
        )

    @patch("core.mongo.MongoDBClient.get_db")
    def test_registrar_diagnostico_obd2_exitoso(self, mock_get_db):
        from core.mongo import registrar_diagnostico_obd2
        mock_db = MagicMock()
        mock_col = MagicMock()
        mock_db.__getitem__.return_value = mock_col
        mock_get_db.return_value = mock_db

        codigos = [
            {"codigo": "p0300", "descripcion": "Fallo de encendido en cilindro aleatorio", "sistema": "Powertrain"},
            {"codigo": "P0420", "descripcion": "Eficiencia catalizador banco 1 bajo el umbral"}
        ]
        params = {
            "rpm": 820,
            "temperatura_refrigerante_c": 92,
            "stft_pct": 2.3,
            "voltaje_bateria_v": 13.8
        }

        doc = registrar_diagnostico_obd2(
            orden_id=self.orden.id,
            codigos_dtc=codigos,
            parametros_en_vivo=params,
            escaner="Launch X431 Pro",
            notas="Prueba de banco realizada con motor a temperatura de régimen.",
            tecnico=self.tecnico,
            numero_ot=self.orden.numero_ot,
            patente=self.vehiculo.patente
        )

        self.assertIsNotNone(doc)
        mock_col.insert_one.assert_called_once()
        self.assertEqual(doc["orden_id"], str(self.orden.id))
        self.assertEqual(doc["patente"], "OBD123")
        self.assertEqual(len(doc["codigos_dtc"]), 2)
        self.assertEqual(doc["codigos_dtc"][0]["codigo"], "P0300")
        self.assertEqual(doc["parametros_en_vivo"]["rpm"], 820)
        self.assertEqual(doc["tecnico"]["email"], "tecnico_obd@fcc.com")

    @patch("core.mongo.MongoDBClient.get_db")
    def test_registrar_diagnostico_obd2_normalizacion_strings(self, mock_get_db):
        from core.mongo import registrar_diagnostico_obd2
        mock_db = MagicMock()
        mock_col = MagicMock()
        mock_db.__getitem__.return_value = mock_col
        mock_get_db.return_value = mock_db

        doc = registrar_diagnostico_obd2(
            orden_id=self.orden.id,
            codigos_dtc="p0171, p0301",
            parametros_en_vivo={"stft": 15.2}
        )

        self.assertIsNotNone(doc)
        self.assertEqual(len(doc["codigos_dtc"]), 2)
        self.assertEqual(doc["codigos_dtc"][0]["codigo"], "P0171")
        self.assertEqual(doc["codigos_dtc"][1]["codigo"], "P0301")

    @patch("core.mongo.MongoDBClient.get_db")
    def test_obtener_diagnosticos_obd2(self, mock_get_db):
        from core.mongo import obtener_diagnosticos_obd2
        mock_db = MagicMock()
        mock_col = MagicMock()
        mock_cursor = MagicMock()

        doc_fake = {
            "_id": "607f1f77bcf86cd799439100",
            "diagnostico_id": "diag-1",
            "orden_id": str(self.orden.id),
            "patente": "OBD123",
            "codigos_dtc": [{"codigo": "P0300"}],
            "timestamp": "2026-10-14T22:00:00Z"
        }
        mock_cursor.sort.return_value.limit.return_value = [doc_fake]
        mock_col.find.return_value = mock_cursor
        mock_db.__getitem__.return_value = mock_col
        mock_get_db.return_value = mock_db

        res = obtener_diagnosticos_obd2(orden_id=self.orden.id)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["diagnostico_id"], "diag-1")
        self.assertEqual(res[0]["codigos_dtc"][0]["codigo"], "P0300")

    @patch("core.mongo.MongoDBClient.get_db")
    def test_fallback_mongo_offline_obd2(self, mock_get_db):
        from core.mongo import registrar_diagnostico_obd2, obtener_diagnosticos_obd2
        mock_get_db.return_value = None

        self.assertIsNone(registrar_diagnostico_obd2(self.orden.id, ["P0300"]))
        self.assertEqual(obtener_diagnosticos_obd2(self.orden.id), [])

    @patch("core.mongo.registrar_diagnostico_obd2")
    def test_endpoint_post_diagnostico_obd2_tecnico(self, mock_registrar):
        mock_registrar.return_value = {
            "_id": "doc123",
            "diagnostico_id": "diag-new",
            "orden_id": str(self.orden.id),
            "codigos_dtc": [{"codigo": "P0300", "descripcion": "Misfire"}],
            "parametros_en_vivo": {"rpm": 800}
        }

        self.client.force_authenticate(user=self.tecnico)
        url = reverse("orden-diagnostico-obd2", kwargs={"orden_id": self.orden.id})
        payload = {
            "codigos_dtc": [{"codigo": "P0300", "descripcion": "Misfire"}],
            "parametros_en_vivo": {"rpm": 800},
            "escaner": "Bosch KTS",
            "notas": "Inspección de encendido"
        }
        response = self.client.post(url, data=payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["diagnostico"]["diagnostico_id"], "diag-new")
        mock_registrar.assert_called_once()

    def test_endpoint_post_diagnostico_obd2_cliente_prohibido(self):
        self.client.force_authenticate(user=self.cliente_user)
        url = reverse("orden-diagnostico-obd2", kwargs={"orden_id": self.orden.id})
        response = self.client.post(url, data={"codigos_dtc": ["P0300"]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("core.mongo.obtener_diagnosticos_obd2")
    def test_endpoint_get_diagnostico_obd2_admin_y_cliente_propio(self, mock_obtener):
        mock_obtener.return_value = [
            {"diagnostico_id": "d-1", "codigos_dtc": [{"codigo": "P0420"}]}
        ]

        # Admin consulta
        self.client.force_authenticate(user=self.admin)
        url = reverse("orden-diagnostico-obd2", kwargs={"orden_id": self.orden.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_diagnosticos"], 1)

        # Cliente propietario consulta
        self.client.force_authenticate(user=self.cliente_user)
        response_cliente = self.client.get(url)
        self.assertEqual(response_cliente.status_code, status.HTTP_200_OK)

    def test_endpoint_get_diagnostico_obd2_cliente_ajeno_denegado(self):
        self.client.force_authenticate(user=self.otro_cliente_user)
        url = reverse("orden-diagnostico-obd2", kwargs={"orden_id": self.orden.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)



