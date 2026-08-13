import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

export interface UserSummary {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'tecnico' | 'cliente';
  estado: 'Activo' | 'En revisión' | 'Pendiente';
  ultimaConexion: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userRole = this.authService.userRoleSignal;

  readonly usuariosRegistrados: UserSummary[] = [
    {
      id: 'USR-001',
      nombre: 'Laura Zárate (Super Admin)',
      email: 'admin@fcc-taller.com',
      rol: 'admin',
      estado: 'Activo',
      ultimaConexion: 'Hace pocos segundos'
    },
    {
      id: 'USR-002',
      nombre: 'Martín Gómez (Mecánico Jefe)',
      email: 'tecnico@fcc-taller.com',
      rol: 'tecnico',
      estado: 'Activo',
      ultimaConexion: 'Hace 15 minutos'
    },
    {
      id: 'USR-003',
      nombre: 'Carlos Rodríguez (Cliente VIP)',
      email: 'cliente@fcc-taller.com',
      rol: 'cliente',
      estado: 'Activo',
      ultimaConexion: 'Hace 1 hora'
    },
    {
      id: 'USR-004',
      nombre: 'Sofía Álvarez (Técnica Diagnóstico)',
      email: 'sofia.a@fcc-taller.com',
      rol: 'tecnico',
      estado: 'En revisión',
      ultimaConexion: 'Ayer'
    }
  ];

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/autenticacion']);
  }
}
