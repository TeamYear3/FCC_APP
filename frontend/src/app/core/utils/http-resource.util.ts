import { ResourceRef, Injector, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

export interface HttpResourceOptions<T, R = void> {
  params?: () => R;
  loader: (param: R) => Observable<T>;
  defaultValue?: T;
  injector?: Injector;
}

/**
 * Utilidad reactiva para estandarizar cargas HTTP desacopladas de suscripciones imperativas en ngOnInit.
 * Conecta HttpClient con Signals mediante rxResource de Angular.
 */
export function httpResource<T, R = void>(options: HttpResourceOptions<T, R>): ResourceRef<T | undefined> {
  let resolvedInjector = options.injector;
  if (!resolvedInjector) {
    try {
      resolvedInjector = inject(Injector);
    } catch {
      // Fuera de contexto de inyección si no se suministró explícitamente
    }
  }

  if (options.params) {
    return rxResource<T, R>({
      params: options.params,
      stream: (loaderParams) => options.loader(loaderParams.params as R),
      ...(options.defaultValue !== undefined ? { defaultValue: options.defaultValue } : {}),
      ...(resolvedInjector ? { injector: resolvedInjector } : {})
    });
  }

  return rxResource<T, void>({
    stream: () => options.loader(undefined as unknown as R),
    ...(options.defaultValue !== undefined ? { defaultValue: options.defaultValue } : {}),
    ...(resolvedInjector ? { injector: resolvedInjector } : {})
  });
}
