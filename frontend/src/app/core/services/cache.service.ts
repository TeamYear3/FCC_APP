import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

export interface CacheEntry {
  response: HttpResponse<unknown>;
  expiresAt: number;
}

/**
 * Servicio de caché en memoria con expiración por TTL (Time To Live).
 * Optimiza el rendimiento evitando peticiones redundantes a catálogos estáticos
 * y consultas de baja variación (TK180 - US-14).
 */
@Injectable({
  providedIn: 'root'
})
export class HttpCacheService {
  private readonly cache = new Map<string, CacheEntry>();
  readonly defaultTtlMs = 5 * 60 * 1000; // 5 minutos por defecto

  /**
   * Obtiene una respuesta en caché si existe y no ha expirado.
   */
  get(key: string): HttpResponse<unknown> | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  /**
   * Almacena una respuesta HTTP con un tiempo de vida (TTL).
   */
  put(key: string, response: HttpResponse<unknown>, ttlMs: number = this.defaultTtlMs): void {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { response, expiresAt });
  }

  /**
   * Invalida las entradas de caché que coincidan con un patrón o prefijo de URL.
   */
  invalidate(urlPattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(urlPattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpia toda la caché en memoria.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Devuelve la cantidad de entradas activas.
   */
  size(): number {
    return this.cache.size;
  }
}
