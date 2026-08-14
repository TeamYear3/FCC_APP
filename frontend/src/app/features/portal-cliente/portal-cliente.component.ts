import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { OrdenService, OrdenResponse, OrdenHistorialResponse } from '../../core/services/orden.service';
import { WebSocketService } from '../../core/services/websocket.service';

@Component({
  selector: 'app-portal-cliente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-cliente.component.html',
  styleUrl: './portal-cliente.component.css'
})
export class PortalClienteComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly ordenService = inject(OrdenService);
  readonly webSocketService = inject(WebSocketService);
  private readonly router = inject(Router);

  readonly userRole = this.authService.userRoleSignal;
  readonly userName = signal<string>('');
  readonly estadoSocket = this.webSocketService.estadoConexion;

  readonly listaOrdenes = signal<OrdenResponse[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Modal para consultar historial de la OT seleccionada
  readonly ordenSeleccionada = signal<OrdenResponse | null>(null);
  readonly historialDatos = signal<OrdenHistorialResponse | null>(null);
  readonly cargandoHistorial = signal<boolean>(false);
  readonly mostrarModalHistorial = signal<boolean>(false);

  private socketSub: Subscription | null = null;

  ngOnInit(): void {
    const user = this.authService.getUserFromToken();
    if (user) {
      const full = `${user.nombre || ''} ${user.apellido || ''}`.trim();
      this.userName.set(full || user.email || 'Cliente');
    }
    this.cargarOrdenesCliente();
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
