import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortalClienteComponent } from './portal-cliente.component';
import { AuthService } from '../../core/auth/auth.service';
import { OrdenService } from '../../core/services/orden.service';
import { VehiculoService } from '../../core/services/vehiculo.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { vi } from 'vitest';
import { signal } from '@angular/core';

describe('PortalClienteComponent', () => {
  let component: PortalClienteComponent;
  let fixture: ComponentFixture<PortalClienteComponent>;
  let ordenServiceSpy: { obtenerOrdenes: ReturnType<typeof vi.fn>; obtenerEstadoHistorial: ReturnType<typeof vi.fn> };
  let vehiculoServiceSpy: { getVehiculos: ReturnType<typeof vi.fn>; obtenerMisVehiculos: ReturnType<typeof vi.fn>; obtenerMantenimientosProgramados: ReturnType<typeof vi.fn> };
  let authServiceSpy: { userRoleSignal: ReturnType<typeof vi.fn>; getUserFromToken: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let webSocketServiceSpy: { conectar: ReturnType<typeof vi.fn>; desconectar: ReturnType<typeof vi.fn>; escucharEvento: ReturnType<typeof vi.fn>; estadoConexion: any };
  let eventSubject: Subject<any>;

  beforeEach(async () => {
    eventSubject = new Subject<any>();

    ordenServiceSpy = {
      obtenerOrdenes: vi.fn().mockReturnValue(of({ count: 1, results: [{ id: 'ot-1', numero_ot: 'OT-001', estado: 'ingresado' }] })),
      obtenerEstadoHistorial: vi.fn().mockReturnValue(of({ orden_id: 'ot-1', numero_ot: 'OT-001', estado_actual: 'ingresado', historial: [] }))
    };

    vehiculoServiceSpy = {
      getVehiculos: vi.fn().mockReturnValue(of([])),
      obtenerMisVehiculos: vi.fn().mockReturnValue(of([])),
      obtenerMantenimientosProgramados: vi.fn().mockReturnValue(of([]))
    };

    authServiceSpy = {
      userRoleSignal: vi.fn().mockReturnValue('cliente'),
      getUserFromToken: vi.fn().mockReturnValue({ nombre: 'Juan', apellido: 'Pérez', email: 'juan@test.com' }),
      logout: vi.fn()
    };

    webSocketServiceSpy = {
      conectar: vi.fn(),
      desconectar: vi.fn(),
      escucharEvento: vi.fn().mockReturnValue(eventSubject.asObservable()),
      estadoConexion: signal('conectado')
    };

    await TestBed.configureTestingModule({
      imports: [PortalClienteComponent],
      providers: [
        provideRouter([]),
        { provide: OrdenService, useValue: ordenServiceSpy },
        { provide: VehiculoService, useValue: vehiculoServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: WebSocketService, useValue: webSocketServiceSpy }
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
    expect(webSocketServiceSpy.conectar).toHaveBeenCalled();
  });

  it('debe actualizar reactivamente el estado de una OT al recibir un evento por WebSocket (TK045)', () => {
    expect(component.listaOrdenes()[0].estado).toBe('ingresado');

    eventSubject.next({ orden_id: 'ot-1', estado: 'en_proceso' });

    expect(component.listaOrdenes()[0].estado).toBe('en_proceso');
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
