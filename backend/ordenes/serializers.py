from decimal import Decimal
from rest_framework import serializers
from vehiculos.models import Vehiculo
from .models import OrdenTrabajo, EstadoOrden, ItemPresupuesto, TipoItem

class OrdenTrabajoSerializer(serializers.ModelSerializer):
    vehiculo_id = serializers.UUIDField(required=True)
    descripcion_problema = serializers.CharField(required=True, allow_blank=False)
    fecha_ingreso = serializers.DateField(required=True)
    estado = serializers.ChoiceField(
        choices=EstadoOrden.choices,
        default=EstadoOrden.INGRESADO,
        required=False
    )

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
            'monto_total',
            'creado_en',
            'actualizado_en'
        ]
        read_only_fields = [
            'id',
            'numero_ot',
            'vehiculo',
            'tecnico',
            'fecha_entrega',
            'comentario_rechazo',
            'monto_total',
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
            **validated_data
        )
        return orden


    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Mapeamos vehiculo ForeignKey a vehiculo_id en la respuesta
        rep['vehiculo_id'] = str(instance.vehiculo.id) if instance.vehiculo else None
        return rep


class ItemManoDeObraSerializer(serializers.ModelSerializer):
    modalidad = serializers.ChoiceField(
        choices=[('estandar', 'Estándar'), ('por_hora', 'Por Hora')],
        default='estandar',
        write_only=True
    )
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=Decimal('1.00'))
    precio_unitario = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)

    class Meta:
        model = ItemPresupuesto
        fields = [
            'id',
            'orden_trabajo',
            'tipo',
            'descripcion',
            'modalidad',
            'cantidad',
            'precio_unitario',
            'subtotal',
            'creado_en',
            'actualizado_en'
        ]
        read_only_fields = ['id', 'orden_trabajo', 'tipo', 'subtotal', 'creado_en', 'actualizado_en']

    def validate_cantidad(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a cero.")
        return value

    def validate_precio_unitario(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio unitario debe ser mayor a cero.")
        return value

    def create(self, validated_data):
        validated_data.pop('modalidad', None)
        validated_data['tipo'] = TipoItem.MANO_DE_OBRA
        return super().create(validated_data)


class ItemRepuestoSerializer(serializers.ModelSerializer):
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=Decimal('1.00'))
    precio_unitario = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)

    class Meta:
        model = ItemPresupuesto
        fields = [
            'id',
            'orden_trabajo',
            'tipo',
            'descripcion',
            'cantidad',
            'precio_unitario',
            'subtotal',
            'creado_en',
            'actualizado_en'
        ]
        read_only_fields = ['id', 'orden_trabajo', 'tipo', 'subtotal', 'creado_en', 'actualizado_en']

    def validate_cantidad(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a cero.")
        return value

    def validate_precio_unitario(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio unitario debe ser mayor a cero.")
        return value

    def create(self, validated_data):
        validated_data['tipo'] = TipoItem.REPUESTO
        return super().create(validated_data)


from .models import HistorialEstadoOrden


class HistorialEstadoOrdenSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = HistorialEstadoOrden
        fields = [
            'id',
            'estado_anterior',
            'estado_nuevo',
            'usuario',
            'usuario_nombre',
            'comentario',
            'creado_en'
        ]
        read_only_fields = fields

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            nombre_completo = f"{getattr(obj.usuario, 'nombre', '')} {getattr(obj.usuario, 'apellido', '')}".strip()
            return nombre_completo or obj.usuario.email
        return "Sistema"



class ActualizarEstadoOrdenSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=EstadoOrden.choices, required=True)
    comentario = serializers.CharField(required=False, allow_blank=True, default="")



