from rest_framework import serializers
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings

class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(required=True)

    def validate_id_token(self, value):
        try:
            # Valida el token con Google y el ID de cliente de la app
            idinfo = id_token.verify_oauth2_token(
                value,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )
            return idinfo
        except Exception:
            raise serializers.ValidationError("Token de Google inválido o expirado.")

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    password = serializers.CharField(min_length=8, required=True, write_only=True)
    password_confirm = serializers.CharField(min_length=8, required=True, write_only=True)

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        return attrs

