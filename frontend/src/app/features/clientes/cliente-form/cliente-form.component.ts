import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ClienteService, ClientePayload } from '../../../core/services/cliente.service';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './cliente-form.component.html',
  styleUrls: []
})
export class ClienteFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isEditMode = signal<boolean>(false);
  readonly clienteId = signal<string | null>(null);

  clienteForm!: FormGroup;

  ngOnInit(): void {
    this.clienteForm = this.fb.group({
      tipo_documento: ['DNI', Validators.required],
      dni_cuit: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      condicion_iva: ['CF', Validators.required],
      telefono: ['', [Validators.maxLength(30)]],
      domicilio: ['', [Validators.maxLength(255)]]
    });

    // Suscripción al cambio en tipo_documento para alternar validación síncrona de DNI o CUIT (sólo útil en alta)
    this.clienteForm.get('tipo_documento')?.valueChanges.subscribe((tipo: 'DNI' | 'CUIT') => {
      const dniCuitControl = this.clienteForm.get('dni_cuit');
      if (!dniCuitControl) return;

      if (tipo === 'DNI') {
        dniCuitControl.setValidators([Validators.required, Validators.pattern(/^\d{7,8}$/)]);
      } else {
        dniCuitControl.setValidators([Validators.required, Validators.pattern(/^\d{2}-\d{8}-\d{1}$/)]);
      }
      dniCuitControl.updateValueAndValidity();
    });

    // Verificar si estamos en modo edición capturando el ID en la ruta
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode.set(true);
      this.clienteId.set(id);
      this.cargarDatosCliente(id);
    }
  }

  cargarDatosCliente(id: string): void {
    this.clienteService.getClienteById(id).subscribe({
      next: (res) => {
        this.clienteForm.patchValue(res);
        // Deshabilitar tipo_documento y dni_cuit por regla de negocio
        this.clienteForm.get('tipo_documento')?.disable();
        this.clienteForm.get('dni_cuit')?.disable();
      },
      error: (err) => {
        console.error('Error al cargar datos del cliente:', err);
        this.errorMessage.set('No se pudieron cargar los datos del cliente.');
      }
    });
  }

  onSubmit(): void {
    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    // En Angular, form.value excluye automáticamente los controles deshabilitados
    const payload: Partial<ClientePayload> = {
      ...this.clienteForm.value
    };

    const request$ = this.isEditMode()
      ? this.clienteService.actualizarCliente(this.clienteId()!, payload)
      : this.clienteService.crearCliente(payload as ClientePayload);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/admin/clientes']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const accion = this.isEditMode() ? 'actualizar' : 'registrar';
        console.error(`Error al ${accion} cliente en la API:`, err);
        
        // Manejo descriptivo de errores provistos por el backend
        let hasFieldError = false;
        if (err.error && typeof err.error === 'object') {
          Object.keys(err.error).forEach((key) => {
            const control = this.clienteForm.get(key);
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
            this.errorMessage.set(`No se pudo ${accion} al cliente. Verifique los datos o la conexión al servidor.`);
          }
        }
      }
    });
  }

  get tipoDocumentoSeleccionado(): string {
    return this.clienteForm?.getRawValue()?.tipo_documento || 'DNI';
  }
}
