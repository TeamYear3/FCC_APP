import { Component, EventEmitter, Input, Output, inject, signal, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrdenService, OrdenResponse, OrdenesPaginadasResponse } from '../../../core/services/orden.service';
import { VehiculoService, VehiculoResponse } from '../../../core/services/vehiculo.service';
import { ClienteDisplayItem } from '../clientes.component';

@Component({
  selector: 'app-expediente-cliente-modal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './expediente-cliente-modal.component.html',
  styleUrl: './expediente-cliente-modal.component.css'
})
export class ExpedienteClienteModalComponent implements OnChanges {
  private readonly ordenService = inject(OrdenService);
  private readonly vehiculoService = inject(VehiculoService);

  @Input() mostrar = false;
  @Input() cliente: ClienteDisplayItem | null = null;
  @Output() cerrado = new EventEmitter<void>();

  readonly cargandoDetalle = signal<boolean>(false);
  readonly ordenesCliente = signal<OrdenResponse[]>([]);
  readonly vehiculosCliente = signal<VehiculoResponse[]>([]);

  readonly tabActivo = signal<'resumen' | 'vehiculos' | 'ordenes'>('resumen');

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.mostrar) {
      this.cerrarModal();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cliente'] && this.cliente && this.mostrar) {
      this.cargarDetallesCliente(this.cliente.id);
    }
  }

  cargarDetallesCliente(clienteId: string): void {
    this.cargandoDetalle.set(true);

    forkJoin({
      ordenesRes: this.ordenService.obtenerOrdenes().pipe(catchError(() => of({ results: [] }))),
      vehiculos: this.vehiculoService.getVehiculos().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ ordenesRes, vehiculos }) => {
        const vehi = vehiculos.filter(v => v.cliente_id === clienteId);
        this.vehiculosCliente.set(vehi);

        const vehiIds = new Set(vehi.map(v => v.id));
        const lista = ordenesRes && Array.isArray((ordenesRes as any).results)
          ? (ordenesRes as any).results
          : (Array.isArray(ordenesRes) ? (ordenesRes as any) : []);

        const ots = lista.filter((o: OrdenResponse) => {
          if (o.vehiculo_id && vehiIds.has(o.vehiculo_id)) return true;
          if ((o as any).cliente === clienteId) return true;
          if (o.cliente_nombre && this.cliente?.nombreCompleto.toLowerCase().includes(o.cliente_nombre.toLowerCase())) return true;
          return false;
        });

        this.ordenesCliente.set(ots);
        this.cargandoDetalle.set(false);
      },
      error: () => {
        this.ordenesCliente.set([]);
        this.vehiculosCliente.set([]);
        this.cargandoDetalle.set(false);
      }
    });
  }

  setTab(tab: 'resumen' | 'vehiculos' | 'ordenes'): void {
    this.tabActivo.set(tab);
  }

  cerrarModal(): void {
    this.cerrado.emit();
  }

  getIniciales(): string {
    if (!this.cliente || !this.cliente.nombreCompleto) return 'CL';
    const partes = this.cliente.nombreCompleto.trim().split(' ');
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return partes[0].substring(0, 2).toUpperCase();
  }
}
