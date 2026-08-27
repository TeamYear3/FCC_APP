from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from core.permissions import EsAdministrador
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import TokenError
from django.conf import settings
from django.template.loader import render_to_string
import threading
import logging
from core.utils.email_service import send_email_service
from .models import PasswordResetToken
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import (
    GoogleAuthSerializer,
    LogoutSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    CustomTokenObtainPairSerializer,
    RegistroUsuarioSerializer,
    PasswordResetSerializer,
    PerfilUsuarioSerializer,
    ActualizarPerfilSerializer,
)

logger = logging.getLogger(__name__)
Usuario = get_user_model()



def enviar_email_recuperacion_background(email, nombre, enlace_reset):
    """
    Función utilitaria en segundo plano para enviar el email con el enlace
    de restablecimiento de contraseña de 1 hora de duración.
    """
    try:
        subject = "Recuperación de Contraseña - FCC App"
        message = (
            f"Hola {nombre},\n\n"
            f"Hemos recibido una solicitud para restablecer tu contraseña en FCC App.\n"
            f"Para crear una nueva clave, ingresa al siguiente enlace (válido por 1 hora):\n"
            f"{enlace_reset}\n\n"
            f"Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.\n\n"
            f"Atentamente,\n"
            f"El equipo de FCC App"
        )
        context = {
            "nombre_usuario": nombre,
            "enlace_reset": enlace_reset,
        }
        try:
            html_message = render_to_string("usuarios/email_recuperacion.html", context)
        except Exception:
            html_message = (
                f"<html><body style='font-family: sans-serif; background: #0B0B0B; color: #FFF; padding: 20px;'>"
                f"<div style='max-width: 600px; margin: auto; background: #1E1E1E; padding: 30px; border-radius: 12px; border-left: 4px solid #FFCC00;'>"
                f"<h1 style='color: #FFCC00;'>Recuperación de Contraseña</h1>"
                f"<p>Hola <strong>{nombre}</strong>,</p>"
                f"<p>Ingresa al siguiente enlace para restablecer tu contraseña (expira en 1 hora):</p>"
                f"<p><a href='{enlace_reset}' style='background: #FFCC00; color: #0B0B0B; padding: 10px 20px; border-radius: 20px; text-decoration: none; font-weight: bold;'>Restablecer Contraseña</a></p>"
                f"</div></body></html>"
            )

        send_email_service(
            subject=subject,
            message=message,
            recipient_list=[email],
            html_message=html_message
        )
    except Exception as e:
        logger.error(f"Error al enviar correo de recuperación para {email}: {str(e)}", exc_info=True)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"].strip().lower()
        user = Usuario.objects.filter(email__iexact=email).first()

        if user:
            token_obj = PasswordResetToken.generar_token(user, duracion_horas=1)
            portal_base_url = getattr(settings, "CLIENT_PORTAL_URL", "https://fccapp.com").rstrip("/")
            enlace_reset = f"{portal_base_url}/autenticacion?action=reset&token={token_obj.token}"
            nombre_usuario = f"{user.nombre} {user.apellido}".strip() or user.email

            threading.Thread(
                target=enviar_email_recuperacion_background,
                args=(user.email, nombre_usuario, enlace_reset),
                daemon=True
            ).start()

        # Respuesta genérica para mitigar User Enumeration Attacks
        return Response(
            {"detail": "Si el correo está registrado en la plataforma, recibirás las instrucciones para restablecer tu contraseña."},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token_str = serializer.validated_data["token"].strip()
        nueva_password = serializer.validated_data["password"]

        token_obj = PasswordResetToken.objects.filter(token=token_str).first()
        if not token_obj or not token_obj.is_valid():
            return Response(
                {"error": "El enlace de recuperación es inválido, ya fue utilizado o ha expirado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = token_obj.usuario
        user.set_password(nueva_password)
        user.save()

        # Consumo e invalidación inmediata del token (TK051)
        token_obj.consumir()

        return Response(
            {"detail": "La contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión con tu nueva clave."},
            status=status.HTTP_200_OK
        )


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Payload validado
        idinfo = serializer.validated_data["id_token"]
        email = idinfo.get("email")
        if not email:
            return Response(
                {"error": "El token de Google no contiene un correo electrónico válido."},
                status=status.HTTP_400_BAD_REQUEST
            )

        nombre = idinfo.get("given_name", "")
        apellido = idinfo.get("family_name", "")

        try:
            user = Usuario.objects.get(email=email)
            
            # Si el usuario ya existe y tiene contraseña local establecida (login clásico)
            if user.has_usable_password():
                return Response(
                    {
                        "error": "Esta cuenta de correo ya se encuentra registrada con inicio de sesión local.",
                        "code": "link_required",
                        "email": email
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
        except Usuario.DoesNotExist:
            # Crear nuevo usuario OAuth con rol "cliente" y password inutilizable
            user = Usuario.objects.create_user(
                email=email,
                nombre=nombre,
                apellido=apellido,
                password=None,
                rol="cliente"
            )

        # Generar JWT locales con claims personalizados para el Frontend
        refresh = RefreshToken.for_user(user)
        refresh["rol"] = user.rol
        refresh["email"] = user.email

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh)
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = LogoutSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        refresh_token = serializer.validated_data["refresh"]
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except (TokenError, Exception):
            # Responder de forma consistente aunque el token ya esté expirado o sea inválido
            pass

        return Response(
            {"detail": "Sesión cerrada correctamente."},
            status=status.HTTP_205_RESET_CONTENT
        )


class DevLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        rol = request.data.get("rol", "cliente")
        if rol not in ["admin", "tecnico", "cliente"]:
            return Response({"error": "Rol inválido"}, status=status.HTTP_400_BAD_REQUEST)

        email = f"dev_{rol}@fcc-taller.com"
        user, _ = Usuario.objects.get_or_create(
            email=email,
            defaults={
                "nombre": "Usuario",
                "apellido": rol.capitalize(),
                "rol": rol
            }
        )
        if user.rol != rol:
            user.rol = rol
            user.save()

        refresh = RefreshToken.for_user(user)
        refresh["rol"] = user.rol
        refresh["email"] = user.email

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh)
        }, status=status.HTTP_200_OK)


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class RegistroView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RegistroUsuarioSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        return Response(
            {
                "detail": "Usuario registrado exitosamente.",
                "usuario": {
                    "email": user.email,
                    "nombre": user.nombre,
                    "apellido": user.apellido,
                    "rol": user.rol
                }
            },
            status=status.HTTP_201_CREATED
        )


# Alias para compatibilidad
PasswordResetView = PasswordResetRequestView



from django.db.models import Q
from rest_framework.permissions import IsAuthenticated

class BusquedaUniversalView(APIView):
    """
    TK065: Endpoint GET /api/busqueda-universal/?q={query}
    Realiza una búsqueda transversal multi-entidad en tiempo real cruzando Clientes, Vehículos y Órdenes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return Response({
                'clientes': [],
                'vehiculos': [],
                'ordenes': []
            }, status=status.HTTP_200_OK)

        from clientes.models import Cliente
        from vehiculos.models import Vehiculo
        from ordenes.models import OrdenTrabajo

        es_admin = getattr(request.user, 'es_administrador', True)

        # 1. Búsqueda de Clientes
        clientes_qs = Cliente.objects.filter(
            Q(nombre__icontains=query) |
            Q(apellido__icontains=query) |
            Q(dni_cuit__icontains=query) |
            Q(usuario__email__icontains=query)
        ).distinct()[:5]

        clientes = [
            {
                'id': str(c.id),
                'titulo': f"{c.nombre} {c.apellido}".strip(),
                'subtitulo': f"{c.tipo_documento}: {c.dni_cuit}",
                'tipo': 'cliente',
                'url': f"/admin/clientes/editar/{c.id}" if es_admin else f"/clientes/editar/{c.id}"
            }
            for c in clientes_qs
        ]

        # 2. Búsqueda de Vehículos
        vehiculos_qs = Vehiculo.objects.filter(
            Q(patente__icontains=query) |
            Q(numero_chasis__icontains=query) |
            Q(marca__icontains=query) |
            Q(modelo__icontains=query)
        ).distinct()[:5]

        vehiculos = [
            {
                'id': str(v.id),
                'titulo': f"{v.marca} {v.modelo} ({v.patente})",
                'subtitulo': f"Chasis: {v.numero_chasis or 'N/A'}",
                'tipo': 'vehiculo',
                'url': f"/vehiculos/historial/{v.id}"
            }
            for v in vehiculos_qs
        ]

        # 3. Búsqueda de Órdenes de Trabajo
        ordenes_qs = OrdenTrabajo.objects.filter(
            Q(numero_ot__icontains=query) |
            Q(vehiculo__patente__icontains=query) |
            Q(vehiculo__cliente__nombre__icontains=query) |
            Q(vehiculo__cliente__apellido__icontains=query)
        ).distinct()[:5]

        ordenes = [
            {
                'id': str(o.id),
                'titulo': f"Orden {o.numero_ot}",
                'subtitulo': f"Estado: {o.get_estado_display()} - Patente: {o.vehiculo.patente if o.vehiculo else 'N/A'}",
                'tipo': 'orden',
                'url': f"/ordenes"
            }
            for o in ordenes_qs
        ]

        return Response({
            'clientes': clientes,
            'vehiculos': vehiculos,
            'ordenes': ordenes
        }, status=status.HTTP_200_OK)


class PerfilUsuarioView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request, *args, **kwargs):
        serializer = PerfilUsuarioSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        serializer = ActualizarPerfilSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updated_user = serializer.update(request.user, serializer.validated_data)
        res_serializer = PerfilUsuarioSerializer(updated_user)
        return Response(res_serializer.data, status=status.HTTP_200_OK)



