import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VehiculoResponse {
  id: string;
  cliente_id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  kilometraje: number;
  color: string;
  foto_url?: string | null;
  creado_en: string;
  actualizado_en: string;
}

@Injectable({
  providedIn: 'root'
})
export class VehiculoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/vehiculos/`;

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
}
