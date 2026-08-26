import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService, PerfilUsuarioResponse } from '../../core/auth/auth.service';

@Component({
  selector: 'app-configuracion-perfil-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion-perfil-modal.component.html',
  styleUrl: './configuracion-perfil-modal.component.css'
})
export class ConfiguracionPerfilModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly tabActivo = signal<'personales' | 'seguridad'>('personales');
  readonly cargando = signal<boolean>(true);
  readonly guardando = signal<boolean>(false);
  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);

  readonly perfilForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    apellido: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.maxLength(50)]],
    password_actual: [''],
    nueva_password: ['', [Validators.minLength(8)]],
    confirmar_password: ['']
  }, { validators: this.validarPasswordsCoinciden });

  private initialEmail = '';

  ngOnInit(): void {
    this.cargarPerfil();
  }

  cargarPerfil(): void {
    this.cargando.set(true);
    this.mensajeError.set(null);

    this.authService.obtenerPerfil().subscribe({
      next: (res: PerfilUsuarioResponse) => {
        this.initialEmail = res.email || '';
        this.perfilForm.patchValue({
          nombre: res.nombre || '',
          apellido: res.apellido || '',
          email: res.email || '',
          telefono: res.telefono || ''
        });
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar perfil de administrador:', err);
        this.mensajeError.set('No se pudieron cargar los datos del perfil.');
        this.cargando.set(false);
      }
    });
  }

  cambiarTab(tab: 'personales' | 'seguridad'): void {
    this.tabActivo.set(tab);
    this.mensajeExito.set(null);
    this.mensajeError.set(null);
  }

  validarPasswordsCoinciden(control: AbstractControl): ValidationErrors | null {
    const nueva = control.get('nueva_password')?.value;
    const confirm = control.get('confirmar_password')?.value;
    if (nueva && confirm && nueva !== confirm) {
      return { passwordsNoCoinciden: true };
    }
    return null;
  }

  guardarCambios(): void {
    this.mensajeExito.set(null);
    this.mensajeError.set(null);

    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      if (this.perfilForm.errors?.['passwordsNoCoinciden']) {
        this.mensajeError.set('Las contraseñas ingresadas no coinciden.');
      } else {
        this.mensajeError.set('Por favor, completa correctamente todos los campos obligatorios.');
      }
      return;
    }

    const formVal = this.perfilForm.value;
    const emailCambiado = formVal.email.trim().toLowerCase() !== this.initialEmail.toLowerCase();
    const quiereCambiarPassword = !!formVal.nueva_password;

    if ((emailCambiado || quiereCambiarPassword) && !formVal.password_actual) {
      this.mensajeError.set('Debes ingresar tu contraseña actual para confirmar el cambio de email o contraseña.');
      this.tabActivo.set('seguridad');
      return;
    }

    this.guardando.set(true);

    const payload: any = {
      nombre: formVal.nombre.trim(),
      apellido: formVal.apellido.trim(),
      email: formVal.email.trim(),
      telefono: formVal.telefono ? formVal.telefono.trim() : ''
    };

    if (formVal.password_actual) {
      payload.password_actual = formVal.password_actual;
    }
    if (formVal.nueva_password) {
      payload.nueva_password = formVal.nueva_password;
    }

    this.authService.actualizarPerfil(payload).subscribe({
      next: (res) => {
        this.initialEmail = res.email || '';
        this.mensajeExito.set('¡Perfil actualizado con éxito!');
        this.guardando.set(false);
        this.perfilForm.patchValue({
          password_actual: '',
          nueva_password: '',
          confirmar_password: ''
        });
      },
      error: (err) => {
        console.error('Error al actualizar perfil:', err);
        this.guardando.set(false);
        const backendError = err.error?.password_actual?.[0] || 
                             err.error?.email?.[0] || 
                             err.error?.nueva_password?.[0] || 
                             err.error?.detail || 
                             'No se pudo actualizar el perfil. Revisa los datos ingresados.';
        this.mensajeError.set(backendError);
      }
    });
  }
}
