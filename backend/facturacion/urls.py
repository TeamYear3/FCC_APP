from django.urls import path
from .views import (
    EmitirFacturaView,
    FacturaListView,
    FacturaClienteListView,
    FacturaDetailView,
    FacturaCalendarioView,
    ActualizarEstadoPagoFacturaView,
    FacturaPDFView,
)

urlpatterns = [
    path("", FacturaListView.as_view(), name="factura-list"),
    path("mis-facturas/", FacturaClienteListView.as_view(), name="factura-cliente-list"),
    path("emitir/", EmitirFacturaView.as_view(), name="factura-emitir"),
    path("calendario/", FacturaCalendarioView.as_view(), name="factura-calendario"),
    path("<uuid:id>/", FacturaDetailView.as_view(), name="factura-detail"),
    path("<uuid:id>/pdf/", FacturaPDFView.as_view(), name="factura-pdf"),
    path("<uuid:id>/pago/", ActualizarEstadoPagoFacturaView.as_view(), name="factura-actualizar-pago"),
]
