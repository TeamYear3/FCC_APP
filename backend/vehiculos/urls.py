from django.urls import path
from .views import CrearVehiculoView, DetalleVehiculoView, HistorialVehiculoView, ExportarHistorialPDFView, ReasignarVehiculoView, MantenimientoProgramadoView

urlpatterns = [
    path('', CrearVehiculoView.as_view(), name='crear-vehiculo'),
    path('<uuid:pk>/', DetalleVehiculoView.as_view(), name='detalle-vehiculo'),
    path('<uuid:pk>/historial/', HistorialVehiculoView.as_view(), name='historial-vehiculo'),
    path('<uuid:pk>/historial/pdf/', ExportarHistorialPDFView.as_view(), name='exportar-historial-pdf'),
    path('<uuid:pk>/reasignar/', ReasignarVehiculoView.as_view(), name='reasignar-vehiculo'),
    path('<uuid:pk>/mantenimientos/', MantenimientoProgramadoView.as_view(), name='mantenimiento-vehiculo'),
]


