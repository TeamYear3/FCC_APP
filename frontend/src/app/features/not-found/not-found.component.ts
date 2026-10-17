import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css',
})
export class NotFoundComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userRole = this.authService.userRoleSignal;

  goHome(): void {
    if (this.userRole() === 'cliente') {
      this.router.navigate(['/portal-cliente']);
    } else if (this.userRole() === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else if (this.userRole() === 'tecnico') {
      this.router.navigate(['/admin/ordenes']);
    } else {
      this.router.navigate(['/autenticacion']);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/autenticacion']);
  }
}
