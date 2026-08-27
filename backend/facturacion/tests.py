from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from clientes.models import Cliente
from vehiculos.models import Vehiculo
from ordenes.models import OrdenTrabajo, ItemPresupuesto, TipoItem, EstadoOrden
from .models import Factura, TipoComprobante, EstadoFactura, EstadoPago
from .arca_client import ArcaWSClient

User = get_user_model()


class ArcaWSClientTest(TestCase):
    def test_generacion_cae_algoritmico(self):
        cae = ArcaWSClient.generar_cae_algoritmico()
        self.assertEqual(len(cae), 14)
        self.assertTrue(cae.isdigit())

    def test_solicitar_cae_exitoso(self):
        resultado = ArcaWSClient.solicitar_cae(
            total=Decimal("150000.00"),
            punto_venta=1,
            tipo_comprobante=TipoComprobante.FACTURA_B,
            doc_tipo="DNI",
            doc_nro="35123456"
        )
        self.assertEqual(resultado["resultado"], "Aprobado")
        self.assertEqual(len(resultado["cae"]), 14)
        self.assertEqual(resultado["punto_venta"], 1)
        self.assertEqual(resultado["tipo_comprobante"], "B")
        self.assertEqual(resultado["numero_factura"], 1)
        # La fecha de vencimiento fiscal debe ser 10 días posterior
        self.assertEqual(
            resultado["fecha_vencimiento_cae"],
            timezone.localdate() + timedelta(days=10)
        )


class FacturaModelTest(TestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(
            nombre="Roberto",
            apellido="Gómez",
            tipo_documento="DNI",
            dni_cuit="20123456",
            condicion_iva="CF"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AA123BB",
            marca="Ford",
            modelo="Focus",
            anio=2018
        )
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Cambio de pastillas de freno"
        )

    def test_formato_numero_comprobante_y_semaforos(self):
        factura = Factura.objects.create(
            orden_trabajo=self.orden,
            tipo_comprobante=TipoComprobante.FACTURA_B,
            punto_venta=1,
            numero_factura=5,
            cae="74123456789012",
            fecha_vencimiento_cae=timezone.localdate() + timedelta(days=10),
            total=Decimal("85000.00"),
            estado=EstadoFactura.EMITIDA,
            estado_pago=EstadoPago.SIN_INTERACCION,
            fecha_vencimiento_pago=timezone.localdate() + timedelta(days=15)
        )

        self.assertEqual(factura.numero_comprobante_formateado, "B-0001-00000005")
        self.assertEqual(factura.semaforo_color, "a_vencer")

        # Probar semáforo pagada
        factura.estado_pago = EstadoPago.PAGADA
        self.assertEqual(factura.semaforo_color, "pagada")

        # Probar semáforo vencida
        factura.estado_pago = EstadoPago.SIN_INTERACCION
        factura.fecha_vencimiento_pago = timezone.localdate() - timedelta(days=2)
        self.assertEqual(factura.semaforo_color, "vencida")

        # Probar factura anulada
        factura.estado = EstadoFactura.ANULADA
        self.assertEqual(factura.semaforo_color, "sin_interaccion")


class FacturacionAPITest(APITestCase):
    def setUp(self):
        # Crear usuarios con diferentes roles
        self.admin = User.objects.create_user(
            email="admin_factura@taller.com",
            nombre="Admin",
            apellido="Taller",
            rol="admin",
            password="AdminPassword123!"
        )
        self.tecnico = User.objects.create_user(
            email="tecnico_factura@taller.com",
            nombre="Tecnico",
            apellido="Taller",
            rol="tecnico",
            password="TecnicoPassword123!"
        )

        self.cliente = Cliente.objects.create(
            nombre="Esteban",
            apellido="Quito",
            tipo_documento="CUIT",
            dni_cuit="20-33445566-9",
            condicion_iva="RI"
        )
        self.vehiculo = Vehiculo.objects.create(
            cliente=self.cliente,
            patente="AF999ZZ",
            marca="Toyota",
            modelo="Hilux",
            anio=2022
        )
        self.orden = OrdenTrabajo.objects.create(
            vehiculo=self.vehiculo,
            descripcion_problema="Service completo y frenos"
        )
        # Cargar ítems de presupuesto para que tenga monto total
        ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.MANO_DE_OBRA,
            descripcion="Mano de obra service",
            cantidad=Decimal("1.00"),
            precio_unitario=Decimal("50000.00")
        )
        ItemPresupuesto.objects.create(
            orden_trabajo=self.orden,
            tipo=TipoItem.REPUESTO,
            descripcion="Filtro de aceite y aceite sintético",
            cantidad=Decimal("1.00"),
            precio_unitario=Decimal("70000.00")
        )
        self.orden.refresh_from_db()

    def test_emitir_factura_como_admin_exito(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("factura-emitir")

        payload = {
            "orden_trabajo_id": str(self.orden.id),
            "tipo_comprobante": "A",
            "punto_venta": 1,
            "dias_vencimiento_pago": 20,
            "observaciones": "Factura emitida vía ARCA WebService"
        }
        response = self.client.post(url, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("cae", response.data)
        self.assertEqual(len(response.data["cae"]), 14)
        self.assertEqual(response.data["numero_comprobante"], "A-0001-00000001")
        self.assertEqual(Decimal(str(response.data["total"])), Decimal("120000.00"))
        self.assertEqual(response.data["cliente_nombre"], "Esteban Quito")
        self.assertEqual(response.data["vehiculo_patente"], "AF999ZZ")
        self.assertEqual(len(response.data["items"]), 2)

        # Verificar persistencia en base de datos
        factura_db = Factura.objects.get(orden_trabajo=self.orden)
        self.assertEqual(factura_db.cae, response.data["cae"])
        self.assertEqual(factura_db.total, Decimal("120000.00"))

    def test_emitir_factura_duplicada_falla(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("factura-emitir")

        payload = {"orden_trabajo_id": str(self.orden.id)}
        response1 = self.client.post(url, payload)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Segunda emisión sobre la misma OT debe fallar
        response2 = self.client.post(url, payload)
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("orden_trabajo_id", response2.data)

    def test_emitir_factura_usuario_no_admin_retorna_403(self):
        self.client.force_authenticate(user=self.tecnico)
        url = reverse("factura-emitir")

        payload = {"orden_trabajo_id": str(self.orden.id)}
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_listar_facturas_y_detalle(self):
        self.client.force_authenticate(user=self.admin)
        # Emitir factura
        self.client.post(reverse("factura-emitir"), {"orden_trabajo_id": str(self.orden.id)})

        # Listar
        res_list = self.client.get(reverse("factura-list"))
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 1)

        factura_id = res_list.data[0]["id"]
        # Detalle
        res_detail = self.client.get(reverse("factura-detail", kwargs={"id": factura_id}))
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(res_detail.data["id"], factura_id)

    def test_endpoint_calendario_facturas_y_resumen(self):
        self.client.force_authenticate(user=self.admin)
        # Emitir factura
        self.client.post(reverse("factura-emitir"), {"orden_trabajo_id": str(self.orden.id)})

        # Consultar calendario
        url_calendario = reverse("factura-calendario")
        response = self.client.get(url_calendario)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("facturas", response.data)
        self.assertIn("resumen", response.data)
        self.assertEqual(len(response.data["facturas"]), 1)
        self.assertEqual(response.data["resumen"]["cantidad_comprobantes"], 1)
        self.assertEqual(Decimal(str(response.data["resumen"]["total_facturado"])), Decimal("120000.00"))

    def test_actualizar_estado_pago_factura(self):
        self.client.force_authenticate(user=self.admin)
        res_emitir = self.client.post(reverse("factura-emitir"), {"orden_trabajo_id": str(self.orden.id)})
        factura_id = res_emitir.data["id"]

        url_pago = reverse("factura-actualizar-pago", kwargs={"id": factura_id})
        res_patch = self.client.patch(url_pago, {"estado_pago": "pagada"})

        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data["estado_pago"], "pagada")
        self.assertEqual(res_patch.data["semaforo"], "pagada")
