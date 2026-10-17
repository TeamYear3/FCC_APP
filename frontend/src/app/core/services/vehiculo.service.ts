import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VehiculoCreatePayload {
  cliente_id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number | null;
  tipo_motor?: string;
  kilometraje?: number | null;
  color?: string;
  numero_chasis?: string | null;
  nro_chasis?: string | null;
  foto_url?: string | null;
}

export interface MantenimientoProgramadoCreatePayload {
  tipo_servicio: string;
  kilometraje_objetivo: number;
  fecha_limite?: string | null;
  completado?: boolean;
}

export interface MantenimientoProgramadoResponse extends MantenimientoProgramadoCreatePayload {
  id: string;
  vehiculo: string;
  porcentaje_desgaste?: number;
  completado_en?: string | null;
  creado_en: string;
}

export interface VehiculoResponse extends VehiculoCreatePayload {
  id: string;
  kilometraje_actual?: number;
  mantenimientos_programados?: MantenimientoProgramadoResponse[];
  creado_en: string;
  actualizado_en: string;
}

export interface HistorialVehiculoResponse {
  total_items: number;
  total_pages: number;
  current_page: number;
  results: any[];
}

export interface VehiculosPaginadosResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  total_items?: number;
  total_pages?: number;
  current_page?: number;
  results: VehiculoResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class VehiculoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/vehiculos/`;

  /**
   * Envía la solicitud de registro de un nuevo vehículo hacia POST /api/vehiculos/
   */
  crearVehiculo(payload: VehiculoCreatePayload): Observable<VehiculoResponse> {
    return this.http.post<VehiculoResponse>(this.apiUrl, payload);
  }

  /**
   * Obtiene los detalles de un vehículo
   */
  obtenerVehiculoPorId(id: string): Observable<VehiculoResponse> {
    return this.http.get<VehiculoResponse>(`${this.apiUrl}${id}/`);
  }

  /**
   * Actualiza los datos de un vehículo existente.
   */
  actualizarVehiculo(id: string, payload: Partial<VehiculoCreatePayload>): Observable<VehiculoResponse> {
    return this.http.patch<VehiculoResponse>(`${this.apiUrl}${id}/`, payload);
  }

  /**
   * Obtiene la lista de vehículos del backend (GET /api/vehiculos/ o GET /api/vehiculos/?cliente=<id>)
   * Consume la propiedad .results de la respuesta paginada estandarizada de la API.
   */
  getVehiculos(clienteId?: string): Observable<VehiculoResponse[]> {
    const url = clienteId ? `${this.apiUrl}?cliente=${clienteId}` : this.apiUrl;
    return this.http.get<VehiculosPaginadosResponse | VehiculoResponse[]>(url).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.results || []))
    );
  }

  /**
   * Obtiene la respuesta paginada completa de vehículos (TK170)
   */
  getVehiculosPaginados(clienteId?: string, page: number = 1, limit: number = 10): Observable<VehiculosPaginadosResponse> {
    const baseUrl = clienteId ? `${this.apiUrl}?cliente=${clienteId}` : this.apiUrl;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return this.http.get<VehiculosPaginadosResponse>(`${baseUrl}${separator}page=${page}&limit=${limit}`);
  }

  /**
   * Obtiene los detalles de un vehículo por su ID (GET /api/vehiculos/<id>/)
   */
  getVehiculoById(id: string): Observable<VehiculoResponse> {
    return this.http.get<VehiculoResponse>(`${this.apiUrl}${id}/`);
  }

  /**
   * Obtiene el historial de intervenciones de un vehículo con paginación (GET /api/vehiculos/<id>/historial/)
   */
  obtenerHistorialVehiculo(id: string, page: number = 1, limit: number = 10): Observable<HistorialVehiculoResponse> {
    return this.http.get<HistorialVehiculoResponse>(`${this.apiUrl}${id}/historial/?page=${page}&limit=${limit}`);
  }

  /**
   * Descarga el reporte en PDF del historial de un vehículo (GET /api/vehiculos/<id>/historial/pdf/)
   */
  descargarHistorialPDF(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}${id}/historial/pdf/`, { responseType: 'blob' });
  }

  /**
   * Reasigna la titularidad de un vehículo a un nuevo cliente (POST /api/vehiculos/<id>/reasignar/)
   */
  reasignarVehiculo(vehiculoId: string, nuevoClienteId: string): Observable<VehiculoResponse> {
    return this.http.post<VehiculoResponse>(`${this.apiUrl}${vehiculoId}/reasignar/`, {
      nuevo_cliente_id: nuevoClienteId
    });
  }

  /**
   * Obtiene los mantenimientos programados de un vehículo (GET /api/vehiculos/<id>/mantenimientos/)
   */
  obtenerMantenimientosProgramados(vehiculoId: string): Observable<MantenimientoProgramadoResponse[]> {
    return this.http.get<MantenimientoProgramadoResponse[]>(`${this.apiUrl}${vehiculoId}/mantenimientos/`);
  }

  /**
   * Crea un mantenimiento programado para un vehículo (POST /api/vehiculos/<id>/mantenimientos/)
   */
  crearMantenimientoProgramado(vehiculoId: string, payload: MantenimientoProgramadoCreatePayload): Observable<MantenimientoProgramadoResponse> {
    return this.http.post<MantenimientoProgramadoResponse>(`${this.apiUrl}${vehiculoId}/mantenimientos/`, payload);
  }
}
