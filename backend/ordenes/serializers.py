from rest_framework import serializers
from .models import OrdenTrabajo

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

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Mapeamos vehiculo ForeignKey a vehiculo_id en la respuesta
        rep['vehiculo_id'] = str(instance.vehiculo.id) if instance.vehiculo else None
        return rep
