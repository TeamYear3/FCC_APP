import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-no-autorizado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './no-autorizado.component.html',
  styleUrl: './no-autorizado.component.css'
})
export class NoAutorizadoComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userRole = this.authService.userRoleSignal;

  goBack(): void {
    if (this.userRole() === 'cliente') {
      this.router.navigate(['/portal-cliente']);
    } else if (this.userRole() === 'admin') {
      this.router.navigate(['/admin']);
    } else if (this.userRole() === 'tecnico') {
      this.router.navigate(['/ordenes']);
    } else {
      this.router.navigate(['/autenticacion']);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/autenticacion']);
  }
}
