import { Component, OnInit, inject, signal } from '@angular/core';

import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { AuthService, PerfilUsuarioResponse } from '../../core/auth/auth.service';

@Component({
  selector: 'app-configuracion-perfil-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './configuracion-perfil-modal.component.html',
  styleUrl: './configuracion-perfil-modal.component.css',
})
export class ConfiguracionPerfilModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly tabActivo = signal<'personales' | 'seguridad'>('personales');
  readonly cargando = signal<boolean>(true);
  readonly guardando = signal<boolean>(false);
  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);

  readonly mostrarPasswordActual = signal<boolean>(false);
  readonly mostrarNuevaPassword = signal<boolean>(false);
  readonly mostrarConfirmarPassword = signal<boolean>(false);

  readonly perfilForm: FormGroup = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      apellido: ['', [Validators.required, Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.maxLength(50)]],
      password_actual: [''],
      nueva_password: ['', [Validators.minLength(8)]],
      confirmar_password: [''],
    },
    { validators: this.validarPasswordsCoinciden },
  );

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
          telefono: res.telefono || '',
        });
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar perfil de administrador:', err);
        this.mensajeError.set('No se pudieron cargar los datos del perfil.');
        this.cargando.set(false);
      },
    });
  }

  cambiarTab(tab: 'personales' | 'seguridad'): void {
    this.tabActivo.set(tab);
    this.mensajeExito.set(null);
    this.mensajeError.set(null);
  }

  togglePasswordVisibility(campo: 'actual' | 'nueva' | 'confirmar'): void {
    if (campo === 'actual') {
      this.mostrarPasswordActual.update((v) => !v);
    } else if (campo === 'nueva') {
      this.mostrarNuevaPassword.update((v) => !v);
    } else if (campo === 'confirmar') {
      this.mostrarConfirmarPassword.update((v) => !v);
    }
  }

  get fortalezaPassword(): {
    nivel: 'debil' | 'media' | 'fuerte' | null;
    porcentaje: number;
    etiqueta: string;
    claseColorBarra: string;
    claseColorTexto: string;
  } {
    const val = this.perfilForm.get('nueva_password')?.value || '';
    if (!val) {
      return {
        nivel: null,
        porcentaje: 0,
        etiqueta: '',
        claseColorBarra: 'bg-zinc-700',
        claseColorTexto: 'text-zinc-400',
      };
    }
    if (val.length < 8) {
      return {
        nivel: 'debil',
        porcentaje: 33,
        etiqueta: 'Débil',
        claseColorBarra: 'bg-rose-500',
        claseColorTexto: 'text-rose-400',
      };
    }
    const tieneMayuscula = /[A-Z]/.test(val);
    const tieneNumero = /[0-9]/.test(val);
    const tieneSimbolo = /[^A-Za-z0-9]/.test(val);

    if (val.length >= 10 && tieneMayuscula && tieneNumero && tieneSimbolo) {
      return {
        nivel: 'fuerte',
        porcentaje: 100,
        etiqueta: 'Fuerte',
        claseColorBarra: 'bg-emerald-500',
        claseColorTexto: 'text-emerald-400',
      };
    }
    if (tieneMayuscula || tieneNumero || tieneSimbolo) {
      return {
        nivel: 'media',
        porcentaje: 66,
        etiqueta: 'Media',
        claseColorBarra: 'bg-amber-500',
        claseColorTexto: 'text-amber-400',
      };
    }
    return {
      nivel: 'debil',
      porcentaje: 33,
      etiqueta: 'Débil',
      claseColorBarra: 'bg-rose-500',
      claseColorTexto: 'text-rose-400',
    };
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
      this.mensajeError.set(
        'Debes ingresar tu contraseña actual para confirmar el cambio de email o contraseña.',
      );
      this.tabActivo.set('seguridad');
      return;
    }

    this.guardando.set(true);

    const payload: any = {
      nombre: formVal.nombre.trim(),
      apellido: formVal.apellido.trim(),
      email: formVal.email.trim(),
      telefono: formVal.telefono ? formVal.telefono.trim() : '',
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
          confirmar_password: '',
        });
      },
      error: (err) => {
        console.error('Error al actualizar perfil:', err);
        this.guardando.set(false);
        const backendError =
          err.error?.password_actual?.[0] ||
          err.error?.email?.[0] ||
          err.error?.nueva_password?.[0] ||
          err.error?.detail ||
          'No se pudo actualizar el perfil. Revisa los datos ingresados.';
        this.mensajeError.set(backendError);
      },
    });
  }
}
