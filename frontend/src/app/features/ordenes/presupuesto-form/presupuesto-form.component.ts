import { Component, Input, Output, EventEmitter, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdenService, ItemPresupuesto } from '../../../core/services/orden.service';

export interface SugerenciaItem {
  tipo: 'mano_de_obra' | 'repuesto';
  descripcion: string;
  precioSugerido: number;
  categoria?: string;
}

export const CATALOGO_SERVICIOS_FRECUENTES: SugerenciaItem[] = [
  // Mano de Obra
  { tipo: 'mano_de_obra', descripcion: 'Cambio de Aceite y Filtro de Motor', precioSugerido: 18000, categoria: 'Service' },
  { tipo: 'mano_de_obra', descripcion: 'Service Completo (Aceite, Filtros y Fluidos)', precioSugerido: 35000, categoria: 'Service' },
  { tipo: 'mano_de_obra', descripcion: 'Reemplazo de Pastillas de Freno Delanteras', precioSugerido: 22000, categoria: 'Frenos' },
  { tipo: 'mano_de_obra', descripcion: 'Reemplazo de Discos y Pastillas de Freno', precioSugerido: 38000, categoria: 'Frenos' },
  { tipo: 'mano_de_obra', descripcion: 'Cambio de Kit de Distribución y Bomba de Agua', precioSugerido: 85000, categoria: 'Motor' },
  { tipo: 'mano_de_obra', descripcion: 'Alineación y Balanceo (4 Ruedas)', precioSugerido: 25000, categoria: 'Tren Delantero' },
  { tipo: 'mano_de_obra', descripcion: 'Reparación de Tren Delantero y Bujes', precioSugerido: 45000, categoria: 'Tren Delantero' },
  { tipo: 'mano_de_obra', descripcion: 'Cambio de Amortiguadores Delanteros', precioSugerido: 40000, categoria: 'Suspensión' },
  { tipo: 'mano_de_obra', descripcion: 'Diagnóstico Computarizado y Scanner OBD-II', precioSugerido: 20000, categoria: 'Diagnóstico' },
  { tipo: 'mano_de_obra', descripcion: 'Limpieza y Calibración de Inyectores', precioSugerido: 32000, categoria: 'Inyección' },
  { tipo: 'mano_de_obra', descripcion: 'Revisión y Recarga de Aire Acondicionado', precioSugerido: 35000, categoria: 'Climatización' },
  { tipo: 'mano_de_obra', descripcion: 'Cambio de Embrague / Placa y Disco', precioSugerido: 95000, categoria: 'Transmisión' },

  // Repuestos
  { tipo: 'repuesto', descripcion: 'Filtro de Aceite Mann Filter', precioSugerido: 12000, categoria: 'Filtros' },
  { tipo: 'repuesto', descripcion: 'Filtro de Aire de Motor', precioSugerido: 14000, categoria: 'Filtros' },
  { tipo: 'repuesto', descripcion: 'Filtro de Combustible Nafta/Diesel', precioSugerido: 18000, categoria: 'Filtros' },
  { tipo: 'repuesto', descripcion: 'Filtro de Habitáculo / Polen', precioSugerido: 11000, categoria: 'Filtros' },
  { tipo: 'repuesto', descripcion: 'Aceite Sintético 5W30 (Bidón 4L)', precioSugerido: 45000, categoria: 'Lubricantes' },
  { tipo: 'repuesto', descripcion: 'Aceite Semi-Sintético 10W40 (Bidón 4L)', precioSugerido: 38000, categoria: 'Lubricantes' },
  { tipo: 'repuesto', descripcion: 'Juego de Pastillas de Freno Delanteras Bosch', precioSugerido: 34000, categoria: 'Frenos' },
  { tipo: 'repuesto', descripcion: 'Juego de Discos de Freno Ventilados', precioSugerido: 62000, categoria: 'Frenos' },
  { tipo: 'repuesto', descripcion: 'Kit de Distribución (Correa + Tensor Gates/Ina)', precioSugerido: 78000, categoria: 'Motor' },
  { tipo: 'repuesto', descripcion: 'Bomba de Agua Dolz / SKF', precioSugerido: 36000, categoria: 'Motor' },
  { tipo: 'repuesto', descripcion: 'Batería 12V 65Ah Moura / Willard', precioSugerido: 95000, categoria: 'Eléctrico' },
  { tipo: 'repuesto', descripcion: 'Juego de Bujías de Encendido NGK (x4)', precioSugerido: 26000, categoria: 'Encendido' },
  { tipo: 'repuesto', descripcion: 'Líquido Refrigerante Orgánico Concentrado 1L', precioSugerido: 9000, categoria: 'Fluidos' },
  { tipo: 'repuesto', descripcion: 'Líquido de Frenos DOT4 (500ml)', precioSugerido: 8500, categoria: 'Fluidos' }
];

@Component({
  selector: 'app-presupuesto-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './presupuesto-form.component.html',
  styleUrls: ['./presupuesto-form.component.css']
})
export class PresupuestoFormComponent implements OnInit {
  @Input({ required: true }) ordenId!: string;
  @Input() modoEjecucion: boolean = false; // true = Checklist de 'En Proceso', false = Carga de 'Presupuesto'
  @Output() totalActualizado = new EventEmitter<number>();
  @Output() itemsActualizados = new EventEmitter<ItemPresupuesto[]>();

  private readonly ordenService = inject(OrdenService);

  // Estado con Signals de Angular
  items = signal<ItemPresupuesto[]>([]);
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Formulario de nuevo ítem
  nuevoTipo = signal<'mano_de_obra' | 'repuesto'>('repuesto');
  nuevaDescripcion = signal<string>('');
  nuevaCantidad = signal<number>(1);
  nuevoPrecioUnitario = signal<number | null>(null);

  // Autocompletado Predictivo (TK104)
  readonly mostrarSugerencias = signal<boolean>(false);
  readonly indiceSugerenciaSeleccionada = signal<number>(-1);

  readonly sugerenciasFiltradas = computed(() => {
    const tipoActivo = this.nuevoTipo();
    const texto = this.nuevaDescripcion().trim().toLowerCase();
    const catalogo = CATALOGO_SERVICIOS_FRECUENTES.filter(s => s.tipo === tipoActivo);

    if (!texto) {
      return catalogo.slice(0, 6);
    }

    return catalogo
      .filter(s => s.descripcion.toLowerCase().includes(texto) || (s.categoria && s.categoria.toLowerCase().includes(texto)))
      .slice(0, 8);
  });

  // Computados
  subtotalNuevoItem = computed(() => {
    const cant = this.nuevaCantidad() || 0;
    const precio = this.nuevoPrecioUnitario() || 0;
    return cant * precio;
  });

  montoTotal = computed(() => {
    return this.items().reduce((acc, item) => acc + (Number(item.subtotal) || (item.cantidad * item.precio_unitario)), 0);
  });

  totalTareas = computed(() => this.items().length);

  tareasCompletadas = computed(() => this.items().filter(i => i.completado).length);

  porcentajeProgreso = computed(() => {
    const total = this.totalTareas();
    if (total === 0) return 0;
    return Math.round((this.tareasCompletadas() / total) * 100);
  });

  ngOnInit(): void {
    if (this.ordenId) {
      this.cargarItems();
    }
  }

  cargarItems(): void {
    this.cargando.set(true);
    this.errorMessage.set('');
    this.ordenService.obtenerItemsPresupuesto(this.ordenId).subscribe({
      next: (data) => {
        this.items.set(data);
        this.cargando.set(false);
        this.totalActualizado.emit(this.montoTotal());
        this.itemsActualizados.emit(this.items());
      },
      error: (err) => {
        this.errorMessage.set('Error al cargar los ítems del presupuesto.');
        this.cargando.set(false);
      }
    });
  }

  agregarItem(): void {
    const desc = this.nuevaDescripcion().trim();
    const cant = this.nuevaCantidad();
    const precio = this.nuevoPrecioUnitario();

    if (!desc) {
      this.errorMessage.set('Debe ingresar una descripción para el ítem.');
      return;
    }
    if (!cant || cant <= 0) {
      this.errorMessage.set('La cantidad debe ser mayor a cero.');
      return;
    }
    if (precio === null || precio <= 0) {
      this.errorMessage.set('El precio unitario debe ser mayor a cero.');
      return;
    }

    this.guardando.set(true);
    this.errorMessage.set('');

    const payload = {
      descripcion: desc,
      cantidad: cant,
      precio_unitario: precio
    };

    const peticion = this.nuevoTipo() === 'mano_de_obra'
      ? this.ordenService.agregarManoDeObra(this.ordenId, payload)
      : this.ordenService.agregarRepuesto(this.ordenId, payload);

    peticion.subscribe({
      next: (itemCreado) => {
        this.items.update(prev => [...prev, itemCreado]);
        this.limpiarFormularioNuevo();
        this.guardando.set(false);
        this.successMessage.set('Ítem agregado exitosamente.');
        this.totalActualizado.emit(this.montoTotal());
        this.itemsActualizados.emit(this.items());
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Error al agregar el ítem.');
        this.guardando.set(false);
      }
    });
  }

  toggleCompletado(item: ItemPresupuesto): void {
    if (!item.id) return;
    const nuevoEstado = !item.completado;

    // Actualización optimista local
    this.items.update(list => list.map(i => i.id === item.id ? { ...i, completado: nuevoEstado } : i));
    this.itemsActualizados.emit(this.items());

    this.ordenService.marcarItemCompletado(this.ordenId, item.id, nuevoEstado).subscribe({
      error: () => {
        // Revertir en caso de error
        this.items.update(list => list.map(i => i.id === item.id ? { ...i, completado: !nuevoEstado } : i));
        this.itemsActualizados.emit(this.items());
        this.errorMessage.set('Error al actualizar el estado de la tarea.');
      }
    });
  }

  eliminarItem(item: ItemPresupuesto): void {
    if (!item.id) return;

    this.ordenService.eliminarItemPresupuesto(this.ordenId, item.id).subscribe({
      next: (res) => {
        this.items.update(list => list.filter(i => String(i.id) !== String(item.id)));
        const nuevoTotal = typeof res?.monto_total === 'number' ? res.monto_total : this.montoTotal();
        this.totalActualizado.emit(nuevoTotal);
        this.itemsActualizados.emit(this.items());
        this.successMessage.set('Ítem eliminado.');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.errorMessage.set('Error al eliminar el ítem del presupuesto.');
      }
    });
  }

  seleccionarSugerencia(sug: SugerenciaItem): void {
    this.nuevaDescripcion.set(sug.descripcion);
    if (this.nuevoPrecioUnitario() === null || this.nuevoPrecioUnitario() === 0) {
      this.nuevoPrecioUnitario.set(sug.precioSugerido);
    }
    this.mostrarSugerencias.set(false);
    this.indiceSugerenciaSeleccionada.set(-1);
  }

  onDescripcionFocus(): void {
    this.mostrarSugerencias.set(true);
  }

  onDescripcionBlur(): void {
    // Timeout para permitir el evento mousedown/click en el panel de sugerencias
    setTimeout(() => {
      this.mostrarSugerencias.set(false);
      this.indiceSugerenciaSeleccionada.set(-1);
    }, 200);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.mostrarSugerencias()) return;

    const lista = this.sugerenciasFiltradas();
    if (lista.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = (this.indiceSugerenciaSeleccionada() + 1) % lista.length;
      this.indiceSugerenciaSeleccionada.set(nextIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = (this.indiceSugerenciaSeleccionada() - 1 + lista.length) % lista.length;
      this.indiceSugerenciaSeleccionada.set(prevIndex);
    } else if (event.key === 'Enter' && this.indiceSugerenciaSeleccionada() >= 0) {
      event.preventDefault();
      const itemSeleccionado = lista[this.indiceSugerenciaSeleccionada()];
      if (itemSeleccionado) {
        this.seleccionarSugerencia(itemSeleccionado);
      }
    } else if (event.key === 'Escape') {
      this.mostrarSugerencias.set(false);
      this.indiceSugerenciaSeleccionada.set(-1);
    }
  }

  private limpiarFormularioNuevo(): void {
    this.nuevaDescripcion.set('');
    this.nuevaCantidad.set(1);
    this.nuevoPrecioUnitario.set(null);
    this.mostrarSugerencias.set(false);
    this.indiceSugerenciaSeleccionada.set(-1);
  }
}
