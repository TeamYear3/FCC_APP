import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ReportesRentabilidadComponent } from './reportes-rentabilidad.component';
import { ReportesService, ReporteRentabilidadResponse } from '../../../core/services/reportes.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ReportesRentabilidadComponent (TK210 #265)', () => {
  let component: ReportesRentabilidadComponent;
  let fixture: ComponentFixture<ReportesRentabilidadComponent>;
  let reportesService: ReportesService;

  const mockReporte: ReporteRentabilidadResponse = {
    periodo: 'mes',
    fecha_desde: '2026-10-01',
    fecha_hasta: '2026-10-31',
    kpis: {
      total_facturado: 230000,
      total_mano_obra: 130000,
      total_repuestos: 100000,
      margen_mano_obra_pct: 56.5,
      margen_repuestos_pct: 43.5,
      cantidad_ordenes: 2,
      ticket_promedio: 115000
    },
    margenes_reparacion: {
      mano_de_obra: { monto: 130000, porcentaje: 56.5 },
      repuestos: { monto: 100000, porcentaje: 43.5 }
    },
    top_servicios: [
      { servicio: 'Alineación y Balanceo', cantidad: 2, total: 100000 },
      { servicio: 'Cambio de Aceite', cantidad: 1, total: 30000 }
    ],
    historico_mensual: [
      { periodo_label: 'May 26', mano_de_obra: 50000, repuestos: 40000, total: 90000, cantidad_ordenes: 1 },
      { periodo_label: 'Jun 26', mano_de_obra: 70000, repuestos: 60000, total: 130000, cantidad_ordenes: 2 }
    ]
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [ReportesRentabilidadComponent, HttpClientTestingModule],
      providers: [ReportesService]
    }).compileComponents();

    reportesService = TestBed.inject(ReportesService);
    vi.spyOn(reportesService, 'getRentabilidad').mockReturnValue(of(mockReporte));

    fixture = TestBed.createComponent(ReportesRentabilidadComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse e inicializar la carga del reporte para el mes actual', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.periodoSeleccionado()).toBe('mes');
    expect(component.cargando()).toBe(false);
    expect(component.reporte()).toEqual(mockReporte);
  });

  it('debe conmutar el período analítico y disparar una nueva consulta', () => {
    fixture.detectChanges();
    const spy = vi.spyOn(reportesService, 'getRentabilidad');

    component.cambiarPeriodo('trimestre');

    expect(component.periodoSeleccionado()).toBe('trimestre');
    expect(spy).toHaveBeenCalledWith('trimestre');
  });

  it('debe calcular correctamente el porcentaje de demanda sobre el total', () => {
    fixture.detectChanges();
    // Total cantidad: 2 + 1 = 3 -> 2/3 = 67%
    const pct = component.obtenerPorcentajeDemanda(2);
    expect(pct).toBe(67);
  });

  it('debe obtener el valor máximo histórico para la escala del gráfico', () => {
    fixture.detectChanges();
    const max = component.obtenerMaximoHistorico();
    expect(max).toBe(130000);
  });

  it('debe manejar errores en la petición actualizando el estado de error', () => {
    vi.spyOn(reportesService, 'getRentabilidad').mockReturnValue(throwError(() => new Error('Error')));
    component.cargarReporte('mes');

    expect(component.cargando()).toBe(false);
    expect(component.error()).toContain('No se pudieron obtener las métricas');
  });
});
