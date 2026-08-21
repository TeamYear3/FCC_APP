from django.urls import path
from .views import ResumenMecanicosView, ResumenClientesView

urlpatterns = [
    path('mecanicos/', ResumenMecanicosView.as_view(), name='taller-mecanicos'),
    path('clientes/', ResumenClientesView.as_view(), name='taller-clientes'),
]
