import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { ClienteService } from '../../core/services/cliente.service';
import { TallerService } from '../../core/services/taller.service';
import { VehiculoService } from '../../core/services/vehiculo.service';
import { PageComponent } from '../../shared/components/page-component/page-component';
import { ExpedienteClienteModalComponent } from './expediente-cliente-modal/expediente-cliente-modal.component';

export interface ClienteDisplayItem {
  id: string;
  nombreCompleto: string;
  tipoDocumento: string;
  dniCuit: string;
  condicionIva?: string;
  telefono: string;
  email: string;
  flota: string[];
  vehiculos_count: number;
  estado: 'En proceso' | 'En revisión' | 'Pendiente' | 'Activo';
  ordenActiva: string;
  ots_activas: number;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [RouterLink, PageComponent, ExpedienteClienteModalComponent],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.css',
})
export class ClientesComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly clienteService = inject(ClienteService);
  private readonly tallerService = inject(TallerService);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly router = inject(Router);

  readonly userRole = this.authService.userRoleSignal;
  readonly isAdminView = signal<boolean>(false);

  readonly cargando = signal<boolean>(true);
  readonly mensajeError = signal<string | null>(null);
  readonly clientes = signal<ClienteDisplayItem[]>([]);

  readonly clienteSeleccionadoExpediente = signal<ClienteDisplayItem | null>(null);
  readonly mostrarModalExpediente = signal<boolean>(false);

  readonly terminoBusqueda = signal<string>('');
  readonly estadoFiltro = signal<string>('Todos');

  readonly clientesFiltrados = computed(() => {
    const termino = this.terminoBusqueda().trim().toLowerCase();
    const estado = this.estadoFiltro();

    return this.clientes().filter(cli => {
      // 1. Filtrado por Píldora de Estado
      if (estado !== 'Todos' && cli.estado !== estado) {
        return false;
      }

      // 2. Filtrado por Término de Búsqueda Textual
      if (!termino) {
        return true;
      }

      const matchNombre = cli.nombreCompleto.toLowerCase().includes(termino);
      const matchDoc = cli.dniCuit.toLowerCase().includes(termino);
      const matchEmail = cli.email.toLowerCase().includes(termino);
      const matchTel = cli.telefono.toLowerCase().includes(termino);
      const matchFlota = cli.flota.some(v => v.toLowerCase().includes(termino));

      return matchNombre || matchDoc || matchEmail || matchTel || matchFlota;
    });
  });

  readonly totalClientes = computed(() => this.clientes().length);
  readonly cuentasCorporativas = computed(() => 
    this.clientes().filter(c => c.tipoDocumento === 'CUIT' || c.condicionIva === 'RI' || c.condicionIva === 'EX').length
  );
  readonly totalVehiculos = computed(() => 
    this.clientes().reduce((acc, c) => acc + (c.flota.length || c.vehiculos_count || 0), 0)
  );
  readonly ordenesAbiertas = computed(() => 
    this.clientes().reduce((acc, c) => acc + (c.ots_activas || 0), 0)
  );

  ngOnInit(): void {
    this.isAdminView.set(this.router.url.startsWith('/admin'));
    this.cargarClientes();
  }

  cargarClientes(): void {
    this.cargando.set(true);
    this.mensajeError.set(null);

    forkJoin({
      clientes: this.clienteService.obtenerClientes(),
      resumen: this.tallerService.getResumenClientes().pipe(catchError(() => of([]))),
      vehiculos: this.vehiculoService.getVehiculos().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ clientes, resumen, vehiculos }) => {
        const mapResumen = new Map(resumen.map(r => [r.id, r]));
        const mapVehiculos = new Map<string, string[]>();

        vehiculos.forEach(v => {
          if (v.cliente_id) {
            const desc = `${v.marca} ${v.modelo} (${v.patente})`.trim();
            const list = mapVehiculos.get(v.cliente_id) || [];
            list.push(desc);
            mapVehiculos.set(v.cliente_id, list);
          }
        });

        const items: ClienteDisplayItem[] = clientes.map(c => {
          const res = mapResumen.get(c.id);
          const vehs = mapVehiculos.get(c.id) || [];
          const otsActivas = res ? res.ots_activas : 0;
          
          let estadoCalculado: 'En proceso' | 'En revisión' | 'Pendiente' | 'Activo' = 'Activo';
          if (otsActivas > 0) {
            estadoCalculado = 'En proceso';
          } else if (vehs.length === 0) {
            estadoCalculado = 'Pendiente';
          }

          return {
            id: c.id,
            nombreCompleto: `${c.nombre} ${c.apellido}`.trim(),
            tipoDocumento: c.tipo_documento || 'DNI',
            dniCuit: c.dni_cuit,
            condicionIva: c.condicion_iva,
            telefono: c.telefono || 'Sin contacto',
            email: c.dni_cuit ? `cliente_${c.dni_cuit}@taller.com` : 'contacto@taller.com',
            flota: vehs,
            vehiculos_count: vehs.length || (res ? res.vehiculos_count : 0),
            estado: estadoCalculado,
            ordenActiva: otsActivas > 0 ? `${otsActivas} OT(s) activa(s)` : 'Sin OT activa',
            ots_activas: otsActivas
          };
        });

        this.clientes.set(items);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar clientes desde la API:', err);
        this.mensajeError.set('No se pudo cargar la cartera de clientes desde el servidor.');
        this.cargando.set(false);
      }
    });
  }

  abrirExpediente(cli: ClienteDisplayItem): void {
    this.clienteSeleccionadoExpediente.set(cli);
    this.mostrarModalExpediente.set(true);
  }

  cerrarExpediente(): void {
    this.mostrarModalExpediente.set(false);
    this.clienteSeleccionadoExpediente.set(null);
  }

  onBusquedaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.terminoBusqueda.set(input ? input.value : '');
  }

  setEstadoFiltro(estado: string): void {
    this.estadoFiltro.set(estado);
  }

  limpiarFiltros(): void {
    this.terminoBusqueda.set('');
    this.estadoFiltro.set('Todos');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/autenticacion']);
  }
}
