import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-google-login-button',
  standalone: true,
  imports: [],
  templateUrl: './google-login-button.component.html',
  styleUrl: './google-login-button.component.css',
})
export class GoogleLoginButtonComponent {
  @Input() label = 'Iniciar sesión con Google';
  @Input() disabled = false;
  @Output() loginClick = new EventEmitter<void>();

  onClick(): void {
    if (!this.disabled) {
      this.loginClick.emit();
    }
  }
}
