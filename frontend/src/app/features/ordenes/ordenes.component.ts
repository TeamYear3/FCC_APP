import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { OrdenService, OrdenResponse, OrdenFiltros } from '../../core/services/orden.service';
import { OrdenEstadoModalComponent } from './orden-estado-modal/orden-estado-modal.component';
import { PageComponent } from '../../shared/components/page-component/page-component';

export interface ServiceTask {
  id: number;
  titulo: string;
  descripcion: string;
  completada: boolean;
  tiempoEstimado: string;
}

export type OrderTab = 'Detalle' | 'Servicios' | 'Repuestos' | 'Pagos' | 'Notas';

@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, OrdenEstadoModalComponent, PageComponent],
  templateUrl: './ordenes.component.html',
  styleUrl: './ordenes.component.css'
})
export class OrdenesComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly ordenService = inject(OrdenService);
  private readonly router = inject(Router);

  readonly userRole = this.authService.userRoleSignal;
  readonly isAdminView = signal<boolean>(false);
  readonly successOT = signal<string | null>(null);
  readonly nuevaOrdenUrl = signal<string>('/ordenes/nueva');

  // Control del modal de estado (TK036)
  readonly mostrarModalEstado = signal<boolean>(false);
  readonly ordenSeleccionadaEstado = signal<OrdenResponse | null>(null);

  // Filtros Avanzados (TK056)
  readonly busqueda = signal<string>('');
  readonly estadoFiltro = signal<string>('todos');
  readonly fechaDesde = signal<string>('');
  readonly fechaHasta = signal<string>('');

  // Estado de lista paginada
  readonly listaOrdenes = signal<OrdenResponse[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly paginaActual = signal<number>(1);
  readonly totalPaginas = signal<number>(1);
  readonly totalItems = signal<number>(0);


  ngOnInit(): void {
    const isAdmin = this.router.url.startsWith('/admin');
    this.isAdminView.set(isAdmin);
    this.nuevaOrdenUrl.set(isAdmin ? '/admin/ordenes/nueva' : '/ordenes/nueva');
    
    if (typeof window !== 'undefined' && window.history.state?.successOT) {
      this.successOT.set(window.history.state.successOT);
      window.history.replaceState({}, '', isAdmin ? '/admin/ordenes' : '/ordenes');
    }
    this.cargarOrdenes(1);
  }

  cargarOrdenes(page: number = 1): void {
    this.cargando.set(true);
    const busq = this.busqueda().trim();
    const filtros: OrdenFiltros = {
      patente: busq,
      cliente: busq,
      estado: this.estadoFiltro(),
      fecha_desde: this.fechaDesde(),
      fecha_hasta: this.fechaHasta()
    };

    this.ordenService.obtenerOrdenes(filtros, page, 10).subscribe({
      next: (res) => {
        this.listaOrdenes.set(res.results || []);
        this.paginaActual.set(res.current_page || 1);
        this.totalPaginas.set(res.total_pages || 1);
        this.totalItems.set(res.total_items || 0);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar órdenes:', err);
        this.cargando.set(false);
      }
    });
  }

  onFiltroChange(): void {
    this.cargarOrdenes(1);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.estadoFiltro.set('todos');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.cargarOrdenes(1);
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas()) {
      this.cargarOrdenes(nuevaPagina);
    }
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
      case 'entregado':
        return 'bg-zinc-700/50 text-zinc-300 border border-zinc-600';
      case 'cancelado':
        return 'bg-red-500/20 text-red-400 border border-red-500/40';
      default:
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  }

  readonly activeTab = signal<OrderTab>('Servicios');
  readonly tabs: OrderTab[] = ['Detalle', 'Servicios', 'Repuestos', 'Pagos', 'Notas'];

  readonly tareasServicio = signal<ServiceTask[]>([
    {
      id: 1,
      titulo: 'Inspección de niveles de fluidos y escaneo ECU',
      descripcion: 'Verificar presión de aceite, líquido refrigerante y códigos de falla OBD2.',
      completada: true,
      tiempoEstimado: '30 min'
    },
    {
      id: 2,
      titulo: 'Reemplazo de pastillas de freno delanteras y rectificado',
      descripcion: 'Desmontaje de mordazas, sustitución por juego original y purga de líquido de frenos.',
      completada: true,
      tiempoEstimado: '1 h 15 min'
    },
    {
      id: 3,
      titulo: 'Alineación computarizada 3D y balanceo dinámico de 4 ruedas',
      descripcion: 'Ajuste de ángulos de avance, comba y convergencia según especificación de fábrica.',
      completada: false,
      tiempoEstimado: '45 min'
    },
    {
      id: 4,
      titulo: 'Control final de calidad y prueba de rodaje en pista',
      descripcion: 'Verificación de ruidos, respuesta en frenada y sellado general del vehículo.',
      completada: false,
      tiempoEstimado: '20 min'
    }
  ]);

  setTab(tab: OrderTab): void {
    this.activeTab.set(tab);
  }

  toggleTask(id: number): void {
    this.tareasServicio.update(tasks =>
      tasks.map(t => t.id === id ? { ...t, completada: !t.completada } : t)
    );
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/autenticacion']);
  }

  abrirModalEstado(orden: OrdenResponse): void {
    this.ordenSeleccionadaEstado.set(orden);
    this.mostrarModalEstado.set(true);
  }

  onEstadoActualizado(): void {
    this.cargarOrdenes(this.paginaActual());
  }
}

