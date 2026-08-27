import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturacionService } from '../../../core/services/facturacion.service';
import {
  FacturaCalendarioItem,
  ResumenFinanciero,
  EstadoPago,
  SemaforoColor
} from '../../../core/models/facturacion.model';

export interface CalendarDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  facturas: FacturaCalendarioItem[];
}

@Component({
  selector: 'app-facturacion-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './facturacion-calendario.component.html',
  styleUrl: './facturacion-calendario.component.css'
})
export class FacturacionCalendarioComponent implements OnInit {
  private readonly facturacionService = inject(FacturacionService);

  readonly facturas = signal<FacturaCalendarioItem[]>([]);
  readonly resumen = signal<ResumenFinanciero>({
    total_facturado: 0,
    total_pagado: 0,
    total_vencido: 0,
    total_a_vencer: 0,
    cantidad_comprobantes: 0
  });
  readonly cargando = signal<boolean>(false);
  readonly facturaSeleccionada = signal<FacturaCalendarioItem | null>(null);
  readonly modalDetalleAbierto = signal<boolean>(false);
  readonly actualizandoPago = signal<boolean>(false);

  // Fecha de referencia del calendario
  currentDate = new Date();
  readonly calendarDays = signal<CalendarDay[]>([]);
  readonly monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  readonly dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Filtro por semáforo
  filtroSemaforo: string = '';

  ngOnInit(): void {
    this.cargarCalendario();
  }

  cargarCalendario(): void {
    this.cargando.set(true);
    this.facturacionService.getFacturasCalendario().subscribe({
      next: (data) => {
        this.facturas.set(data.facturas);
        this.resumen.set(data.resumen);
        this.generarMatrizCalendario();
        this.cargando.set(false);
      },
      error: () => {
        // Fallback enriquecido para demo local
        this.cargarFallbackCalendario();
        this.cargando.set(false);
      }
    });
  }

  private cargarFallbackCalendario(): void {
    const hoy = new Date();
    const formato = (d: Date) => d.toISOString().split('T')[0];

    const d1 = new Date(hoy.getFullYear(), hoy.getMonth(), 5);
    const d2 = new Date(hoy.getFullYear(), hoy.getMonth(), 12);
    const d3 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 4);
    const d4 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 3);

    const mocks: FacturaCalendarioItem[] = [
      {
        id: 'cal-1',
        numero_comprobante: 'B-0001-00000101',
        tipo_comprobante: 'B',
        total: 64500,
        cliente: 'Gonzalo Pérez',
        patente: 'AA333ZZ',
        fecha_emision: formato(d1),
        fecha_vencimiento_pago: formato(d1),
        estado_pago: 'pagada',
        semaforo: 'pagada',
        cae: '74192847561928'
      },
      {
        id: 'cal-2',
        numero_comprobante: 'A-0001-00000102',
        tipo_comprobante: 'A',
        total: 195000,
        cliente: 'Logística Express SA',
        patente: 'AF888LL',
        fecha_emision: formato(d2),
        fecha_vencimiento_pago: formato(d2),
        estado_pago: 'sin_interaccion',
        semaforo: 'sin_interaccion',
        cae: '74291847291039'
      },
      {
        id: 'cal-3',
        numero_comprobante: 'B-0001-00000103',
        tipo_comprobante: 'B',
        total: 89000,
        cliente: 'Laura Benítez',
        patente: 'AE123KK',
        fecha_emision: formato(d3),
        fecha_vencimiento_pago: formato(d3),
        estado_pago: 'a_vencer',
        semaforo: 'a_vencer',
        cae: '74391847501928'
      },
      {
        id: 'cal-4',
        numero_comprobante: 'B-0001-00000104',
        tipo_comprobante: 'B',
        total: 142000,
        cliente: 'Matías Díaz',
        patente: 'AD567PP',
        fecha_emision: formato(d4),
        fecha_vencimiento_pago: formato(d4),
        estado_pago: 'vencida',
        semaforo: 'vencida',
        cae: '74491847291055'
      }
    ];

    this.facturas.set(mocks);
    this.resumen.set({
      total_facturado: 490500,
      total_pagado: 64500,
      total_vencido: 142000,
      total_a_vencer: 89000,
      cantidad_comprobantes: 4
    });
    this.generarMatrizCalendario();
  }

  generarMatrizCalendario(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Domingo
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: CalendarDay[] = [];
    const todayString = new Date().toISOString().split('T')[0];

    // Días del mes anterior para rellenar la primera semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: dateStr === todayString,
        facturas: this.obtenerFacturasPorFecha(dateStr)
      });
    }

    // Días del mes actual
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayString,
        facturas: this.obtenerFacturasPorFecha(dateStr)
      });
    }

    // Días del próximo mes para completar la cuadrícula de 35 o 42 celdas
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayString,
        facturas: this.obtenerFacturasPorFecha(dateStr)
      });
    }

    this.calendarDays.set(days);
  }

  obtenerFacturasPorFecha(dateStr: string): FacturaCalendarioItem[] {
    return this.facturas().filter((f) => {
      const fecha = f.fecha_vencimiento_pago || f.fecha_emision;
      const coincideFecha = fecha === dateStr;
      const coincideFiltro = !this.filtroSemaforo || f.semaforo === this.filtroSemaforo;
      return coincideFecha && coincideFiltro;
    });
  }

  mesAnterior(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.generarMatrizCalendario();
  }

  mesSiguiente(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.generarMatrizCalendario();
  }

  hoy(): void {
    this.currentDate = new Date();
    this.generarMatrizCalendario();
  }

  get nombreMesActual(): string {
    return `${this.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  abrirDetalle(factura: FacturaCalendarioItem): void {
    this.facturaSeleccionada.set(factura);
    this.modalDetalleAbierto.set(true);
  }

  cerrarModalDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.facturaSeleccionada.set(null);
  }

  cambiarEstadoPago(nuevoEstado: EstadoPago): void {
    const f = this.facturaSeleccionada();
    if (!f) return;

    this.actualizandoPago.set(true);
    this.facturacionService.actualizarEstadoPago(f.id, nuevoEstado).subscribe({
      next: (facturaActualizada) => {
        this.facturas.update((list) =>
          list.map((item) =>
            item.id === f.id
              ? {
                  ...item,
                  estado_pago: facturaActualizada.estado_pago,
                  semaforo: facturaActualizada.semaforo
                }
              : item
          )
        );
        this.facturaSeleccionada.set({
          ...f,
          estado_pago: facturaActualizada.estado_pago,
          semaforo: facturaActualizada.semaforo
        });
        this.actualizandoPago.set(false);
        this.generarMatrizCalendario();
      },
      error: () => {
        // Fallback local
        const nuevoSemaforo: SemaforoColor =
          nuevoEstado === 'pagada'
            ? 'pagada'
            : nuevoEstado === 'vencida'
            ? 'vencida'
            : nuevoEstado === 'a_vencer'
            ? 'a_vencer'
            : 'sin_interaccion';

        this.facturas.update((list) =>
          list.map((item) =>
            item.id === f.id ? { ...item, estado_pago: nuevoEstado, semaforo: nuevoSemaforo } : item
          )
        );
        this.facturaSeleccionada.set({
          ...f,
          estado_pago: nuevoEstado,
          semaforo: nuevoSemaforo
        });
        this.actualizandoPago.set(false);
        this.generarMatrizCalendario();
      }
    });
  }

  imprimirFactura(): void {
    window.print();
  }
}
