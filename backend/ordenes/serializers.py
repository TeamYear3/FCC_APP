from rest_framework import serializers
from vehiculos.models import Vehiculo
from .models import OrdenTrabajo, EstadoOrden

class OrdenTrabajoSerializer(serializers.ModelSerializer):
    vehiculo_id = serializers.UUIDField(required=True)
    descripcion_problema = serializers.CharField(required=True, allow_blank=False)
    fecha_ingreso = serializers.DateField(required=True)

    class Meta:
        model = OrdenTrabajo
        fields = [
            'id',
            'numero_ot',
            'vehiculo_id',
            'vehiculo',
            'descripcion_problema',
            'fecha_ingreso',
            'estado',
            'tecnico',
            'fecha_entrega',
            'comentario_rechazo',
            'creado_en',
            'actualizado_en'
        ]
        read_only_fields = [
            'id',
            'numero_ot',
            'vehiculo',
            'estado',
            'tecnico',
            'fecha_entrega',
            'comentario_rechazo',
            'creado_en',
            'actualizado_en'
        ]

    def validate_vehiculo_id(self, value):
        if not Vehiculo.objects.filter(id=value).exists():
            raise serializers.ValidationError("El vehículo especificado no existe.")
        return value

    def create(self, validated_data):
        vehiculo_id = validated_data.pop('vehiculo_id')
        vehiculo = Vehiculo.objects.get(id=vehiculo_id)
        orden = OrdenTrabajo.objects.create(
            vehiculo=vehiculo,
            estado=EstadoOrden.INGRESADO,
            **validated_data
        )
        return orden

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Mapeamos vehiculo ForeignKey a vehiculo_id en la respuesta
        rep['vehiculo_id'] = str(instance.vehiculo.id) if instance.vehiculo else None
        return rep
