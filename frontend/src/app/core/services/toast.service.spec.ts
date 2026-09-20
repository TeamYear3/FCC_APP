import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService]
    });
    service = TestBed.inject(ToastService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
    expect(service.toasts()).toEqual([]);
  });

  it('debe agregar una notificación toast', () => {
    service.mostrarExito('Operación realizada con éxito');
    const toasts = service.toasts();

    expect(toasts.length).toBe(1);
    expect(toasts[0].mensaje).toBe('Operación realizada con éxito');
    expect(toasts[0].tipo).toBe('exito');
  });

  it('debe remover una notificación por id', () => {
    service.mostrarError('Error grave de conexión');
    const toastId = service.toasts()[0].id;

    expect(service.toasts().length).toBe(1);

    service.remover(toastId);
    expect(service.toasts().length).toBe(0);
  });

  it('debe remover automáticamente la notificación al transcurrir el tiempo', () => {
    vi.useFakeTimers();
    service.mostrarAdvertencia('Tu sesión está por expirar', 2000);

    expect(service.toasts().length).toBe(1);

    vi.advanceTimersByTime(2500);
    expect(service.toasts().length).toBe(0);
    vi.useRealTimers();
  });
});
