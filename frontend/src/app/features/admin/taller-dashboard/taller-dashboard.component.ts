import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SidebarService, RolVistaPrevia } from '../../../core/services/sidebar.service';
import { TallerService, MecanicoResumen, ClienteResumen } from '../../../core/services/taller.service';
import { OrdenService, OrdenResponse } from '../../../core/services/orden.service';

@Component({
  selector: 'app-taller-dashboard',
  standalone: true,
  imports: [DecimalPipe, DatePipe, RouterLink],
  templateUrl: './taller-dashboard.component.html',
  styleUrl: './taller-dashboard.component.css'
})
export class TallerDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly tallerService = inject(TallerService);
  private readonly ordenService = inject(OrdenService);
  readonly sidebarService = inject(SidebarService);

  readonly userRole = this.authService.userRoleSignal;
  readonly mecanicos = signal<MecanicoResumen[]>([]);
  readonly clientes = signal<ClienteResumen[]>([]);
  readonly ordenesRecientes = signal<OrdenResponse[]>([]);
  readonly cargandoMecanicos = signal<boolean>(true);
  readonly cargandoClientes = signal<boolean>(true);
  readonly cargandoOrdenes = signal<boolean>(true);

  readonly totalOtsActivas = computed(() =>
    this.mecanicos().reduce((acc, m) => acc + (m.ots_activas || 0), 0)
  );

  readonly capacidadPromedio = computed(() => {
    const mecs = this.mecanicos();
    if (mecs.length === 0) return 0;
    const sum = mecs.reduce((acc, m) => acc + (m.porcentaje_carga || 0), 0);
    return Math.round(sum / mecs.length);
  });

  readonly totalClientesRegistrados = computed(() => this.clientes().length);

  readonly facturacionTotalConsolidada = computed(() =>
    this.clientes().reduce((acc, c) => acc + (c.monto_total_facturado || 0), 0)
  );

  ngOnInit(): void {
    this.cargarResumenMecanicos();
    this.cargarResumenClientes();
    this.cargarOrdenesRecientes();
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

  cargarOrdenesRecientes(): void {
    this.cargandoOrdenes.set(true);
    this.ordenService.obtenerOrdenes({}, 1, 5).subscribe({
      next: (res) => {
        this.ordenesRecientes.set(res.results || []);
        this.cargandoOrdenes.set(false);
      },
      error: () => this.cargandoOrdenes.set(false)
    });
  }

  cambiarVistaPrevia(rol: RolVistaPrevia): void {
    this.sidebarService.setVistaPreviaRol(rol);
  }
}

