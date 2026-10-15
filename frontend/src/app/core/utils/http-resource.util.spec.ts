import { TestBed } from '@angular/core/testing';
import { httpResource } from './http-resource.util';
import { of } from 'rxjs';
import { signal } from '@angular/core';

describe('httpResource util', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('debe inicializar el recurso reactivo con defaultValue', () => {
    TestBed.runInInjectionContext(() => {
      const res = httpResource<string[]>({
        loader: () => of(['item1', 'item2']),
        defaultValue: []
      });

      expect(res.value()).toEqual([]);
      expect(res.isLoading()).toBeDefined();
    });
  });

  it('debe aceptar params reactivos y configurar el recurso correctamente', () => {
    TestBed.runInInjectionContext(() => {
      const querySignal = signal('filtro1');
      const res = httpResource<string, string>({
        params: () => querySignal(),
        loader: (q) => of(`Resultado para ${q}`),
        defaultValue: 'inicio'
      });

      expect(res.value()).toBe('inicio');
      expect(res.isLoading()).toBeDefined();
    });
  });
});
