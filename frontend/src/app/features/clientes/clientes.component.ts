import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

export interface ClienteSummary {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  flota: string[];
  estado: 'En proceso' | 'En revisión' | 'Pendiente';
  ordenActiva: string;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.css'
})
export class ClientesComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userRole = this.authService.userRoleSignal;

  readonly listaClientes: ClienteSummary[] = [
    {
      id: 'CLI-019',
      nombre: 'Carlos Rodríguez',
      telefono: '+54 9 11 5566-7788',
      email: 'crodriguez@empresa.com',
      flota: ['Volkswagen Amarok V6 AD456XY', 'Ford Ranger XLT AF889WZ'],
      estado: 'En proceso',
      ordenActiva: '#OT-1257'
    },
    {
      id: 'CLI-024',
      nombre: 'Logística y Transportes Sur S.A.',
      telefono: '+54 9 11 4433-2211',
      email: 'flota@transportessur.com.ar',
      flota: ['Mercedes-Benz Sprinter AG334BB', 'Toyota Hilux AE998ZZ'],
      estado: 'En revisión',
      ordenActiva: '#OT-1242'
    },
    {
      id: 'CLI-031',
      nombre: 'Mariana Peralta',
      telefono: '+54 9 11 8877-6655',
      email: 'mperalta@gmail.com',
      flota: ['Peugeot 208 GT AF112MN'],
      estado: 'Pendiente',
      ordenActiva: '#OT-1260'
    }
  ];

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/autenticacion']);
  }
}
