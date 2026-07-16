from rest_framework.exceptions import ValidationError
from vehiculos.models import Vehiculo
from .models import OrdenTrabajo, EstadoOrden

class CrearOrdenTrabajoUseCase:
    def execute(self, vehiculo_id, descripcion_problema, fecha_ingreso):
        try:
            vehiculo = Vehiculo.objects.get(id=vehiculo_id)
        except (Vehiculo.DoesNotExist, ValidationError, ValueError):
            raise ValidationError({"vehiculo_id": "El vehículo especificado no existe."})
        
        orden = OrdenTrabajo.objects.create(
            vehiculo=vehiculo,
            descripcion_problema=descripcion_problema,
            fecha_ingreso=fecha_ingreso,
            estado=EstadoOrden.INGRESADO
        )
        return orden
