import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MecanicoResumen {
  id: string;
  nombre: string;
  email: string;
  estado: string;
  ots_asignadas: number;
  ots_activas: number;
  porcentaje_carga: number;
}

export interface ClienteResumen {
  id: string;
  nombre: string;
  apellido: string;
  dni_cuit: string;
  tipo_documento: string;
  vehiculos_count: number;
  ots_activas: number;
  monto_total_facturado: number;
  codigo_cliente: string;
}

@Injectable({
  providedIn: 'root'
})
export class TallerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/taller`;

  getResumenMecanicos(): Observable<MecanicoResumen[]> {
    return this.http.get<MecanicoResumen[]>(`${this.apiUrl}/mecanicos/`);
  }

  getResumenClientes(): Observable<ClienteResumen[]> {
    return this.http.get<ClienteResumen[]>(`${this.apiUrl}/clientes/`);
  }
}
