import re
from rest_framework import serializers
from clientes.models import Cliente
from .models import Vehiculo

class VehiculoSerializer(serializers.ModelSerializer):
    cliente_id = serializers.UUIDField(required=True)

    class Meta:
        model = Vehiculo
        fields = [
            'id',
            'cliente_id',
            'cliente',
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
        read_only_fields = ['id', 'cliente', 'creado_en', 'actualizado_en']

    def validate_cliente_id(self, value):
        if not Cliente.objects.filter(id=value).exists():
            raise serializers.ValidationError("El cliente especificado no existe.")
        return value

    def validate_patente(self, value):
        patente_limpia = value.upper().strip()
        # Formato argentino oficial: AAA000 o AB123CD
        if not re.match(r'^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$', patente_limpia):
            raise serializers.ValidationError("El formato de la patente es inválido. Debe ser AAA000 o AB123CD.")
        
        if self.instance is None and Vehiculo.objects.filter(patente=patente_limpia).exists():
            raise serializers.ValidationError("Ya existe un vehículo registrado con esta patente.")
        
        return patente_limpia

    def create(self, validated_data):
        cliente_id = validated_data.pop('cliente_id')
        cliente = Cliente.objects.get(id=cliente_id)
        vehiculo = Vehiculo.objects.create(
            cliente=cliente,
            **validated_data
        )
        return vehiculo

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['cliente_id'] = str(instance.cliente.id) if instance.cliente else None
        return rep
