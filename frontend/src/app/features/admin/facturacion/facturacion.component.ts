import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturacionService } from '../../../core/services/facturacion.service';
import { OrdenService } from '../../../core/services/orden.service';
import { Factura, TipoComprobante, EstadoPago } from '../../../core/models/facturacion.model';

import { FacturaImpresionComponent } from './factura-impresion/factura-impresion.component';

export interface OrdenPendienteFacturar {
  id: string;
  numero_ot: string;
  cliente: string;
  dni_cuit: string;
  vehiculo: string;
  patente: string;
  monto: number;
}

@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [CommonModule, FormsModule, FacturaImpresionComponent],
  templateUrl: './facturacion.component.html',
  styleUrl: './facturacion.component.css'
})
export class FacturacionComponent implements OnInit {
  private readonly facturacionService = inject(FacturacionService);
  private readonly ordenService = inject(OrdenService);

  readonly facturas = signal<Factura[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly emitirEnProgreso = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly facturaReciente = signal<Factura | null>(null);
  readonly modalEmisionAbierto = signal<boolean>(false);
  readonly modalDetalleAbierto = signal<boolean>(false);
  readonly facturaSeleccionada = signal<Factura | null>(null);

  // Modal de impresión A4 (TK099)
  readonly modalImpresionAbierto = signal<boolean>(false);
  readonly facturaAImprimir = signal<Factura | null>(null);

  // Filtro
  filtroEstadoPago: string = '';
  filtroTipo: string = '';
  busqueda: string = '';

  // Formulario de emisión
  ordenSeleccionadaId: string = '';
  tipoComprobanteSeleccionado: TipoComprobante = 'B';
  puntoVentaSeleccionado: number = 1;
  diasVencimientoSeleccionado: number = 15;
  observacionesEmision: string = '';

  // Órdenes aprobadas/finalizadas reales listas para ser facturadas (TK098)
  readonly ordenesParaFacturar = signal<OrdenPendienteFacturar[]>([]);
  readonly cargandoOrdenes = signal<boolean>(false);

  ngOnInit(): void {
    this.cargarFacturas();
    this.cargarOrdenesPendientes();
  }

  cargarOrdenesPendientes(): void {
    this.cargandoOrdenes.set(true);
    this.ordenService.obtenerOrdenes({ estado: 'finalizado' }, 1, 50).subscribe({
      next: (res) => {
        const list = res.results || [];
        const mapped: OrdenPendienteFacturar[] = list.map(o => ({
          id: o.id,
          numero_ot: o.numero_ot || `OT-${o.id.slice(0, 4)}`,
          cliente: o.cliente_nombre || 'Cliente General',
          dni_cuit: o.cliente_dni_cuit || o.cliente_documento || 'Consumidor Final',
          vehiculo: o.vehiculo_marca_modelo || 'Vehículo Registrado',
          patente: o.vehiculo_patente || 'S/D',
          monto: typeof o.monto_total === 'number' ? o.monto_total : parseFloat(String(o.monto_total || '0'))
        }));
        this.ordenesParaFacturar.set(mapped);
        this.cargandoOrdenes.set(false);
      },
      error: () => {
        this.ordenesParaFacturar.set([]);
        this.cargandoOrdenes.set(false);
      }
    });
  }

  cargarFacturas(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.facturacionService.getFacturas({
      estado_pago: this.filtroEstadoPago || undefined,
      tipo: this.filtroTipo || undefined
    }).subscribe({
      next: (data) => {
        this.facturas.set(data || []);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al obtener facturas desde el servidor:', err);
        this.error.set('No se pudieron recuperar las facturas emitidas desde el servidor fiscal.');
        this.facturas.set([]);
        this.cargando.set(false);
      }
    });
  }

  abrirModalEmision(orden?: OrdenPendienteFacturar): void {
    const lista = this.ordenesParaFacturar();
    if (orden) {
      this.ordenSeleccionadaId = orden.id;
    } else if (lista.length > 0) {
      this.ordenSeleccionadaId = lista[0].id;
    } else {
      this.ordenSeleccionadaId = '';
    }
    this.tipoComprobanteSeleccionado = 'B';
    this.puntoVentaSeleccionado = 1;
    this.diasVencimientoSeleccionado = 15;
    this.observacionesEmision = '';
    this.error.set(null);
    this.modalEmisionAbierto.set(true);
  }

  cerrarModalEmision(): void {
    this.modalEmisionAbierto.set(false);
  }

  confirmarEmision(): void {
    if (!this.ordenSeleccionadaId) {
      this.error.set('Seleccione una Orden de Trabajo para facturar.');
      return;
    }

    this.emitirEnProgreso.set(true);
    this.error.set(null);

    this.facturacionService.emitirFactura({
      orden_trabajo_id: this.ordenSeleccionadaId,
      tipo_comprobante: this.tipoComprobanteSeleccionado,
      punto_venta: this.puntoVentaSeleccionado,
      dias_vencimiento_pago: this.diasVencimientoSeleccionado,
      observaciones: this.observacionesEmision
    }).subscribe({
      next: (nuevaFactura) => {
        this.emitirEnProgreso.set(false);
        this.modalEmisionAbierto.set(false);
        this.facturaReciente.set(nuevaFactura);
        this.facturas.update((prev) => [nuevaFactura, ...prev]);
        this.cargarOrdenesPendientes();
      },
      error: (err) => {
        console.error('Error al emitir factura en ARCA WebService:', err);
        this.emitirEnProgreso.set(false);
        const msg = err.error?.error || err.error?.detail || err.message || 'Error en la comunicación con el WebService de ARCA/AFIP.';
        this.error.set(msg);
      }
    });
  }

  cambiarEstadoPago(factura: Factura, nuevoEstado: EstadoPago): void {
    this.facturacionService.actualizarEstadoPago(factura.id, nuevoEstado).subscribe({
      next: (facturaActualizada) => {
        this.facturas.update(prev => prev.map(f => f.id === facturaActualizada.id ? facturaActualizada : f));
        if (this.facturaSeleccionada()?.id === facturaActualizada.id) {
          this.facturaSeleccionada.set(facturaActualizada);
        }
      },
      error: (err) => {
        console.error('Error al actualizar estado de cobro:', err);
        const msg = err.error?.error || err.error?.detail || 'No se pudo actualizar el estado de cobro de la factura.';
        alert(msg);
      }
    });
  }

  verDetalle(factura: Factura): void {
    this.facturaSeleccionada.set(factura);
    this.modalDetalleAbierto.set(true);
  }

  cerrarModalDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.facturaSeleccionada.set(null);
  }

  imprimirComprobante(factura: Factura): void {
    this.facturaAImprimir.set(factura);
    this.modalImpresionAbierto.set(true);
  }

  cerrarModalImpresion(): void {
    this.modalImpresionAbierto.set(false);
    this.facturaAImprimir.set(null);
  }

  facturasFiltradas(): Factura[] {
    return this.facturas().filter((f) => {
      const cumpleFiltroEstado = !this.filtroEstadoPago || f.estado_pago === this.filtroEstadoPago;
      const cumpleFiltroTipo = !this.filtroTipo || f.tipo_comprobante === this.filtroTipo;
      const term = this.busqueda.toLowerCase();
      const cumpleBusqueda =
        !term ||
        (f.numero_comprobante && f.numero_comprobante.toLowerCase().includes(term)) ||
        (f.cliente_nombre && f.cliente_nombre.toLowerCase().includes(term)) ||
        (f.vehiculo_patente && f.vehiculo_patente.toLowerCase().includes(term)) ||
        (f.cae && f.cae.includes(term));

      return cumpleFiltroEstado && cumpleFiltroTipo && cumpleBusqueda;
    });
  }
}
