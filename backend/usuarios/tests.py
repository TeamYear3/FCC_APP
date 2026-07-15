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
