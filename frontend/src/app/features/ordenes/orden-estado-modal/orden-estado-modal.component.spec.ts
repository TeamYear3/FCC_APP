import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdenEstadoModalComponent } from './orden-estado-modal.component';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { OrdenService, OrdenResponse, OrdenHistorialResponse } from '../../../core/services/orden.service';
import { ToastService } from '../../../core/services/toast.service';

describe('OrdenEstadoModalComponent', () => {
  let component: OrdenEstadoModalComponent;
  let fixture: ComponentFixture<OrdenEstadoModalComponent>;
  let router: Router;
  let toastService: ToastService;

  const mockOrden: OrdenResponse = {
    id: 'ot-123',
    numero_ot: 'OT-2026-001',
    vehiculo_id: 'veh-1',
    descripcion_problema: 'Revisión técnica',
    fecha_ingreso: '2026-09-19',
    estado: 'ingresado',
    creado_en: '2026-09-19T10:00:00Z',
    actualizado_en: '2026-09-19T10:00:00Z'
  };

  const mockHistorialRes: OrdenHistorialResponse = {
    id: 'ot-123',
    numero_ot: 'OT-2026-001',
    estado_actual: 'en_presupuesto',
    estado_actual_display: 'En Presupuesto',
    historial: [
      {
        id: 'hist-1',
        estado_anterior: 'ingresado',
        estado_nuevo: 'en_presupuesto',
        usuario_nombre: 'Admin General',
        comentario: 'Iniciado presupuesto',
        creado_en: '2026-09-19T11:00:00Z'
      }
    ]
  };

  let mockOrdenService: any;
  let mockToastService: any;

  beforeEach(async () => {
    mockOrdenService = {
      actualizarEstado: vi.fn().mockReturnValue(of(mockHistorialRes)),
      registrarPago: vi.fn().mockReturnValue(of({ message: 'Cobro OK', orden: mockOrden }))
    };

    mockToastService = {
      info: vi.fn(),
      exito: vi.fn(),
      error: vi.fn(),
      mostrar: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [OrdenEstadoModalComponent],
      providers: [
        provideRouter([]),
        { provide: OrdenService, useValue: mockOrdenService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    toastService = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(OrdenEstadoModalComponent);
    component = fixture.componentInstance;
    component.mostrar = true;
    component.orden = mockOrden;
    component.ngOnChanges();
    fixture.detectChanges();
  });

  it('debe crear el componente e inicializar el estado proyectado con el estado de la orden', () => {
    expect(component).toBeTruthy();
    expect(component.nuevoEstado()).toBe('ingresado');
  });

  it('debe mostrar advertencia de requisitos si se selecciona "en_proceso" sobre orden en estado "ingresado"', () => {
    component.onEstadoChange('en_proceso');
    expect(component.mostrarAdvertenciaRequisitos()).toBe(true);
  });

  it('debe navegar a la agenda de turnos con queryParams al hacer click en agendarTurno', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const cerrarSpy = vi.spyOn(component.cerrado, 'emit');

    component.agendarTurno();

    expect(cerrarSpy).toHaveBeenCalledWith(true);
    expect(navigateSpy).toHaveBeenCalledWith(['/turnos'], {
      queryParams: {
        ot: 'OT-2026-001',
        vehiculo_id: 'veh-1'
      }
    });
  });

  it('debe emitir toast informativo al solicitar aprobacion sin invocar alert nativo', () => {
    component.solicitarAprobacion();
    expect(mockToastService.info).toHaveBeenCalledWith(
      expect.stringContaining('Solicitud de aprobación enviada al cliente para la OT OT-2026-001')
    );
  });

  it('debe llamar a actualizarEstado en el servicio al confirmar cambio de estado', () => {
    component.onEstadoChange('en_presupuesto');
    component.comentario.set('Iniciado presupuesto');
    component.confirmarCambioEstado();

    expect(mockOrdenService.actualizarEstado).toHaveBeenCalledWith(
      'ot-123',
      'en_presupuesto',
      'Iniciado presupuesto'
    );
  });

  it('debe llamar a registrarPago en el servicio al confirmar cobro operativo (TK103)', () => {
    component.seccionActiva.set('cobro');
    component.metodoPago.set('transferencia');
    component.comentarioCobro.set('Comprobante #1234');
    component.entregarOrden.set(true);

    component.confirmarCobro();

    expect(mockOrdenService.registrarPago).toHaveBeenCalledWith('ot-123', {
      metodo_pago: 'transferencia',
      comentario: 'Comprobante #1234',
      entregar_orden: true
    });
    expect(mockToastService.exito).toHaveBeenCalledWith('Cobro de la Orden registrado correctamente.');
  });
});
