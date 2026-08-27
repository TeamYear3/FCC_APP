import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { FacturacionComponent } from './facturacion.component';
import { FacturacionService } from '../../../core/services/facturacion.service';
import { Factura } from '../../../core/models/facturacion.model';

describe('FacturacionComponent', () => {
  let component: FacturacionComponent;
  let fixture: ComponentFixture<FacturacionComponent>;
  let facturacionService: FacturacionService;

  const mockFacturas: Factura[] = [
    {
      id: 'fact-1',
      orden_trabajo: 'ot-1',
      numero_ot: 'OT-0001',
      cliente_nombre: 'Esteban Quito',
      vehiculo_patente: 'AF999ZZ',
      tipo_comprobante: 'B',
      punto_venta: 1,
      numero_factura: 1,
      numero_comprobante: 'B-0001-00000001',
      cae: '74123456789012',
      fecha_vencimiento_cae: '2026-09-05',
      total: 120000,
      estado: 'emitida',
      estado_pago: 'sin_interaccion',
      semaforo: 'a_vencer',
      fecha_vencimiento_pago: '2026-09-10',
      fecha_emision: '2026-08-26',
      cuit_emisor: '30-71234567-9',
      observaciones: ''
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturacionComponent, HttpClientTestingModule],
      providers: [FacturacionService]
    }).compileComponents();

    fixture = TestBed.createComponent(FacturacionComponent);
    component = fixture.componentInstance;
    facturacionService = TestBed.inject(FacturacionService);
  });

  it('debe crearse correctamente el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar el listado de facturas al inicializar', () => {
    vi.spyOn(facturacionService, 'getFacturas').mockReturnValue(of(mockFacturas));
    component.ngOnInit();
    expect(component.facturas().length).toBe(1);
    expect(component.facturas()[0].numero_comprobante).toBe('B-0001-00000001');
  });

  it('debe abrir y cerrar el modal de emisión de factura', () => {
    component.abrirModalEmision();
    expect(component.modalEmisionAbierto()).toBe(true);

    component.cerrarModalEmision();
    expect(component.modalEmisionAbierto()).toBe(false);
  });

  it('debe emitir una factura electrónica vía ARCA y actualizar el listado', () => {
    const nuevaFactura: Factura = {
      ...mockFacturas[0],
      id: 'fact-2',
      numero_comprobante: 'B-0001-00000002',
      cae: '74998877665544'
    };

    vi.spyOn(facturacionService, 'emitirFactura').mockReturnValue(of(nuevaFactura));

    component.ordenSeleccionadaId = 'ot-1';
    component.confirmarEmision();

    expect(component.facturaReciente()?.cae).toBe('74998877665544');
    expect(component.modalEmisionAbierto()).toBe(false);
  });
});
