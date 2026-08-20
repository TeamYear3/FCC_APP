import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface BusquedaItem {
  id: string;
  titulo: string;
  subtitulo: string;
  tipo: 'cliente' | 'vehiculo' | 'orden';
  url: string;
}

export interface BusquedaResultadoResponse {
  clientes: BusquedaItem[];
  vehiculos: BusquedaItem[];
  ordenes: BusquedaItem[];
}

@Injectable({
  providedIn: 'root'
})
export class BusquedaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/busqueda-universal/`;

  buscarUniversal(query: string): Observable<BusquedaResultadoResponse> {
    const q = query.trim();
    if (!q || q.length < 2) {
      return of({ clientes: [], vehiculos: [], ordenes: [] });
    }

    const params = new HttpParams().set('q', q);
    return this.http.get<BusquedaResultadoResponse>(this.apiUrl, { params }).pipe(
      catchError(() => of({ clientes: [], vehiculos: [], ordenes: [] }))
    );
  }
}
