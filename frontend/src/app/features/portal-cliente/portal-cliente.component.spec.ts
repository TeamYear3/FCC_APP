import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortalClienteComponent } from './portal-cliente.component';
import { AuthService } from '../../core/auth/auth.service';
import { OrdenService } from '../../core/services/orden.service';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

describe('PortalClienteComponent', () => {
  let component: PortalClienteComponent;
  let fixture: ComponentFixture<PortalClienteComponent>;
  let ordenServiceSpy: { obtenerOrdenes: ReturnType<typeof vi.fn>; obtenerEstadoHistorial: ReturnType<typeof vi.fn> };
  let authServiceSpy: { userRoleSignal: ReturnType<typeof vi.fn>; getUserFromToken: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    ordenServiceSpy = {
      obtenerOrdenes: vi.fn().mockReturnValue(of({ count: 1, results: [{ id: 'ot-1', numero_ot: 'OT-001', estado: 'ingresado' }] })),
      obtenerEstadoHistorial: vi.fn().mockReturnValue(of({ orden_id: 'ot-1', numero_ot: 'OT-001', estado_actual: 'ingresado', historial: [] }))
    };

    authServiceSpy = {
      userRoleSignal: vi.fn().mockReturnValue('cliente'),
      getUserFromToken: vi.fn().mockReturnValue({ nombre: 'Juan', apellido: 'Pérez', email: 'juan@test.com' }),
      logout: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PortalClienteComponent],
      providers: [
        provideRouter([]),
        { provide: OrdenService, useValue: ordenServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PortalClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente e inicializar el portal del cliente', () => {
    expect(component).toBeTruthy();
    expect(component.userName()).toBe('Juan Pérez');
    expect(ordenServiceSpy.obtenerOrdenes).toHaveBeenCalled();
    expect(component.listaOrdenes().length).toBe(1);
    expect(component.cargando()).toBe(false);
  });

  it('debe manejar errores de carga de la API mostrando mensaje descriptivo', () => {
    ordenServiceSpy.obtenerOrdenes.mockReturnValue(throwError(() => new Error('Error API')));
    component.cargarOrdenesCliente();

    expect(component.errorMessage()).toContain('No se pudieron obtener tus órdenes');
    expect(component.cargando()).toBe(false);
  });

  it('debe abrir el modal de historial y consultar la API para la OT elegida', () => {
    const mockOT = { id: 'ot-1', numero_ot: 'OT-001', estado: 'ingresado' } as any;
    component.verHistorialOT(mockOT);

    expect(component.mostrarModalHistorial()).toBe(true);
    expect(ordenServiceSpy.obtenerEstadoHistorial).toHaveBeenCalledWith('ot-1');
  });
});
