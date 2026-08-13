import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { GoogleLoginButtonComponent } from '../../shared/components/google-login-button/google-login-button.component';

@Component({
  selector: 'app-autenticacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GoogleLoginButtonComponent],
  templateUrl: './autenticacion.component.html',
  styleUrl: './autenticacion.component.css'
})
export class AutenticacionComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly mode = signal<'login' | 'registro' | 'reset-request' | 'reset-confirm'>('login');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isInitializing = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);

  loginForm!: FormGroup;
  registroForm!: FormGroup;
  resetRequestForm!: FormGroup;
  resetConfirmForm!: FormGroup;

  resetUid: string | null = null;
  resetToken: string | null = null;

  constructor() {
    effect(() => {
      const err = this.authService.authErrorSignal();
      if (err) {
        this.errorMessage.set(err);
      }
    });

    this.initForms();
  }

  private initForms(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.registroForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.resetRequestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetConfirmForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  ngOnInit(): void {
    this.authService.initializeGoogleAuth().then(() => {
      this.isInitializing.set(false);
    }).catch(err => {
      console.error('Error al inicializar SDK de Google:', err);
      this.errorMessage.set('No se pudo inicializar el servicio de autenticación con Google Identity Services.');
      this.isInitializing.set(false);
    });

    this.route.queryParams.subscribe(params => {
      this.resetUid = params['uid'] || null;
      this.resetToken = params['token'] || null;

      if (this.resetUid && this.resetToken) {
        this.mode.set('reset-confirm');
      }
    });
  }

  onGoogleLogin(): void {
    this.clearMessages();
    this.authService.loginWithGoogle();
  }

  changeMode(newMode: 'login' | 'registro' | 'reset-request' | 'reset-confirm'): void {
    this.clearMessages();
    this.mode.set(newMode);
    
    if (newMode === 'login') this.loginForm.reset();
    if (newMode === 'registro') this.registroForm.reset();
    if (newMode === 'reset-request') this.resetRequestForm.reset();
    if (newMode === 'reset-confirm') this.resetConfirmForm.reset();
  }

  onLoginSubmit(): void {
    if (this.loginForm.invalid) return;
    this.clearMessages();
    this.isSubmitting.set(true);

    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const role = this.authService.getUserRole() || 'cliente';
        if (role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else if (role === 'tecnico') {
          this.router.navigate(['/ordenes']);
        } else {
          this.router.navigate(['/transparencia']);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err.error?.detail || err.error?.error || 'Credenciales inválidas o error de conexión.';
        this.errorMessage.set(msg);
      }
    });
  }

  onRegistroSubmit(): void {
    if (this.registroForm.invalid) return;
    this.clearMessages();
    this.isSubmitting.set(true);

    const { nombre, apellido, email, password } = this.registroForm.value;
    this.authService.registro(nombre, apellido, email, password).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Registro exitoso. Ya puedes iniciar sesión.');
        this.changeMode('login');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err.error?.email?.[0] || err.error?.password?.[0] || err.error?.error || 'No se pudo completar el registro.';
        this.errorMessage.set(msg);
      }
    });
  }

  onResetRequestSubmit(): void {
    if (this.resetRequestForm.invalid) return;
    this.clearMessages();
    this.isSubmitting.set(true);

    const { email } = this.resetRequestForm.value;
    this.authService.requestPasswordReset(email).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set(res.detail || 'Se envió un correo de recuperación si la cuenta existe.');
        this.resetRequestForm.reset();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err.error?.email?.[0] || err.error?.error || 'No se pudo solicitar la recuperación de contraseña.';
        this.errorMessage.set(msg);
      }
    });
  }

  onResetConfirmSubmit(): void {
    if (this.resetConfirmForm.invalid || !this.resetUid || !this.resetToken) return;
    this.clearMessages();
    this.isSubmitting.set(true);

    const { password } = this.resetConfirmForm.value;
    this.authService.confirmPasswordReset(this.resetUid, this.resetToken, password).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set(res.detail || 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.');
        this.changeMode('login');
        
        this.router.navigate([], {
          queryParams: { uid: null, token: null },
          queryParamsHandling: 'merge'
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err.error?.password?.[0] || err.error?.token?.[0] || err.error?.error || 'Token inválido o expirado. Vuelve a solicitar la recuperación.';
        this.errorMessage.set(msg);
      }
    });
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}

