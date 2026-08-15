from django.urls import path
from .views import (
    CrearOrdenTrabajoView,
    AgregarManoDeObraView,
    AgregarRepuestoView,
    ConsultarHistorialOrdenView,
    ActualizarEstadoOrdenView,
    AdjuntoDiagnosticoListCreateView,
    AdjuntoDiagnosticoDetailView,
    ListarItemsPresupuestoView,
    MarcarItemCompletadoView,
    EliminarItemPresupuestoView
)

urlpatterns = [
    path('ordenes/', CrearOrdenTrabajoView.as_view(), name='crear-orden-trabajo'),
    path('ordenes/<uuid:orden_id>/items/', ListarItemsPresupuestoView.as_view(), name='listar-items-presupuesto'),
    path('ordenes/<uuid:orden_id>/items/mano-de-obra/', AgregarManoDeObraView.as_view(), name='agregar-mano-de-obra'),
    path('ordenes/<uuid:orden_id>/items/repuestos/', AgregarRepuestoView.as_view(), name='agregar-repuesto'),
    path('ordenes/<uuid:orden_id>/items/<uuid:item_id>/completado/', MarcarItemCompletadoView.as_view(), name='marcar-item-completado'),
    path('ordenes/<uuid:orden_id>/items/<uuid:item_id>/', EliminarItemPresupuestoView.as_view(), name='eliminar-item-presupuesto'),
    path('ordenes/<uuid:orden_id>/historial/', ConsultarHistorialOrdenView.as_view(), name='consultar-historial-orden'),
    path('ordenes/<uuid:orden_id>/estado/', ActualizarEstadoOrdenView.as_view(), name='actualizar-estado-orden'),
    path('ordenes/<uuid:orden_id>/adjuntos/', AdjuntoDiagnosticoListCreateView.as_view(), name='listar-crear-adjuntos-orden'),
    path('diagnosticos/adjuntos/', AdjuntoDiagnosticoListCreateView.as_view(), name='crear-adjunto-diagnostico'),
    path('diagnosticos/adjuntos/<uuid:adjunto_id>/', AdjuntoDiagnosticoDetailView.as_view(), name='eliminar-adjunto-diagnostico'),
]
