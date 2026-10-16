from django.urls import path
from .views import (
    EmitirFacturaView,
    FacturaListView,
    FacturaDetailView,
    FacturaCalendarioView,
    ActualizarEstadoPagoFacturaView,
)

urlpatterns = [
    path("", FacturaListView.as_view(), name="factura-list"),
    path("emitir/", EmitirFacturaView.as_view(), name="factura-emitir"),
    path("calendario/", FacturaCalendarioView.as_view(), name="factura-calendario"),
    path("<uuid:id>/", FacturaDetailView.as_view(), name="factura-detail"),
    path("<uuid:id>/pago/", ActualizarEstadoPagoFacturaView.as_view(), name="factura-actualizar-pago"),
]
