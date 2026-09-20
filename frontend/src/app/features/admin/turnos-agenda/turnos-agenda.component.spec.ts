import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TurnosAgendaComponent } from './turnos-agenda.component';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { TurnoService } from '../../../core/services/turno.service';
import { ClienteService } from '../../../core/services/cliente.service';
import { VehiculoService } from '../../../core/services/vehiculo.service';
import { OrdenService } from '../../../core/services/orden.service';
import { AuthService } from '../../../core/auth/auth.service';

describe('TurnosAgendaComponent', () => {
  let component: TurnosAgendaComponent;
  let fixture: ComponentFixture<TurnosAgendaComponent>;

  let mockTurnoService: any;
  let mockClienteService: any;
  let mockVehiculoService: any;
  let mockOrdenService: any;
  let mockAuthService: any;

  const configurarModuloConRol = async (rol: string) => {
    mockTurnoService = {
      obtenerTurnos: vi.fn().mockReturnValue(of([
        {
          id: 'turno-1',
          cliente: 'cli-1',
          vehiculo: 'veh-1',
          cliente_nombre: 'Carlos Gómez',
          vehiculo_info: 'Ford Fiesta',
          fecha_hora: '2026-09-20T09:00:00Z',
          estado: 'pendiente',
          motivo: 'Fallo eléctrico',
          creado_en: '2026-09-20T08:00:00Z',
          actualizado_en: '2026-09-20T08:00:00Z',
          warning_overbooking: false
        }
      ])),
      actualizarTurno: vi.fn().mockReturnValue(of({})),
      eliminarTurno: vi.fn().mockReturnValue(of({}))
    };

    mockClienteService = {
      obtenerClientes: vi.fn().mockReturnValue(of([]))
    };

    mockVehiculoService = {
      getVehiculosByCliente: vi.fn().mockReturnValue(of([]))
    };

    mockOrdenService = {
      obtenerOrdenes: vi.fn().mockReturnValue(of({ results: [] }))
    };

    mockAuthService = {
      getUserRole: vi.fn().mockReturnValue(rol)
    };

    await TestBed.configureTestingModule({
      imports: [TurnosAgendaComponent],
      providers: [
        provideRouter([]),
        { provide: TurnoService, useValue: mockTurnoService },
        { provide: ClienteService, useValue: mockClienteService },
        { provide: VehiculoService, useValue: mockVehiculoService },
        { provide: OrdenService, useValue: mockOrdenService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TurnosAgendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('Cuando el usuario tiene rol "tecnico" (TK110 - Modo Solo Lectura)', () => {
    beforeEach(async () => {
      await configurarModuloConRol('tecnico');
    });

    it('debe identificar al usuario como técnico (esTecnico() === true)', () => {
      expect(component.esTecnico()).toBe(true);
    });

    it('debe configurar el calendario en modo no editable (editable: false)', () => {
      expect(component.calendarOptions().editable).toBe(false);
    });

    it('no debe permitir abrir el modal de creación al hacer dateClick', () => {
      component.handleDateClick({ date: new Date('2026-09-20T10:00:00Z') });
      expect(component.mostrarModalCrear()).toBe(false);
    });

    it('debe revertir inmediatamente el evento si se intenta hacer drag & drop en el calendario', () => {
      const revertSpy = vi.fn();
      const mockDropInfo = {
        revert: revertSpy,
        event: { id: 'turno-1', start: new Date() }
      };

      component.handleEventDrop(mockDropInfo);

      expect(revertSpy).toHaveBeenCalled();
      expect(mockTurnoService.actualizarTurno).not.toHaveBeenCalled();
    });
  });

  describe('Cuando el usuario tiene rol "admin"', () => {
    beforeEach(async () => {
      await configurarModuloConRol('admin');
    });

    it('debe identificar al usuario como no técnico (esTecnico() === false)', () => {
      expect(component.esTecnico()).toBe(false);
    });

    it('debe configurar el calendario en modo editable (editable: true)', () => {
      expect(component.calendarOptions().editable).toBe(true);
    });

    it('debe permitir abrir el modal de creación al hacer dateClick', () => {
      component.handleDateClick({ date: new Date('2026-09-20T10:00:00Z') });
      expect(component.mostrarModalCrear()).toBe(true);
    });
  });
});
