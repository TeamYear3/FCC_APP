import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortalClienteComponent } from './portal-cliente.component';
import { AuthService } from '../../core/auth/auth.service';
import { OrdenService } from '../../core/services/orden.service';
import { VehiculoService } from '../../core/services/vehiculo.service';
import { TurnoService } from '../../core/services/turno.service';
import { FacturacionService } from '../../core/services/facturacion.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { signal } from '@angular/core';

describe('PortalClienteComponent', () => {
  let component: PortalClienteComponent;
  let fixture: ComponentFixture<PortalClienteComponent>;
  let ordenServiceSpy: {
    obtenerOrdenes: ReturnType<typeof vi.fn>;
    obtenerEstadoHistorial: ReturnType<typeof vi.fn>;
    actualizarEstado: ReturnType<typeof vi.fn>;
    obtenerAdjuntosDiagnostico: ReturnType<typeof vi.fn>;
  };
  let vehiculoServiceSpy: { getVehiculos: ReturnType<typeof vi.fn>; obtenerMisVehiculos: ReturnType<typeof vi.fn>; obtenerMantenimientosProgramados: ReturnType<typeof vi.fn> };
  let turnoServiceSpy: { obtenerTurnos: ReturnType<typeof vi.fn>; crearTurno: ReturnType<typeof vi.fn> };
  let facturacionServiceSpy: { getFacturasCliente: ReturnType<typeof vi.fn>; descargarPdf: ReturnType<typeof vi.fn> };
  let authServiceSpy: { userRoleSignal: ReturnType<typeof vi.fn>; getUserFromToken: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let webSocketServiceSpy: { conectar: ReturnType<typeof vi.fn>; desconectar: ReturnType<typeof vi.fn>; escucharEvento: ReturnType<typeof vi.fn>; estadoConexion: any };
  let eventSubject: Subject<any>;

  beforeEach(async () => {
    eventSubject = new Subject<any>();

    ordenServiceSpy = {
      obtenerOrdenes: vi.fn().mockReturnValue(of({ count: 1, results: [{ id: 'ot-1', numero_ot: 'OT-001', estado: 'ingresado' }] })),
      obtenerEstadoHistorial: vi.fn().mockReturnValue(of({ orden_id: 'ot-1', numero_ot: 'OT-001', estado_actual: 'ingresado', historial: [] })),
      actualizarEstado: vi.fn().mockReturnValue(of({ orden_id: 'ot-1', estado_actual: 'aprobado' })),
      obtenerAdjuntosDiagnostico: vi.fn().mockReturnValue(of([{ id: 'adj-1', url_secure: 'https://cloudinary.com/foto1.jpg', nombre_archivo: 'frente.jpg', tamanio: 1024, mime_type: 'image/jpeg', creado_en: '2026-10-14T10:00:00Z' }]))
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

    facturacionServiceSpy = {
      getFacturasCliente: vi.fn().mockReturnValue(of([
        {
          id: 'fac-1',
          numero_comprobante: 'B-0001-00000101',
          tipo_comprobante: 'B',
          punto_venta: 1,
          numero_factura: 101,
          total: 45000,
          cae: '26101506010011',
          fecha_vencimiento_cae: '2026-10-25',
          fecha_emision: '2026-10-15T10:00:00Z',
          estado: 'emitida',
          estado_pago: 'pagada',
          vehiculo_patente: 'AA123BB',
          numero_ot: 'OT-001'
        }
      ])),
      descargarPdf: vi.fn().mockReturnValue(of(new Blob(['%PDF-1.4 test'], { type: 'application/pdf' })))
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
        { provide: FacturacionService, useValue: facturacionServiceSpy },
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

  it('debe permitir al cliente aprobar un presupuesto en_presupuesto (TK204)', () => {
    ordenServiceSpy.actualizarEstado.mockReturnValue(of({ estado_actual: 'aprobado' }));
    const mockOT = { id: 'ot-1', numero_ot: 'OT-001', estado: 'en_presupuesto' } as any;
    component.listaOrdenes.set([mockOT]);

    component.aprobarPresupuesto(mockOT);

    expect(ordenServiceSpy.actualizarEstado).toHaveBeenCalledWith('ot-1', 'aprobado', expect.any(String));
    expect(component.listaOrdenes()[0].estado).toBe('aprobado');
    expect(component.mensajeAccion()).toContain('aprobado con éxito');
  });

  it('debe permitir al cliente rechazar un presupuesto en_presupuesto (TK204)', () => {
    ordenServiceSpy.actualizarEstado.mockReturnValue(of({ estado_actual: 'rechazado' }));
    const mockOT = { id: 'ot-1', numero_ot: 'OT-001', estado: 'en_presupuesto' } as any;
    component.listaOrdenes.set([mockOT]);

    component.rechazarPresupuesto(mockOT);

    expect(ordenServiceSpy.actualizarEstado).toHaveBeenCalledWith('ot-1', 'rechazado', expect.any(String));
    expect(component.listaOrdenes()[0].estado).toBe('rechazado');
    expect(component.mensajeAccion()).toContain('rechazado');
  });

  it('debe calcular correctamente el desglose de mano de obra y repuestos (TK204)', () => {
    const mockOT = {
      id: 'ot-1',
      items_presupuesto: [
        { tipo: 'mano_de_obra', subtotal: 35000 },
        { tipo: 'mano_de_obra', subtotal: 15000 },
        { tipo: 'repuesto', subtotal: 80000 },
      ]
    } as any;

    expect(component.getTotalManoDeObra(mockOT)).toBe(50000);
    expect(component.getTotalRepuestos(mockOT)).toBe(80000);
  });

  it('debe enviar el motivo personalizado de rechazo al taller (TK204)', () => {
    ordenServiceSpy.actualizarEstado.mockReturnValue(of({ estado_actual: 'rechazado' }));
    const mockOT = { id: 'ot-1', numero_ot: 'OT-001', estado: 'en_presupuesto' } as any;
    component.listaOrdenes.set([mockOT]);

    component.iniciarRechazo(mockOT);
    expect(component.ordenRechazoEnCurso()).toBe('ot-1');

    component.motivoRechazo.set('Presupuesto excede el límite autorizado');
    component.confirmarRechazoPresupuesto(mockOT);

    expect(ordenServiceSpy.actualizarEstado).toHaveBeenCalledWith('ot-1', 'rechazado', 'Presupuesto excede el límite autorizado');
    expect(component.ordenRechazoEnCurso()).toBeNull();
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
  it('debe abrir la galería de fotos de diagnóstico y permitir ampliar y cerrar fotos (TK205)', () => {
    const mockOT = { id: 'ot-1', numero_ot: 'OT-001', estado: 'ingresado' } as any;
    component.verFotosDiagnostico(mockOT);

    expect(component.mostrarModalGaleria()).toBe(true);
    expect(ordenServiceSpy.obtenerAdjuntosDiagnostico).toHaveBeenCalledWith('ot-1');
    expect(component.adjuntosOT().length).toBe(1);

    component.ampliarFoto('https://cloudinary.com/foto1.jpg');
    expect(component.fotoSeleccionada()).toBe('https://cloudinary.com/foto1.jpg');

    component.cerrarVisorAmpliado();
    expect(component.fotoSeleccionada()).toBeNull();

    component.cerrarModalGaleria();
    expect(component.mostrarModalGaleria()).toBe(false);
  });

  it('debe cambiar a la solapa de Mis Turnos y renderizar las tarjetas de citas activas (TK202)', () => {
    component.cambiarTab('turnos');
    expect(component.tabActivo()).toBe('turnos');
    expect(turnoServiceSpy.obtenerTurnos).toHaveBeenCalled();
    expect(component.listaTurnos().length).toBe(1);
    expect(component.listaTurnos()[0].motivo).toBe('Service');
    expect(component.listaTurnos()[0].vehiculo_info).toBe('Ford Fiesta (AA123BB)');
    expect(component.getTurnoBadgeClass('pendiente')).toContain('FFCC00');
    expect(component.getTurnoDisplay('pendiente')).toBe('Pendiente');
  });

  it('debe recargar los turnos del cliente al cambiar a la solapa de turnos (TK202)', () => {
    turnoServiceSpy.obtenerTurnos.mockClear();
    component.cambiarTab('turnos');
    expect(turnoServiceSpy.obtenerTurnos).toHaveBeenCalledTimes(1);
  });

  it('debe cargar las facturas del cliente e inicializar la lista en ngOnInit (TK206)', () => {
    expect(facturacionServiceSpy.getFacturasCliente).toHaveBeenCalled();
    expect(component.listaFacturas().length).toBe(1);
    expect(component.listaFacturas()[0].numero_comprobante).toBe('B-0001-00000101');
    expect(component.listaFacturas()[0].cae).toBe('26101506010011');
  });

  it('debe cambiar a la solapa de Mis Facturas y refrescar la consulta (TK206)', () => {
    facturacionServiceSpy.getFacturasCliente.mockClear();
    component.cambiarTab('facturas');
    expect(component.tabActivo()).toBe('facturas');
    expect(facturacionServiceSpy.getFacturasCliente).toHaveBeenCalledTimes(1);
  });

  it('debe descargar el comprobante en PDF mediante el servicio de facturación (TK208)', () => {
    const dummyFactura = component.listaFacturas()[0];
    const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:http://localhost/test-blob');
    const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

    component.descargarPdfFactura(dummyFactura);

    expect(facturacionServiceSpy.descargarPdf).toHaveBeenCalledWith('fac-1');
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(component.descargandoPdfId()).toBeNull();
  });

  it('debe manejar error al recuperar facturas del cliente mostrando mensaje (TK206)', () => {
    facturacionServiceSpy.getFacturasCliente.mockReturnValue(throwError(() => new Error('Error al listar')));
    component.cargarFacturasCliente();

    expect(component.errorFacturas()).toContain('No se pudieron recuperar las facturas emitidas.');
    expect(component.cargandoFacturas()).toBe(false);
  });
});


