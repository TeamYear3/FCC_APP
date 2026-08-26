import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PresupuestoFormComponent } from './presupuesto-form.component';
import { OrdenService, ItemPresupuesto } from '../../../core/services/orden.service';
import { of, throwError } from 'rxjs';

describe('PresupuestoFormComponent', () => {
  let component: PresupuestoFormComponent;
  let fixture: ComponentFixture<PresupuestoFormComponent>;
  let ordenServiceMock: any;

  const itemsMock: ItemPresupuesto[] = [
    {
      id: 'item-1',
      tipo: 'repuesto',
      descripcion: 'Filtro de aceite',
      cantidad: 1,
      precio_unitario: 8000,
      subtotal: 8000,
      completado: true
    },
    {
      id: 'item-2',
      tipo: 'mano_de_obra',
      descripcion: 'Cambio de aceite y filtro',
      cantidad: 1,
      precio_unitario: 12000,
      subtotal: 12000,
      completado: false
    }
  ];

  beforeEach(async () => {
    ordenServiceMock = {
      obtenerItemsPresupuesto: vi.fn().mockReturnValue(of(itemsMock)),
      agregarManoDeObra: vi.fn().mockReturnValue(of(itemsMock[1])),
      agregarRepuesto: vi.fn().mockReturnValue(of(itemsMock[0])),
      marcarItemCompletado: vi.fn().mockReturnValue(of({ ...itemsMock[1], completado: true })),
      eliminarItemPresupuesto: vi.fn().mockReturnValue(of({ message: 'OK', monto_total: 8000 }))
    };

    await TestBed.configureTestingModule({
      imports: [PresupuestoFormComponent],
      providers: [
        { provide: OrdenService, useValue: ordenServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PresupuestoFormComponent);
    component = fixture.componentInstance;
    component.ordenId = 'orden-123';
  });

  it('debe crear el componente y cargar los ítems del presupuesto', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(ordenServiceMock.obtenerItemsPresupuesto).toHaveBeenCalledWith('orden-123');
    expect(component.items().length).toBe(2);
    expect(component.montoTotal()).toBe(20000);
    expect(component.porcentajeProgreso()).toBe(50);
  });

  it('debe validar errores antes de agregar un ítem inválido', () => {
    fixture.detectChanges();

    component.nuevaDescripcion.set('');
    component.agregarItem();
    expect(component.errorMessage()).toContain('descripción');

    component.nuevaDescripcion.set('Pastillas de freno');
    component.nuevoPrecioUnitario.set(0);
    component.agregarItem();
    expect(component.errorMessage()).toContain('precio');
  });

  it('debe agregar un nuevo repuesto exitosamente', () => {
    fixture.detectChanges();

    component.nuevoTipo.set('repuesto');
    component.nuevaDescripcion.set('Pastillas Bosch');
    component.nuevaCantidad.set(2);
    component.nuevoPrecioUnitario.set(15000);

    component.agregarItem();

    expect(ordenServiceMock.agregarRepuesto).toHaveBeenCalledWith('orden-123', {
      descripcion: 'Pastillas Bosch',
      cantidad: 2,
      precio_unitario: 15000
    });
  });

  it('debe tildar un ítem completado en modo ejecución', () => {
    fixture.detectChanges();

    const itemTarget = itemsMock[1]; // item-2 (completado: false)
    component.toggleCompletado(itemTarget);

    expect(ordenServiceMock.marcarItemCompletado).toHaveBeenCalledWith('orden-123', 'item-2', true);
  });

  it('debe eliminar un ítem del presupuesto', () => {
    fixture.detectChanges();

    const itemTarget = itemsMock[0]; // item-1
    component.eliminarItem(itemTarget);

    expect(ordenServiceMock.eliminarItemPresupuesto).toHaveBeenCalledWith('orden-123', 'item-1');
  });
});
