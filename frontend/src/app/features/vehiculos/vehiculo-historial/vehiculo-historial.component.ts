import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VehiculoService, VehiculoResponse, HistorialVehiculoResponse, MantenimientoProgramadoResponse } from '../../../core/services/vehiculo.service';

@Component({
  selector: 'app-vehiculo-historial',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './vehiculo-historial.component.html'
})
export class VehiculoHistorialComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly router = inject(Router);

  readonly returnUrl = signal<string>('/ordenes');
  readonly vehiculo = signal<VehiculoResponse | null>(null);
  readonly ordenes = signal<any[]>([]);
  readonly mantenimientos = signal<MantenimientoProgramadoResponse[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly cargandoMantenimientos = signal<boolean>(false);
  readonly descargandoPdf = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  // Formulario y modal de mantenimientos programados
  readonly mostrarModalMantenimiento = signal<boolean>(false);
  tipoServicioNuevo: string = '';
  kilometrajeObjetivoNuevo: number | null = null;
  fechaLimiteNueva: string = '';
  readonly cargandoGuardadoMaint = signal<boolean>(false);

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
      this.cargarMantenimientosProgramados();
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

  cargarMantenimientosProgramados(): void {
    this.cargandoMantenimientos.set(true);
    this.vehiculoService.obtenerMantenimientosProgramados(this.vehiculoId).subscribe({
      next: (res) => {
        this.mantenimientos.set(res || []);
        this.cargandoMantenimientos.set(false);
      },
      error: (err) => {
        console.error('Error al obtener mantenimientos:', err);
        this.cargandoMantenimientos.set(false);
      }
    });
  }

  abrirModalMantenimiento(): void {
    this.tipoServicioNuevo = '';
    this.kilometrajeObjetivoNuevo = null;
    this.fechaLimiteNueva = '';
    this.mostrarModalMantenimiento.set(true);
  }

  cerrarModalMantenimiento(): void {
    this.mostrarModalMantenimiento.set(false);
  }

  guardarMantenimiento(): void {
    if (!this.tipoServicioNuevo || !this.kilometrajeObjetivoNuevo) {
      alert('Debe ingresar tipo de servicio y kilometraje objetivo.');
      return;
    }

    this.cargandoGuardadoMaint.set(true);
    const payload = {
      tipo_servicio: this.tipoServicioNuevo,
      kilometraje_objetivo: this.kilometrajeObjetivoNuevo,
      fecha_limite: this.fechaLimiteNueva || null
    };

    this.vehiculoService.crearMantenimientoProgramado(this.vehiculoId, payload).subscribe({
      next: () => {
        this.cargandoGuardadoMaint.set(false);
        this.cerrarModalMantenimiento();
        this.cargarMantenimientosProgramados();
      },
      error: (err) => {
        console.error('Error al guardar mantenimiento:', err);
        alert('No se pudo guardar el mantenimiento programado.');
        this.cargandoGuardadoMaint.set(false);
      }
    });
  }

  getPorcentajeDesgaste(maint: MantenimientoProgramadoResponse): number {
    const veh = this.vehiculo();
    if (!veh) return 0;
    const actual = veh.kilometraje_actual || veh.kilometraje || 0;
    const objetivo = maint.kilometraje_objetivo;
    if (objetivo <= 0) return 0;
    const pct = (actual / objetivo) * 100;
    return Math.min(Math.max(pct, 0), 100);
  }

  getAlertaClase(maint: MantenimientoProgramadoResponse): { text: string, bg: string, bar: string } {
    const veh = this.vehiculo();
    if (!veh) return { text: '', bg: '', bar: '' };
    const actual = veh.kilometraje_actual || veh.kilometraje || 0;
    const objetivo = maint.kilometraje_objetivo;
    const restante = objetivo - actual;

    if (restante <= 500 || maint.completado) {
      if (maint.completado) {
        return {
          text: 'text-green-400 border-green-500/30',
          bg: 'bg-green-500/10',
          bar: 'bg-green-500'
        };
      }
      return {
        text: 'text-red-400 border-red-500/30',
        bg: 'bg-red-500/10',
        bar: 'bg-red-500'
      };
    } else if (restante <= 2000) {
      return {
        text: 'text-yellow-400 border-yellow-500/30',
        bg: 'bg-yellow-500/10',
        bar: 'bg-yellow-500'
      };
    } else {
      return {
        text: 'text-green-400 border-green-500/30',
        bg: 'bg-green-500/10',
        bar: 'bg-green-500'
      };
    }
  }

  getKilometrosRestantes(maint: MantenimientoProgramadoResponse): number {
    const veh = this.vehiculo();
    if (!veh) return 0;
    const actual = veh.kilometraje_actual || veh.kilometraje || 0;
    const objetivo = maint.kilometraje_objetivo;
    return Math.max(objetivo - actual, 0);
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
