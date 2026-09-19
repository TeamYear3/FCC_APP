import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdenFormComponent } from './orden-form.component';
import { FormBuilder } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { OrdenService } from '../../../core/services/orden.service';
import { VehiculoService } from '../../../core/services/vehiculo.service';
import { ClienteService } from '../../../core/services/cliente.service';
import { TurnoService } from '../../../core/services/turno.service';

describe('OrdenFormComponent', () => {
  let component: OrdenFormComponent;
  let fixture: ComponentFixture<OrdenFormComponent>;
  let router: Router;

  const mockTurnos = [
    {
      id: 'turno-1',
      cliente_id: 'cli-1',
      vehiculo_id: 'veh-1',
      cliente_nombre: 'Juan Perez',
      vehiculo_info: 'Toyota Corolla (AA123BB)',
      fecha_hora: '2026-09-20T10:00:00Z',
      estado: 'confirmado',
      tipo_servicio: 'Mantenimiento'
    }
  ];

  let mockOrdenService: any;
  let mockVehiculoService: any;
  let mockClienteService: any;
  let mockTurnoService: any;

  beforeEach(async () => {
    mockOrdenService = {
      crearOrden: vi.fn().mockReturnValue(of({ id: 'ot-new-1', numero_ot: 'OT-001' }))
    };

    mockVehiculoService = {
      getVehiculoById: vi.fn().mockReturnValue(of({
        id: 'veh-1',
        patente: 'AA123BB',
        marca: 'Toyota',
        modelo: 'Corolla',
        anio: 2022,
        cliente_id: 'cli-1'
      })),
      getVehiculos: vi.fn().mockReturnValue(of([])),
      obtenerVehiculos: vi.fn().mockReturnValue(of({ results: [] }))
    };

    mockClienteService = {
      getClienteById: vi.fn().mockReturnValue(of({
        id: 'cli-1',
        nombre: 'Juan',
        apellido: 'Perez',
        email: 'juan@example.com',
        telefono: '1122334455'
      })),
      obtenerClientes: vi.fn().mockReturnValue(of({ results: [] }))
    };

    mockTurnoService = {
      obtenerTurnos: vi.fn().mockReturnValue(of(mockTurnos)),
      getTurnos: vi.fn().mockReturnValue(of(mockTurnos))
    };

    await TestBed.configureTestingModule({
      imports: [OrdenFormComponent],
      providers: [
        FormBuilder,
        provideRouter([]),
        { provide: OrdenService, useValue: mockOrdenService },
        { provide: VehiculoService, useValue: mockVehiculoService },
        { provide: ClienteService, useValue: mockClienteService },
        { provide: TurnoService, useValue: mockTurnoService }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(OrdenFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente y cargar la lista de turnos reales desde el servicio', () => {
    expect(component).toBeTruthy();
    expect(mockTurnoService.obtenerTurnos).toHaveBeenCalled();
    expect(component.turnos().length).toBe(1);
    expect(component.turnos()[0].id).toBe('turno-1');
  });

  it('debe inicializar el formulario en modo PRESUPUESTO sin requerir turno_id', () => {
    expect(component.ordenForm.get('modo')?.value).toBe('PRESUPUESTO');
    const turnoCtrl = component.ordenForm.get('turno_id');
    expect(turnoCtrl?.validator).toBeNull();
  });

  it('debe requerir turno_id y cliente_acepto al cambiar a modo ORDEN_TRABAJO', () => {
    component.ordenForm.get('modo')?.setValue('ORDEN_TRABAJO');
    const turnoCtrl = component.ordenForm.get('turno_id');
    const aceptoCtrl = component.ordenForm.get('cliente_acepto');

    expect(turnoCtrl?.valid).toBeFalsy();
    expect(aceptoCtrl?.valid).toBeFalsy();

    turnoCtrl?.setValue('turno-1');
    aceptoCtrl?.setValue(true);

    expect(turnoCtrl?.valid).toBeTruthy();
    expect(aceptoCtrl?.valid).toBeTruthy();
  });

  it('debe cargar los datos del vehiculo y del cliente al seleccionar un vehiculo_id', () => {
    component.ordenForm.get('vehiculo_id')?.setValue('veh-1');

    expect(mockVehiculoService.getVehiculoById).toHaveBeenCalledWith('veh-1');
    expect(mockClienteService.getClienteById).toHaveBeenCalledWith('cli-1');
    expect(component.selectedVehiculoDetails()?.patente).toBe('AA123BB');
    expect(component.selectedClienteDetails()?.nombre).toBe('Juan');
  });

  it('debe enviar el formulario correctamente cuando es valido', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.ordenForm.patchValue({
      modo: 'PRESUPUESTO',
      vehiculo_id: 'veh-1',
      complejidad: 'baja',
      descripcion_problema: 'Ruido en frenos delanteros',
      fecha_ingreso: '2026-09-19'
    });

    component.onSubmit();

    expect(mockOrdenService.crearOrden).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/ordenes'], {
      state: { successOT: 'OT-001' }
    });
  });

  it('debe manejar apertura y cierre del modal in-situ de cliente (TK102)', () => {
    component.abrirModalCliente();
    expect(component.mostrarModalCliente()).toBe(true);
    expect(component.clienteFormInSitu).toBeDefined();

    component.cerrarModalCliente();
    expect(component.mostrarModalCliente()).toBe(false);
  });

  it('debe manejar apertura y configuracion del modal in-situ de vehiculo (TK102)', () => {
    component.abrirModalVehiculo('cli-1');
    expect(component.mostrarModalVehiculo()).toBe(true);
    expect(component.vehiculoFormInSitu.get('cliente_id')?.value).toBe('cli-1');

    component.cerrarModalVehiculo();
    expect(component.mostrarModalVehiculo()).toBe(false);
  });
});

