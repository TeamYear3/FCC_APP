import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

export interface OrderSummary {
  numeroOrden: string;
  vehiculo: string;
  patente: string;
  estado: 'En proceso' | 'En revisión' | 'Pendiente';
  cliente: string;
  fechaIngreso: string;
  precioTotal: string;
  descripcion: string;
}

@Component({
  selector: 'app-portal-cliente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-cliente.component.html',
  styleUrl: './portal-cliente.component.css'
})
export class PortalClienteComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userRole = this.authService.userRoleSignal;

  readonly misOrdenes: OrderSummary[] = [
    {
      numeroOrden: '#OT-1257',
      vehiculo: 'Volkswagen Amarok V6 3.0 TDI',
      patente: 'AD 456 XY',
      estado: 'En proceso',
      cliente: 'Carlos Rodríguez',
      fechaIngreso: '16 Jul 2026 - 08:30 AM',
      precioTotal: '$ 485,000.00',
      descripcion: 'Reemplazo de kit de distribución y cambio de aceite sintético.'
    },
    {
      numeroOrden: '#OT-1242',
      vehiculo: 'Ford Ranger XLT 2.2 Diesel',
      patente: 'AF 889 WZ',
      estado: 'En revisión',
      cliente: 'Carlos Rodríguez',
      fechaIngreso: '14 Jul 2026 - 15:15 PM',
      precioTotal: '$ 310,500.00',
      descripcion: 'Diagnóstico electrónico computarizado e inspección de frenos ABS.'
    },
    {
      numeroOrden: '#OT-1260',
      vehiculo: 'Toyota Corolla Cross 2.0 Hybrid',
      patente: 'AE 123 KL',
      estado: 'Pendiente',
      cliente: 'Carlos Rodríguez',
      fechaIngreso: 'Agendado para 18 Jul 2026',
      precioTotal: '$ 125,000.00',
      descripcion: 'Alineación 3D, balanceo y control preventivo de suspensión.'
    }
  ];

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/autenticacion']);
  }
}
