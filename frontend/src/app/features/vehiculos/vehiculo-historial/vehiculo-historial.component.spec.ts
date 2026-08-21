import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehiculoHistorialComponent } from './vehiculo-historial.component';
import { VehiculoService } from '../../../core/services/vehiculo.service';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('VehiculoHistorialComponent', () => {
  let component: VehiculoHistorialComponent;
  let fixture: ComponentFixture<VehiculoHistorialComponent>;
  let mockVehiculoService: any;

  const mockVehiculo = {
    id: '123-uuid',
    patente: 'AA111BB',
    marca: 'Toyota',
    modelo: 'Corolla',
    anio: 2022,
    kilometraje: 45000,
    numero_chasis: 'CHASIS9999',
    creado_en: '2026-01-01',
    actualizado_en: '2026-01-01'
  };

  const mockHistorialResponse = {
    total_items: 15,
    total_pages: 2,
    current_page: 1,
    results: [
      {
        id: 'ot-1',
        numero_ot: 'OT-001',
        fecha_ingreso: '2026-02-01',
        estado: 'finalizado',
        descripcion_problema: 'Cambio de aceite y filtros',
        monto_total: 12000
      }
    ]
  };

  beforeEach(async () => {
    mockVehiculoService = {
      obtenerVehiculoPorId: vi.fn().mockReturnValue(of(mockVehiculo)),
      obtenerHistorialVehiculo: vi.fn().mockReturnValue(of(mockHistorialResponse)),
      obtenerMantenimientosProgramados: vi.fn().mockReturnValue(of([])),
      descargarHistorialPDF: vi.fn().mockReturnValue(of(new Blob(['pdf content'], { type: 'application/pdf' })))
    };

    await TestBed.configureTestingModule({
      imports: [VehiculoHistorialComponent],
      providers: [
        provideRouter([]),
        { provide: VehiculoService, useValue: mockVehiculoService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              params: { id: '123-uuid' }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VehiculoHistorialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente y cargar detalle del vehículo e historial', () => {
    expect(component).toBeTruthy();
    expect(mockVehiculoService.obtenerVehiculoPorId).toHaveBeenCalledWith('123-uuid');
    expect(mockVehiculoService.obtenerHistorialVehiculo).toHaveBeenCalledWith('123-uuid', 1, 10);
    expect(component.vehiculo()?.patente).toBe('AA111BB');
    expect(component.ordenes().length).toBe(1);
    expect(component.totalPaginas()).toBe(2);
  });

  it('debe cambiar de página al invocar cambiarPagina', () => {
    component.cambiarPagina(2);
    expect(mockVehiculoService.obtenerHistorialVehiculo).toHaveBeenCalledWith('123-uuid', 2, 10);
  });

  it('debe llamar al servicio de descarga de PDF al presionar exportar', () => {
    component.descargarPDF();
    expect(mockVehiculoService.descargarHistorialPDF).toHaveBeenCalledWith('123-uuid');
  });

  it('debe calcular correctamente si una etapa de la línea de tiempo ha sido alcanzada', () => {
    expect(component.isEtapaAlcanzada('ingresado')).toBe(true);
    expect(component.isEtapaAlcanzada('finalizado')).toBe(true);
  });
});
