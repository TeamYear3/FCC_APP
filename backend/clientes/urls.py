from django.urls import path
from .views import CrearClienteView, DetalleClienteView

urlpatterns = [
    path('', CrearClienteView.as_view(), name='crear-cliente'),
    path('<uuid:pk>/', DetalleClienteView.as_view(), name='detalle-cliente'),
]
