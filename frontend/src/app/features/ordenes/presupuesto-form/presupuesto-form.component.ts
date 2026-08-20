import { Component, Input, Output, EventEmitter, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdenService, ItemPresupuesto } from '../../../core/services/orden.service';

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

    this.ordenService.marcarItemCompletado(this.ordenId, item.id, nuevoEstado).subscribe({
      error: () => {
        // Revertir en caso de error
        this.items.update(list => list.map(i => i.id === item.id ? { ...i, completado: !nuevoEstado } : i));
        this.errorMessage.set('Error al actualizar el estado de la tarea.');
      }
    });
  }

  eliminarItem(item: ItemPresupuesto): void {
    if (!item.id) return;

    this.ordenService.eliminarItemPresupuesto(this.ordenId, item.id).subscribe({
      next: () => {
        this.items.update(list => list.filter(i => i.id !== item.id));
        this.totalActualizado.emit(this.montoTotal());
        this.successMessage.set('Ítem eliminado.');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.errorMessage.set('Error al eliminar el ítem del presupuesto.');
      }
    });
  }

  private limpiarFormularioNuevo(): void {
    this.nuevaDescripcion.set('');
    this.nuevaCantidad.set(1);
    this.nuevoPrecioUnitario.set(null);
  }
}
