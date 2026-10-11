import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, HttpResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { cacheInterceptorFn } from './cache.interceptor';
import { HttpCacheService } from '../services/cache.service';

describe('cacheInterceptorFn', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let cacheService: HttpCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HttpCacheService,
        provideHttpClient(withInterceptors([cacheInterceptorFn])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    cacheService = TestBed.inject(HttpCacheService);
    cacheService.clear();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe almacenar en caché peticiones GET a rutas elegibles y reutilizar la respuesta', () => {
    const url = '/api/vehiculos/?cliente=1';
    const mockData = [{ id: 1, patente: 'AA111BB' }];

    // Primera llamada (viaja por la red)
    let firstResult: any;
    httpClient.get(url).subscribe(res => firstResult = res);

    const req1 = httpTesting.expectOne(url);
    expect(req1.request.method).toBe('GET');
    req1.flush(mockData);

    expect(firstResult).toEqual(mockData);
    expect(cacheService.get(url)).toBeDefined();

    // Segunda llamada (debe servirse de la caché sin generar request HTTP)
    let secondResult: any;
    httpClient.get(url).subscribe(res => secondResult = res);

    httpTesting.expectNone(url); // No debe emitir ninguna petición de red
    expect(secondResult).toEqual(mockData);
  });

  it('no debe almacenar en caché rutas no elegibles', () => {
    const url = '/api/ordenes/activas/';
    const mockData = [{ id: 10 }];

    httpClient.get(url).subscribe();
    const req1 = httpTesting.expectOne(url);
    req1.flush(mockData);

    expect(cacheService.get(url)).toBeNull();
  });

  it('debe invalidar la caché de vehículos ante una petición POST/PUT mutante', () => {
    const getUrl = '/api/vehiculos/?cliente=1';
    cacheService.put(getUrl, new HttpResponse({ body: [{ id: 1 }] }));
    expect(cacheService.get(getUrl)).not.toBeNull();

    // Petición POST para crear vehículo
    httpClient.post('/api/vehiculos/', { patente: 'NEW123' }).subscribe();
    const reqPost = httpTesting.expectOne('/api/vehiculos/');
    reqPost.flush({ id: 2, patente: 'NEW123' });

    // La entrada previa de vehículos debe haber sido invalidada
    expect(cacheService.get(getUrl)).toBeNull();
  });
});
