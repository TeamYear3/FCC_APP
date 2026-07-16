from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.permissions import EsAdministrador, EsTecnico
from .serializers import OrdenTrabajoSerializer
from .use_cases import CrearOrdenTrabajoUseCase

class CrearOrdenTrabajoView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico]

    def post(self, request, *args, **kwargs):
        serializer = OrdenTrabajoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        vehiculo_id = serializer.validated_data['vehiculo_id']
        descripcion_problema = serializer.validated_data['descripcion_problema']
        fecha_ingreso = serializer.validated_data['fecha_ingreso']
        
        use_case = CrearOrdenTrabajoUseCase()
        orden = use_case.execute(
            vehiculo_id=vehiculo_id,
            descripcion_problema=descripcion_problema,
            fecha_ingreso=fecha_ingreso
        )
        
        response_serializer = OrdenTrabajoSerializer(orden)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
