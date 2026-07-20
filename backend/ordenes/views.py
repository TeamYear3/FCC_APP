from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.permissions import EsAdministrador, EsTecnico
from .serializers import OrdenTrabajoSerializer

class CrearOrdenTrabajoView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico]

    def post(self, request, *args, **kwargs):
        serializer = OrdenTrabajoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        orden = serializer.save()
        response_serializer = OrdenTrabajoSerializer(orden)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
