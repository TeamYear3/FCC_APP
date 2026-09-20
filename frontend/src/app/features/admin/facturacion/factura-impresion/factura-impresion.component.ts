import { Component, Input, Output, EventEmitter, HostListener, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Factura } from '../../../../core/models/facturacion.model';
import { OrdenService, ItemPresupuesto } from '../../../../core/services/orden.service';

@Component({
  selector: 'app-factura-impresion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './factura-impresion.component.html',
  styleUrl: './factura-impresion.component.css'
})
export class FacturaImpresionComponent {
  private readonly ordenService = inject(OrdenService);

  @Input() mostrar = false;
  private _factura: Factura | null = null;

  @Input()
  set factura(val: Factura | null) {
    this._factura = val;
    if (val && val.orden_trabajo) {
      this.cargarItemsOrden(val.orden_trabajo);
    } else {
      this.items.set([]);
    }
  }

  get factura(): Factura | null {
    return this._factura;
  }

  @Output() cerrado = new EventEmitter<void>();

  readonly items = signal<ItemPresupuesto[]>([]);
  readonly cargandoItems = signal<boolean>(false);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mostrar) {
      this.cerrarModal();
    }
  }

  cargarItemsOrden(ordenId: string): void {
    this.cargandoItems.set(true);
    this.ordenService.obtenerItemsPresupuesto(ordenId).subscribe({
      next: (res) => {
        this.items.set(res || []);
        this.cargandoItems.set(false);
      },
      error: () => {
        this.items.set([]);
        this.cargandoItems.set(false);
      }
    });
  }

  cerrarModal(): void {
    this.cerrado.emit();
  }

  imprimir(): void {
    window.print();
  }

  getCodigoComprobante(): string {
    const tipo = (this.factura?.tipo_comprobante || 'B').toUpperCase();
    switch (tipo) {
      case 'A': return '001';
      case 'B': return '006';
      case 'C': return '011';
      default: return '006';
    }
  }

  getSubtotalManoObra(): number {
    return this.items()
      .filter(i => i.tipo === 'mano_de_obra')
      .reduce((acc, i) => acc + Number(i.subtotal || (i.cantidad * i.precio_unitario)), 0);
  }

  getSubtotalRepuestos(): number {
    return this.items()
      .filter(i => i.tipo === 'repuesto')
      .reduce((acc, i) => acc + Number(i.subtotal || (i.cantidad * i.precio_unitario)), 0);
  }
}
