import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrdenService, OrdenPayload } from '../../../core/services/orden.service';
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
  private readonly router = inject(Router);

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  ordenForm!: FormGroup;

  ngOnInit(): void {
    // Obtener la fecha de hoy en formato YYYY-MM-DD local
    const hoy = new Date();
    const hoyString = hoy.getFullYear() + '-' + 
                      String(hoy.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(hoy.getDate()).padStart(2, '0');

    this.ordenForm = this.fb.group({
      vehiculo_id: [null, [Validators.required]],
      descripcion_problema: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
      fecha_ingreso: [hoyString, [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.ordenForm.invalid) {
      this.ordenForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: OrdenPayload = {
      ...this.ordenForm.value
    };

    this.ordenService.crearOrden(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        // Redirigir al listado de órdenes pasando el número de OT creada en el state
        this.router.navigate(['/ordenes'], {
          state: { successOT: res.numero_ot }
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Error al registrar orden de trabajo:', err);

        // Manejo descriptivo de errores provistos por el backend
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
