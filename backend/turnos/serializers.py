from rest_framework import serializers
from .models import Turno
from clientes.models import Cliente
from vehiculos.models import Vehiculo

class TurnoSerializer(serializers.ModelSerializer):
    warning_overbooking = serializers.SerializerMethodField()
    force_booking = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Turno
        fields = [
            "id",
            "cliente",
            "vehiculo",
            "fecha_hora",
            "motivo",
            "estado",
            "creado_en",
            "actualizado_en",
            "warning_overbooking",
            "force_booking",
        ]
        read_only_fields = ["id", "creado_en", "actualizado_en"]

    def get_warning_overbooking(self, obj):
        if obj.estado == "cancelado":
            return False
        
        fecha = obj.fecha_hora.date()
        # Contamos cuántos turnos activos (excluyendo cancelados) existen ese día
        turnos_dia = Turno.objects.filter(fecha_hora__date=fecha).exclude(estado="cancelado")
        if obj.pk:
            turnos_dia = turnos_dia.exclude(pk=obj.pk)
        
        return turnos_dia.count() >= 2

    def validate(self, attrs):
        cliente = attrs.get("cliente")
        vehiculo = attrs.get("vehiculo")
        fecha_hora = attrs.get("fecha_hora")
        estado = attrs.get("estado", "pendiente")
        force_booking = attrs.get("force_booking", False)

        # Si estamos actualizando, recuperamos los valores actuales si no se enviaron
        if self.instance:
            if not cliente:
                cliente = self.instance.cliente
            if not vehiculo:
                vehiculo = self.instance.vehiculo
            if not fecha_hora:
                fecha_hora = self.instance.fecha_hora

        # Validación 1: Integridad lógica del vehículo y cliente
        if cliente and vehiculo and vehiculo.cliente != cliente:
            raise serializers.ValidationError({
                "vehiculo": "El vehículo seleccionado no pertenece al cliente especificado."
            })

        # Validación 2: Regla de sobre-cupo diario (>2 turnos/día)
        # Solo se valida si el turno no es cancelado
        if estado != "cancelado" and fecha_hora:
            fecha = fecha_hora.date()
            turnos_dia = Turno.objects.filter(fecha_hora__date=fecha).exclude(estado="cancelado")
            
            # Excluimos el turno actual en caso de edición
            if self.instance:
                turnos_dia = turnos_dia.exclude(pk=self.instance.pk)
                
            count = turnos_dia.count()
            if count >= 2 and not force_booking:
                raise serializers.ValidationError({
                    "warning_overbooking": True,
                    "detail": "El día seleccionado ya cuenta con 2 o más turnos activos. ¿Desea forzar la reserva?"
                })

        # Quitar force_booking para que no se pase al constructor del modelo Turno
        attrs.pop("force_booking", None)
        return attrs
