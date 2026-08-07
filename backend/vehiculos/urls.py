from django.urls import path
from .views import CrearVehiculoView, DetalleVehiculoView, HistorialVehiculoView

urlpatterns = [
    path('', CrearVehiculoView.as_view(), name='crear-vehiculo'),
    path('<uuid:pk>/', DetalleVehiculoView.as_view(), name='detalle-vehiculo'),
    path('<uuid:pk>/historial/', HistorialVehiculoView.as_view(), name='historial-vehiculo'),
]
