from rest_framework import serializers
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings

class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(required=True)

    def validate_id_token(self, value):
        try:
            client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None) or None
            # Valida el token con Google y el ID de cliente de la app si está configurado
            idinfo = id_token.verify_oauth2_token(
                value,
                requests.Request(),
                client_id
            )
            return idinfo
        except Exception:
            raise serializers.ValidationError("Token de Google inválido o expirado.")

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True)


from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth.tokens import default_token_generator

Usuario = get_user_model()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError("No existe ningún usuario registrado con este correo electrónico.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    uid = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    password = serializers.CharField(min_length=8, required=False, write_only=True)
    password_confirm = serializers.CharField(min_length=8, required=False, write_only=True)
    new_password = serializers.CharField(min_length=8, required=False, write_only=True)

    def validate(self, attrs):
        password = attrs.get("password") or attrs.get("new_password")
        if not password:
            raise serializers.ValidationError({"password": "La contraseña es obligatoria."})
        
        password_confirm = attrs.get("password_confirm")
        if password_confirm and password != password_confirm:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})

        attrs["password"] = password
        return attrs


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    default_error_messages = {
        "no_active_account": "Correo electrónico o contraseña incorrectos."
    }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["rol"] = user.rol
        token["email"] = user.email
        token["nombre"] = user.nombre
        token["apellido"] = user.apellido
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["rol"] = self.user.rol
        data["email"] = self.user.email
        data["nombre"] = self.user.nombre
        data["apellido"] = self.user.apellido
        return data


class RegistroUsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    class Meta:
        model = Usuario
        fields = ("email", "nombre", "apellido", "password")

    def create(self, validated_data):
        user = Usuario.objects.create_user(
            email=validated_data["email"],
            nombre=validated_data["nombre"],
            apellido=validated_data["apellido"],
            password=validated_data["password"],
            rol="cliente",
        )
        from .signals import vincular_o_crear_cliente_usuario
        vincular_o_crear_cliente_usuario(user, crear_si_no_existe=True)
        return user


class VincularGoogleSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True)
    id_token = serializers.CharField(required=True)

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password")
        id_token_val = attrs.get("id_token")

        user = Usuario.objects.filter(email__iexact=email).first()
        if not user or not user.check_password(password):
            raise serializers.ValidationError({"password": "La contraseña ingresada es incorrecta o el usuario no existe."})

        try:
            client_id = getattr(settings, "GOOGLE_CLIENT_ID", None) or None
            idinfo = id_token.verify_oauth2_token(
                id_token_val,
                requests.Request(),
                client_id
            )
            token_email = idinfo.get("email", "").strip().lower()
            if token_email != email:
                raise serializers.ValidationError({"id_token": "El correo de la cuenta de Google no coincide con el usuario."})
            attrs["idinfo"] = idinfo
            attrs["user"] = user
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError({"id_token": "Token de Google inválido o expirado."})

        return attrs


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    telefono = serializers.SerializerMethodField()
    google_vinculado = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ("id", "email", "nombre", "apellido", "rol", "telefono", "google_vinculado")
        read_only_fields = ("id", "rol", "google_vinculado")

    def get_telefono(self, obj):
        if hasattr(obj, "cliente_perfil") and obj.cliente_perfil:
            return obj.cliente_perfil.telefono
        return getattr(obj, "telefono", "")

    def get_google_vinculado(self, obj):
        return bool(obj.google_id)


class ActualizarPerfilSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=150, required=False)
    apellido = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)
    telefono = serializers.CharField(max_length=50, required=False, allow_blank=True)
    password_actual = serializers.CharField(write_only=True, required=False, allow_blank=True)
    nueva_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def validate(self, attrs):
        user = self.context["request"].user
        email = attrs.get("email")
        password_actual = attrs.get("password_actual")
        nueva_password = attrs.get("nueva_password")

        # Si se desea cambiar la contraseña o el email, se requiere la contraseña actual
        if (nueva_password or (email and email.lower() != user.email.lower())):
            if not password_actual:
                raise serializers.ValidationError({
                    "password_actual": "Debes ingresar tu contraseña actual para confirmar cambios de email o clave."
                })
            if not user.check_password(password_actual):
                raise serializers.ValidationError({
                    "password_actual": "La contraseña actual ingresada es incorrecta."
                })

        # Validar nuevo email único
        if email and email.lower() != user.email.lower():
            if Usuario.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                raise serializers.ValidationError({
                    "email": "Ya existe otro usuario registrado con este correo electrónico."
                })

        # Validar fortaleza de la nueva contraseña si se provee
        if nueva_password:
            validate_password(nueva_password, user=user)

        return attrs

    def update(self, user, validated_data):
        nombre = validated_data.get("nombre")
        apellido = validated_data.get("apellido")
        email = validated_data.get("email")
        telefono = validated_data.get("telefono")
        nueva_password = validated_data.get("nueva_password")

        if nombre:
            user.nombre = nombre
        if apellido:
            user.apellido = apellido
        if email:
            user.email = email.lower()
        if nueva_password:
            user.set_password(nueva_password)

        user.save()

        if telefono is not None and hasattr(user, "cliente_perfil") and user.cliente_perfil:
            user.cliente_perfil.telefono = telefono
            user.cliente_perfil.save()

        return user
