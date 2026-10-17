import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ReportesService,
  ReporteRentabilidadResponse,
  KPIsRentabilidad,
  TopServicio,
  MargenesReparacion,
  HistoricoMensual
} from '../../../core/services/reportes.service';

@Component({
  selector: 'app-reportes-rentabilidad',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './reportes-rentabilidad.component.html',
  styleUrl: './reportes-rentabilidad.component.css'
})
export class ReportesRentabilidadComponent implements OnInit {
  private readonly reportesService = inject(ReportesService);

  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly periodoSeleccionado = signal<string>('mes');

  readonly reporte = signal<ReporteRentabilidadResponse | null>(null);

  ngOnInit(): void {
    this.cargarReporte();
  }

  cargarReporte(periodo?: string): void {
    if (periodo) {
      this.periodoSeleccionado.set(periodo);
    }
    this.cargando.set(true);
    this.error.set(null);

    this.reportesService.getRentabilidad(this.periodoSeleccionado()).subscribe({
      next: (data) => {
        this.reporte.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set('No se pudieron obtener las métricas de rentabilidad. Intente nuevamente.');
        this.cargando.set(false);
      }
    });
  }

  cambiarPeriodo(periodo: string): void {
    if (this.periodoSeleccionado() !== periodo) {
      this.cargarReporte(periodo);
    }
  }

  obtenerPorcentajeDemanda(cantidad: number): number {
    const total = this.reporte()?.top_servicios.reduce((acc, s) => acc + s.cantidad, 0) || 0;
    if (total === 0) return 0;
    return Math.round((cantidad / total) * 100);
  }

  obtenerMaximoHistorico(): number {
    const hist = this.reporte()?.historico_mensual || [];
    if (hist.length === 0) return 1;
    const max = Math.max(...hist.map(h => h.total));
    return max > 0 ? max : 1;
  }
}
