import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

export interface UserSummary {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'tecnico' | 'cliente';
  estado: 'Activo' | 'En revisión' | 'Pendiente';
  ultimaConexion: string;
}

@Component({
  selector: 'app-taller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './taller-dashboard.component.html',
  styleUrl: './taller-dashboard.component.css'
})
export class TallerDashboardComponent {
  readonly authService = inject(AuthService);
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
}
