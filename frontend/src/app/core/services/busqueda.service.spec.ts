import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BusquedaService } from './busqueda.service';
import { firstValueFrom } from 'rxjs';

describe('BusquedaService', () => {
  let service: BusquedaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BusquedaService]
    });
    service = TestBed.inject(BusquedaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crear el servicio', () => {
    expect(service).toBeTruthy();
  });

  it('debe retornar resultados vacíos si el término es menor a 2 caracteres', async () => {
    const resPromise = firstValueFrom(service.buscarUniversal('a'));
    const res = await resPromise;
    expect(res.clientes.length).toBe(0);
    expect(res.vehiculos.length).toBe(0);
    expect(res.ordenes.length).toBe(0);
  });

  it('debe realizar la petición GET con query param q', async () => {
    const mockResponse = {
      clientes: [{ id: '1', titulo: 'Juan Perez', subtitulo: 'DNI: 30123456', tipo: 'cliente' as const, url: '/clientes' }],
      vehiculos: [],
      ordenes: []
    };

    const resPromise = firstValueFrom(service.buscarUniversal('Juan'));

    const req = httpMock.expectOne((r) => r.url.includes('/busqueda-universal/') && r.params.get('q') === 'Juan');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);

    const res = await resPromise;
    expect(res.clientes.length).toBe(1);
    expect(res.clientes[0].titulo).toBe('Juan Perez');
  });
});
