import re
from rest_framework import serializers
from clientes.models import Cliente
from .models import Vehiculo, MantenimientoProgramado

from rest_framework.exceptions import APIException
from rest_framework import status

class ConflictException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Conflicto de unicidad en la base de datos.'
    default_code = 'conflict'

class MantenimientoProgramadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MantenimientoProgramado
        fields = [
            'id',
            'vehiculo',
            'tipo_servicio',
            'kilometraje_objetivo',
            'completado',
            'fecha_limite',
            'completado_en',
            'creado_en'
        ]
        read_only_fields = ['id', 'vehiculo', 'completado_en', 'creado_en']


class VehiculoSerializer(serializers.ModelSerializer):
    cliente_id = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(),
        source='cliente',
        error_messages={
            'does_not_exist': 'El cliente especificado no existe.'
        }
    )
    numero_chasis = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    mantenimientos_programados = MantenimientoProgramadoSerializer(many=True, read_only=True)

    class Meta:
        model = Vehiculo
        fields = [
            'id',
            'cliente_id',
            'patente',
            'numero_chasis',
            'marca',
            'modelo',
            'anio',
            'kilometraje',
            'kilometraje_actual',
            'mantenimientos_programados',
            'color',
            'foto_url',
            'activo',
            'creado_en',
            'actualizado_en'
        ]
        read_only_fields = ['id', 'activo', 'creado_en', 'actualizado_en']

    def create(self, validated_data):
        if 'kilometraje_actual' not in validated_data or not validated_data['kilometraje_actual']:
            validated_data['kilometraje_actual'] = validated_data.get('kilometraje', 0)
        return super().create(validated_data)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None:
            self.fields['patente'].read_only = True
            if 'numero_chasis' in self.fields:
                self.fields['numero_chasis'].read_only = True
        else:
            self.fields['kilometraje'].required = True

    def validate_patente(self, value):
        patente_limpia = value.upper().strip()
        # Formato argentino oficial: AAA000 o AB123CD
        if not re.match(r'^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$', patente_limpia):
            raise serializers.ValidationError("El formato de la patente es inválido. Debe ser AAA000 o AB123CD.")
        
        if self.instance is None and Vehiculo.objects.filter(patente=patente_limpia).exists():
            raise ConflictException("Ya existe un vehículo registrado con esta patente.")
        
        return patente_limpia

    def validate_numero_chasis(self, value):
        if not value:
            return value
        chasis_limpio = value.upper().strip()
        if self.instance is None and Vehiculo.objects.filter(numero_chasis=chasis_limpio).exists():
            raise ConflictException("Ya existe un vehículo registrado con este número de chasis.")
        return chasis_limpio

    def validate_kilometraje(self, value):
        if value < 0:
            raise serializers.ValidationError("El kilometraje no puede ser negativo.")
        return value

