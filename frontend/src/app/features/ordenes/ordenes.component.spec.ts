import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdenesComponent } from './ordenes.component';
import { provideRouter } from '@angular/router';
import { OrdenService } from '../../core/services/orden.service';
import { of } from 'rxjs';

describe('OrdenesComponent', () => {
  let component: OrdenesComponent;
  let fixture: ComponentFixture<OrdenesComponent>;
  let mockOrdenService: any;

  beforeEach(async () => {
    mockOrdenService = {
      obtenerOrdenes: vi.fn().mockReturnValue(of({
        total_items: 1,
        total_pages: 1,
        current_page: 1,
        results: [
          {
            id: 'ot-100',
            numero_ot: 'OT-001',
            vehiculo_id: 'veh-1',
            descripcion_problema: 'Cambio de aceite',
            fecha_ingreso: '2026-08-01',
            estado: 'ingresado',
            creado_en: '2026-08-01',
            actualizado_en: '2026-08-01'
          }
        ]
      }))
    };

    await TestBed.configureTestingModule({
      imports: [OrdenesComponent],
      providers: [
        provideRouter([]),
        { provide: OrdenService, useValue: mockOrdenService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrdenesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente y cargar la lista de órdenes', () => {
    expect(component).toBeTruthy();
    expect(mockOrdenService.obtenerOrdenes).toHaveBeenCalled();
    expect(component.listaOrdenes().length).toBe(1);
  });

  it('debe filtrar órdenes reactivamente cuando cambia la búsqueda', () => {
    component.busqueda.set('ABC123');
    component.onFiltroChange();
    expect(mockOrdenService.obtenerOrdenes).toHaveBeenCalledWith(
      expect.objectContaining({ patente: 'ABC123' }),
      1,
      10
    );
  });
});
