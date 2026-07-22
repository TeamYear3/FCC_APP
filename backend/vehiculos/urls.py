from django.urls import path
from .views import DetalleVehiculoView

urlpatterns = [
    path('<uuid:pk>/', DetalleVehiculoView.as_view(), name='detalle-vehiculo'),
]
