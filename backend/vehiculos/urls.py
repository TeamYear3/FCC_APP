from django.urls import path
from .views import CrearVehiculoView

urlpatterns = [
    path('', CrearVehiculoView.as_view(), name='crear-vehiculo'),
]
