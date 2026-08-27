import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { FacturacionCalendarioComponent } from './facturacion-calendario.component';
import { FacturacionService } from '../../../core/services/facturacion.service';
import { FacturasCalendarioResponse } from '../../../core/models/facturacion.model';

describe('FacturacionCalendarioComponent', () => {
  let component: FacturacionCalendarioComponent;
  let fixture: ComponentFixture<FacturacionCalendarioComponent>;
  let facturacionService: FacturacionService;

  const mockResponse: FacturasCalendarioResponse = {
    facturas: [
      {
        id: 'fact-1',
        numero_comprobante: 'B-0001-00000101',
        tipo_comprobante: 'B',
        total: 100000,
        cliente: 'Gonzalo Pérez',
        patente: 'AA123BB',
        fecha_emision: '2026-08-26',
        fecha_vencimiento_pago: '2026-08-26',
        estado_pago: 'a_vencer',
        semaforo: 'a_vencer',
        cae: '74123456789012'
      }
    ],
    resumen: {
      total_facturado: 100000,
      total_pagado: 0,
      total_vencido: 0,
      total_a_vencer: 100000,
      cantidad_comprobantes: 1
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturacionCalendarioComponent, HttpClientTestingModule],
      providers: [FacturacionService]
    }).compileComponents();

    fixture = TestBed.createComponent(FacturacionCalendarioComponent);
    component = fixture.componentInstance;
    facturacionService = TestBed.inject(FacturacionService);
  });

  it('debe crearse correctamente el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar los datos del calendario y calcular los KPIs financieros', () => {
    vi.spyOn(facturacionService, 'getFacturasCalendario').mockReturnValue(of(mockResponse));
    component.ngOnInit();

    expect(component.facturas().length).toBe(1);
    expect(component.resumen().total_facturado).toBe(100000);
    expect(component.calendarDays().length).toBeGreaterThan(27);
  });

  it('debe navegar entre meses y volver a hoy', () => {
    const mesInicial = component.currentDate.getMonth();
    component.mesSiguiente();
    expect(component.currentDate.getMonth()).toBe((mesInicial + 1) % 12);

    component.mesAnterior();
    expect(component.currentDate.getMonth()).toBe(mesInicial);

    component.hoy();
    expect(component.currentDate.getMonth()).toBe(new Date().getMonth());
  });

  it('debe abrir modal de detalle y permitir actualizar el estado de pago', () => {
    const item = mockResponse.facturas[0];
    component.abrirDetalle(item);
    expect(component.modalDetalleAbierto()).toBe(true);
    expect(component.facturaSeleccionada()?.id).toBe('fact-1');

    vi.spyOn(facturacionService, 'actualizarEstadoPago').mockReturnValue(
      of({
        ...item,
        orden_trabajo: 'ot-1',
        numero_ot: 'OT-0001',
        cliente_nombre: 'Gonzalo Pérez',
        vehiculo_patente: 'AA123BB',
        punto_venta: 1,
        numero_factura: 101,
        fecha_vencimiento_cae: '2026-09-05',
        estado: 'emitida',
        estado_pago: 'pagada',
        semaforo: 'pagada',
        cuit_emisor: '30-71234567-9',
        observaciones: ''
      })
    );

    component.cambiarEstadoPago('pagada');
    expect(component.facturaSeleccionada()?.estado_pago).toBe('pagada');
  });
});
