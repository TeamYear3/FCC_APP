import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrdenService, OrdenPayload } from '../../../core/services/orden.service';
import { VehiculoService, VehiculoResponse } from '../../../core/services/vehiculo.service';
import { ClienteService, ClienteResponse } from '../../../core/services/cliente.service';
import { VehiculoSelectorComponent } from '../../../shared/components/vehiculo-selector/vehiculo-selector.component';

@Component({
  selector: 'app-orden-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, VehiculoSelectorComponent],
  templateUrl: './orden-form.component.html',
  styleUrls: ['./orden-form.component.css']
})
export class OrdenFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ordenService = inject(OrdenService);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly clienteService = inject(ClienteService);
  private readonly router = inject(Router);

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Señales para almacenar los detalles cargados en tiempo real
  readonly selectedVehiculoDetails = signal<VehiculoResponse | null>(null);
  readonly selectedClienteDetails = signal<ClienteResponse | null>(null);

  ordenForm!: FormGroup;

  // Turnos simulados (Mocks) para la UI antes del desarrollo del backend de Turnos
  readonly turnosDisponibles = [
    { id: 'T-001', descripcion: 'Turno Mañana - 09:00 hs' },
    { id: 'T-002', descripcion: 'Turno Mañana - 11:30 hs' },
    { id: 'T-003', descripcion: 'Turno Tarde - 15:00 hs' },
    { id: 'T-004', descripcion: 'Turno Tarde - 17:30 hs' }
  ];

  ngOnInit(): void {
    const hoy = new Date();
    const hoyString = hoy.getFullYear() + '-' + 
                      String(hoy.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(hoy.getDate()).padStart(2, '0');

    this.ordenForm = this.fb.group({
      modo: ['PRESUPUESTO', [Validators.required]],
      vehiculo_id: [null, [Validators.required]],
      descripcion_problema: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
      fecha_ingreso: [hoyString, [Validators.required]],
      turno_id: [null],
      cliente_acepto: [false]
    });

    // Suscripción al modo de ingreso para ajustar validaciones reactivas
    this.ordenForm.get('modo')?.valueChanges.subscribe((modo: 'PRESUPUESTO' | 'ORDEN_TRABAJO') => {
      const turnoCtrl = this.ordenForm.get('turno_id');
      const aceptoCtrl = this.ordenForm.get('cliente_acepto');

      if (modo === 'ORDEN_TRABAJO') {
        turnoCtrl?.setValidators([Validators.required]);
        aceptoCtrl?.setValidators([Validators.requiredTrue]);
      } else {
        turnoCtrl?.clearValidators();
        aceptoCtrl?.clearValidators();
      }

      turnoCtrl?.updateValueAndValidity();
      aceptoCtrl?.updateValueAndValidity();
    });

    // Suscripción al cambio de vehículo para cargar información detallada en tiempo real
    this.ordenForm.get('vehiculo_id')?.valueChanges.subscribe((vehiculoId: string | null) => {
      if (!vehiculoId) {
        this.selectedVehiculoDetails.set(null);
        this.selectedClienteDetails.set(null);
        return;
      }

      this.vehiculoService.getVehiculoById(vehiculoId).subscribe({
        next: (vehiculo) => {
          this.selectedVehiculoDetails.set(vehiculo);
          // Cargar datos del propietario asociado
          if (vehiculo.cliente_id) {
            this.clienteService.getClienteById(vehiculo.cliente_id).subscribe({
              next: (cliente) => this.selectedClienteDetails.set(cliente),
              error: () => this.selectedClienteDetails.set(null)
            });
          } else {
            this.selectedClienteDetails.set(null);
          }
        },
        error: (err) => {
          console.error('Error al obtener detalles del vehículo:', err);
          this.selectedVehiculoDetails.set(null);
          this.selectedClienteDetails.set(null);
        }
      });
    });
  }

  get modoSeleccionado(): 'PRESUPUESTO' | 'ORDEN_TRABAJO' {
    return this.ordenForm?.get('modo')?.value || 'PRESUPUESTO';
  }

  onSubmit(): void {
    if (this.ordenForm.invalid) {
      this.ordenForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formVal = this.ordenForm.value;
    const payload: OrdenPayload = {
      vehiculo_id: formVal.vehiculo_id,
      descripcion_problema: formVal.descripcion_problema,
      fecha_ingreso: formVal.fecha_ingreso,
      estado: formVal.modo === 'PRESUPUESTO' ? 'en_presupuesto' : 'ingresado'
    };

    this.ordenService.crearOrden(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/ordenes'], {
          state: { successOT: res.numero_ot }
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Error al registrar orden de trabajo:', err);

        if (err.error?.vehiculo_id) {
          const detail = Array.isArray(err.error.vehiculo_id) ? err.error.vehiculo_id[0] : err.error.vehiculo_id;
          this.errorMessage.set(`Vehículo: ${detail}`);
        } else if (err.error?.descripcion_problema) {
          const detail = Array.isArray(err.error.descripcion_problema) ? err.error.descripcion_problema[0] : err.error.descripcion_problema;
          this.errorMessage.set(`Descripción: ${detail}`);
        } else if (err.error?.fecha_ingreso) {
          const detail = Array.isArray(err.error.fecha_ingreso) ? err.error.fecha_ingreso[0] : err.error.fecha_ingreso;
          this.errorMessage.set(`Fecha: ${detail}`);
        } else if (err.error?.detail || err.error?.error) {
          this.errorMessage.set(err.error.detail || err.error.error);
        } else if (typeof err.error === 'object' && err.error !== null) {
          const firstKey = Object.keys(err.error)[0];
          const message = Array.isArray(err.error[firstKey]) ? err.error[firstKey][0] : err.error[firstKey];
          this.errorMessage.set(`${firstKey.toUpperCase()}: ${message}`);
        } else {
          this.errorMessage.set('No se pudo registrar la Orden de Trabajo. Verifique su conexión.');
        }
      }
    });
  }
}

