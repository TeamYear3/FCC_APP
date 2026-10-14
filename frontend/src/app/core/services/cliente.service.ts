import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClientePayload {
  nombre: string;
  apellido: string;
  tipo_documento: 'DNI' | 'CUIT';
  dni_cuit: string;
  condicion_iva: 'CF' | 'RI' | 'MT' | 'EX';
  telefono?: string | null;
  domicilio?: string | null;
}

export interface ClienteResponse extends ClientePayload {
  id: string;
  usuario?: number | null;
  creado_en: string;
  actualizado_en: string;
}

export interface ClientesPaginadosResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  total_items?: number;
  total_pages?: number;
  current_page?: number;
  results: ClienteResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/clientes/`;

  private normalizarPayload(payload: Partial<ClientePayload>): Partial<ClientePayload> {
    return {
      ...payload,
      ...(payload.telefono !== undefined && {
        telefono: payload.telefono && payload.telefono.trim() ? payload.telefono.trim() : null,
      }),
      ...(payload.domicilio !== undefined && {
        domicilio: payload.domicilio && payload.domicilio.trim() ? payload.domicilio.trim() : null,
      }),
    };
  }

  /**
   * Envía la solicitud de registro del nuevo cliente hacia el endpoint POST /api/clientes/
   */
  crearCliente(payload: ClientePayload): Observable<ClienteResponse> {
    const sanitized = this.normalizarPayload(payload) as ClientePayload;
    return this.http.post<ClienteResponse>(this.apiUrl, sanitized);
  }

  /**
   * Obtiene el listado de clientes registrados desde GET /api/clientes/ (con soporte opcional de búsqueda ?search=)
   * Consume la propiedad .results de la respuesta paginada estandarizada de la API.
   */
  obtenerClientes(search?: string): Observable<ClienteResponse[]> {
    const options = search ? { params: { search } } : {};
    return this.http.get<ClientesPaginadosResponse | ClienteResponse[]>(this.apiUrl, options).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.results || []))
    );
  }

  /**
   * Obtiene la respuesta paginada completa de clientes (TK170)
   */
  obtenerClientesPaginados(search?: string, page: number = 1, limit: number = 10): Observable<ClientesPaginadosResponse> {
    let params: any = { page: page.toString(), limit: limit.toString() };
    if (search) params.search = search;
    return this.http.get<ClientesPaginadosResponse>(this.apiUrl, { params });
  }

  /**
   * Busca clientes dinámicamente mediante el parámetro ?search= (TK155)
   */
  buscarClientes(termino: string): Observable<ClienteResponse[]> {
    return this.http.get<ClientesPaginadosResponse | ClienteResponse[]>(this.apiUrl, { params: { search: termino } }).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.results || []))
    );
  }

  /**
   * Obtiene los datos detallados de un cliente específico por su UUID
   */
  obtenerClientePorId(id: string): Observable<ClienteResponse> {
    return this.http.get<ClienteResponse>(`${this.apiUrl}${id}/`);
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
    const sanitized = this.normalizarPayload(payload);
    return this.http.patch<ClienteResponse>(`${this.apiUrl}${id}/`, sanitized);
  }
}
