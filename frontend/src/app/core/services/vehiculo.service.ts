import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VehiculoCreatePayload {
  cliente_id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number | null;
  kilometraje?: number | null;
  color?: string;
  numero_chasis?: string;
  nro_chasis?: string;
  foto_url?: string | null;
}

export interface VehiculoResponse extends VehiculoCreatePayload {
  id: string;
  creado_en: string;
  actualizado_en: string;
}

export interface HistorialVehiculoResponse {
  total_items: number;
  total_pages: number;
  current_page: number;
  results: any[];
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
   * Obtiene la lista de vehículos del backend (GET /api/vehiculos/)
   */
  getVehiculos(): Observable<VehiculoResponse[]> {
    return this.http.get<VehiculoResponse[]>(this.apiUrl);
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
}
