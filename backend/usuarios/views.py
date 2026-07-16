from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import GoogleAuthSerializer, LogoutSerializer

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
