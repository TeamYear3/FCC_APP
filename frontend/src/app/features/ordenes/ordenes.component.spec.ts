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
      })),
      obtenerItemsPresupuesto: vi.fn().mockReturnValue(of([]))
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

  it('debe seleccionar una orden activa y abrir el expediente', () => {
    const ordenTest = {
      id: 'ot-100',
      numero_ot: 'OT-001',
      vehiculo_id: 'veh-1',
      descripcion_problema: 'Cambio de aceite',
      fecha_ingreso: '2026-08-01',
      estado: 'ingresado',
      complejidad: 'media',
      creado_en: '2026-08-01',
      actualizado_en: '2026-08-01'
    } as any;

    component.seleccionarOrden(ordenTest, true);
    expect(component.ordenActiva()?.id).toBe('ot-100');
    expect(mockOrdenService.obtenerItemsPresupuesto).toHaveBeenCalledWith('ot-100');
  });

  it('debe retornar clases semánticas correctas para estados y complejidades', () => {
    expect(component.getEstadoBadgeClass('ingresado')).toContain('bg-blue-500/20');
    expect(component.getEstadoBadgeClass('en_proceso')).toContain('bg-purple-500/20');
    expect(component.getComplejidadBadgeClass('alta')).toContain('bg-rose-500/10');
    expect(component.getComplejidadBadgeClass('baja')).toContain('bg-emerald-500/10');
  });
});
