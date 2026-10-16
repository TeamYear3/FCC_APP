import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface KPIsRentabilidad {
  total_facturado: number;
  total_mano_obra: number;
  total_repuestos: number;
  margen_mano_obra_pct: number;
  margen_repuestos_pct: number;
  cantidad_ordenes: number;
  ticket_promedio: number;
}

export interface DetalleMargen {
  monto: number;
  porcentaje: number;
}

export interface MargenesReparacion {
  mano_de_obra: DetalleMargen;
  repuestos: DetalleMargen;
}

export interface TopServicio {
  servicio: string;
  cantidad: number;
  total: number;
}

export interface HistoricoMensual {
  periodo_label: string;
  mano_de_obra: number;
  repuestos: number;
  total: number;
  cantidad_ordenes: number;
}

export interface ReporteRentabilidadResponse {
  periodo: string;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  kpis: KPIsRentabilidad;
  margenes_reparacion: MargenesReparacion;
  top_servicios: TopServicio[];
  historico_mensual: HistoricoMensual[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reportes/rentabilidad/`;

  /**
   * Obtiene métricas analíticas de rentabilidad, márgenes y ranking de servicios más demandados (TK210).
   */
  getRentabilidad(periodo: string = 'mes', fechaDesde?: string, fechaHasta?: string): Observable<ReporteRentabilidadResponse> {
    let params = new HttpParams().set('periodo', periodo);
    if (fechaDesde) {
      params = params.set('fecha_desde', fechaDesde);
    }
    if (fechaHasta) {
      params = params.set('fecha_hasta', fechaHasta);
    }
    return this.http.get<ReporteRentabilidadResponse>(this.baseUrl, { params });
  }
}
