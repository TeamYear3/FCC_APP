from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import UserRoles

User = get_user_model()

class UserModelTest(TestCase):
    def test_create_user_default_role(self):
        """Crear un usuario sin especificar rol y verificar que por defecto es CLIENTE"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword123"
        )
        self.assertEqual(user.username, "testuser")
        self.assertEqual(user.email, "test@example.com")
        self.assertEqual(user.rol, UserRoles.CLIENTE)
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_user_with_specific_roles(self):
        """Crear usuarios con roles específicos y verificar que se guardan correctamente"""
        admin_user = User.objects.create_user(
            username="adminuser",
            email="admin@example.com",
            password="testpassword123",
            rol=UserRoles.ADMINISTRADOR
        )
        self.assertEqual(admin_user.rol, UserRoles.ADMINISTRADOR)

        tecnico_user = User.objects.create_user(
            username="tecnicouser",
            email="tecnico@example.com",
            password="testpassword123",
            rol=UserRoles.TECNICO
        )
        self.assertEqual(tecnico_user.rol, UserRoles.TECNICO)

    def test_create_superuser(self):
        """Crear un superusuario y verificar que tiene los permisos y flags correctos"""
        superuser = User.objects.create_superuser(
            username="superadmin",
            email="super@example.com",
            password="superpassword123"
        )
        self.assertEqual(superuser.username, "superadmin")
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)
