import { Component, OnInit, forwardRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { VehiculoService, VehiculoResponse } from '../../../core/services/vehiculo.service';

@Component({
  selector: 'app-vehiculo-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VehiculoSelectorComponent),
      multi: true
    }
  ],
  templateUrl: './vehiculo-selector.component.html',
  styleUrls: []
})
export class VehiculoSelectorComponent implements OnInit, ControlValueAccessor {
  private readonly vehiculoService = inject(VehiculoService);

  readonly vehiculos = signal<VehiculoResponse[]>([]);
  readonly searchTerm = signal<string>('');
  readonly isOpen = signal<boolean>(false);
  readonly selectedVehiculo = signal<VehiculoResponse | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMsg = signal<string | null>(null);

  // Filtrado de vehículos reactivo usando computed signals
  readonly filteredVehiculos = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.vehiculos();
    if (!term) return list;

    return list.filter(
      (v) =>
        v.patente.toLowerCase().includes(term) ||
        v.marca.toLowerCase().includes(term) ||
        v.modelo.toLowerCase().includes(term)
    );
  });

  // Funciones de ControlValueAccessor
  onChange: (value: string | null) => void = () => {};
  onTouched: () => void = () => {};
  isDisabled = signal<boolean>(false);

  ngOnInit(): void {
    this.cargarVehiculos();
  }

  cargarVehiculos(): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.vehiculoService.getVehiculos().subscribe({
      next: (data) => {
        this.vehiculos.set(data);
        this.isLoading.set(false);
        // Sincronizar selectedVehiculo si writeValue ya seteó un valor
        this.syncSelectedVehiculo();
      },
      error: (err) => {
        console.error('Error al obtener vehículos:', err);
        this.errorMsg.set('No se pudieron cargar los vehículos.');
        this.isLoading.set(false);
      }
    });
  }

  // Sincronizar el objeto seleccionado con el ID asignado por el Form
  private syncSelectedVehiculo(): void {
    const currentId = this.selectedVehiculo()?.id || null;
    if (currentId) {
      const found = this.vehiculos().find(v => v.id === currentId);
      if (found) {
        this.selectedVehiculo.set(found);
        this.searchTerm.set(`${found.marca} ${found.modelo} (${found.patente})`);
      }
    }
  }

  selectVehiculo(vehiculo: VehiculoResponse): void {
    if (this.isDisabled()) return;
    this.selectedVehiculo.set(vehiculo);
    this.searchTerm.set(`${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})`);
    this.isOpen.set(false);
    this.onChange(vehiculo.id);
    this.onTouched();
  }

  clearSelection(): void {
    if (this.isDisabled()) return;
    this.selectedVehiculo.set(null);
    this.searchTerm.set('');
    this.onChange(null);
    this.onTouched();
  }

  onInputFocus(): void {
    if (this.isDisabled()) return;
    this.isOpen.set(true);
    this.onTouched();
  }

  onInputBlur(): void {
    // Retrasar el cierre para permitir el click en el listado del dropdown
    setTimeout(() => {
      this.isOpen.set(false);
      // Si el buscador pierde foco y no hay coincidencia exacta o selección previa, resetear a la selección
      const selected = this.selectedVehiculo();
      if (selected) {
        this.searchTerm.set(`${selected.marca} ${selected.modelo} (${selected.patente})`);
      } else {
        this.searchTerm.set('');
      }
    }, 200);
  }

  // Métodos de ControlValueAccessor
  writeValue(value: string | null): void {
    if (value) {
      // Si ya cargaron, buscarlo
      const found = this.vehiculos().find((v) => v.id === value);
      if (found) {
        this.selectedVehiculo.set(found);
        this.searchTerm.set(`${found.marca} ${found.modelo} (${found.patente})`);
      } else {
        // Guardar temporalmente el ID para sync posterior
        this.selectedVehiculo.set({ id: value } as VehiculoResponse);
      }
    } else {
      this.selectedVehiculo.set(null);
      this.searchTerm.set('');
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
}
