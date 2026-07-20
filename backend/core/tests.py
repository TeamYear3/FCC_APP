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
