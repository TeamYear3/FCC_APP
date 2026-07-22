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
   * Obtiene el listado de todos los clientes registrados desde GET /api/clientes/
   */
  obtenerClientes(): Observable<ClienteResponse[]> {
    return this.http.get<ClienteResponse[]>(this.apiUrl);
  }

  /**
   * Obtiene los datos detallados de un cliente específico por su UUID
   */
  obtenerClientePorId(id: string): Observable<ClienteResponse> {
    return this.http.get<ClienteResponse>(`${this.apiUrl}${id}/`);
  }
}
