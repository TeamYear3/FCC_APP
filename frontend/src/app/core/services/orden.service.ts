import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OrdenPayload {
  vehiculo_id: string;
  descripcion_problema: string;
  fecha_ingreso: string; // YYYY-MM-DD
  estado?: string;
}

export interface OrdenResponse {
  id: string;
  numero_ot: string;
  vehiculo_id: string;
  descripcion_problema: string;
  fecha_ingreso: string;
  estado: string;
  tecnico?: string | null;
  fecha_entrega?: string | null;
  comentario_rechazo?: string | null;
  creado_en: string;
  actualizado_en: string;
  vehiculo_patente?: string;
  cliente_nombre?: string;
  monto_total?: number;
}

export interface OrdenFiltros {
  patente?: string;
  cliente?: string;
  estado?: string;
  tecnico?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface OrdenesPaginadasResponse {
  total_items: number;
  total_pages: number;
  current_page: number;
  results: OrdenResponse[];
}

export interface HistorialEstadoItem {
  id: string;
  estado_anterior: string | null;
  estado_nuevo: string;
  usuario_nombre: string;
  comentario?: string | null;
  creado_en: string;
}

export interface OrdenHistorialResponse {
  orden_id: string;
  numero_ot: string;
  estado_actual: string;
  estado_actual_display: string;
  historial: HistorialEstadoItem[];
}

@Injectable({
  providedIn: 'root'
})
export class OrdenService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ordenes/`;

  /**
   * Crea una nueva orden de trabajo (POST /api/ordenes/)
   */
  crearOrden(payload: OrdenPayload): Observable<OrdenResponse> {
    return this.http.post<OrdenResponse>(this.apiUrl, payload);
  }

  /**
   * Obtiene la lista paginada de Órdenes de Trabajo aplicando filtros acumulativos (GET /api/ordenes/)
   */
  obtenerOrdenes(filtros: OrdenFiltros = {}, page: number = 1, limit: number = 10): Observable<OrdenesPaginadasResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filtros.patente?.trim()) params = params.set('patente', filtros.patente.trim());
    if (filtros.cliente?.trim()) params = params.set('cliente', filtros.cliente.trim());
    if (filtros.estado?.trim() && filtros.estado.toLowerCase() !== 'todos') params = params.set('estado', filtros.estado.trim());
    if (filtros.tecnico?.trim()) params = params.set('tecnico', filtros.tecnico.trim());
    if (filtros.fecha_desde) params = params.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params = params.set('fecha_hasta', filtros.fecha_hasta);

    return this.http.get<OrdenesPaginadasResponse>(this.apiUrl, { params });
  }

  /**
   * Consultar estado actual e historial cronológico de la OT (GET /api/ordenes/<id>/historial/) (TK046)
   */
  obtenerEstadoHistorial(ordenId: string): Observable<OrdenHistorialResponse> {
    return this.http.get<OrdenHistorialResponse>(`${this.apiUrl}${ordenId}/historial/`);
  }

  /**
   * Actualizar el estado de la OT (PATCH /api/ordenes/<id>/estado/) (TK033 & TK035)
   */
  actualizarEstado(ordenId: string, estado: string, comentario: string = ''): Observable<OrdenHistorialResponse> {
    return this.http.patch<OrdenHistorialResponse>(`${this.apiUrl}${ordenId}/estado/`, { estado, comentario });
  }
}

