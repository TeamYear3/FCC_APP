import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
}
