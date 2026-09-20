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
