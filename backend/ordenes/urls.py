from django.urls import path
from .views import CrearOrdenTrabajoView

urlpatterns = [
    path('ordenes/', CrearOrdenTrabajoView.as_view(), name='crear-orden-trabajo'),
]
