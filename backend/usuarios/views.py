from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import (
    GoogleAuthSerializer,
    LogoutSerializer,
    CustomTokenObtainPairSerializer,
    RegistroUsuarioSerializer,
    PasswordResetSerializer,
    PasswordResetConfirmSerializer,
)

Usuario = get_user_model()

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


class PasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"]
        user = Usuario.objects.get(email=email)

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        reset_link = f"{settings.CLIENT_PORTAL_URL}/autenticacion?uid={uid}&token={token}"

        subject = "Recuperación de Contraseña - FCC App"
        message = (
            f"Hola {user.nombre},\n\n"
            f"Hemos recibido una solicitud para restablecer tu contraseña. "
            f"Para proceder, haz clic en el siguiente enlace o cópialo en tu navegador:\n\n"
            f"{reset_link}\n\n"
            f"Este enlace tiene una validez de 1 hora.\n\n"
            f"Si no solicitaste este cambio, puedes ignorar este correo.\n\n"
            f"Saludos,\nEl equipo de FCC App"
        )

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
        except Exception as e:
            return Response(
                {"error": f"No se pudo enviar el correo de recuperación. Detalle: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {"detail": "Se ha enviado un correo electrónico con las instrucciones para restablecer tu contraseña."},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(
            {"detail": "Tu contraseña ha sido restablecida exitosamente."},
            status=status.HTTP_200_OK
        )


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


