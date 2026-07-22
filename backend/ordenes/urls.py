from django.urls import path
from .views import CrearOrdenTrabajoView, AgregarManoDeObraView

urlpatterns = [
    path('ordenes/', CrearOrdenTrabajoView.as_view(), name='crear-orden-trabajo'),
    path('ordenes/<uuid:orden_id>/items/mano-de-obra/', AgregarManoDeObraView.as_view(), name='agregar-mano-de-obra'),
]

