from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.permissions import EsAdministrador, EsTecnico
from .models import OrdenTrabajo
from .serializers import OrdenTrabajoSerializer, ItemManoDeObraSerializer

class CrearOrdenTrabajoView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico]

    def post(self, request, *args, **kwargs):
        serializer = OrdenTrabajoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        orden = serializer.save()
        response_serializer = OrdenTrabajoSerializer(orden)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class AgregarManoDeObraView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador | EsTecnico]

    def post(self, request, orden_id, *args, **kwargs):
        orden = get_object_or_404(OrdenTrabajo, id=orden_id)
        serializer = ItemManoDeObraSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        item = serializer.save(orden_trabajo=orden)
        response_serializer = ItemManoDeObraSerializer(item)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

