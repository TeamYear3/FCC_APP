import { Injectable, inject, ResourceRef, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { httpResource } from '../utils/http-resource.util';

export interface MecanicoResumen {
  id: string;
  nombre: string;
  email: string;
  estado: string;
  ots_asignadas: number;
  ots_activas: number;
  porcentaje_carga: number;
  ot_activa_numero?: string | null;
  ot_activa_vehiculo?: string | null;
  ot_activa_estado?: string | null;
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
  private readonly injector = inject(Injector);
  private readonly apiUrl = `${environment.apiUrl}/taller`;

  getResumenMecanicos(): Observable<MecanicoResumen[]> {
    return this.http.get<MecanicoResumen[]>(`${this.apiUrl}/mecanicos/`);
  }

  getResumenClientes(): Observable<ClienteResumen[]> {
    return this.http.get<ClienteResumen[]>(`${this.apiUrl}/clientes/`);
  }

  /**
   * Recurso reactivo para mecánicos que sustituye suscripciones manuales (TK178)
   */
  getResumenMecanicosResource(): ResourceRef<MecanicoResumen[] | undefined> {
    return httpResource<MecanicoResumen[]>({
      loader: () => this.getResumenMecanicos(),
      defaultValue: [],
      injector: this.injector
    });
  }

  /**
   * Recurso reactivo para clientes del taller que sustituye suscripciones manuales (TK178)
   */
  getResumenClientesResource(): ResourceRef<ClienteResumen[] | undefined> {
    return httpResource<ClienteResumen[]>({
      loader: () => this.getResumenClientes(),
      defaultValue: [],
      injector: this.injector
    });
  }
}
