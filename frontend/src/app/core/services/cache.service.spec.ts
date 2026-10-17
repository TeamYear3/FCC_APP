import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpCacheService } from './cache.service';
import { HttpResponse } from '@angular/common/http';

describe('HttpCacheService', () => {
  let service: HttpCacheService;

  beforeEach(() => {
    service = new HttpCacheService();
  });

  it('debe almacenar y recuperar respuestas en memoria', () => {
    const response = new HttpResponse({ body: [{ id: 1, marca: 'Ford' }], status: 200 });
    service.put('/api/vehiculos/?cliente=1', response);

    const cached = service.get('/api/vehiculos/?cliente=1');
    expect(cached).toBeDefined();
    expect(cached?.status).toBe(200);
    expect(cached?.body).toEqual([{ id: 1, marca: 'Ford' }]);
  });

  it('debe retornar null si la clave no existe en caché', () => {
    expect(service.get('/api/inexistente/')).toBeNull();
  });

  it('debe expirar y eliminar entradas que exceden el TTL', () => {
    const response = new HttpResponse({ body: { data: 'test' } });
    const ttlMs = 100;
    service.put('/api/temporal/', response, ttlMs);

    // Adelantar tiempo simulado
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 200);

    const cached = service.get('/api/temporal/');
    expect(cached).toBeNull();
  });

  it('debe invalidar selectivamente por prefijo de URL', () => {
    service.put('/api/vehiculos/?cliente=1', new HttpResponse({ body: [1] }));
    service.put('/api/vehiculos/?cliente=2', new HttpResponse({ body: [2] }));
    service.put('/api/usuarios/?rol=tecnico', new HttpResponse({ body: [3] }));

    service.invalidate('/api/vehiculos/');

    expect(service.get('/api/vehiculos/?cliente=1')).toBeNull();
    expect(service.get('/api/vehiculos/?cliente=2')).toBeNull();
    expect(service.get('/api/usuarios/?rol=tecnico')).not.toBeNull();
  });

  it('debe limpiar toda la caché con clear()', () => {
    service.put('/api/item1', new HttpResponse({ body: 1 }));
    service.put('/api/item2', new HttpResponse({ body: 2 }));
    expect(service.size()).toBe(2);

    service.clear();
    expect(service.size()).toBe(0);
  });
});
