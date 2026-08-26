import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FacturacionService } from './facturacion.service';
import { environment } from '../../../environments/environment';
import { Factura, FacturasCalendarioResponse } from '../models/facturacion.model';

describe('FacturacionService', () => {
  let service: FacturacionService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/facturas`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FacturacionService]
    });
    service = TestBed.inject(FacturacionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente el servicio', () => {
    expect(service).toBeTruthy();
  });

  it('debe emitir una factura electrónica hacia el endpoint de ARCA', () => {
    const mockFactura: Factura = {
      id: 'fact-123',
      orden_trabajo: 'ot-456',
      numero_ot: 'OT-0001',
      cliente_nombre: 'Juan Pérez',
      vehiculo_patente: 'AA123BB',
      tipo_comprobante: 'B',
      punto_venta: 1,
      numero_factura: 1,
      numero_comprobante: 'B-0001-00000001',
      cae: '74123456789012',
      fecha_vencimiento_cae: '2026-09-05',
      total: 150000,
      estado: 'emitida',
      estado_pago: 'sin_interaccion',
      semaforo: 'a_vencer',
      fecha_vencimiento_pago: '2026-09-10',
      fecha_emision: '2026-08-26',
      cuit_emisor: '30-71234567-9',
      observaciones: ''
    };

    service.emitirFactura({ orden_trabajo_id: 'ot-456', tipo_comprobante: 'B' }).subscribe((res) => {
      expect(res.cae).toBe('74123456789012');
      expect(res.numero_comprobante).toBe('B-0001-00000001');
      expect(res.total).toBe(150000);
    });

    const req = httpMock.expectOne(`${baseUrl}/emitir/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.orden_trabajo_id).toBe('ot-456');
    req.flush(mockFactura);
  });

  it('debe obtener las facturas para el calendario con semáforos', () => {
    const mockCalendario: FacturasCalendarioResponse = {
      facturas: [
        {
          id: 'fact-1',
          numero_comprobante: 'B-0001-00000001',
          tipo_comprobante: 'B',
          total: 80000,
          cliente: 'Carlos Gómez',
          patente: 'CD456EF',
          fecha_emision: '2026-08-20',
          fecha_vencimiento_pago: '2026-09-04',
          estado_pago: 'a_vencer',
          semaforo: 'a_vencer',
          cae: '74112233445566'
        }
      ],
      resumen: {
        total_facturado: 80000,
        total_pagado: 0,
        total_vencido: 0,
        total_a_vencer: 80000,
        cantidad_comprobantes: 1
      }
    };

    service.getFacturasCalendario().subscribe((res) => {
      expect(res.facturas.length).toBe(1);
      expect(res.resumen.total_facturado).toBe(80000);
      expect(res.facturas[0].semaforo).toBe('a_vencer');
    });

    const req = httpMock.expectOne(`${baseUrl}/calendario/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCalendario);
  });

  it('debe actualizar el estado de cobro de una factura', () => {
    const mockFacturaActualizada = {
      id: 'fact-1',
      estado_pago: 'pagada',
      semaforo: 'pagada'
    } as Factura;

    service.actualizarEstadoPago('fact-1', 'pagada').subscribe((res) => {
      expect(res.estado_pago).toBe('pagada');
    });

    const req = httpMock.expectOne(`${baseUrl}/fact-1/pago/`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado_pago: 'pagada' });
    req.flush(mockFacturaActualizada);
  });
});
