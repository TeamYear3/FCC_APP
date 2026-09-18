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

  describe('TK086 - Buscador Dinámico en Vivo y Filtro por Estado', () => {
    it('debe inicializar con los filtros por defecto (todos los clientes visibles)', () => {
      expect(component.terminoBusqueda()).toBe('');
      expect(component.estadoFiltro()).toBe('Todos');
      expect(component.clientesFiltrados().length).toBe(2);
    });

    it('debe filtrar en vivo por nombre del cliente', () => {
      component.terminoBusqueda.set('carlos');
      expect(component.clientesFiltrados().length).toBe(1);
      expect(component.clientesFiltrados()[0].nombreCompleto).toContain('Carlos');
    });

    it('debe filtrar en vivo por DNI / CUIT', () => {
      component.terminoBusqueda.set('30712345678');
      expect(component.clientesFiltrados().length).toBe(1);
      expect(component.clientesFiltrados()[0].dniCuit).toBe('30712345678');
    });

    it('debe filtrar en vivo por vehículo o patente vinculada', () => {
      component.terminoBusqueda.set('AD456XY');
      expect(component.clientesFiltrados().length).toBe(1);
      expect(component.clientesFiltrados()[0].id).toBe('uuid-cli-1');
    });

    it('debe filtrar por estado del cliente (píldoras de estado)', () => {
      // Carlos Rodríguez tiene ots_activas = 1 -> estado 'En proceso'
      // Transportes Sur S.A. sin vehículos -> estado 'Pendiente'
      component.setEstadoFiltro('En proceso');
      expect(component.clientesFiltrados().length).toBe(1);
      expect(component.clientesFiltrados()[0].estado).toBe('En proceso');

      component.setEstadoFiltro('Pendiente');
      expect(component.clientesFiltrados().length).toBe(1);
      expect(component.clientesFiltrados()[0].estado).toBe('Pendiente');
    });

    it('debe combinar la búsqueda por texto y el filtro por estado', () => {
      component.terminoBusqueda.set('Carlos');
      component.setEstadoFiltro('Pendiente'); // Carlos está 'En proceso', no 'Pendiente'
      expect(component.clientesFiltrados().length).toBe(0);

      component.setEstadoFiltro('En proceso');
      expect(component.clientesFiltrados().length).toBe(1);
    });

    it('debe restablecer la búsqueda y los filtros con limpiarFiltros()', () => {
      component.terminoBusqueda.set('Búsqueda sin resultado');
      component.setEstadoFiltro('En revisión');
      expect(component.clientesFiltrados().length).toBe(0);

      component.limpiarFiltros();
      expect(component.terminoBusqueda()).toBe('');
      expect(component.estadoFiltro()).toBe('Todos');
      expect(component.clientesFiltrados().length).toBe(2);
    });
  });
});
