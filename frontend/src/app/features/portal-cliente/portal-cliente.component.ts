import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { OrdenService, OrdenResponse, OrdenHistorialResponse, AdjuntoDiagnostico } from '../../core/services/orden.service';
import { VehiculoService, VehiculoResponse, MantenimientoProgramadoResponse } from '../../core/services/vehiculo.service';
import { TurnoService, TurnoResponse, TurnoPayload } from '../../core/services/turno.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { ConfiguracionPerfilModalComponent } from '../configuracion/configuracion-perfil-modal.component';

@Component({
  selector: 'app-portal-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfiguracionPerfilModalComponent],
  templateUrl: './portal-cliente.component.html',
  styleUrl: './portal-cliente.component.css'
})
export class PortalClienteComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly ordenService = inject(OrdenService);
  readonly vehiculoService = inject(VehiculoService);
  readonly turnoService = inject(TurnoService);
  readonly webSocketService = inject(WebSocketService);
  private readonly router = inject(Router);

  readonly userRole = this.authService.userRoleSignal;
  readonly userName = signal<string>('');
  readonly estadoSocket = this.webSocketService.estadoConexion;

  readonly listaOrdenes = signal<OrdenResponse[]>([]);
  readonly listaVehiculos = signal<VehiculoResponse[]>([]);
  readonly listaTurnos = signal<TurnoResponse[]>([]);
  readonly tabActivo = signal<'ordenes' | 'vehiculos' | 'turnos'>('ordenes');
  readonly cargando = signal<boolean>(true);
  readonly cargandoVehiculos = signal<boolean>(false);
  readonly cargandoTurnos = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Modal para reservar nuevo turno (TK207)
  readonly mostrarModalReserva = signal<boolean>(false);
  readonly vehiculoIdReserva = signal<string>('');
  readonly fechaHoraReserva = signal<string>('');
  readonly motivoReserva = signal<string>('');
  readonly cargandoReserva = signal<boolean>(false);
  readonly errorReserva = signal<string | null>(null);
  readonly exitoReserva = signal<string | null>(null);
  readonly warningOverbooking = signal<boolean>(false);

  // Modal para consultar historial de la OT seleccionada
  readonly ordenSeleccionada = signal<OrdenResponse | null>(null);
  readonly historialDatos = signal<OrdenHistorialResponse | null>(null);
  readonly cargandoHistorial = signal<boolean>(false);
  readonly mostrarModalHistorial = signal<boolean>(false);

  // Modal para galería y fotos de diagnóstico (TK205)
  readonly adjuntosOT = signal<AdjuntoDiagnostico[]>([]);
  readonly cargandoAdjuntos = signal<boolean>(false);
  readonly mostrarModalGaleria = signal<boolean>(false);
  readonly fotoSeleccionada = signal<string | null>(null);

  // Modal para perfil del cliente (TK201)
  readonly mostrarModalPerfil = signal<boolean>(false);

  private socketSub: Subscription | null = null;

  ngOnInit(): void {
    const user = this.authService.getUserFromToken();
    if (user) {
      const full = `${user.nombre || ''} ${user.apellido || ''}`.trim();
      this.userName.set(full || user.email || 'Cliente');
    }
    this.cargarOrdenesCliente();
    this.cargarVehiculosCliente();
    this.cargarTurnosCliente();
    this.iniciarWebSocket();
  }

  cambiarTab(tab: 'ordenes' | 'vehiculos' | 'turnos'): void {
    this.tabActivo.set(tab);
    if (tab === 'turnos') {
      this.cargarTurnosCliente();
    }
    this.iniciarWebSocket();
  }

  iniciarWebSocket(): void {
    this.webSocketService.conectar();
    this.socketSub = this.webSocketService.escucharEvento<{ orden_id: string; estado: string; nuevo_estado?: string }>('orden_actualizada').subscribe({
      next: (payload) => {
        if (!payload || !payload.orden_id) return;
        const targetState = payload.nuevo_estado || payload.estado;
        if (!targetState) return;

        // Actualizar reactivamente la lista de órdenes
        this.listaOrdenes.update(actuales =>
          actuales.map(ot => ot.id === payload.orden_id ? { ...ot, estado: targetState } : ot)
        );

        // Si la modal de historial está abierta para esta OT, refrescar el historial
        const sel = this.ordenSeleccionada();
        if (sel && sel.id === payload.orden_id) {
          this.verHistorialOT({ ...sel, estado: targetState });
        }
      }
    });
  }

  cargarOrdenesCliente(): void {
    this.cargando.set(true);
    this.errorMessage.set(null);

    this.ordenService.obtenerOrdenes({}, 1, 50).subscribe({
      next: (res) => {
        this.listaOrdenes.set(res.results || []);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar órdenes en Portal del Cliente:', err);
        this.errorMessage.set('No se pudieron obtener tus órdenes de trabajo. Por favor, verifica tu conexión.');
        this.cargando.set(false);
      }
    });
  }

  cargarVehiculosCliente(): void {
    this.cargandoVehiculos.set(true);
    this.vehiculoService.getVehiculos().subscribe({
      next: (res) => {
        this.listaVehiculos.set(res || []);
        this.cargandoVehiculos.set(false);
      },
      error: (err) => {
        console.error('Error al cargar vehículos en Portal del Cliente:', err);
        this.cargandoVehiculos.set(false);
      }
    });
  }

  getPorcentajeDesgaste(maint: MantenimientoProgramadoResponse, vehiculo: VehiculoResponse): number {
    const actual = vehiculo.kilometraje_actual || vehiculo.kilometraje || 0;
    const objetivo = maint.kilometraje_objetivo;
    if (objetivo <= 0) return 0;
    const pct = (actual / objetivo) * 100;
    return Math.min(Math.max(pct, 0), 100);
  }

  getAlertaClase(maint: MantenimientoProgramadoResponse, vehiculo: VehiculoResponse): { text: string, bg: string, bar: string } {
    const actual = vehiculo.kilometraje_actual || vehiculo.kilometraje || 0;
    const objetivo = maint.kilometraje_objetivo;
    const restante = objetivo - actual;

    if (restante <= 500 || maint.completado) {
      // Completado o con menos de 500 km restantes (Crítico / Vencido)
      if (maint.completado) {
        return {
          text: 'text-emerald-400 border-emerald-500/30',
          bg: 'bg-emerald-500/10',
          bar: 'bg-emerald-500'
        };
      }
      return {
        text: 'text-rose-400 border-rose-500/30',
        bg: 'bg-rose-500/10',
        bar: 'bg-rose-500'
      };
    } else if (restante <= 2000) {
      return {
        text: 'text-amber-400 border-amber-500/30',
        bg: 'bg-amber-500/10',
        bar: 'bg-amber-500'
      };
    } else {
      return {
        text: 'text-emerald-400 border-emerald-500/30',
        bg: 'bg-emerald-500/10',
        bar: 'bg-emerald-500'
      };
    }
  }

  getKilometrosRestantes(maint: MantenimientoProgramadoResponse, vehiculo: VehiculoResponse): number {
    const actual = vehiculo.kilometraje_actual || vehiculo.kilometraje || 0;
    const objetivo = maint.kilometraje_objetivo;
    return Math.max(objetivo - actual, 0);
  }

  verHistorialOT(orden: OrdenResponse): void {
    this.ordenSeleccionada.set(orden);
    this.mostrarModalHistorial.set(true);
    this.cargandoHistorial.set(true);
    this.historialDatos.set(null);

    this.ordenService.obtenerEstadoHistorial(orden.id).subscribe({
      next: (res) => {
        this.historialDatos.set(res);
        this.cargandoHistorial.set(false);
      },
      error: (err) => {
        console.error('Error al obtener historial de OT:', err);
        this.cargandoHistorial.set(false);
      }
    });
  }

  cerrarModalHistorial(): void {
    this.mostrarModalHistorial.set(false);
    this.ordenSeleccionada.set(null);
    this.historialDatos.set(null);
  }

  verFotosDiagnostico(orden: OrdenResponse): void {
    this.ordenSeleccionada.set(orden);
    this.mostrarModalGaleria.set(true);
    this.cargandoAdjuntos.set(true);
    this.adjuntosOT.set([]);

    this.ordenService.obtenerAdjuntosDiagnostico(orden.id).subscribe({
      next: (res) => {
        this.adjuntosOT.set(res || []);
        this.cargandoAdjuntos.set(false);
      },
      error: (err) => {
        console.error('Error al cargar fotos de diagnóstico:', err);
        this.adjuntosOT.set([]);
        this.cargandoAdjuntos.set(false);
      }
    });
  }

  cerrarModalGaleria(): void {
    this.mostrarModalGaleria.set(false);
    this.fotoSeleccionada.set(null);
  }

  ampliarFoto(url: string): void {
    this.fotoSeleccionada.set(url);
  }

  cerrarVisorAmpliado(): void {
    this.fotoSeleccionada.set(null);
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'ingresado':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/40';
      case 'en_presupuesto':
        return 'bg-[#FFCC00]/20 text-[#FFCC00] border border-[#FFCC00]/40';
      case 'aprobado':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      case 'en_proceso':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/40';
      case 'finalizado':
        return 'bg-green-500/20 text-green-400 border border-green-500/40';
      case 'rechazado':
        return 'bg-red-500/20 text-red-400 border border-red-500/40';
      default:
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  }

  getEstadoDisplay(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'ingresado': return 'Ingresado';
      case 'en_presupuesto': return 'En Presupuesto';
      case 'aprobado': return 'Aprobado';
      case 'en_proceso': return 'En Proceso';
      case 'finalizado': return 'Finalizado';
      case 'rechazado': return 'Rechazado';
      default: return estado || 'N/A';
    }
  }

  cargarTurnosCliente(): void {
    this.cargandoTurnos.set(true);
    this.turnoService.obtenerTurnos().subscribe({
      next: (res) => {
        this.listaTurnos.set(res || []);
        this.cargandoTurnos.set(false);
      },
      error: (err) => {
        console.error('Error al cargar turnos del cliente:', err);
        this.cargandoTurnos.set(false);
      }
    });
  }

  abrirModalReserva(vehiculoIdDefault?: string): void {
    const vehiculos = this.listaVehiculos();
    const defaultId = vehiculoIdDefault || (vehiculos.length > 0 ? vehiculos[0].id : '');
    this.vehiculoIdReserva.set(defaultId);
    this.fechaHoraReserva.set('');
    this.motivoReserva.set('');
    this.errorReserva.set(null);
    this.exitoReserva.set(null);
    this.warningOverbooking.set(false);
    this.mostrarModalReserva.set(true);
  }

  cerrarModalReserva(): void {
    this.mostrarModalReserva.set(false);
    this.errorReserva.set(null);
    this.exitoReserva.set(null);
    this.warningOverbooking.set(false);
  }

  confirmarReservaTurno(): void {
    const vehiculo = this.vehiculoIdReserva();
    const fechaHora = this.fechaHoraReserva();
    const motivo = this.motivoReserva().trim();

    if (!vehiculo) {
      this.errorReserva.set('Debes seleccionar un vehículo para el turno.');
      return;
    }
    if (!fechaHora) {
      this.errorReserva.set('Debes seleccionar la fecha y hora del turno.');
      return;
    }
    if (!motivo) {
      this.errorReserva.set('Debes describir el motivo o servicio requerido.');
      return;
    }

    this.cargandoReserva.set(true);
    this.errorReserva.set(null);

    const payload: TurnoPayload = {
      vehiculo,
      fecha_hora: new Date(fechaHora).toISOString(),
      motivo
    };

    this.turnoService.crearTurno(payload).subscribe({
      next: (res) => {
        this.cargandoReserva.set(false);
        this.exitoReserva.set('¡Tu turno ha sido reservado correctamente!');
        this.cargarTurnosCliente();
        setTimeout(() => {
          this.cerrarModalReserva();
        }, 1500);
      },
      error: (err) => {
        this.cargandoReserva.set(false);
        if (err.error?.warning_overbooking) {
          this.warningOverbooking.set(true);
          this.errorReserva.set(err.error?.detail || 'Capacidad completa para esta fecha. Por favor, selecciona otro horario o día.');
        } else if (err.error?.fecha_hora) {
          this.errorReserva.set(Array.isArray(err.error.fecha_hora) ? err.error.fecha_hora[0] : err.error.fecha_hora);
        } else if (err.error?.vehiculo) {
          this.errorReserva.set(Array.isArray(err.error.vehiculo) ? err.error.vehiculo[0] : err.error.vehiculo);
        } else {
          this.errorReserva.set(err.error?.detail || 'No se pudo reservar el turno. Por favor, reintenta.');
        }
      }
    });
  }

  getTurnoBadgeClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
        return 'bg-[#FFCC00]/20 text-[#FFCC00] border border-[#FFCC00]/40';
      case 'completado':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      case 'cancelado':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/40';
      default:
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  }

  getTurnoDisplay(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return 'Pendiente';
      case 'completado': return 'Completado';
      case 'cancelado': return 'Cancelado';
      default: return estado || 'N/A';
    }
  }

  abrirModalPerfil(): void {
    this.mostrarModalPerfil.set(true);
  }

  cerrarModalPerfil(): void {
    this.mostrarModalPerfil.set(false);
    const user = this.authService.getUserFromToken();
    if (user) {
      const full = `${user.nombre || ''} ${user.apellido || ''}`.trim();
      this.userName.set(full || user.email || 'Cliente');
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/autenticacion']);
  }

  ngOnDestroy(): void {
    if (this.socketSub) {
      this.socketSub.unsubscribe();
    }
    this.webSocketService.desconectar();
  }
}
