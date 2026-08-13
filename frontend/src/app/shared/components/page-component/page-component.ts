import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-page-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-component.html',
  styleUrl: './page-component.css'
})
export class PageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @Input({ required: true }) titulo!: string;
  @Input() subtitulo?: string;
  @Input() categoria?: string;
  @Input() userRole?: string | null;
  @Input() mostrarLogout = false;

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/autenticacion']);
  }
}
