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
  readonly isEditMode = signal<boolean>(false);
  readonly vehiculoId = signal<string | null>(null);
  readonly returnUrl = signal<string>('/clientes');
  readonly mostrarModalUnicidad = signal<boolean>(false);
  readonly reasignando = signal<boolean>(false);
  readonly datosConflicto = signal<{
    vehiculo_id?: string;
    patente?: string;
    nro_chasis?: string;
    clienteNombre?: string;
    mensaje?: string;
  } | null>(null);

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
    this.returnUrl.set(this.router.url.startsWith('/admin') ? '/admin/clientes' : '/clientes');
    this.vehiculoForm = this.fb.group({
      cliente_id: ['', [Validators.required]],
      marca: ['', [Validators.required, Validators.minLength(2)]],
      modelo: ['', [Validators.required, Validators.minLength(2)]],
      anio: [null, [Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]],
      patente: ['', [
        Validators.required,
        Validators.pattern(/^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/i)
      ]],
      numero_chasis: ['', [Validators.maxLength(50)]],
      nro_chasis: ['', [Validators.maxLength(50)]],
      kilometraje: [null, [Validators.min(0)]],
      color: ['', [Validators.maxLength(50)]],
      informacion_adicional: ['', [Validators.maxLength(255)]]
    });

    this.cargarClientes();

    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode.set(true);
      this.vehiculoId.set(id);
      this.cargarDatosVehiculo(id);
    }
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
        
        // Si estamos en modo edición, ahora que los clientes están cargados,
        // podemos seleccionar al cliente asociado al vehículo si ya obtuvimos el vehículo.
        // Pero es más seguro buscarlo dentro del subscribe de cargarDatosVehiculo.
      },
      error: (err) => {
        console.error('Error al cargar la lista de clientes:', err);
      }
    });
  }

  cargarDatosVehiculo(id: string): void {
    this.vehiculoService.obtenerVehiculoPorId(id).subscribe({
      next: (vehiculo) => {
        this.vehiculoForm.patchValue({
          ...vehiculo,
          numero_chasis: vehiculo.numero_chasis || vehiculo.nro_chasis || '',
          nro_chasis: vehiculo.numero_chasis || vehiculo.nro_chasis || ''
        });
        this.vehiculoForm.get('patente')?.disable(); // Bloqueamos patente por regla de negocio
        this.vehiculoForm.get('numero_chasis')?.disable(); // Bloqueamos chasis por regla de negocio en modo edición (TK028)
        this.vehiculoForm.get('nro_chasis')?.disable();

        // Preseleccionar el cliente asociado
        if (vehiculo.cliente_id) {
          // Buscamos si ya tenemos la lista cargada
          const clientes = this.listaClientes();
          const encontrado = clientes.find(c => c.id === vehiculo.cliente_id);
          if (encontrado) {
            this.seleccionarCliente(encontrado);
          } else {
            // Si la lista aún no carga, nos suscribimos puntualmente al cliente
            this.clienteService.obtenerClientes().subscribe(clientesAPI => {
              const cli = clientesAPI.find(c => c.id === vehiculo.cliente_id);
              if (cli) this.seleccionarCliente(cli);
            });
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar vehículo:', err);
        this.errorMessage.set('No se pudieron cargar los datos del vehículo.');
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

    const formValue = this.vehiculoForm.getRawValue();
    const chasisVal = (formValue.numero_chasis || formValue.nro_chasis || '').toUpperCase().trim();
    const payload: VehiculoCreatePayload = {
      cliente_id: formValue.cliente_id,
      patente: formValue.patente ? formValue.patente.toUpperCase().trim() : '',
      numero_chasis: chasisVal,
      nro_chasis: chasisVal,
      marca: formValue.marca.trim(),
      modelo: formValue.modelo.trim(),
      anio: formValue.anio ? Number(formValue.anio) : null,
      kilometraje: formValue.kilometraje ? Number(formValue.kilometraje) : null,
      color: formValue.color ? formValue.color.trim() : ''
    };

    const request$ = this.isEditMode() && this.vehiculoId()
      ? this.vehiculoService.actualizarVehiculo(this.vehiculoId()!, payload)
      : this.vehiculoService.crearVehiculo(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        // Redirigir a la vista de clientes o listado de vehículos
        this.router.navigate([this.returnUrl()]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Error al procesar vehículo en la API:', err);

        // Interceptamos error 409 Conflict (Unicidad Global - Vehículo existente bajo otro cliente)
        if (err.status === 409) {
          this.mostrarModalUnicidad.set(true);
          this.datosConflicto.set({
            vehiculo_id: err.error?.vehiculo_id || err.error?.id,
            patente: payload.patente,
            nro_chasis: payload.nro_chasis,
            clienteNombre: err.error?.cliente_propietario || err.error?.cliente_nombre || 'otro cliente',
            mensaje: err.error?.detail || err.error?.mensaje || 'El vehículo con esta patente o número de chasis ya se encuentra registrado a nombre de otro cliente.'
          });
          return;
        }

        // Manejo descriptivo de errores provistos por el backend
        let hasFieldError = false;
        if (err.error && typeof err.error === 'object') {
          Object.keys(err.error).forEach((key) => {
            const control = this.vehiculoForm.get(key);
            if (control) {
              const mensaje = Array.isArray(err.error[key]) ? err.error[key][0] : err.error[key];
              control.setErrors({ serverError: mensaje });
              control.markAsTouched();
              hasFieldError = true;
            }
          });
        }

        if (!hasFieldError) {
          if (err.error?.detail || err.error?.error) {
            this.errorMessage.set(err.error.detail || err.error.error);
          } else {
            this.errorMessage.set('No se pudo registrar el vehículo. Verifique los datos ingresados o la conexión al servidor.');
          }
        }
      }
    });
  }

  cerrarModalUnicidad(): void {
    this.mostrarModalUnicidad.set(false);
    this.datosConflicto.set(null);
  }

  confirmarReasignacion(): void {
    const clienteId = this.vehiculoForm.get('cliente_id')?.value;
    const conflicto = this.datosConflicto();
    const vehiculoId = conflicto?.vehiculo_id;

    if (!clienteId || !vehiculoId) {
      this.cerrarModalUnicidad();
      return;
    }

    this.reasignando.set(true);
    this.vehiculoService.reasignarVehiculo(vehiculoId, clienteId).subscribe({
      next: () => {
        this.reasignando.set(false);
        this.cerrarModalUnicidad();
        this.router.navigate([this.returnUrl()]);
      },
      error: (err) => {
        this.reasignando.set(false);
        this.cerrarModalUnicidad();
        console.error('Error al reasignar vehículo:', err);
        this.errorMessage.set('No se pudo completar la reasignación de la titularidad.');
      }
    });
  }
}
