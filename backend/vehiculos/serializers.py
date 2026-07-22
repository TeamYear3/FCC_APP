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
        read_only_fields = ['id', 'patente', 'creado_en', 'actualizado_en']
