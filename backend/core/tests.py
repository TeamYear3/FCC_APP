from django.test import TestCase
from django.core import mail
from django.urls import reverse
from unittest.mock import patch, MagicMock
from core.utils.email_service import send_email_service


class EmailServiceTest(TestCase):
    def test_send_email_service_texto_plano_exitoso(self):
        """Verifica el envío exitoso de un correo en texto plano utilizando el outbox en memoria."""
        resultado = send_email_service(
            subject="Bienvenido a FCC App",
            message="Hola, tu cuenta ha sido creada correctamente.",
            recipient_list=["cliente@ejemplo.com"],
        )
        self.assertTrue(resultado)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "Bienvenido a FCC App")
        self.assertEqual(mail.outbox[0].body, "Hola, tu cuenta ha sido creada correctamente.")
        self.assertEqual(mail.outbox[0].to, ["cliente@ejemplo.com"])

    def test_send_email_service_con_html(self):
        """Verifica que el cuerpo HTML se adjunte como alternativa cuando se proporciona html_message."""
        resultado = send_email_service(
            subject="Notificación de Turno",
            message="Tu turno fue confirmado.",
            recipient_list=["usuario@ejemplo.com"],
            html_message="<strong>Tu turno fue confirmado.</strong>",
        )
        self.assertTrue(resultado)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(len(mail.outbox[0].alternatives), 1)
        self.assertEqual(
            mail.outbox[0].alternatives[0],
            ("<strong>Tu turno fue confirmado.</strong>", "text/html"),
        )

    def test_send_email_service_lista_destinatarios_vacia(self):
        """Verifica que retorne False sin intentar enviar si recipient_list está vacía."""
        resultado = send_email_service(
            subject="Asunto vacío",
            message="Mensaje",
            recipient_list=[],
        )
        self.assertFalse(resultado)
        self.assertEqual(len(mail.outbox), 0)

    @patch("django.core.mail.EmailMultiAlternatives.send")
    def test_send_email_service_manejo_excepciones(self, mock_send):
        """Verifica que si ocurre una excepción de conexión SMTP, la función la capture y devuelva False."""
        mock_send.side_effect = Exception("Fallo en el servidor SMTP")
        resultado = send_email_service(
            subject="Alerta",
            message="Fallo de prueba",
            recipient_list=["error@ejemplo.com"],
        )
        self.assertFalse(resultado)


class CustomExceptionHandlerTests(TestCase):
    """Pruebas unitarias para el manejador global de excepciones custom_exception_handler (TK164)."""

    def test_custom_exception_handler_integrity_error_retorna_409_json(self):
        """Verifica que IntegrityError devuelva HTTP 409 JSON con error_id único."""
        import uuid
        from django.db import IntegrityError
        from core.exceptions import custom_exception_handler

        exc = IntegrityError("duplicate key value violates unique constraint 'patente_unique'")
        context = {"view": None}

        response = custom_exception_handler(exc, context)

        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data.get("status_code"), 409)
        self.assertIn("error", response.data)
        self.assertIn("error_id", response.data)
        self.assertTrue(uuid.UUID(response.data["error_id"]))
        self.assertEqual(response["X-Error-ID"], response.data["error_id"])

    def test_custom_exception_handler_database_error_retorna_409_json(self):
        """Verifica que DatabaseError devuelva HTTP 409 JSON con error_id."""
        from django.db import DatabaseError
        from core.exceptions import custom_exception_handler

        exc = DatabaseError("error de acceso a base de datos relacional")
        context = {"view": None}

        response = custom_exception_handler(exc, context)

        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 409)
        self.assertIn("error_id", response.data)

    def test_custom_exception_handler_excepcion_no_controlada_retorna_500_json(self):
        """Verifica que excepciones imprevistas no devuelvan HTML sino HTTP 500 JSON con error_id."""
        import uuid
        from core.exceptions import custom_exception_handler

        exc = RuntimeError("Fallo inesperado del sistema de archivos")
        context = {"view": None}

        response = custom_exception_handler(exc, context)

        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data.get("status_code"), 500)
        self.assertEqual(response.data.get("error"), "Se produjo un error interno en el servidor.")
        self.assertIn("error_id", response.data)
        self.assertTrue(uuid.UUID(response.data["error_id"]))
        self.assertEqual(response["X-Error-ID"], response.data["error_id"])

    def test_custom_exception_handler_drf_validation_error_enriquece_con_error_id(self):
        """Verifica que excepciones estándar de DRF conserven sus detalles y se enriquezcan con error_id."""
        import uuid
        from rest_framework.exceptions import ValidationError
        from core.exceptions import custom_exception_handler

        exc = ValidationError({"email": ["Ingrese una dirección de correo válida."]})
        context = {"view": None}

        response = custom_exception_handler(exc, context)

        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 400)
        self.assertIn("error_id", response.data)
        self.assertTrue(uuid.UUID(response.data["error_id"]))
        self.assertEqual(response.data.get("email"), ["Ingrese una dirección de correo válida."])
        self.assertEqual(response["X-Error-ID"], response.data["error_id"])

    def test_custom_exception_handler_drf_not_authenticated_enriquece_con_error_id(self):
        """Verifica que excepciones de autenticación de DRF incluyan error_id y X-Error-ID."""
        from rest_framework.exceptions import NotAuthenticated
        from core.exceptions import custom_exception_handler

        exc = NotAuthenticated()
        context = {"view": None}

        response = custom_exception_handler(exc, context)

        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 401)
        self.assertIn("error_id", response.data)
        self.assertEqual(response["X-Error-ID"], response.data["error_id"])


class RequestTracingMiddlewareTests(TestCase):
    """Pruebas unitarias para RequestTracingMiddleware y RequestIDFilter (TK165)."""

    def test_middleware_genera_x_request_id_cuando_no_es_provisto(self):
        """Verifica que el middleware genere un UUID en X-Request-ID si el cliente no lo envía."""
        # Arrange
        import uuid
        from django.test import RequestFactory
        from django.http import HttpResponse
        from core.middleware import RequestTracingMiddleware

        rf = RequestFactory()
        request = rf.get(reverse("crear-vehiculo"))
        middleware = RequestTracingMiddleware(lambda req: HttpResponse("OK"))

        # Act
        response = middleware(request)

        # Assert
        self.assertIn("X-Request-ID", response)
        request_id = response["X-Request-ID"]
        self.assertTrue(uuid.UUID(request_id))
        self.assertEqual(request.request_id, request_id)

    def test_middleware_preserva_y_reutiliza_x_request_id_entrante(self):
        """Verifica que si el cliente envía un X-Request-ID, el middleware lo preserve y retorne."""
        # Arrange
        from django.test import RequestFactory
        from django.http import HttpResponse
        from core.middleware import RequestTracingMiddleware

        rf = RequestFactory()
        custom_id = "req-custom-trace-777"
        request = rf.get(reverse("crear-vehiculo"), HTTP_X_REQUEST_ID=custom_id)
        middleware = RequestTracingMiddleware(lambda req: HttpResponse("OK"))

        # Act
        response = middleware(request)

        # Assert
        self.assertIn("X-Request-ID", response)
        self.assertEqual(response["X-Request-ID"], custom_id)
        self.assertEqual(request.request_id, custom_id)

    def test_request_id_filter_inyecta_request_id_activo_en_log_record(self):
        """Verifica que RequestIDFilter asigne el request_id activo de la solicitud al registro de log."""
        # Arrange
        import logging
        from django.test import RequestFactory
        from django.http import HttpResponse
        from core.middleware import RequestTracingMiddleware, RequestIDFilter

        rf = RequestFactory()
        custom_id = "trace-log-correlation-456"
        request = rf.get(reverse("crear-orden-trabajo"), HTTP_X_REQUEST_ID=custom_id)

        captured_record = None

        def dummy_view(req):
            nonlocal captured_record
            log_filter = RequestIDFilter()
            record = logging.LogRecord(
                name="core.test",
                level=logging.INFO,
                pathname="tests.py",
                lineno=10,
                msg="Log de prueba dentro de request",
                args=(),
                exc_info=None,
            )
            log_filter.filter(record)
            captured_record = record
            return HttpResponse("OK")

        middleware = RequestTracingMiddleware(dummy_view)
        # Act
        middleware(request)

        # Assert
        self.assertIsNotNone(captured_record)
        self.assertEqual(getattr(captured_record, "request_id", None), custom_id)

    def test_request_id_filter_asigna_system_fuera_del_ciclo_de_request(self):
        """Verifica que RequestIDFilter utilice 'system' como fallback cuando se loguea sin request HTTP."""
        import logging
        from core.middleware import RequestIDFilter

        log_filter = RequestIDFilter()
        record = logging.LogRecord(
            name="core.test",
            level=logging.INFO,
            pathname="tests.py",
            lineno=20,
            msg="Log fuera de contexto HTTP",
            args=(),
            exc_info=None,
        )

        log_filter.filter(record)

        self.assertEqual(getattr(record, "request_id", None), "system")


class AuditPerformanceCommandTests(TestCase):
    def test_normalize_sql(self):
        """Verifica que normalize_sql abstraiga literales numéricos y cadenas para agrupar patrones N+1."""
        from core.management.commands.audit_performance import normalize_sql

        sql = "SELECT id, nombre FROM clientes WHERE id = 42 AND apellido = 'Perez'"
        normalized = normalize_sql(sql)
        self.assertIn("id = ?", normalized)
        self.assertIn("apellido = '?'", normalized)

    def test_audit_performance_command_execution(self):
        """Verifica que el comando audit_performance ejecute exitosamente las peticiones y genere reporte."""
        from io import StringIO
        from django.core.management import call_command

        out = StringIO()
        call_command(
            "audit_performance",
            "--seed-volume",
            "--iterations=1",
            "--format=markdown",
            stdout=out,
        )
        output = out.getvalue()
        self.assertIn("Reporte de Línea Base de Rendimiento", output)
        self.assertIn("/api/clientes/", output)


class MongoTelemetriaArcaTests(TestCase):
    """Pruebas unitarias para la telemetría NoSQL de ARCA en MongoDB (TK191 / US-11)."""

    @patch("core.mongo.MongoDBClient.get_db")
    def test_registrar_telemetria_arca_persiste_documento_con_timestamp(self, mock_get_db):
        # Arrange
        from core.mongo import registrar_telemetria_arca
        mock_collection = MagicMock()
        mock_db = MagicMock()
        mock_db.__getitem__.return_value = mock_collection
        mock_get_db.return_value = mock_db

        datos_solicitud = {"total": "150000.00", "tipo_comprobante": "B", "punto_venta": 1}
        respuesta_arca = {"resultado": "Aprobado", "cae": "74123456789012", "numero_factura": 42}
        orden_id = "ot-12345"

        # Act
        resultado = registrar_telemetria_arca(
            datos_solicitud=datos_solicitud,
            respuesta_arca=respuesta_arca,
            orden_id=orden_id,
            exitoso=True
        )

        # Assert
        self.assertTrue(resultado)
        mock_db.__getitem__.assert_called_with("telemetria_arca")
        self.assertTrue(mock_collection.insert_one.called)
        doc = mock_collection.insert_one.call_args[0][0]
        self.assertEqual(doc["orden_id"], "ot-12345")
        self.assertEqual(doc["solicitud"], datos_solicitud)
        self.assertEqual(doc["respuesta"]["cae"], "74123456789012")
        self.assertTrue(doc["exitoso"])
        self.assertIn("timestamp", doc)

    @patch("core.mongo.MongoDBClient.get_db")
    def test_registrar_telemetria_arca_falla_graceful_si_mongo_offline(self, mock_get_db):
        # Arrange
        from core.mongo import registrar_telemetria_arca
        mock_get_db.return_value = None

        # Act
        resultado = registrar_telemetria_arca(
            datos_solicitud={"total": "50000"},
            respuesta_arca=None,
            orden_id="ot-offline",
            exitoso=False,
            error="Connection timeout"
        )

        # Assert
        self.assertFalse(resultado)

    @patch("core.mongo.MongoDBClient.get_db")
    def test_obtener_telemetria_arca_recupera_historial(self, mock_get_db):
        # Arrange
        from core.mongo import obtener_telemetria_arca
        mock_collection = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.sort.return_value.limit.return_value = [
            {"_id": "mongo_id_1", "orden_id": "ot-100", "timestamp": "2026-10-14T10:00:00Z"}
        ]
        mock_collection.find.return_value = mock_cursor
        mock_db = MagicMock()
        mock_db.__getitem__.return_value = mock_collection
        mock_get_db.return_value = mock_db

        # Act
        registros = obtener_telemetria_arca(orden_id="ot-100")

        # Assert
        self.assertEqual(len(registros), 1)
        self.assertEqual(registros[0]["_id"], "mongo_id_1")
        self.assertEqual(registros[0]["orden_id"], "ot-100")


class ArquitecturaCanalesYCacheTests(TestCase):
    """
    TK172: Valida la configuración de Redis como backend central de canales
    (channels_redis) y caché (django-redis), así como el aislamiento hermético en tests.
    """
    def test_configuracion_base_utiliza_channels_redis(self):
        import pathlib
        base_path = pathlib.Path(__file__).resolve().parent.parent / "config" / "settings" / "base.py"
        content = base_path.read_text(encoding="utf-8")
        self.assertIn('"BACKEND": "channels_redis.core.RedisChannelLayer"', content)
        self.assertIn('"hosts": [f"{REDIS_URL}/0"]', content)

    def test_configuracion_base_utiliza_django_redis(self):
        import pathlib
        base_path = pathlib.Path(__file__).resolve().parent.parent / "config" / "settings" / "base.py"
        content = base_path.read_text(encoding="utf-8")
        self.assertIn('"BACKEND": "django_redis.cache.RedisCache"', content)
        self.assertIn('"CLIENT_CLASS": "django_redis.client.DefaultClient"', content)

    def test_aislamiento_de_canales_y_cache_en_testing(self):
        from django.conf import settings
        # En la suite de testing activa, CHANNEL_LAYERS debe aislarse en memoria
        self.assertEqual(
            settings.CHANNEL_LAYERS["default"]["BACKEND"],
            "channels.layers.InMemoryChannelLayer"
        )
        # Y CACHES debe aislarse en LocMemCache
        self.assertEqual(
            settings.CACHES["default"]["BACKEND"],
            "django.core.cache.backends.locmem.LocMemCache"
        )



