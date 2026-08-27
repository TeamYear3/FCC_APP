import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Factura,
  EmitirFacturaPayload,
  FacturasCalendarioResponse,
  EstadoPago,
} from '../models/facturacion.model';

@Injectable({
  providedIn: 'root'
})
export class FacturacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/facturas`;

  /**
   * Obtiene el listado de facturas emitidas con filtros opcionales.
   */
  getFacturas(filtros?: { estado_pago?: string; tipo?: string }): Observable<Factura[]> {
    let params = new HttpParams();
    if (filtros?.estado_pago) {
      params = params.set('estado_pago', filtros.estado_pago);
    }
    if (filtros?.tipo) {
      params = params.set('tipo', filtros.tipo);
    }
    return this.http.get<Factura[]>(`${this.baseUrl}/`, { params });
  }

  /**
   * Obtiene el detalle ampliado de una factura por su ID (incluyendo items y datos fiscales).
   */
  getFacturaDetalle(id: string): Observable<Factura> {
    return this.http.get<Factura>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Emite una nueva factura electrónica oficial conectando al WebService de ARCA.
   */
  emitirFactura(payload: EmitirFacturaPayload): Observable<Factura> {
    return this.http.post<Factura>(`${this.baseUrl}/emitir/`, payload);
  }

  /**
   * Obtiene los comprobantes clasificados por semaforización para el calendario financiero.
   */
  getFacturasCalendario(): Observable<FacturasCalendarioResponse> {
    return this.http.get<FacturasCalendarioResponse>(`${this.baseUrl}/calendario/`);
  }

  /**
   * Actualiza el estado de cobro / interacción de un comprobante.
   */
  actualizarEstadoPago(id: string, estado_pago: EstadoPago): Observable<Factura> {
    return this.http.patch<Factura>(`${this.baseUrl}/${id}/pago/`, { estado_pago });
  }
}
