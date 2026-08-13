import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { VehiculoService, VehiculoResponse, HistorialVehiculoResponse } from '../../../core/services/vehiculo.service';

@Component({
  selector: 'app-vehiculo-historial',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './vehiculo-historial.component.html'
})
export class VehiculoHistorialComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly router = inject(Router);

  readonly returnUrl = signal<string>('/ordenes');
  readonly vehiculo = signal<VehiculoResponse | null>(null);
  readonly ordenes = signal<any[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly descargandoPdf = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  // Metadata Paginación
  readonly paginaActual = signal<number>(1);
  readonly totalPaginas = signal<number>(1);
  readonly totalItems = signal<number>(0);
  readonly limitePorPagina = signal<number>(10);

  vehiculoId: string = '';

  ngOnInit(): void {
    this.returnUrl.set(this.router.url.startsWith('/admin') ? '/admin/ordenes' : '/ordenes');
    this.vehiculoId = this.route.snapshot.params['id'];
    if (this.vehiculoId) {
      this.cargarDetalleVehiculo();
      this.cargarHistorial(1);
    }
  }

  cargarDetalleVehiculo(): void {
    this.vehiculoService.obtenerVehiculoPorId(this.vehiculoId).subscribe({
      next: (data) => this.vehiculo.set(data),
      error: (err) => console.error('Error al obtener vehículo:', err)
    });
  }

  cargarHistorial(page: number): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.vehiculoService.obtenerHistorialVehiculo(this.vehiculoId, page, this.limitePorPagina()).subscribe({
      next: (res: HistorialVehiculoResponse) => {
        this.ordenes.set(res.results || []);
        this.paginaActual.set(res.current_page || 1);
        this.totalPaginas.set(res.total_pages || 1);
        this.totalItems.set(res.total_items || 0);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar historial:', err);
        this.errorMsg.set('No se pudo cargar el historial de intervenciones.');
        this.cargando.set(false);
      }
    });
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas()) {
      this.cargarHistorial(nuevaPagina);
    }
  }

  descargarPDF(): void {
    if (!this.vehiculoId || this.descargandoPdf()) return;
    this.descargandoPdf.set(true);

    this.vehiculoService.descargarHistorialPDF(this.vehiculoId).subscribe({
      next: (blob: Blob) => {
        this.descargandoPdf.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const patenteStr = this.vehiculo()?.patente || 'vehiculo';
        a.download = `historial_${patenteStr}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.descargandoPdf.set(false);
        console.error('Error al descargar PDF:', err);
        alert('No se pudo descargar el archivo PDF. Intente nuevamente.');
      }
    });
  }

  readonly etapasTimeline = [
    { key: 'ingresado', label: 'Ingresado' },
    { key: 'en_presupuesto', label: 'En Presupuesto' },
    { key: 'aprobado', label: 'Aprobado' },
    { key: 'en_proceso', label: 'En Proceso' },
    { key: 'finalizado', label: 'Finalizado' }
  ];

  isEtapaAlcanzada(key: string): boolean {
    const list = this.ordenes();
    if (!list || list.length === 0) return false;
    const estadoActual = (list[0]?.estado || '').toLowerCase();
    
    const ordenEstados = ['ingresado', 'en_presupuesto', 'aprobado', 'en_proceso', 'finalizado'];
    const idxActual = ordenEstados.indexOf(estadoActual);
    const idxEtapa = ordenEstados.indexOf(key);

    return idxEtapa !== -1 && idxActual !== -1 && idxEtapa <= idxActual;
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'ingresado':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'en_presupuesto':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'aprobado':
      case 'finalizado':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'en_proceso':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'rechazado':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  }
}
