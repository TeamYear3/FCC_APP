import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpedienteClienteModalComponent } from './expediente-cliente-modal.component';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OrdenService } from '../../../core/services/orden.service';
import { VehiculoService } from '../../../core/services/vehiculo.service';
import { ClienteDisplayItem } from '../clientes.component';

describe('ExpedienteClienteModalComponent', () => {
  let component: ExpedienteClienteModalComponent;
  let fixture: ComponentFixture<ExpedienteClienteModalComponent>;
  let ordenServiceMock: any;
  let vehiculoServiceMock: any;

  const mockCliente: ClienteDisplayItem = {
    id: 'uuid-cli-1',
    nombreCompleto: 'Carlos Rodríguez',
    tipoDocumento: 'DNI',
    dniCuit: '20345678901',
    condicionIva: 'CF',
    telefono: '351123456',
    email: 'carlos@test.com',
    flota: ['Volkswagen Amarok (AD456XY)'],
    vehiculos_count: 1,
    estado: 'En proceso',
    ordenActiva: '1 OT activa',
    ots_activas: 1
  };

  beforeEach(async () => {
    ordenServiceMock = {
      obtenerOrdenes: vi.fn().mockReturnValue(of([
        {
          id: 'ot-1',
          numero_ot: 'OT-1001',
          cliente: 'uuid-cli-1',
          vehiculo: 'veh-1',
          estado: 'en_proceso',
          descripcion_falla: 'Service de 50.000km',
          monto_total: 120000,
          creado_en: '2026-01-01'
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
          anio: 2022,
          tipo_motor: '2.0 TDI',
          kilometraje: 52000
        }
      ]))
    };

    await TestBed.configureTestingModule({
      imports: [ExpedienteClienteModalComponent],
      providers: [
        provideRouter([]),
        { provide: OrdenService, useValue: ordenServiceMock },
        { provide: VehiculoService, useValue: vehiculoServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteClienteModalComponent);
    component = fixture.componentInstance;
    component.cliente = mockCliente;
    component.mostrar = true;
    fixture.detectChanges();
  });

  it('debe crear el componente y generar las iniciales del cliente', () => {
    expect(component).toBeTruthy();
    expect(component.getIniciales()).toBe('CR');
  });

  it('debe cargar bajo demanda los vehículos y las órdenes del cliente', () => {
    component.cargarDetallesCliente('uuid-cli-1');
    expect(ordenServiceMock.obtenerOrdenes).toHaveBeenCalled();
    expect(vehiculoServiceMock.getVehiculos).toHaveBeenCalled();
    expect(component.ordenesCliente().length).toBe(1);
    expect(component.vehiculosCliente().length).toBe(1);
  });

  it('debe cambiar entre pestañas del expediente (resumen, vehiculos, ordenes)', () => {
    expect(component.tabActivo()).toBe('resumen');
    component.setTab('vehiculos');
    expect(component.tabActivo()).toBe('vehiculos');
    component.setTab('ordenes');
    expect(component.tabActivo()).toBe('ordenes');
  });

  it('debe emitir el evento cerrado al ejecutar cerrarModal()', () => {
    let emitido = false;
    component.cerrado.subscribe(() => emitido = true);
    component.cerrarModal();
    expect(emitido).toBe(true);
  });
});
