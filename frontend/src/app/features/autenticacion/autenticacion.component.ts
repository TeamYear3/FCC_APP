import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { GoogleLoginButtonComponent } from '../../shared/components/google-login-button/google-login-button.component';

@Component({
  selector: 'app-autenticacion',
  standalone: true,
  imports: [CommonModule, GoogleLoginButtonComponent],
  templateUrl: './autenticacion.component.html',
  styleUrl: './autenticacion.component.css'
})
export class AutenticacionComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly idTokenCaptured = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isInitializing = signal<boolean>(true);

  constructor() {
    effect(() => {
      const err = this.authService.authErrorSignal();
      if (err) {
        this.errorMessage.set(err);
      }
    });
  }

  ngOnInit(): void {
    this.authService.initializeGoogleAuth().then(() => {
      this.isInitializing.set(false);
    }).catch(err => {
      console.error('Error al inicializar SDK de Google:', err);
      this.errorMessage.set('No se pudo inicializar el servicio de autenticación con Google Identity Services.');
      this.isInitializing.set(false);
    });

    this.authService.idToken$.subscribe(token => {
      if (token) {
        this.idTokenCaptured.set(token);
        this.errorMessage.set(null);
      }
    });
  }

  onGoogleLogin(): void {
    this.errorMessage.set(null);
    this.authService.loginWithGoogle();
  }

  simulateRole(role: 'admin' | 'tecnico' | 'cliente'): void {
    this.errorMessage.set(null);
    this.authService.loginDev(role).subscribe({
      next: (res) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('fcc_refresh_token', res.refresh);
        }
        this.authService.setToken(res.access);
        this.idTokenCaptured.set(res.access);

        if (role === 'admin') {
          this.router.navigate(['/admin']);
        } else if (role === 'tecnico') {
          this.router.navigate(['/ordenes']);
        } else {
          this.router.navigate(['/portal-cliente']);
        }
      },
      error: (err) => {
        console.error('Error al generar token real en el servidor:', err);
        const msg = err.error?.error || 'Error al conectar con el backend Django para emitir el token JWT real.';
        this.errorMessage.set(msg);
      }
    });
  }
}
