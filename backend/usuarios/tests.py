from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError

User = get_user_model()

class UsuarioModelTest(TestCase):
    def test_creacion_usuario_default_rol_cliente(self):
        # Crear usuario local con contraseña
        usuario = User.objects.create_user(
            email="cliente@ejemplo.com",
            nombre="Juan",
            apellido="Pérez",
            password="securepassword123",
        )
        self.assertEqual(usuario.email, "cliente@ejemplo.com")
        self.assertEqual(usuario.nombre, "Juan")
        self.assertEqual(usuario.apellido, "Pérez")
        self.assertEqual(usuario.rol, "cliente")
        self.assertTrue(usuario.active)
        self.assertTrue(usuario.is_active)
        self.assertFalse(usuario.is_staff)
        self.assertFalse(usuario.is_superuser)

    def test_contrasena_hasheada_con_argon2(self):
        usuario = User.objects.create_user(
            email="hash@ejemplo.com",
            nombre="User",
            apellido="Hash",
            password="mysecretpassword",
        )
        # Verificar que la contraseña guardada empiece con el identificador de Argon2
        self.assertTrue(usuario.password.startswith("argon2"))

    def test_creacion_roles_especificos(self):
        usuario_admin = User.objects.create_user(
            email="admin_role@ejemplo.com",
            nombre="Admin",
            apellido="User",
            password="adminpassword123",
            rol="admin",
        )
        usuario_tecnico = User.objects.create_user(
            email="tecnico_role@ejemplo.com",
            nombre="Tecnico",
            apellido="User",
            password="tecnicopassword123",
            rol="tecnico",
        )
        self.assertEqual(usuario_admin.rol, "admin")
        self.assertEqual(usuario_tecnico.rol, "tecnico")

    def test_creacion_superuser(self):
        superuser = User.objects.create_superuser(
            email="superuser@ejemplo.com",
            nombre="Super",
            apellido="Admin",
            password="superpassword123",
        )
        self.assertEqual(superuser.email, "superuser@ejemplo.com")
        self.assertEqual(superuser.rol, "admin")
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)

    def test_email_unico_error(self):
        User.objects.create_user(
            email="unico@ejemplo.com",
            nombre="Original",
            apellido="User",
            password="password123",
        )
        with self.assertRaises((IntegrityError, ValueError)):
            User.objects.create_user(
                email="unico@ejemplo.com",
                nombre="Duplicado",
                apellido="User",
                password="password456",
            )


from unittest.mock import patch
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

class GoogleAuthViewTest(APITestCase):
    def setUp(self):
        self.url = reverse('google-auth')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_login_google_exitoso_usuario_existente_oauth(self, mock_verify):
        # Mock de la validación del token de Google
        mock_verify.return_value = {
            "email": "oauth_user@ejemplo.com",
            "given_name": "OAuth",
            "family_name": "User"
        }
        
        # Crear usuario OAuth (sin contraseña local)
        user = User.objects.create_user(
            email="oauth_user@ejemplo.com",
            nombre="OAuth",
            apellido="User",
            password=None
        )
        self.assertFalse(user.has_usable_password())

        response = self.client.post(self.url, {"id_token": "valid_token_123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_login_google_exitoso_registro_usuario_nuevo(self, mock_verify):
        mock_verify.return_value = {
            "email": "nuevo_oauth@ejemplo.com",
            "given_name": "Nuevo",
            "family_name": "OAuth"
        }

        response = self.client.post(self.url, {"id_token": "new_token_123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        # Verificar creación del usuario en base de datos
        user = User.objects.get(email="nuevo_oauth@ejemplo.com")
        self.assertEqual(user.nombre, "Nuevo")
        self.assertEqual(user.apellido, "OAuth")
        self.assertEqual(user.rol, "cliente")
        self.assertFalse(user.has_usable_password())

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_login_google_fallido_cuenta_local_existente(self, mock_verify):
        mock_verify.return_value = {
            "email": "local_user@ejemplo.com",
            "given_name": "Local",
            "family_name": "User"
        }

        # Crear usuario previo con contraseña local
        User.objects.create_user(
            email="local_user@ejemplo.com",
            nombre="Local",
            apellido="User",
            password="classicpassword123"
        )

        response = self.client.post(self.url, {"id_token": "local_token_123"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "link_required")
        self.assertIn("ya se encuentra registrada con inicio de sesión local", response.data["error"])

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_login_google_token_invalido(self, mock_verify):
        mock_verify.side_effect = ValueError("Token inválido")

        response = self.client.post(self.url, {"id_token": "invalid_or_expired"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Token de Google inválido o expirado", str(response.data))

    def test_login_google_payload_incompleto(self):
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("id_token", response.data)


from rest_framework_simplejwt.tokens import RefreshToken

class LogoutViewTest(APITestCase):
    def setUp(self):
        self.url = reverse('logout')
        self.user = User.objects.create_user(
            email="logout_test@ejemplo.com",
            nombre="Logout",
            apellido="Test",
            password="testpassword123"
        )
        self.refresh = RefreshToken.for_user(self.user)

    def test_logout_exitoso_invalida_refresh_token(self):
        refresh_str = str(self.refresh)
        response = self.client.post(self.url, {"refresh": refresh_str})
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

        # Intentar refrescar el token debe retornar HTTP 401 Unauthorized o 400 Bad Request
        refresh_url = reverse('token-refresh')
        refresh_response = self.client.post(refresh_url, {"refresh": refresh_str})
        self.assertIn(refresh_response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST])

    def test_refresh_con_token_blacklisteado_falla(self):
        # Primero blacklistear el token
        refresh_str = str(self.refresh)
        self.client.post(self.url, {"refresh": refresh_str})

        # Segundo intento de refresco debe dar HTTP 401 o 400
        refresh_url = reverse('token-refresh')
        response = self.client.post(refresh_url, {"refresh": refresh_str})
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST])

    def test_logout_con_token_invalido_responde_205(self):
        # Un refresh token inválido o expirado debe responder igualmente con HTTP 205
        response = self.client.post(self.url, {"refresh": "invalid_refresh_token_123"})
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)


from core.permissions import EsAdministrador, EsTecnico, EsCliente

class PermisosRolTest(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            email="admin_perm@ejemplo.com",
            nombre="Admin",
            apellido="Perm",
            password="password123",
            rol="admin"
        )
        self.tecnico_user = User.objects.create_user(
            email="tecnico_perm@ejemplo.com",
            nombre="Tecnico",
            apellido="Perm",
            password="password123",
            rol="tecnico"
        )
        self.cliente_user = User.objects.create_user(
            email="cliente_perm@ejemplo.com",
            nombre="Cliente",
            apellido="Perm",
            password="password123",
            rol="cliente"
        )
        self.otro_cliente_user = User.objects.create_user(
            email="otro_cliente_perm@ejemplo.com",
            nombre="Otro",
            apellido="Cliente",
            password="password123",
            rol="cliente"
        )

    def test_permiso_administrador_permite_solo_admin(self):
        permission = EsAdministrador()
        
        # Request con usuario admin
        request = type("MockRequest", (object,), {"user": self.admin_user})()
        self.assertTrue(permission.has_permission(request, None))

        # Request con usuario tecnico
        request = type("MockRequest", (object,), {"user": self.tecnico_user})()
        self.assertFalse(permission.has_permission(request, None))

        # Request con usuario cliente
        request = type("MockRequest", (object,), {"user": self.cliente_user})()
        self.assertFalse(permission.has_permission(request, None))

    def test_permiso_tecnico_permite_solo_tecnico(self):
        permission = EsTecnico()
        
        request = type("MockRequest", (object,), {"user": self.tecnico_user})()
        self.assertTrue(permission.has_permission(request, None))

        request = type("MockRequest", (object,), {"user": self.admin_user})()
        self.assertFalse(permission.has_permission(request, None))

        request = type("MockRequest", (object,), {"user": self.cliente_user})()
        self.assertFalse(permission.has_permission(request, None))

    def test_permiso_cliente_permite_solo_cliente(self):
        permission = EsCliente()
        
        request = type("MockRequest", (object,), {"user": self.cliente_user})()
        self.assertTrue(permission.has_permission(request, None))

        request = type("MockRequest", (object,), {"user": self.admin_user})()
        self.assertFalse(permission.has_permission(request, None))

        request = type("MockRequest", (object,), {"user": self.tecnico_user})()
        self.assertFalse(permission.has_permission(request, None))

    def test_permiso_cliente_propietario_objeto(self):
        permission = EsCliente()
        
        # Verificar has_object_permission donde el objeto es el usuario mismo
        request = type("MockRequest", (object,), {"user": self.cliente_user})()
        self.assertTrue(permission.has_object_permission(request, None, self.cliente_user))
        self.assertFalse(permission.has_object_permission(request, None, self.otro_cliente_user))

        # Verificar has_object_permission donde el objeto tiene un atributo 'cliente'
        mock_obj = type("MockObject", (object,), {"cliente": self.cliente_user})()
        self.assertTrue(permission.has_object_permission(request, None, mock_obj))

        mock_obj_otro = type("MockObject", (object,), {"cliente": self.otro_cliente_user})()
        self.assertFalse(permission.has_object_permission(request, None, mock_obj_otro))


class DevLoginViewTest(APITestCase):
    def setUp(self):
        self.url = reverse('dev-login')

    def test_dev_login_admin_exitoso(self):
        response = self.client.post(self.url, {"rol": "admin"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        user = User.objects.get(email="dev_admin@fcc-taller.com")
        self.assertEqual(user.rol, "admin")

    def test_dev_login_rol_invalido(self):
        response = self.client.post(self.url, {"rol": "superhero"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Rol inválido", response.data["error"])


class EmailBienvenidaTest(TestCase):
    def setUp(self):
        from django.core import mail
        mail.outbox = []

    def test_enviar_email_bienvenida_background_directo(self):
        from django.core import mail
        from usuarios.signals import enviar_email_bienvenida_background

        mail.outbox.clear()

        # Ejecutar función síncronamente para validar armado y renderizado del email
        enviar_email_bienvenida_background(
            email="nuevo_cliente@taller.com",
            nombre="Lucas",
            apellido="Gómez",
            rol="cliente"
        )

        self.assertEqual(len(mail.outbox), 1)
        email_enviado = mail.outbox[0]
        self.assertIn("¡Bienvenido a FCC App", email_enviado.subject)
        self.assertIn("Lucas Gómez", email_enviado.subject)
        self.assertEqual(email_enviado.to, ["nuevo_cliente@taller.com"])
        self.assertIn("Lucas Gómez", email_enviado.body)
        self.assertIn("Cliente", email_enviado.body)
        
        # Verificar alternative HTML
        self.assertEqual(len(email_enviado.alternatives), 1)
        html_content, mimetype = email_enviado.alternatives[0]
        self.assertEqual(mimetype, "text/html")
        self.assertIn("¡Hola Lucas Gómez!", html_content)
        self.assertIn("nuevo_cliente@taller.com", html_content)

    def test_email_bienvenida_sin_email_no_genera_error_ni_envio(self):
        from django.core import mail
        from usuarios.signals import enviar_email_bienvenida_background
        
        mail.outbox = []
        enviar_email_bienvenida_background(email="", nombre="Sin", apellido="Email")
        self.assertEqual(len(mail.outbox), 0)


