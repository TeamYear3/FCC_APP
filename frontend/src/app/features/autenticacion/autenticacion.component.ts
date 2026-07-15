import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  readonly idTokenCaptured = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isInitializing = signal<boolean>(true);

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
}
