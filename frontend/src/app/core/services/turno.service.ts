import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TurnoPayload {
  cliente: string;
  vehiculo: string;
  fecha_hora: string;
  motivo: string;
  estado?: 'pendiente' | 'completado' | 'cancelado';
  force_booking?: boolean;
}

export interface TurnoResponse {
  id: string;
  cliente: string;
  vehiculo: string;
  fecha_hora: string;
  motivo: string;
  estado: 'pendiente' | 'completado' | 'cancelado';
  creado_en: string;
  actualizado_en: string;
  warning_overbooking: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TurnoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/turnos/`;

  /**
   * Obtiene la lista completa de turnos registrados
   */
  obtenerTurnos(): Observable<TurnoResponse[]> {
    return this.http.get<TurnoResponse[]>(this.apiUrl);
  }

  /**
   * Obtiene un turno específico por su UUID
   */
  obtenerTurnoPorId(id: string): Observable<TurnoResponse> {
    return this.http.get<TurnoResponse>(`${this.apiUrl}${id}/`);
  }

  /**
   * Crea un nuevo turno.
   * Admite force_booking: true para forzar en caso de sobre-cupo.
   */
  crearTurno(payload: TurnoPayload): Observable<TurnoResponse> {
    return this.http.post<TurnoResponse>(this.apiUrl, payload);
  }

  /**
   * Actualiza parcialmente los datos de un turno existente
   */
  actualizarTurno(id: string, payload: Partial<TurnoPayload>): Observable<TurnoResponse> {
    return this.http.patch<TurnoResponse>(`${this.apiUrl}${id}/`, payload);
  }

  /**
   * Elimina un turno
   */
  eliminarTurno(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}
