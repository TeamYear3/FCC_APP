import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { OrdenService, OrdenResponse, OrdenFiltros, ItemPresupuesto } from '../../core/services/orden.service';
import { environment } from '../../../environments/environment';
import { OrdenEstadoModalComponent } from './orden-estado-modal/orden-estado-modal.component';
import { DiagnosticoFotosComponent } from './diagnostico-fotos/diagnostico-fotos.component';
import { PresupuestoFormComponent } from './presupuesto-form/presupuesto-form.component';
import { PageComponent } from '../../shared/components/page-component/page-component';

export type OrderTab = 'Resumen' | 'Carga de Mano de Obra y Repuestos' | 'Imágenes';

@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    OrdenEstadoModalComponent,
    DiagnosticoFotosComponent,
    PresupuestoFormComponent,
    PageComponent
  ],
  templateUrl: './ordenes.component.html',
  styleUrl: './ordenes.component.css'
})
export class OrdenesComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly ordenService = inject(OrdenService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly userRole = this.authService.userRoleSignal;
  readonly isAdminView = signal<boolean>(false);
  readonly successOT = signal<string | null>(null);
  readonly nuevaOrdenUrl = signal<string>('/ordenes/nueva');

  // Control del modal de estado (TK036)
  readonly mostrarModalEstado = signal<boolean>(false);
  readonly ordenSeleccionadaEstado = signal<OrdenResponse | null>(null);

  // Filtros Avanzados (TK056 / TK119)
  readonly busqueda = signal<string>('');
  readonly estadoFiltro = signal<string>('todos');
  readonly complejidadFiltro = signal<string>('todas');
  readonly fechaDesde = signal<string>('');
  readonly fechaHasta = signal<string>('');

  // Estado de lista paginada y orden activa (TK120)
  readonly listaOrdenes = signal<OrdenResponse[]>([]);
  readonly ordenSeleccionada = signal<OrdenResponse | null>(null);
  readonly otQueryParam = signal<string | null>(null);

  readonly ordenActiva = computed<OrdenResponse | null>(() => {
    const sel = this.ordenSeleccionada();
    if (sel) return sel;
    const lista = this.listaOrdenes();
    return lista.length > 0 ? lista[0] : null;
  });

  readonly cargando = signal<boolean>(false);
  readonly paginaActual = signal<number>(1);
  readonly totalPaginas = signal<number>(1);
  readonly totalItems = signal<number>(0);

  get ordenIdActiva(): string {
    return this.ordenActiva()?.id || '';
  }
  ngOnInit(): void {
    const isAdmin = this.router.url.startsWith('/admin');
    this.isAdminView.set(isAdmin);
    this.nuevaOrdenUrl.set(isAdmin ? '/admin/ordenes/nueva' : '/ordenes/nueva');
    
    if (typeof window !== 'undefined' && window.history.state?.successOT) {
      this.successOT.set(window.history.state.successOT);
      window.history.replaceState({}, '', isAdmin ? '/admin/ordenes' : '/ordenes');
    }

    this.route.queryParams.subscribe(params => {
      const targetOt = params['ot'] || params['id'];
      if (targetOt) {
        this.otQueryParam.set(targetOt);
      }
      const targetBusqueda = params['busqueda'];
      if (targetBusqueda) {
        this.busqueda.set(targetBusqueda);
      }
      this.cargarOrdenes(1, targetOt, targetBusqueda);
    });
  }

  cargarOrdenes(page: number = 1, targetId?: string, targetBusqueda?: string): void {
    this.cargando.set(true);
    const busq = this.busqueda().trim();
    const filtros: OrdenFiltros = {
      busqueda: busq,
      estado: this.estadoFiltro(),
      complejidad: this.complejidadFiltro(),
      fecha_desde: this.fechaDesde(),
      fecha_hasta: this.fechaHasta()
    };

    this.ordenService.obtenerOrdenes(filtros, page, 10).subscribe({
      next: (res) => {
        const ordenes = res.results || [];
        this.listaOrdenes.set(ordenes);
        this.paginaActual.set(res.current_page || 1);
        this.totalPaginas.set(res.total_pages || 1);
        this.totalItems.set(res.total_items || 0);

        if (targetId) {
          const enc = ordenes.find((o: OrdenResponse) => String(o.id) === String(targetId) || o.numero_ot === targetId);
          if (enc) this.ordenSeleccionada.set(enc);
        } else if (targetBusqueda) {
          const enc = ordenes.find((o: OrdenResponse) => 
            (o.numero_ot && o.numero_ot.toLowerCase().includes(targetBusqueda.toLowerCase())) ||
            String(o.id) === String(targetBusqueda)
          );
          if (enc) this.ordenSeleccionada.set(enc);
        } else if (ordenes.length > 0 && (!this.ordenSeleccionada() || !ordenes.some((r: OrdenResponse) => r.id === this.ordenSeleccionada()?.id))) {
          this.ordenSeleccionada.set(ordenes[0]);
        }
        this.cargando.set(false);

        // Auto-selección por query param o preservar selección previa
        const targetOt = this.otQueryParam();
        if (targetOt && ordenes.length > 0) {
          const encontrada = ordenes.find(o => o.id === targetOt || o.numero_ot === targetOt);
          if (encontrada) {
            this.ordenSeleccionada.set(encontrada);
            this.cargarItemsDeOrden(encontrada.id);
          }
        } else if (this.ordenSeleccionada()) {
          const sigueExistiendo = ordenes.find(o => o.id === this.ordenSeleccionada()?.id);
          if (sigueExistiendo) {
            this.ordenSeleccionada.set(sigueExistiendo);
            this.cargarItemsDeOrden(sigueExistiendo.id);
          }
        } else if (ordenes.length > 0) {
          this.cargarItemsDeOrden(ordenes[0].id);
        }
      },
      error: (err) => {
        console.error('Error al cargar órdenes:', err);
        this.cargando.set(false);
      }
    });
  }

  seleccionarOrden(orden: OrdenResponse, scrollToExpediente: boolean = false): void {
    this.ordenSeleccionada.set(orden);
    this.cargarItemsDeOrden(orden.id);
    if (scrollToExpediente && typeof document !== 'undefined') {
      const elem = document.getElementById('expediente-activo');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  imprimirOT(orden?: OrdenResponse | null): void {
    const target = orden || this.ordenActiva();
    if (!target) return;
    this.ordenService.descargarOrdenPDF(target.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Orden_Trabajo_${target.numero_ot || target.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar PDF de la orden:', err);
        alert('No se pudo generar el PDF de la orden de trabajo.');
      }
    });
  }

  obtenerClaseEstado(estado?: string | null): string {
    const e = (estado || '').toLowerCase().trim();
    switch (e) {
      case 'en_proceso':
      case 'en proceso':
        return 'bg-color-primary-accent text-black';
      case 'en_revision':
      case 'en revisión':
      case 'aprobado':
      case 'entregado':
        return 'bg-color-status-review text-white';
      case 'facturado':
      case 'facturado arca':
      case 'finalizado':
        return 'bg-color-status-pending text-white';
      case 'en_presupuesto':
      case 'en presupuesto':
        return 'bg-color-status-process text-black';
      case 'ingresado':
      default:
        return 'bg-zinc-700 text-white';
    }
  }

  obtenerTextoEstado(estado?: string | null): string {
    const e = (estado || '').toLowerCase().trim();
    switch (e) {
      case 'en_proceso':
      case 'en proceso':
        return 'En Proceso';
      case 'en_revision':
      case 'en revisión':
        return 'En Revisión';
      case 'aprobado':
        return 'Aprobado';
      case 'facturado':
      case 'facturado arca':
        return 'Facturado ARCA';
      case 'finalizado':
        return 'Finalizado';
      case 'en_presupuesto':
      case 'en presupuesto':
        return 'En Presupuesto';
      case 'ingresado':
        return 'Ingresado';
      case 'en_pausa':
      case 'en pausa':
        return 'En Pausa';
      case 'cancelado':
        return 'Cancelado';
      case 'entregado':
        return 'Entregado';
      default:
        return estado || 'Sin Estado';
    }
  }

  onFiltroChange(): void {
    this.cargarOrdenes(1);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.estadoFiltro.set('todos');
    this.complejidadFiltro.set('todas');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.cargarOrdenes(1);
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas()) {
      this.cargarOrdenes(nuevaPagina);
    }
  }

  pausarOReanudarOrden(orden: OrdenResponse): void {
    if (orden.estado === 'en_proceso') {
      const motivo = prompt('Ingrese el motivo del pausado de la orden (ej: Espera de repuestos / Rectificadora):');
      if (motivo !== null) {
        this.ordenService.actualizarEstado(orden.id, 'en_pausa', motivo || 'Pausado temporal en taller').subscribe({
          next: () => this.cargarOrdenes(this.paginaActual()),
          error: (err) => console.error('Error al pausar la orden:', err)
        });
      }
    } else if (orden.estado === 'en_pausa') {
      this.ordenService.actualizarEstado(orden.id, 'en_proceso', 'Reanudación de trabajos en taller').subscribe({
        next: () => this.cargarOrdenes(this.paginaActual()),
        error: (err) => console.error('Error al reanudar la orden:', err)
      });
    }
  }

  getComplejidadBadgeClass(complejidad?: string): string {
    switch (complejidad?.toLowerCase()) {
      case 'baja':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'media':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'alta':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
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
      case 'en_pausa':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
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

  readonly activeTab = signal<OrderTab>('Resumen');
  readonly tabs: OrderTab[] = ['Resumen', 'Carga de Mano de Obra y Repuestos', 'Imágenes'];

  // Ítems reales del presupuesto (servicios y repuestos)
  readonly itemsPresupuesto = signal<ItemPresupuesto[]>([]);
  readonly cargandoItems = signal<boolean>(false);

  readonly serviciosRealizados = computed<ItemPresupuesto[]>(() => {
    return this.itemsPresupuesto().filter(i => i.tipo === 'mano_de_obra');
  });

  readonly repuestosUtilizados = computed<ItemPresupuesto[]>(() => {
    return this.itemsPresupuesto().filter(i => i.tipo === 'repuesto');
  });

  readonly porcentajeProgreso = computed<number>(() => {
    const servicios = this.serviciosRealizados();
    if (servicios.length === 0) {
      const est = this.ordenActiva()?.estado;
      if (est === 'finalizado' || est === 'entregado') return 100;
      if (est === 'en_proceso') return 50;
      if (est === 'aprobado') return 25;
      return 10;
    }
    const completados = servicios.filter(s => s.completado).length;
    return Math.round((completados / servicios.length) * 100);
  });

  cargarItemsDeOrden(ordenId: string): void {
    if (!ordenId) {
      this.itemsPresupuesto.set([]);
      return;
    }
    this.cargandoItems.set(true);
    this.ordenService.obtenerItemsPresupuesto(ordenId).subscribe({
      next: (items) => {
        this.itemsPresupuesto.set(items || []);
        this.cargandoItems.set(false);
      },
      error: (err) => {
        console.error('Error al cargar items de presupuesto:', err);
        this.itemsPresupuesto.set([]);
        this.cargandoItems.set(false);
      }
    });
  }

  onItemsActualizados(items: ItemPresupuesto[]): void {
    this.itemsPresupuesto.set(items || []);
    const nuevoMonto = (items || []).reduce((acc, i) => acc + (Number(i.subtotal) || (i.cantidad * i.precio_unitario)), 0);
    if (this.ordenActiva()) {
      const ordenId = this.ordenActiva()!.id;
      this.ordenSeleccionada.update(sel => sel && sel.id === ordenId ? { ...sel, monto_total: nuevoMonto } : sel);
      this.listaOrdenes.update(lista =>
        lista.map(o => o.id === ordenId ? { ...o, monto_total: nuevoMonto } : o)
      );
      this.ordenService.obtenerOrdenPorId(ordenId).subscribe({
        next: (ordenActualizada: OrdenResponse) => {
          this.ordenSeleccionada.set(ordenActualizada);
          this.listaOrdenes.update(lista =>
            lista.map(o => o.id === ordenActualizada.id ? ordenActualizada : o)
          );
        },
        error: () => {}
      });
    }
  }

  onTotalPresupuestoActualizado(nuevoTotal: number): void {
    if (this.ordenActiva()) {
      const ordenId = this.ordenActiva()!.id;
      this.ordenSeleccionada.update(sel => sel && sel.id === ordenId ? { ...sel, monto_total: nuevoTotal } : sel);
      this.listaOrdenes.update(lista =>
        lista.map(o => o.id === ordenId ? { ...o, monto_total: nuevoTotal } : o)
      );
    }
  }

  toggleCompletadoItem(item: ItemPresupuesto): void {
    if (!this.ordenActiva() || !item.id) return;
    const nuevoEstado = !item.completado;
    this.itemsPresupuesto.update(items =>
      items.map(i => i.id === item.id ? { ...i, completado: nuevoEstado } : i)
    );
    this.ordenService.marcarItemCompletado(this.ordenActiva()!.id, item.id, nuevoEstado).subscribe({
      error: () => {
        this.itemsPresupuesto.update(items =>
          items.map(i => i.id === item.id ? { ...i, completado: !nuevoEstado } : i)
        );
      }
    });
  }

  normalizarUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  finalizarOrden(): void {
    const orden = this.ordenActiva();
    if (!orden) return;
    if (!confirm(`¿Confirmas finalizar la orden #${orden.numero_ot || orden.id} y pasarla a control de calidad?`)) {
      return;
    }
    this.ordenService.actualizarEstado(orden.id, 'finalizado', 'Orden finalizada desde el expediente y lista para control').subscribe({
      next: () => {
        alert('Orden finalizada con éxito y pasada a control de calidad.');
        this.cargarOrdenes(this.paginaActual());
      },
      error: (err) => {
        console.error('Error al finalizar orden:', err);
        const msg = err.error?.error || err.error?.detail || 'No se pudo finalizar la orden. Verifica que esté en proceso.';
        alert(msg);
      }
    });
  }

  // Modal y Flujo 'Aprobar Presupuesto y Convertir en OT' (TK091)
  readonly mostrarModalAprobarPresupuesto = signal<boolean>(false);
  readonly canalAprobacion = signal<'whatsapp' | 'telefono' | 'presencial'>('whatsapp');
  readonly cargandoAprobacion = signal<boolean>(false);

  readonly ctaDinamico = computed(() => {
    const tab = this.activeTab();
    const orden = this.ordenActiva();
    const estado = (orden?.estado || '').toLowerCase();

    if (tab === 'Carga de Mano de Obra y Repuestos') {
      if (estado === 'en_presupuesto' || estado === 'ingresado' || estado === 'en presupuesto') {
        return {
          texto: 'Aprobar Presupuesto y Convertir en OT',
          icono: 'check_circle',
          tipo: 'aprobar_presupuesto',
          clase: 'bg-color-primary-accent text-black hover:bg-color-primary-accent/90'
        };
      }
      return {
        texto: 'Guardar Cambios de Presupuesto',
        icono: 'save',
        tipo: 'guardar_presupuesto',
        clase: 'bg-white/10 text-white hover:bg-white/20'
      };
    }

    if (tab === 'Imágenes') {
      return {
        texto: 'Revisar / Adjuntar Evidencias Fotográficas',
        icono: 'photo_camera',
        tipo: 'imagenes',
        clase: 'bg-white/10 text-white hover:bg-white/20'
      };
    }

    // Default 'Resumen'
    return {
      texto: 'Finalizar Orden y Pasar a Control',
      icono: 'task_alt',
      tipo: 'finalizar_orden',
      clase: 'bg-color-primary-accent text-black hover:bg-color-primary-accent/90'
    };
  });

  ejecutarCtaPrincipal(): void {
    const cta = this.ctaDinamico();
    if (cta.tipo === 'aprobar_presupuesto') {
      this.abrirModalAprobarPresupuesto();
    } else if (cta.tipo === 'finalizar_orden') {
      this.finalizarOrden();
    } else if (cta.tipo === 'guardar_presupuesto') {
      alert('Los cambios en el presupuesto fueron guardados correctamente.');
    }
  }

  abrirModalAprobarPresupuesto(): void {
    const orden = this.ordenActiva();
    if (!orden) return;
    this.canalAprobacion.set('whatsapp');
    this.mostrarModalAprobarPresupuesto.set(true);
  }

  cerrarModalAprobarPresupuesto(): void {
    this.mostrarModalAprobarPresupuesto.set(false);
  }

  setCanalAprobacion(canal: 'whatsapp' | 'telefono' | 'presencial'): void {
    this.canalAprobacion.set(canal);
  }

  confirmarAprobacionPresupuesto(): void {
    const orden = this.ordenActiva();
    if (!orden) return;

    this.cargandoAprobacion.set(true);
    const canalMap = {
      whatsapp: 'WhatsApp (Mensaje / Chat)',
      telefono: 'Llamada Telefónica',
      presencial: 'Atención Presencial en Taller'
    };
    const canalNombre = canalMap[this.canalAprobacion()] || 'WhatsApp';
    const motivo = `Aprobación registrada por el taller vía ${canalNombre}. Cotización aceptada por el cliente.`;

    this.ordenService.actualizarEstado(orden.id, 'en_proceso', motivo).subscribe({
      next: () => {
        this.cargandoAprobacion.set(false);
        this.cerrarModalAprobarPresupuesto();
        alert(`¡Presupuesto aprobado con éxito! La Orden de Trabajo #${orden.numero_ot || orden.id.slice(0, 8)} ha pasado a estado EN PROCESO.`);
        this.cargarOrdenes(this.paginaActual());
      },
      error: (err) => {
        console.error('Error al aprobar presupuesto:', err);
        this.cargandoAprobacion.set(false);
        const msg = err.error?.error || err.error?.detail || 'No se pudo actualizar el estado de la orden.';
        alert(msg);
      }
    });
  }

  setTab(tab: OrderTab): void {
    this.activeTab.set(tab);
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

