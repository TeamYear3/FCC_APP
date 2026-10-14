import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortalClienteComponent } from './portal-cliente.component';
import { AuthService } from '../../core/auth/auth.service';
import { OrdenService } from '../../core/services/orden.service';
import { VehiculoService } from '../../core/services/vehiculo.service';
import { TurnoService } from '../../core/services/turno.service';
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
  let turnoServiceSpy: { obtenerTurnos: ReturnType<typeof vi.fn>; crearTurno: ReturnType<typeof vi.fn> };
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
      getVehiculos: vi.fn().mockReturnValue(of([{ id: 'veh-1', marca: 'Ford', modelo: 'Fiesta', patente: 'AA123BB' }])),
      obtenerMisVehiculos: vi.fn().mockReturnValue(of([])),
      obtenerMantenimientosProgramados: vi.fn().mockReturnValue(of([]))
    };

    turnoServiceSpy = {
      obtenerTurnos: vi.fn().mockReturnValue(of([{ id: 'tur-1', vehiculo: 'veh-1', vehiculo_info: 'Ford Fiesta (AA123BB)', fecha_hora: '2026-10-20T10:00:00Z', motivo: 'Service', estado: 'pendiente', warning_overbooking: false }])),
      crearTurno: vi.fn().mockReturnValue(of({ id: 'tur-2', vehiculo: 'veh-1', fecha_hora: '2026-10-22T10:00:00Z', motivo: 'Frenos', estado: 'pendiente' }))
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
        { provide: TurnoService, useValue: turnoServiceSpy },
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

  it('debe cargar los turnos del cliente al inicializar (TK207)', () => {
    expect(turnoServiceSpy.obtenerTurnos).toHaveBeenCalled();
    expect(component.listaTurnos().length).toBe(1);
    expect(component.listaTurnos()[0].motivo).toBe('Service');
  });

  it('debe abrir modal de reserva y enviar solicitud a la API (TK207)', () => {
    component.abrirModalReserva('veh-1');
    expect(component.mostrarModalReserva()).toBe(true);
    expect(component.vehiculoIdReserva()).toBe('veh-1');

    component.fechaHoraReserva.set('2026-10-22T10:00');
    component.motivoReserva.set('Frenos delanteros y pastillas');
    component.confirmarReservaTurno();

    expect(turnoServiceSpy.crearTurno).toHaveBeenCalled();
    expect(component.exitoReserva()).toContain('correctamente');
  });
});
