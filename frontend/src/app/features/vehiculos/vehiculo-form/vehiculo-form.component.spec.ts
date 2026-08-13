import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehiculoFormComponent } from './vehiculo-form.component';
import { VehiculoService } from '../../../core/services/vehiculo.service';
import { ClienteService, ClienteResponse } from '../../../core/services/cliente.service';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

describe('VehiculoFormComponent', () => {
  let component: VehiculoFormComponent;
  let fixture: ComponentFixture<VehiculoFormComponent>;
  let vehiculoServiceSpy: { crearVehiculo: ReturnType<typeof vi.fn>; reasignarVehiculo: ReturnType<typeof vi.fn> };
  let clienteServiceSpy: { obtenerClientes: ReturnType<typeof vi.fn> };

  const mockClientes: ClienteResponse[] = [
    {
      id: 'uuid-cli-1',
      nombre: 'Juan',
      apellido: 'Perez',
      tipo_documento: 'DNI',
      dni_cuit: '30111222',
      condicion_iva: 'CF',
      creado_en: '2026-07-21T12:00:00Z',
      actualizado_en: '2026-07-21T12:00:00Z'
    },
    {
      id: 'uuid-cli-2',
      nombre: 'Maria',
      apellido: 'Gomez',
      tipo_documento: 'DNI',
      dni_cuit: '28999888',
      condicion_iva: 'RI',
      creado_en: '2026-07-21T12:00:00Z',
      actualizado_en: '2026-07-21T12:00:00Z'
    }
  ];

  beforeEach(async () => {
    vehiculoServiceSpy = {
      crearVehiculo: vi.fn(),
      reasignarVehiculo: vi.fn().mockReturnValue(of({ id: 'uuid-veh-123', cliente_id: 'uuid-cli-1' }))
    };
    clienteServiceSpy = { obtenerClientes: vi.fn().mockReturnValue(of(mockClientes)) };

    await TestBed.configureTestingModule({
      imports: [VehiculoFormComponent],
      providers: [
        provideRouter([{ path: 'clientes', redirectTo: '' }]),
        { provide: VehiculoService, useValue: vehiculoServiceSpy },
        { provide: ClienteService, useValue: clienteServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VehiculoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente y cargar la lista de clientes en ngOnInit', () => {
    expect(component).toBeTruthy();
    expect(clienteServiceSpy.obtenerClientes).toHaveBeenCalled();
    expect(component.listaClientes().length).toBe(2);
    expect(component.vehiculoForm.valid).toBe(false);
  });

  it('debe validar el formato de patente argentina en tiempo real (Regex de TK024)', () => {
    const patenteControl = component.vehiculoForm.get('patente');

    // Patente inválida (números al inicio sin letras suficientes)
    patenteControl?.setValue('123ABC');
    expect(patenteControl?.valid).toBe(false);
    expect(patenteControl?.errors?.['pattern']).toBeTruthy();

    // Patente inválida por longitud
    patenteControl?.setValue('ABCD1234');
    expect(patenteControl?.valid).toBe(false);

    // Patente formato viejo válido (ABC123)
    patenteControl?.setValue('ABC123');
    expect(patenteControl?.valid).toBe(true);

    // Patente formato Mercosur válido (AB123CD)
    patenteControl?.setValue('AB123CD');
    expect(patenteControl?.valid).toBe(true);
  });

  it('debe permitir buscar y seleccionar un cliente desde el typeahead', () => {
    component.terminoBusqueda.set('Juan');
    expect(component.clientesFiltrados().length).toBe(1);
    expect(component.clientesFiltrados()[0].nombre).toBe('Juan');

    component.seleccionarCliente(mockClientes[0]);
    expect(component.vehiculoForm.get('cliente_id')?.value).toBe('uuid-cli-1');
    expect(component.clienteSeleccionado()?.nombre).toBe('Juan');
    expect(component.terminoBusqueda()).toBe('');
    expect(component.mostrarDropdown()).toBe(false);
  });

  it('debe llamar a VehiculoService.crearVehiculo al enviar un formulario válido', () => {
    component.seleccionarCliente(mockClientes[0]);
    component.vehiculoForm.patchValue({
      marca: 'Toyota',
      modelo: 'Hilux',
      anio: 2023,
      patente: 'AC123DE',
      kilometraje: 38500,
      color: 'Gris Plata'
    });

    vehiculoServiceSpy.crearVehiculo.mockReturnValue(of({
      id: 'uuid-veh-999',
      cliente_id: 'uuid-cli-1',
      patente: 'AC123DE',
      marca: 'Toyota',
      modelo: 'Hilux',
      anio: 2023,
      kilometraje: 38500,
      color: 'Gris Plata',
      creado_en: '2026-07-22T20:00:00Z',
      actualizado_en: '2026-07-22T20:00:00Z'
    }));

    component.onSubmit();

    expect(vehiculoServiceSpy.crearVehiculo).toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
  });

  it('debe mostrar mensaje descriptivo ante un error del backend (patente duplicada)', () => {
    component.seleccionarCliente(mockClientes[0]);
    component.vehiculoForm.patchValue({
      marca: 'Ford',
      modelo: 'Focus',
      anio: 2018,
      patente: 'AAA111',
      kilometraje: 10000,
      color: 'Blanco'
    });

    vehiculoServiceSpy.crearVehiculo.mockReturnValue(throwError(() => ({
      error: { patente: ['Ya existe un vehículo registrado con esta patente.'] }
    })));

    component.onSubmit();

    expect(component.vehiculoForm.get('patente')?.errors?.['serverError']).toBe('Ya existe un vehículo registrado con esta patente.');
    expect(component.errorMessage()).toBeNull();
    expect(component.isSubmitting()).toBe(false);
  });

  it('debe llamar a reasignarVehiculo al confirmar la reasignacion', () => {
    component.seleccionarCliente(mockClientes[0]);
    component.datosConflicto.set({ vehiculo_id: 'uuid-veh-123', patente: 'AA111BB' });
    component.confirmarReasignacion();

    expect(vehiculoServiceSpy.reasignarVehiculo).toHaveBeenCalledWith('uuid-veh-123', 'uuid-cli-1');
  });

  it('debe inhabilitar patente y numero_chasis al cargar datos de vehiculo en modo edicion (TK028)', () => {
    const vehiculoMock = {
      id: 'uuid-veh-100',
      cliente_id: 'uuid-cli-1',
      patente: 'AA999ZZ',
      numero_chasis: '8AW1234567890',
      nro_chasis: '8AW1234567890',
      marca: 'Toyota',
      modelo: 'Hilux',
      anio: 2022
    };

    const spyObtener = vi.fn().mockReturnValue(of(vehiculoMock));
    (component as any).vehiculoService.obtenerVehiculoPorId = spyObtener;

    component.cargarDatosVehiculo('uuid-veh-100');

    expect(component.vehiculoForm.get('patente')?.disabled).toBe(true);
    expect(component.vehiculoForm.get('numero_chasis')?.disabled).toBe(true);
    expect(component.vehiculoForm.get('nro_chasis')?.disabled).toBe(true);
  });
});


