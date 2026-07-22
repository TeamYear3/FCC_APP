import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClientePayload {
  nombre: string;
  apellido: string;
  tipo_documento: 'DNI' | 'CUIT';
  dni_cuit: string;
  condicion_iva: 'CF' | 'RI' | 'MT' | 'EX';
  telefono?: string;
  domicilio?: string;
}

export interface ClienteResponse extends ClientePayload {
  id: string;
  usuario?: number | null;
  creado_en: string;
  actualizado_en: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/clientes/`;

  /**
   * Envía la solicitud de registro del nuevo cliente hacia el endpoint POST /api/clientes/
   */
  crearCliente(payload: ClientePayload): Observable<ClienteResponse> {
    return this.http.post<ClienteResponse>(this.apiUrl, payload);
  }

  /**
   * Obtiene un cliente por su ID (GET /api/clientes/<id>/)
   */
  getClienteById(id: string): Observable<ClienteResponse> {
    return this.http.get<ClienteResponse>(`${this.apiUrl}${id}/`);
  }

  /**
   * Actualiza los datos de un cliente (PATCH /api/clientes/<id>/)
   */
  actualizarCliente(id: string, payload: Partial<ClientePayload>): Observable<ClienteResponse> {
    return this.http.patch<ClienteResponse>(`${this.apiUrl}${id}/`, payload);
  }
}
