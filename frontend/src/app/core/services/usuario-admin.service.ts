import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UsuarioAdminItem {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  rol: 'admin' | 'tecnico' | 'cliente';
  is_active: boolean;
  last_login: string | null;
  creado_en: string | null;
}

export interface MetricasUsuarios {
  total_usuarios: number;
  administradores_count: number;
  tecnicos_count: number;
  clientes_count: number;
  activos_count: number;
}

export interface UsuariosAdminResponse {
  metricas: MetricasUsuarios;
  usuarios: UsuarioAdminItem[];
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/usuarios/`;

  obtenerUsuariosAdmin(): Observable<UsuariosAdminResponse> {
    return this.http.get<UsuariosAdminResponse>(this.apiUrl);
  }
}
