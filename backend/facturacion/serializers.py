from rest_framework import serializers
from ordenes.models import OrdenTrabajo, ItemPresupuesto
from .models import Factura, TipoComprobante, EstadoPago, EstadoFactura


class ItemFacturaSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ItemPresupuesto
        fields = [
            "id",
            "tipo",
            "descripcion",
            "cantidad",
            "precio_unitario",
            "subtotal",
        ]



class FacturaSerializer(serializers.ModelSerializer):
    numero_comprobante = serializers.CharField(source="numero_comprobante_formateado", read_only=True)
    semaforo = serializers.CharField(source="semaforo_color", read_only=True)
    cliente_nombre = serializers.SerializerMethodField()
    cliente_documento = serializers.SerializerMethodField()
    cliente_condicion_iva = serializers.SerializerMethodField()
    vehiculo_patente = serializers.SerializerMethodField()
    vehiculo_descripcion = serializers.SerializerMethodField()
    numero_ot = serializers.CharField(source="orden_trabajo.numero_ot", read_only=True)
    items = serializers.SerializerMethodField()

    class Meta:
        model = Factura
        fields = [
            "id",
            "orden_trabajo",
            "numero_ot",
            "numero_comprobante",
            "tipo_comprobante",
            "punto_venta",
            "numero_factura",
            "cae",
            "fecha_vencimiento_cae",
            "total",
            "estado",
            "estado_pago",
            "semaforo",
            "fecha_emision",
            "fecha_vencimiento_pago",
            "cuit_emisor",
            "observaciones",
            "cliente_nombre",
            "cliente_documento",
            "cliente_condicion_iva",
            "vehiculo_patente",
            "vehiculo_descripcion",
            "items",
        ]
        read_only_fields = [
            "id",
            "cae",
            "fecha_vencimiento_cae",
            "numero_factura",
            "fecha_emision",
            "numero_comprobante",
            "semaforo",
        ]

    def get_cliente_nombre(self, obj):
        try:
            cliente = obj.orden_trabajo.vehiculo.cliente
            return f"{cliente.nombre} {cliente.apellido}".strip()
        except Exception:
            return "Consumidor Final"

    def get_cliente_documento(self, obj):
        try:
            cliente = obj.orden_trabajo.vehiculo.cliente
            return f"{cliente.tipo_documento}: {cliente.dni_cuit}"
        except Exception:
            return "S/D"

    def get_cliente_condicion_iva(self, obj):
        try:
            return obj.orden_trabajo.vehiculo.cliente.get_condicion_iva_display()
        except Exception:
            return "Consumidor Final"

    def get_vehiculo_patente(self, obj):
        try:
            return obj.orden_trabajo.vehiculo.patente
        except Exception:
            return ""

    def get_vehiculo_descripcion(self, obj):
        try:
            v = obj.orden_trabajo.vehiculo
            return f"{v.marca} {v.modelo} ({v.anio})"
        except Exception:
            return ""

    def get_items(self, obj):
        try:
            items_qs = obj.orden_trabajo.items_presupuesto.all()
            return ItemFacturaSerializer(items_qs, many=True).data
        except Exception:
            return []


class EmitirFacturaSerializer(serializers.Serializer):
    orden_trabajo_id = serializers.UUIDField(required=True)
    tipo_comprobante = serializers.ChoiceField(
        choices=TipoComprobante.choices,
        default=TipoComprobante.FACTURA_B,
        required=False
    )
    punto_venta = serializers.IntegerField(default=1, min_value=1, required=False)
    dias_vencimiento_pago = serializers.IntegerField(default=15, min_value=1, required=False)
    observaciones = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_orden_trabajo_id(self, value):
        orden = OrdenTrabajo.objects.filter(id=value).first()
        if not orden:
            raise serializers.ValidationError("La Orden de Trabajo especificada no existe.")
        if hasattr(orden, "factura") and orden.factura is not None:
            raise serializers.ValidationError(
                f"Esta Orden de Trabajo ya posee una Factura emitida ({orden.factura.numero_comprobante_formateado})."
            )
        if orden.monto_total <= 0:
            raise serializers.ValidationError("No se puede facturar una orden con monto total igual o menor a cero.")
        return value


class FacturaCalendarioSerializer(serializers.ModelSerializer):
    """
    Serializer optimizado para la representación de facturas en el calendario financiero (TK062/TK063).
    """
    numero_comprobante = serializers.CharField(source="numero_comprobante_formateado", read_only=True)
    semaforo = serializers.CharField(source="semaforo_color", read_only=True)
    cliente = serializers.SerializerMethodField()
    vehiculo = serializers.SerializerMethodField()
    numero_ot = serializers.CharField(source="orden_trabajo.numero_ot", read_only=True)

    class Meta:
        model = Factura
        fields = [
            "id",
            "orden_trabajo_id",
            "numero_ot",
            "numero_comprobante",
            "cae",
            "total",
            "fecha_emision",
            "fecha_vencimiento_pago",
            "estado_pago",
            "semaforo",
            "cliente",
            "vehiculo",
        ]

    def get_cliente(self, obj):
        try:
            c = obj.orden_trabajo.vehiculo.cliente
            return f"{c.nombre} {c.apellido}"
        except Exception:
            return "Consumidor Final"

    def get_vehiculo(self, obj):
        try:
            v = obj.orden_trabajo.vehiculo
            return f"{v.marca} {v.modelo} [{v.patente}]"
        except Exception:
            return ""
