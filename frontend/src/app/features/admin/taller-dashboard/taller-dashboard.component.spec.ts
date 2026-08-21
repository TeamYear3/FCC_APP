import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TallerDashboardComponent } from './taller-dashboard.component';
import { TallerService } from '../../../core/services/taller.service';
import { of } from 'rxjs';

describe('TallerDashboardComponent', () => {
  let component: TallerDashboardComponent;
  let fixture: ComponentFixture<TallerDashboardComponent>;
  let tallerServiceMock: any;

  beforeEach(async () => {
    tallerServiceMock = {
      getResumenMecanicos: () => of([
        { id: '1', nombre: 'Martin Gomez', email: 'tecnico@test.com', estado: 'Activo', ots_asignadas: 3, ots_activas: 2, porcentaje_carga: 40 }
      ]),
      getResumenClientes: () => of([
        { id: '10', nombre: 'Carlos', apellido: 'Rodriguez', dni_cuit: '30111222', tipo_documento: 'DNI', vehiculos_count: 1, ots_activas: 1, monto_total_facturado: 15000, codigo_cliente: 'CLI-301112' }
      ])
    };

    await TestBed.configureTestingModule({
      imports: [TallerDashboardComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: TallerService, useValue: tallerServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TallerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar mecánicos y clientes al iniciar', () => {
    expect(component.mecanicos().length).toBe(1);
    expect(component.clientes().length).toBe(1);
    expect(component.mecanicos()[0].nombre).toBe('Martin Gomez');
    expect(component.clientes()[0].apellido).toBe('Rodriguez');
  });

  it('debe conmutar el modo vista previa de rol', () => {
    component.cambiarVistaPrevia('tecnico');
    expect(component.sidebarService.vistaPreviaRolSignal()).toBe('tecnico');

    component.cambiarVistaPrevia('admin');
    expect(component.sidebarService.vistaPreviaRolSignal()).toBeNull();
  });
});
