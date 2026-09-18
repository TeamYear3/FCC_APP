import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientesComponent } from './clientes.component';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { TallerService } from '../../core/services/taller.service';
import { VehiculoService } from '../../core/services/vehiculo.service';

describe('ClientesComponent', () => {
  let component: ClientesComponent;
  let fixture: ComponentFixture<ClientesComponent>;
  let clienteServiceMock: any;
  let tallerServiceMock: any;
  let vehiculoServiceMock: any;

  beforeEach(async () => {
    clienteServiceMock = {
      obtenerClientes: vi.fn().mockReturnValue(of([
        {
          id: 'uuid-cli-1',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          tipo_documento: 'DNI',
          dni_cuit: '20345678901',
          condicion_iva: 'CF',
          telefono: '351123456',
          creado_en: '2026-01-01',
          actualizado_en: '2026-01-01'
        },
        {
          id: 'uuid-cli-2',
          nombre: 'Transportes',
          apellido: 'Sur S.A.',
          tipo_documento: 'CUIT',
          dni_cuit: '30712345678',
          condicion_iva: 'RI',
          telefono: '351987654',
          creado_en: '2026-01-01',
          actualizado_en: '2026-01-01'
        }
      ]))
    };

    tallerServiceMock = {
      getResumenClientes: vi.fn().mockReturnValue(of([
        {
          id: 'uuid-cli-1',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          dni_cuit: '20345678901',
          tipo_documento: 'DNI',
          vehiculos_count: 2,
          ots_activas: 1,
          monto_total_facturado: 150000,
          codigo_cliente: 'CLI-001'
        }
      ]))
    };

    vehiculoServiceMock = {
      getVehiculos: vi.fn().mockReturnValue(of([
        {
          id: 'veh-1',
          cliente_id: 'uuid-cli-1',
          patente: 'AD456XY',
          marca: 'Volkswagen',
          modelo: 'Amarok',
          creado_en: '2026-01-01',
          actualizado_en: '2026-01-01'
        }
      ]))
    };

    await TestBed.configureTestingModule({
      imports: [ClientesComponent],
      providers: [
        provideRouter([]),
        { provide: ClienteService, useValue: clienteServiceMock },
        { provide: TallerService, useValue: tallerServiceMock },
        { provide: VehiculoService, useValue: vehiculoServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente y cargar la lista real de clientes', () => {
    expect(component).toBeTruthy();
    expect(clienteServiceMock.obtenerClientes).toHaveBeenCalled();
    expect(component.cargando()).toBe(false);
    expect(component.clientes().length).toBe(2);
  });

  it('debe calcular las métricas superiores en tiempo real', () => {
    expect(component.totalClientes()).toBe(2);
    expect(component.cuentasCorporativas()).toBe(1); // CUIT / RI
    expect(component.ordenesAbiertas()).toBe(1);
  });

  it('debe manejar errores de carga de la API mostrando un mensaje descriptivo', () => {
    clienteServiceMock.obtenerClientes.mockReturnValue(throwError(() => new Error('Network error')));
    component.cargarClientes();

    expect(component.mensajeError()).toBe('No se pudo cargar la cartera de clientes desde el servidor.');
    expect(component.cargando()).toBe(false);
  });
});
