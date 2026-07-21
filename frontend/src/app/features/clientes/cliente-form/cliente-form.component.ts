import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

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

    // Suscripción al cambio en tipo_documento para alternar validación síncrona de DNI o CUIT
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
  }

  onSubmit(): void {
    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: ClientePayload = {
      ...this.clienteForm.value
    };

    this.clienteService.crearCliente(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/clientes']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Error al registrar cliente en la API:', err);
        
        // Manejo descriptivo de errores provistos por el backend
        if (err.error?.dni_cuit) {
          const detalle = Array.isArray(err.error.dni_cuit) ? err.error.dni_cuit[0] : err.error.dni_cuit;
          this.errorMessage.set(`Error en DNI/CUIT: ${detalle}`);
        } else if (err.error?.detail || err.error?.error) {
          this.errorMessage.set(err.error.detail || err.error.error);
        } else if (typeof err.error === 'object' && err.error !== null) {
          const primerCampo = Object.keys(err.error)[0];
          const mensaje = Array.isArray(err.error[primerCampo]) ? err.error[primerCampo][0] : err.error[primerCampo];
          this.errorMessage.set(`${primerCampo.toUpperCase()}: ${mensaje}`);
        } else {
          this.errorMessage.set('No se pudo registrar al cliente. Verifique los datos o la conexión al servidor.');
        }
      }
    });
  }

  get tipoDocumentoSeleccionado(): string {
    return this.clienteForm.get('tipo_documento')?.value || 'DNI';
  }
}
