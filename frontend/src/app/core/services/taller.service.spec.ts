import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TallerService } from './taller.service';
import { firstValueFrom } from 'rxjs';

describe('TallerService', () => {
  let service: TallerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TallerService]
    });
    service = TestBed.inject(TallerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crear el servicio', () => {
    expect(service).toBeTruthy();
  });

  it('debe solicitar el resumen de mecánicos vía GET', async () => {
    const mockMecanicos = [
      { id: '1', nombre: 'Martin Gomez', email: 'tecnico@test.com', estado: 'Activo', ots_asignadas: 3, ots_activas: 2, porcentaje_carga: 40 }
    ];

    const resPromise = firstValueFrom(service.getResumenMecanicos());

    const req = httpMock.expectOne((r) => r.url.endsWith('/taller/mecanicos/'));
    expect(req.request.method).toBe('GET');
    req.flush(mockMecanicos);

    const res = await resPromise;
    expect(res.length).toBe(1);
    expect(res[0].nombre).toBe('Martin Gomez');
    expect(res[0].porcentaje_carga).toBe(40);
  });

  it('debe solicitar el resumen de clientes vía GET', async () => {
    const mockClientes = [
      { id: '10', nombre: 'Carlos', apellido: 'Rodriguez', dni_cuit: '30111222', tipo_documento: 'DNI', vehiculos_count: 1, ots_activas: 1, monto_total_facturado: 15000, codigo_cliente: 'CLI-301112' }
    ];

    const resPromise = firstValueFrom(service.getResumenClientes());

    const req = httpMock.expectOne((r) => r.url.endsWith('/taller/clientes/'));
    expect(req.request.method).toBe('GET');
    req.flush(mockClientes);

    const res = await resPromise;
    expect(res.length).toBe(1);
    expect(res[0].monto_total_facturado).toBe(15000);
  });
});
