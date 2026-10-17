import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpResponse, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { HttpCacheService } from '../services/cache.service';

/**
 * Lista de prefijos o rutas elegibles para almacenamiento en caché local con TTL.
 * Especificación TK180: catálogos estáticos y consultas de baja variación.
 */
const CACHEABLE_ROUTES = [
  '/api/vehiculos/',
  '/api/usuarios/?rol=tecnico',
  '/api/catalogo'
];

export const cacheInterceptorFn: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const cacheService = inject(HttpCacheService);

  // 1. Manejo de peticiones de mutación: invalidar entradas de caché asociadas
  if (req.method !== 'GET') {
    if (req.url.includes('/api/vehiculos/')) {
      cacheService.invalidate('/api/vehiculos/');
    }
    if (req.url.includes('/api/usuarios/')) {
      cacheService.invalidate('/api/usuarios/');
    }
    return next(req);
  }

  // 2. Verificar si la ruta actual es elegible para caché
  const isCacheable = CACHEABLE_ROUTES.some(route => req.urlWithParams.includes(route));
  if (!isCacheable) {
    return next(req);
  }

  // 3. Consultar la caché en memoria
  const cachedResponse = cacheService.get(req.urlWithParams);
  if (cachedResponse) {
    return of(cachedResponse.clone());
  }

  // 4. Si no está en caché, ejecutar la petición y almacenar la respuesta
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        cacheService.put(req.urlWithParams, event.clone());
      }
    })
  );
};
