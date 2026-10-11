from django.test import TestCase
from django.core import mail
from unittest.mock import patch
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

