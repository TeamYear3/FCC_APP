from django.urls import path
from .views import CrearVehiculoView, DetalleVehiculoView

urlpatterns = [
    path('', CrearVehiculoView.as_view(), name='crear-vehiculo'),
    path('<uuid:pk>/', DetalleVehiculoView.as_view(), name='detalle-vehiculo'),
]
