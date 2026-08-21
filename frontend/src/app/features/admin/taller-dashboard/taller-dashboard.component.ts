import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SidebarService, RolVistaPrevia } from '../../../core/services/sidebar.service';
import { TallerService, MecanicoResumen, ClienteResumen } from '../../../core/services/taller.service';

@Component({
  selector: 'app-taller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './taller-dashboard.component.html',
  styleUrl: './taller-dashboard.component.css'
})
export class TallerDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly tallerService = inject(TallerService);
  readonly sidebarService = inject(SidebarService);

  readonly userRole = this.authService.userRoleSignal;
  readonly mecanicos = signal<MecanicoResumen[]>([]);
  readonly clientes = signal<ClienteResumen[]>([]);
  readonly cargandoMecanicos = signal<boolean>(true);
  readonly cargandoClientes = signal<boolean>(true);

  ngOnInit(): void {
    this.cargarResumenMecanicos();
    this.cargarResumenClientes();
  }

  cargarResumenMecanicos(): void {
    this.cargandoMecanicos.set(true);
    this.tallerService.getResumenMecanicos().subscribe({
      next: (data) => {
        this.mecanicos.set(data);
        this.cargandoMecanicos.set(false);
      },
      error: () => this.cargandoMecanicos.set(false)
    });
  }

  cargarResumenClientes(): void {
    this.cargandoClientes.set(true);
    this.tallerService.getResumenClientes().subscribe({
      next: (data) => {
        this.clientes.set(data);
        this.cargandoClientes.set(false);
      },
      error: () => this.cargandoClientes.set(false)
    });
  }

  cambiarVistaPrevia(rol: RolVistaPrevia): void {
    this.sidebarService.setVistaPreviaRol(rol);
  }
}
