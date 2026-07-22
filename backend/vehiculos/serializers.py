import re
from rest_framework import serializers
from clientes.models import Cliente
from .models import Vehiculo

class VehiculoSerializer(serializers.ModelSerializer):
    cliente_id = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(),
        source='cliente',
        error_messages={
            'does_not_exist': 'El cliente especificado no existe.'
        }
    )

    class Meta:
        model = Vehiculo
        fields = [
            'id',
            'cliente_id',
            'patente',
            'marca',
            'modelo',
            'anio',
            'kilometraje',
            'color',
            'foto_url',
            'creado_en',
            'actualizado_en'
        ]
        read_only_fields = ['id', 'creado_en', 'actualizado_en']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None:
            self.fields['patente'].read_only = True

    def validate_patente(self, value):
        patente_limpia = value.upper().strip()
        # Formato argentino oficial: AAA000 o AB123CD
        if not re.match(r'^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$', patente_limpia):
            raise serializers.ValidationError("El formato de la patente es inválido. Debe ser AAA000 o AB123CD.")
        
        if self.instance is None and Vehiculo.objects.filter(patente=patente_limpia).exists():
            raise serializers.ValidationError("Ya existe un vehículo registrado con esta patente.")
        
        return patente_limpia
