from django.urls import path
from .views import CrearClienteView

urlpatterns = [
    path('', CrearClienteView.as_view(), name='crear-cliente'),
]
