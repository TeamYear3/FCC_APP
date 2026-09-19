import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TallerDashboardComponent } from './taller-dashboard.component';
import { TallerService } from '../../../core/services/taller.service';
import { OrdenService } from '../../../core/services/orden.service';
import { of } from 'rxjs';

describe('TallerDashboardComponent', () => {
  let component: TallerDashboardComponent;
  let fixture: ComponentFixture<TallerDashboardComponent>;
  let tallerServiceMock: any;
  let ordenServiceMock: any;

  beforeEach(async () => {
    tallerServiceMock = {
      getResumenMecanicos: () => of([
        {
          id: '1',
          nombre: 'Carlos Rodríguez',
          email: 'tecnico@test.com',
          estado: 'Activo',
          ots_asignadas: 3,
          ots_activas: 2,
          porcentaje_carga: 40,
          ot_activa_numero: 'OT #1257',
          ot_activa_vehiculo: 'Toyota Hilux',
          ot_activa_estado: 'En Proceso'
        }
      ]),
      getResumenClientes: () => of([
        {
          id: '10',
          nombre: 'Carlos',
          apellido: 'Rodriguez',
          dni_cuit: '30111222',
          tipo_documento: 'DNI',
          vehiculos_count: 1,
          ots_activas: 1,
          monto_total_facturado: 15000,
          codigo_cliente: 'CLI-301112'
        }
      ])
    };

    ordenServiceMock = {
      obtenerOrdenes: () => of({
        total_items: 1,
        total_pages: 1,
        current_page: 1,
        results: [
          {
            id: '100',
            numero_ot: '1257',
            vehiculo_id: 'v1',
            descripcion_problema: 'Cambio de embrague',
            fecha_ingreso: '2026-08-04',
            estado: 'En Proceso',
            cliente_nombre: 'Juan Pérez',
            cliente_dni_cuit: '41834243',
            cliente_documento: 'DNI: 41.834.243',
            vehiculo_marca_modelo: 'Toyota Hilux',
            vehiculo_patente: 'AB123CD',
            creado_en: '2026-08-04T10:00:00Z',
            actualizado_en: '2026-08-04T10:00:00Z'
          }
        ]
      })
    };

    await TestBed.configureTestingModule({
      imports: [TallerDashboardComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: TallerService, useValue: tallerServiceMock },
        { provide: OrdenService, useValue: ordenServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TallerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar mecánicos, clientes y órdenes recientes al iniciar', () => {
    expect(component.mecanicos().length).toBe(1);
    expect(component.clientes().length).toBe(1);
    expect(component.ordenesRecientes().length).toBe(1);
    expect(component.mecanicos()[0].nombre).toBe('Carlos Rodríguez');
    expect(component.mecanicos()[0].ot_activa_numero).toBe('OT #1257');
    expect(component.ordenesRecientes()[0].numero_ot).toBe('1257');
    expect(component.ordenesRecientes()[0].cliente_nombre).toBe('Juan Pérez');
  });

  it('debe conmutar el modo vista previa de rol', () => {
    component.cambiarVistaPrevia('tecnico');
    expect(component.sidebarService.vistaPreviaRolSignal()).toBe('tecnico');

    component.cambiarVistaPrevia('admin');
    expect(component.sidebarService.vistaPreviaRolSignal()).toBeNull();
  });

  it('debe calcular correctamente los Core KPIs del taller', () => {
    expect(component.totalOtsActivas()).toBe(2);
    expect(component.capacidadPromedio()).toBe(40);
    expect(component.totalClientesRegistrados()).toBe(1);
    expect(component.facturacionTotalConsolidada()).toBe(15000);
  });
});

