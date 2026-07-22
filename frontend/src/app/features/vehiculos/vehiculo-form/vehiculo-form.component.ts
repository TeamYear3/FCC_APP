import { Component, OnInit, inject, signal, computed, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { VehiculoService, VehiculoCreatePayload } from '../../../core/services/vehiculo.service';
import { ClienteService, ClienteResponse } from '../../../core/services/cliente.service';

@Component({
  selector: 'app-vehiculo-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './vehiculo-form.component.html',
  styleUrls: []
})
export class VehiculoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly clienteService = inject(ClienteService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly elementRef = inject(ElementRef);

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly listaClientes = signal<ClienteResponse[]>([]);
  readonly terminoBusqueda = signal<string>('');
  readonly mostrarDropdown = signal<boolean>(false);
  readonly clienteSeleccionado = signal<ClienteResponse | null>(null);

  vehiculoForm!: FormGroup;

  readonly clientesFiltrados = computed(() => {
    const termino = this.terminoBusqueda().trim().toLowerCase();
    const clientes = this.listaClientes();
    if (!termino) {
      return clientes.slice(0, 10);
    }
    return clientes.filter(c => {
      const nombreCompleto = `${c.nombre} ${c.apellido}`.toLowerCase();
      const doc = (c.dni_cuit || '').toLowerCase();
      return nombreCompleto.includes(termino) || doc.includes(termino);
    });
  });

  ngOnInit(): void {
    this.vehiculoForm = this.fb.group({
      cliente_id: ['', [Validators.required]],
      marca: ['', [Validators.required, Validators.minLength(2)]],
      modelo: ['', [Validators.required, Validators.minLength(2)]],
      anio: [null, [Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]],
      patente: ['', [
        Validators.required,
        Validators.pattern(/^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/i)
      ]],
      kilometraje: [null, [Validators.min(0)]],
      color: ['', [Validators.maxLength(50)]],
      informacion_adicional: ['', [Validators.maxLength(255)]]
    });

    this.cargarClientes();
  }

  private cargarClientes(): void {
    this.clienteService.obtenerClientes().subscribe({
      next: (clientes) => {
        this.listaClientes.set(clientes);
        // Si viene un cliente_id por query param, preseleccionarlo
        const clienteIdParam = this.route.snapshot.queryParamMap.get('cliente_id');
        if (clienteIdParam) {
          const encontrado = clientes.find(c => c.id === clienteIdParam);
          if (encontrado) {
            this.seleccionarCliente(encontrado);
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar la lista de clientes:', err);
      }
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.terminoBusqueda.set(input.value);
    this.mostrarDropdown.set(true);
  }

  seleccionarCliente(cliente: ClienteResponse): void {
    this.vehiculoForm.patchValue({ cliente_id: cliente.id });
    this.vehiculoForm.get('cliente_id')?.markAsTouched();
    this.clienteSeleccionado.set(cliente);
    this.terminoBusqueda.set('');
    this.mostrarDropdown.set(false);
  }

  removerCliente(): void {
    this.vehiculoForm.patchValue({ cliente_id: '' });
    this.vehiculoForm.get('cliente_id')?.markAsTouched();
    this.clienteSeleccionado.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.mostrarDropdown.set(false);
    }
  }

  onSubmit(): void {
    if (this.vehiculoForm.invalid) {
      this.vehiculoForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.vehiculoForm.value;
    const payload: VehiculoCreatePayload = {
      cliente_id: formValue.cliente_id,
      patente: formValue.patente.toUpperCase().trim(),
      marca: formValue.marca.trim(),
      modelo: formValue.modelo.trim(),
      anio: formValue.anio ? Number(formValue.anio) : null,
      kilometraje: formValue.kilometraje ? Number(formValue.kilometraje) : null,
      color: formValue.color ? formValue.color.trim() : ''
    };

    this.vehiculoService.crearVehiculo(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        // Redirigir a la vista de clientes o listado de vehículos
        this.router.navigate(['/clientes']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Error al registrar vehículo en la API:', err);

        // Manejo descriptivo de errores provistos por el backend
        if (err.error?.patente) {
          const detalle = Array.isArray(err.error.patente) ? err.error.patente[0] : err.error.patente;
          this.errorMessage.set(`Error en Patente: ${detalle}`);
        } else if (err.error?.cliente_id) {
          const detalle = Array.isArray(err.error.cliente_id) ? err.error.cliente_id[0] : err.error.cliente_id;
          this.errorMessage.set(`Error en Cliente: ${detalle}`);
        } else if (err.error?.detail || err.error?.error) {
          this.errorMessage.set(err.error.detail || err.error.error);
        } else if (typeof err.error === 'object' && err.error !== null) {
          const primerCampo = Object.keys(err.error)[0];
          const mensaje = Array.isArray(err.error[primerCampo]) ? err.error[primerCampo][0] : err.error[primerCampo];
          this.errorMessage.set(`${primerCampo.toUpperCase()}: ${mensaje}`);
        } else {
          this.errorMessage.set('No se pudo registrar el vehículo. Verifique los datos ingresados o la conexión al servidor.');
        }
      }
    });
  }
}
